import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ClosetPage from './pages/ClosetPage'
import OutfitsPage from './pages/OutfitsPage'
import BinsPage from './pages/BinsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/closet" replace />} />
        <Route path="closet" element={<ClosetPage />} />
        <Route path="outfits" element={<OutfitsPage />} />
        <Route path="bins" element={<BinsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/closet" replace />} />
      </Route>
    </Routes>
  )
}
