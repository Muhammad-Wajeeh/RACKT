import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { GuestOnly, RequireAuth } from './auth/RouteGuards'
import AppLayout from './layouts/AppLayout'
import AuthPage from './pages/AuthPage'
import ClosetPage from './pages/ClosetPage'
import PieceDetailPage from './pages/PieceDetailPage'
import OutfitsPage from './pages/OutfitsPage'
import BinsPage from './pages/BinsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="signup" element={<AuthPage mode="signup" />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/closet" replace />} />
            <Route path="closet" element={<ClosetPage />} />
            <Route path="closet/:id" element={<PieceDetailPage />} />
            <Route path="outfits" element={<OutfitsPage />} />
            <Route path="bins" element={<BinsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/closet" replace />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
