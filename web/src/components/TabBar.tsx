import { NavLink } from 'react-router-dom'

const icons = {
  today: <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" />,
  league: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  trends: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  me: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />,
}

const tabs = [
  { to: '/today', label: 'Today', icon: icons.today },
  { to: '/league', label: 'League', icon: icons.league },
  { to: '/trends', label: 'Trends', icon: icons.trends },
  { to: '/me', label: 'Me', icon: icons.me },
]

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      <div className="tabbar-inner">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
