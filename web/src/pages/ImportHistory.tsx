import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, FileUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatShortDay } from '../lib/dates'
import { readSleepSegments, toBatches, type Batch } from '../lib/healthImport'
import { ErrorNote, PageHead } from '../components/ui'

type Phase =
  | { kind: 'pick' }
  | { kind: 'reading'; fraction: number; found: number }
  | { kind: 'ready'; batches: Batch[]; segments: number }
  | { kind: 'uploading'; done: number; total: number }
  | { kind: 'done'; nights: number }

export function ImportHistory() {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' })
  const [error, setError] = useState<unknown>(null)

  async function onFile(file: File) {
    setError(null)
    setPhase({ kind: 'reading', fraction: 0, found: 0 })
    try {
      const segments = await readSleepSegments(file, (fraction, found) => setPhase({ kind: 'reading', fraction, found }))
      if (segments.length === 0) throw new Error('No sleep data found in that file. Make sure it is the Apple Health export (export.xml or export.zip).')
      setPhase({ kind: 'ready', batches: toBatches(segments), segments: segments.length })
    } catch (e) {
      setError(e)
      setPhase({ kind: 'pick' })
    }
  }

  async function upload(batches: Batch[]) {
    setError(null)
    const nights = new Set<string>()
    try {
      for (let i = 0; i < batches.length; i++) {
        setPhase({ kind: 'uploading', done: i, total: batches.length })
        const { data, error } = await supabase.rpc('import_sleep_segments', { p_segments: batches[i].segments })
        if (error) throw new Error(error.message)
        for (const n of (data as { nights?: { night_date: string }[] } | null)?.nights ?? []) nights.add(n.night_date)
      }
      await qc.invalidateQueries()
      setPhase({ kind: 'done', nights: nights.size })
    } catch (e) {
      setError(e)
      setPhase({ kind: 'ready', batches, segments: batches.reduce((s, b) => s + b.segments.length, 0) })
    }
  }

  return (
    <div className="screen stack">
      <PageHead title="Import history" back />

      {phase.kind === 'done' ? (
        <div className="card stack">
          <h2 style={{ marginBottom: 0 }}><Check size={20} className="inline-icon" /> Imported</h2>
          <p>
            Saved <b>{phase.nights}</b> night{phase.nights === 1 ? '' : 's'} of sleep. Existing nights are only replaced when the
            imported one is at least as long, so nothing newer is lost.
          </p>
        </div>
      ) : (
        <>
          <div className="card stack">
            <h2 style={{ marginBottom: 0 }}>One-time upload</h2>
            <p className="muted">
              Brings in your whole Apple Health sleep history in one go. The file is read on this device, and only the sleep
              entries are sent. It can take a minute or two for a big export.
            </p>
            <ol className="muted small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>Open the Health app, tap your picture, then <b>Export All Health Data</b>.</li>
              <li>Save the <b>export.zip</b> to Files (or AirDrop it to this device).</li>
              <li>Choose it below. You can use the zip as is.</li>
            </ol>
          </div>

          {phase.kind === 'pick' && (
            <>
              <input
                ref={input}
                type="file"
                accept=".zip,.xml,application/zip,text/xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) void onFile(f)
                }}
              />
              <button className="btn" onClick={() => input.current?.click()}><FileUp size={18} /> Choose export file</button>
            </>
          )}

          {phase.kind === 'reading' && (
            <div className="card stack">
              <p>Reading your export… <b>{Math.round(phase.fraction * 100)}%</b></p>
              <div className="meter"><i style={{ width: `${phase.fraction * 100}%` }} /></div>
              <p className="muted small">{phase.found.toLocaleString()} sleep entries found so far</p>
            </div>
          )}

          {phase.kind === 'ready' && (
            <div className="card stack">
              <p>
                Found <b>{phase.segments.toLocaleString()}</b> sleep entries from{' '}
                <b>{formatShortDay(phase.batches[0].from)}</b> to <b>{formatShortDay(phase.batches[phase.batches.length - 1].to)}</b>.
              </p>
              <button className="btn" onClick={() => void upload(phase.batches)}>Import {phase.batches.length} batch{phase.batches.length === 1 ? '' : 'es'}</button>
            </div>
          )}

          {phase.kind === 'uploading' && (
            <div className="card stack">
              <p>Uploading… batch <b>{Math.min(phase.done + 1, phase.total)}</b> of {phase.total}</p>
              <div className="meter"><i style={{ width: `${(phase.done / phase.total) * 100}%` }} /></div>
              <p className="muted small">Keep this screen open until it finishes.</p>
            </div>
          )}
        </>
      )}

      <ErrorNote error={error} />
    </div>
  )
}
