import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminService, authService } from '../services/api'

function ChangePassword({ onDone }) {
  const { admin, setAuthAdmin } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (next !== confirm) {
      setError('New passwords do not match')
      return
    }
    try {
      await authService.changePassword(current, next)
      setSuccess('Password updated')
      setCurrent('')
      setNext('')
      setConfirm('')
      setAuthAdmin({ ...admin, is_default: false })
      if (onDone) onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Change My Password</h2>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Update Password
        </button>
      </form>
    </div>
  )
}

function AdminManagement() {
  const { admin } = useAuth()
  const [admins, setAdmins] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const fetchAdmins = async () => {
    try {
      const res = await adminService.list()
      setAdmins(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admins')
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await adminService.create(username, password)
      setUsername('')
      setPassword('')
      setShowCreate(false)
      fetchAdmins()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this admin account?')) return
    try {
      await adminService.remove(id)
      fetchAdmins()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete admin')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Admin Users</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
        >
          + New Admin
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-4 p-4 border border-gray-200 rounded-md space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex space-x-2">
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              Create Admin
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !showCreate && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {admins.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {a.username} {a.id === admin?.id && <span className="text-gray-400">(you)</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {a.is_default ? (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Default</span>
                ) : (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Admin</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {new Date(a.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {a.id !== admin?.id && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminPage() {
  const { admin } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Admin Panel <span className="text-base font-normal text-gray-500">({admin?.username})</span>
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangePassword />
        <AdminManagement />
      </div>
    </div>
  )
}

export default AdminPage