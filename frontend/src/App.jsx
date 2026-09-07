import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './context/AuthContext'
import HomePage from './pages/HomePage'
import TournamentPage from './pages/TournamentPage'
import PlayerPage from './pages/PlayerPage'
import RulesPage from './pages/RulesPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import { setLanguage } from './i18n'

function RequireAdmin({ children }) {
  const { admin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  if (!admin) return <Navigate to="/login" replace />
  return children
}

function Nav() {
  const { admin, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const currentLng = i18n.language === 'fi' ? 'fi' : 'en'
  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">{t('app.title')}</Link>
        <div className="flex items-center space-x-4">
          <NavLink to="/" className="hover:text-gray-300">{t('app.home')}</NavLink>
          <NavLink to="/players" className="hover:text-gray-300">{t('app.performance')}</NavLink>
          <NavLink to="/rules" className="hover:text-gray-300">{t('app.rules')}</NavLink>
          <span className="text-gray-400 text-sm">•</span>
          <button
            onClick={() => setLanguage(currentLng === 'fi' ? 'en' : 'fi')}
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
          >
            {currentLng === 'fi' ? 'EN' : 'FI'}
          </button>
          {admin ? (
            <>
              <NavLink to="/admin" className="hover:text-gray-300">{t('app.adminPanel')}</NavLink>
              <span className="text-gray-300 text-sm">{admin.username}</span>
              <button onClick={logout} className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm">
                {t('app.logout')}
              </button>
            </>
          ) : (
            <NavLink to="/login" className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
              {t('app.adminLogin')}
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tournament/:id" element={<TournamentPage />} />
          <Route path="/players" element={<PlayerPage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App