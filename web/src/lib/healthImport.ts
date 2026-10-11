// Reads sleep records out of an Apple Health export (export.xml, or the export.zip that contains it) entirely in the
// browser, so a 500MB file never has to be uploaded. Only the sleep segments are sent on, in batches that never split
// a sleep session.

export type ImportSegment = { start: string; end: string; value: string; tz?: string }

export type ReadProgress = (fraction: number, found: number) => void

const SLEEP_RECORD =
  /<Record type="HKCategoryTypeIdentifierSleepAnalysis"([^>]*?)(?:\/>|>([\s\S]*?)<\/Record>)/g

const SESSION_GAP_MS = 3 * 60 * 60 * 1000
export const BATCH_TARGET = 3500 // the database accepts at most 5000 per call

const attr = (s: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(s)?.[1]

/** "2026-07-09 23:10:00 +1100" -> "2026-07-09T23:10:00+11:00" */
function toIso(s: string): string | null {
  const m = /^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d) ([+-]\d\d)(\d\d)$/.exec(s)
  return m ? `${m[1]}T${m[2]}${m[3]}:${m[4]}` : null
}

function stageOf(value: string): string | null {
  const v = value.replace('HKCategoryValueSleepAnalysis', '')
  if (v === 'InBed') return null
  if (v === 'AsleepCore') return 'Core'
  if (v === 'AsleepDeep') return 'Deep'
  if (v === 'AsleepREM') return 'REM'
  if (v === 'Awake') return 'Awake'
  return 'Asleep'
}

/** The XML as a byte stream, plus its (uncompressed) size for progress. */
async function openExport(file: File): Promise<{ stream: ReadableStream<Uint8Array>; size: number }> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  if (!isZip) return { stream: file.stream(), size: file.size }

  const tailLen = Math.min(file.size, 70000)
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer())
  let i = tailLen - 22
  while (i >= 0 && tail.getUint32(i, true) !== 0x06054b50) i--
  if (i < 0) throw new Error('That zip file looks damaged.')
  const cdSize = tail.getUint32(i + 12, true)
  const cdOffset = tail.getUint32(i + 16, true)
  if (cdOffset === 0xffffffff) throw new Error('This zip is too large to read here. Unzip it and choose export.xml instead.')

  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer())
  const names = new TextDecoder()
  let p = 0
  while (p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50) {
    const method = cd.getUint16(p + 10, true)
    const comp = cd.getUint32(p + 20, true)
    const uncomp = cd.getUint32(p + 24, true)
    const nameLen = cd.getUint16(p + 28, true)
    const extraLen = cd.getUint16(p + 30, true)
    const commentLen = cd.getUint16(p + 32, true)
    const local = cd.getUint32(p + 42, true)
    const name = names.decode(new Uint8Array(cd.buffer, p + 46, nameLen))
    p += 46 + nameLen + extraLen + commentLen
    if (name !== 'export.xml' && !name.endsWith('/export.xml')) continue
    if (comp === 0xffffffff || uncomp === 0xffffffff) throw new Error('This zip is too large to read here. Unzip it and choose export.xml instead.')
    const lh = new DataView(await file.slice(local, local + 30).arrayBuffer())
    const start = local + 30 + lh.getUint16(26, true) + lh.getUint16(28, true)
    const raw = file.slice(start, start + comp).stream()
    if (method === 0) return { stream: raw, size: uncomp }
    if (method === 8) return { stream: raw.pipeThrough(new DecompressionStream('deflate-raw')), size: uncomp }
    throw new Error('Unsupported zip compression. Unzip it and choose export.xml instead.')
  }
  throw new Error("Couldn't find export.xml in that zip.")
}

export async function readSleepSegments(file: File, onProgress: ReadProgress): Promise<ImportSegment[]> {
  const { stream, size } = await openExport(file)
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const out: ImportSegment[] = []
  let buf = ''
  let read = 0

  const scan = () => {
    SLEEP_RECORD.lastIndex = 0
    let consumed = 0
    for (let m = SLEEP_RECORD.exec(buf); m; m = SLEEP_RECORD.exec(buf)) {
      consumed = SLEEP_RECORD.lastIndex
      const stage = stageOf(attr(m[1], 'value') ?? '')
      const start = toIso(attr(m[1], 'startDate') ?? '')
      const end = toIso(attr(m[1], 'endDate') ?? '')
      if (!stage || !start || !end) continue
      const tz = m[2] ? /key="HKTimeZone" value="([^"]+)"/.exec(m[2])?.[1] : undefined
      out.push(tz ? { start, end, value: stage, tz } : { start, end, value: stage })
    }
    // keep only a possibly-incomplete trailing record
    const lastStart = buf.lastIndexOf('<Record ')
    buf = buf.slice(lastStart >= consumed ? lastStart : Math.max(consumed, buf.length - 8))
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    read += value.byteLength
    buf += decoder.decode(value, { stream: true })
    scan()
    onProgress(Math.min(1, read / size), out.length)
  }
  buf += decoder.decode()
  scan()
  onProgress(1, out.length)
  return out
}

export type Batch = { segments: ImportSegment[]; from: string; to: string }

/** Sorted, de-duplicated, and cut into batches only where there is a >3h gap, so no sleep session is split. */
export function toBatches(segments: ImportSegment[]): Batch[] {
  const sorted = [...segments].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
  const batches: Batch[] = []
  let cur: ImportSegment[] = []
  let curEnd = -Infinity
  let last = ''
  const flush = () => {
    if (cur.length) batches.push({ segments: cur, from: cur[0].start.slice(0, 10), to: cur[cur.length - 1].end.slice(0, 10) })
    cur = []
  }
  for (const s of sorted) {
    const key = `${s.start}|${s.end}|${s.value}`
    if (key === last) continue
    last = key
    const startMs = Date.parse(s.start)
    if (cur.length >= BATCH_TARGET && startMs - curEnd > SESSION_GAP_MS) flush()
    cur.push(s)
    curEnd = Math.max(curEnd, Date.parse(s.end))
  }
  flush()
  return batches
}
