import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/queries'
import { Avatar, PageHead, Spinner } from '../components/ui'

const items = [
  { to: '/me/profile', icon: '👤', label: 'Profile', hint: 'Names and timezone' },
  { to: '/me/blackout', icon: '🌙', label: 'Blackout & sleep schedule', hint: 'When rankings rest' },
  { to: '/me/devices', icon: '📲', label: 'Devices & auto-sync', hint: 'Shortcut keys, manual logging' },
  { to: '/me/groups', icon: '👥', label: 'Groups', hint: 'Members, invites, roles' },
]

export function Me() {
  const profile = useProfile()
  if (!profile.data) return <div className="screen"><Spinner /></div>
  return (
    <div className="screen stack">
      <PageHead title="Me" />
      <div className="card row">
        <Avatar name={profile.data.display_name} />
        <div className="grow">
          <b>{profile.data.display_name}</b>
          <p className="muted small">{profile.data.full_name ?? 'Add your name in Profile'}</p>
        </div>
      </div>
      <div className="card">
        <div className="list">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="list-item">
              <span style={{ fontSize: 22 }}>{i.icon}</span>
              <div className="grow">
                <b>{i.label}</b>
                <p className="muted small">{i.hint}</p>
              </div>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      </div>
      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
      <p className="muted small center">Legity League · v0.1</p>
    </div>
  )
}
