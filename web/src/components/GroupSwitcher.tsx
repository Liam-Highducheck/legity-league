import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useGroup } from '../hooks/group'

const MANAGE = '__manage'

export function GroupSwitcher() {
  const { groups, group, setGroupId } = useGroup()
  const nav = useNavigate()
  if (!group) return null
  return (
    <label className="chip chip-select">
      <b>{group.name}</b> <ChevronDown size={16} className="muted" />
      <select
        aria-label="Switch group"
        value={group.id}
        onChange={(e) => {
          if (e.target.value === MANAGE) nav('/me/groups')
          else setGroupId(e.target.value)
        }}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
        <option value={MANAGE}>Manage groups…</option>
      </select>
    </label>
  )
}
