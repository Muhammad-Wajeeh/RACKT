import { useEffect, useState, type ReactNode } from 'react'
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined'
import { useAuth } from '../auth/AuthContext'
import EditProfileModal from '../components/EditProfileModal'
import PageHeader from '../components/PageHeader'
import { exportClosetCsv } from '../lib/exportCloset'
import { fetchProfileStats, type ProfileStats } from '../lib/stats'
import { supabase } from '../lib/supabase'
import { useImageUrls } from '../lib/useImageUrls'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [editing, setEditing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)

  useEffect(() => {
    fetchProfileStats()
      .then(setStats)
      .catch(() => {}) // the stats just stay as dashes
  }, [])

  const meta = user?.user_metadata
  const name: string = meta?.display_name ?? meta?.full_name ?? meta?.name ?? 'Your name'
  const avatarPath: string | undefined = meta?.avatar_path ?? undefined
  const urls = useImageUrls([avatarPath])
  // An uploaded picture wins; Google sign-ins also bring their own.
  const avatarUrl: string | null = avatarPath
    ? (urls[avatarPath] ?? null)
    : (meta?.avatar_url ?? meta?.picture ?? null)

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null

  async function handleExport() {
    setExporting(true)
    setNotice(null)
    try {
      const count = await exportClosetCsv()
      setNotice({ text: `Exported ${count} ${count === 1 ? 'piece' : 'pieces'}.` })
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : 'Could not export your closet.',
        error: true,
      })
    } finally {
      setExporting(false)
    }
  }

  const statTiles: { value: string; label: string }[] = [
    { value: stats ? String(stats.pieces) : '—', label: 'Pieces' },
    { value: stats ? String(stats.outfits) : '—', label: 'Looks' },
    {
      value: stats?.avgCostPerWear != null ? `$${stats.avgCostPerWear.toFixed(2)}` : '—',
      label: 'Avg / wear',
    },
  ]

  const rows: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }[] = [
    {
      label: 'Edit profile',
      icon: <EditOutlined sx={{ fontSize: 16 }} />,
      onClick: () => setEditing(true),
    },
    {
      label: exporting ? 'Exporting…' : 'Export my closet (CSV)',
      icon: <FileDownloadOutlined sx={{ fontSize: 16 }} />,
      onClick: handleExport,
      disabled: exporting,
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow={memberSince ? `Member since ${memberSince}` : 'Your account'}
        title="Profile"
      >
        <button type="button" className="btn profile-edit" onClick={() => setEditing(true)}>
          <EditOutlined sx={{ fontSize: 16 }} />
          EDIT PROFILE
        </button>
      </PageHeader>

      <div className="profile-scroll">
        <div className="profile">
          <div className="profile__identity">
            <button
              type="button"
              className={`profile__photo${avatarUrl ? ' profile__photo--filled' : ''}`}
              onClick={() => setEditing(true)}
              aria-label="Change profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                <PersonOutlineOutlined sx={{ fontSize: 34 }} />
              )}
            </button>
            <div>
              <h2>{name}</h2>
              <p>{user?.email}</p>
            </div>
          </div>

          <div className="profile__stats">
            {statTiles.map((s) => (
              <div key={s.label} className="profile__stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <h3 className="profile__section">Account</h3>
          <ul className="profile__rows">
            {rows.map((r) => (
              <li key={r.label}>
                <button type="button" onClick={r.onClick} disabled={r.disabled}>
                  {r.icon}
                  <span>{r.label}</span>
                  <ChevronRightOutlined className="profile__chevron" sx={{ fontSize: 16 }} />
                </button>
              </li>
            ))}
          </ul>

          {notice && (
            <p className={`profile__notice${notice.error ? ' profile__notice--error' : ''}`}>
              {notice.text}
            </p>
          )}

          <button
            type="button"
            className="btn profile__signout"
            onClick={() => supabase.auth.signOut()}
          >
            <LogoutOutlined sx={{ fontSize: 16 }} />
            SIGN OUT
          </button>
        </div>
      </div>

      {editing && (
        <EditProfileModal
          name={name === 'Your name' ? '' : name}
          email={user?.email}
          avatarUrl={avatarUrl}
          avatarPath={avatarPath}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
