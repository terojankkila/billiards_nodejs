import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import HomePage from './pages/HomePage'
import TournamentPage from './pages/TournamentPage'
import PlayerPage from './pages/PlayerPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'

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
  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">🎱 Billiard Tournament Manager</Link>
        <div className="flex items-center space-x-4">
          <NavLink to="/" className="hover:text-gray-300">Home</NavLink>
          <NavLink to="/players" className="hover:text-gray-300">Performance</NavLink>
          {admin ? (
            <>
              <NavLink to="/admin" className="hover:text-gray-300">Admin Panel</NavLink>
              <span className="text-gray-300 text-sm">{admin.username}</span>
              <button onClick={logout} className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm">
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
              Admin Login
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