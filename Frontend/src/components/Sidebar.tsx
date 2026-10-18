import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined'
import CheckroomOutlined from '@mui/icons-material/CheckroomOutlined'
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import DryCleaningOutlined from '@mui/icons-material/DryCleaningOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined'
import { useClosetCount } from '../layouts/ClosetCount'
import { useTheme } from '../lib/theme'
import './Sidebar.css'


type SidebarKey = 'closet' | 'outfits' | 'bins' | 'categories' | 'profile'

interface NavItem {
  key: SidebarKey
  label: string
  icon: ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { key: 'closet', label: 'Closet', icon: <CheckroomOutlined fontSize="small" /> },
  { key: 'outfits', label: 'Outfits', icon: <DryCleaningOutlined fontSize="small" /> },
  { key: 'bins', label: 'Bins', icon: <Inventory2Outlined fontSize="small" /> },
  { key: 'categories', label: 'Categories', icon: <AccountTreeOutlined fontSize="small" /> },
  { key: 'profile', label: 'Profile', icon: <PersonOutlineOutlined fontSize="small" /> },
]

export default function Sidebar() {
  const { count } = useClosetCount()
  const { resolved, setPreference } = useTheme()

  return (
    <aside className="sidebar">
      <div className="sidebar__head">
        <div className="sidebar__logo">
          RACK<span>T</span>
        </div>
        <button
          type="button"
          className="sidebar__theme"
          aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
          onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
        >
          {resolved === 'dark' ? (
            <LightModeOutlined sx={{ fontSize: 18 }} />
          ) : (
            <DarkModeOutlined sx={{ fontSize: 18 }} />
          )}
        </button>
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
        No. {count ?? '—'} {count === 1 ? 'item' : 'items'} catalogued
      </footer>
    </aside>
  )
}
