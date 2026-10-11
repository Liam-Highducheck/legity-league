import { NavLink } from 'react-router-dom'
import { ChartColumn, Moon, Trophy, User } from 'lucide-react'

const tabs = [
  { to: '/today', label: 'Today', Icon: Moon },
  { to: '/league', label: 'League', Icon: Trophy },
  { to: '/trends', label: 'Trends', Icon: ChartColumn },
  { to: '/me', label: 'Me', Icon: User },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <Icon size={24} strokeWidth={1.9} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
