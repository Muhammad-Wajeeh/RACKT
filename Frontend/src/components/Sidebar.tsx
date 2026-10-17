import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import './Sidebar.css'

type SidebarKey = 'closet' | 'outfits' | 'bins' | 'profile'

interface NavItem {
  key: SidebarKey
  label: string
  icon: ReactNode
}

const svgProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'closet',
    label: 'Closet',
    icon: (
      <svg {...svgProps}>
        <path d="M12 7.5a2.2 2.2 0 1 0-2.2-2.2" />
        <path d="M12 7.5v2L3 17a1.5 1.5 0 0 0 1 2.6h16a1.5 1.5 0 0 0 1-2.6l-9-7.5" />
      </svg>
    ),
  },
  {
    key: 'outfits',
    label: 'Outfits',
    icon: (
      <svg {...svgProps}>
        <path d="M12 6.5a2 2 0 1 0-2-2" />
        <path d="M12 6.5v2" />
        <path d="M12 8.5 4 13l2 3 2-1v5h8v-5l2 1 2-3-8-4.5Z" />
      </svg>
    ),
  },
  {
    key: 'bins',
    label: 'Bins',
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M4.5 8v11a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8" />
        <path d="M10 12.5h4" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20v-1a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v1Z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const itemCount = 20

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        RACK<span>T</span>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <NavLink
            key={key}
            to={`/${key}`}
            className={({ isActive }) =>
              `sidebar__item${isActive ? ' sidebar__item--active' : ''}`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <footer className="sidebar__footer">
        No. {itemCount} items catalogued
      </footer>
    </aside>
  )
}
