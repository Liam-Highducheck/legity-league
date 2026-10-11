import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { useGroup } from '../hooks/group'
import { Sheet } from './ui'

export function GroupSwitcher() {
  const { groups, group, setGroupId } = useGroup()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  if (!group) return null
  return (
    <>
      <button className="chip" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <b>{group.name}</b> <ChevronDown size={16} className="muted" />
      </button>
      {open && (
        <Sheet title="Your groups" onClose={() => setOpen(false)}>
          <div className="list">
            {groups.map((g) => (
              <button
                key={g.id}
                className="list-item"
                onClick={() => {
                  setGroupId(g.id)
                  setOpen(false)
                }}
              >
                <span className="grow">{g.name}</span>
                {g.id === group.id && <Check size={18} className="success" />}
              </button>
            ))}
            <button
              className="list-item"
              onClick={() => {
                setOpen(false)
                nav('/me/groups')
              }}
            >
              <span className="grow muted">Manage groups…</span>
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}
