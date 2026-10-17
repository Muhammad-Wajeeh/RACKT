import type { ReactNode } from 'react'
import PageHeader from '../components/PageHeader'
import './ProfilePage.css'

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const PencilIcon = (
  <svg {...iconProps}>
    <path d="m4 20 1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1Z" />
    <path d="m14 7 3 3" />
  </svg>
)

interface Row {
  label: string
  icon: ReactNode
}

const STATS = [
  { value: '20', label: 'Pieces' },
  { value: '6', label: 'Looks' },
  { value: '$0.42', label: 'Avg / wear' },
]

const ROWS: Row[] = [
  { label: 'Edit profile', icon: PencilIcon },
  {
    label: 'Measurements & sizing',
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="8" width="20" height="8" rx="1" />
        <path d="M6 8v3M10 8v3M14 8v3M18 8v3" />
      </svg>
    ),
  },
  {
    label: 'Export my closet',
    icon: (
      <svg {...iconProps}>
        <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
      </svg>
    ),
  },
  {
    label: 'Privacy & data',
    icon: (
      <svg {...iconProps}>
        <rect x="5" y="11" width="14" height="9" rx="1.5" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  return (
    <>
      <PageHeader eyebrow="Member since 2024" title="Profile">
        <button type="button" className="btn profile-edit">
          {PencilIcon}
          EDIT PROFILE
        </button>
      </PageHeader>

      <div className="profile-scroll">
        <div className="profile">
          <div className="profile__identity">
            <div className="profile__photo">
              <span>Photo</span>
              <small>
                or <u>browse files</u>
              </small>
            </div>
            <div>
              <h2>Jane Doe</h2>
              <p>jane@email.com</p>
            </div>
          </div>

          <div className="profile__stats">
            {STATS.map((s) => (
              <div key={s.label} className="profile__stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <h3 className="profile__section">Account</h3>
          <ul className="profile__rows">
            {ROWS.map((r) => (
              <li key={r.label}>
                <button type="button">
                  {r.icon}
                  <span>{r.label}</span>
                  <svg {...iconProps} width={14} height={14} className="profile__chevron">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="btn profile__signout">
            <svg {...iconProps}>
              <path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 8l4 4-4 4M18 12H9" />
            </svg>
            SIGN OUT
          </button>
        </div>
      </div>
    </>
  )
}
