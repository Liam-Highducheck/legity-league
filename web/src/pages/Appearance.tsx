import { useState } from 'react'
import { Check } from 'lucide-react'
import { applyTheme, getTheme, type Theme } from '../lib/theme'
import { PageHead } from '../components/ui'

const options: { value: Theme; label: string; hint: string; swatch: string[] }[] = [
  { value: 'default', label: 'Midnight', hint: 'Dark with purple accents', swatch: ['#0b0d1a', '#151a2e', '#8b7cff', '#5eead4'] },
  { value: 'red', label: 'Red only', hint: 'Shades of red on black, for a red colour filter', swatch: ['#080000', '#260000', '#8a0000', '#ff0000'] },
]

export function Appearance() {
  const [theme, setTheme] = useState<Theme>(getTheme())
  return (
    <div className="screen stack">
      <PageHead title="Appearance" back />
      <div className="card flush">
        <div className="list">
          {options.map((o) => (
            <button
              key={o.value}
              className="list-item"
              onClick={() => {
                applyTheme(o.value)
                setTheme(o.value)
              }}
            >
              <span className="swatch">
                {o.swatch.map((c) => <i key={c} style={{ background: c }} />)}
              </span>
              <div className="grow">
                <b>{o.label}</b>
                <p className="muted small">{o.hint}</p>
              </div>
              {theme === o.value && <Check size={20} color="var(--accent)" />}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">Saved on this device only.</p>
    </div>
  )
}
