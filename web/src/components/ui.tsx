import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { initials } from '../lib/format'

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <p className="error">{msg}</p>
}

export function Avatar({ name }: { name: string }) {
  return <div className="avatar">{initials(name)}</div>
}

export function PageHead({ title, right, back }: { title: string; right?: ReactNode; back?: boolean }) {
  const nav = useNavigate()
  return (
    <>
      {back && (
        <button className="back" onClick={() => nav(-1)}>
          ‹ Back
        </button>
      )}
      <div className="page-head">
        <h1>{title}</h1>
        {right}
      </div>
    </>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn secondary small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {
          window.prompt('Copy this:', text)
        }
      }}
    >
      {done ? 'Copied ✓' : label}
    </button>
  )
}

export function ErrorBoundaryFallback({ message }: { message: string }) {
  return (
    <div className="screen no-tabs">
      <div className="card">
        <p>{message}</p>
      </div>
    </div>
  )
}
