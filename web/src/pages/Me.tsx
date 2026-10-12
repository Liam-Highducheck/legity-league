import { Link } from 'react-router-dom'
import { ChevronRight, Medal, Moon, Palette, Smartphone, User, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUserId } from '../hooks/auth'
import { useProfile } from '../hooks/queries'
import { memberPath } from '@legity/core/links'
import { Avatar, PageHead, Spinner } from '../components/ui'

const items = [
  { to: '/me/profile', Icon: User, label: 'Profile', hint: 'Names and timezone' },
  { to: '/me/blackout', Icon: Moon, label: 'Blackout & sleep schedule', hint: 'When rankings rest' },
  { to: '/me/appearance', Icon: Palette, label: 'Appearance', hint: 'Colour theme' },
  { to: '/me/devices', Icon: Smartphone, label: 'Devices & auto-sync', hint: 'Shortcut keys, manual logging' },
  { to: '/me/groups', Icon: Users, label: 'Groups', hint: 'Members, invites, roles' },
]

export function Me() {
  const profile = useProfile()
  const uid = useUserId()
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
      <Link to={memberPath(uid)} className="btn secondary">
        <Medal size={18} /> View my stats, podiums and records
      </Link>
      <div className="card flush">
        <div className="list">
          {items.map(({ Icon, ...i }) => (
            <Link key={i.to} to={i.to} className="list-item">
              <Icon size={22} color="var(--accent)" />
              <div className="grow">
                <b>{i.label}</b>
                <p className="muted small">{i.hint}</p>
              </div>
              <ChevronRight size={18} className="chev" />
            </Link>
          ))}
        </div>
      </div>
      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
      <p className="muted small center">Legity League · v0.1</p>
    </div>
  )
}
