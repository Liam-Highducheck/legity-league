import { LogOut, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '@legity/data/queries'
import { PageHead } from '../components/ui'

export function Account() {
  const profile = useProfile()
  return (
    <div className="screen stack">
      <PageHead title="Account" back />
      <p className="muted">Signed in as <b style={{ color: 'var(--text)' }}>{profile.data?.display_name ?? '…'}</b>.</p>
      <button className="btn secondary" onClick={() => supabase.auth.signOut()}>
        <LogOut size={18} /> Sign out
      </button>
      <div className="card stack" style={{ marginTop: 16 }}>
        <h2>Danger zone</h2>
        <p className="muted">Deleting your account permanently removes your profile, your sleep data and your place in every group.</p>
        <button
          className="btn danger"
          onClick={async () => {
            if (!window.confirm('Delete your account? This permanently deletes your account and all of your sleep data. It can’t be undone.')) return
            const { error } = await supabase.rpc('delete_my_account')
            if (error) return window.alert(error.message)
            await supabase.auth.signOut({ scope: 'local' })
          }}
        >
          <Trash2 size={18} /> Delete account
        </button>
      </div>
    </div>
  )
}
