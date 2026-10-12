import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, todayISO } from '@legity/core/dates'
import { useProfile, useSaveManualNight } from '../hooks/queries'
import { ErrorNote, PageHead } from '../components/ui'

export function LogNight() {
  const nav = useNavigate()
  const profile = useProfile()
  const save = useSaveManualNight()
  const today = todayISO(profile.data?.timezone)
  const [date, setDate] = useState(today)
  const [hours, setHours] = useState('7')
  const [mins, setMins] = useState('30')
  const [restorative, setRestorative] = useState('')

  const duration = Number(hours || 0) * 60 + Number(mins || 0)
  const valid = duration > 0 && duration <= 1440

  return (
    <div className="screen">
      <PageHead title="Log a night" back />
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault()
          await save.mutateAsync({
            night_date: date,
            duration_min: duration,
            restorative_min: restorative ? Number(restorative) : null,
          })
          nav(-1)
        }}
      >
        <label className="field">
          Morning you woke up
          <input type="date" value={date} min={addDays(today, -60)} max={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="row">
          <label className="field grow">
            Hours
            <input inputMode="numeric" type="number" min={0} max={23} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="field grow">
            Minutes
            <input inputMode="numeric" type="number" min={0} max={59} value={mins} onChange={(e) => setMins(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <label className="field grow">
            Restorative min (optional)
            <input inputMode="numeric" type="number" min={0} max={1440} value={restorative} onChange={(e) => setRestorative(e.target.value)} />
          </label>
        </div>
        <ErrorNote error={save.error} />
        <button className="btn" disabled={!valid || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save night'}
        </button>
      </form>
    </div>
  )
}
