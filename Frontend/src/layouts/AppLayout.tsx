import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { ClosetCountProvider } from './ClosetCount'
import './AppLayout.css'

export default function AppLayout() {
  return (
    <ClosetCountProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="app-layout__main">
          <Outlet />
        </main>
      </div>
    </ClosetCountProvider>
  )
}
