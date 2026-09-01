import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tournamentService } from '../services/api'
import { useAuth } from '../context/AuthContext'

function CreateTournamentModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await tournamentService.create({ name, password })
      onCreated()
    } catch (err) {
      alert(`Error creating tournament: ${err.response?.data?.error || err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Create New Tournament</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password <span className="text-xs text-gray-500">(required to add results & view status)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TournamentCard({ tournament }) {
  const navigate = useNavigate()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleOpenTournament = async (e) => {
    e.preventDefault()
    try {
      const result = await tournamentService.verifyPassword(tournament.id, password)
      if (result.data.valid) {
        localStorage.setItem(`tournament_${tournament.id}`, 'true')
        localStorage.setItem(`tournament_token_${tournament.id}`, result.data.token)
        navigate(`/tournament/${tournament.id}`)
      }
    } catch (err) {
      setError('Invalid password')
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      'setup': 'bg-yellow-100 text-yellow-800',
      'round_robin': 'bg-blue-100 text-blue-800',
      'playoffs': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
          {getStatusBadge(tournament.status)}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Created: {new Date(tournament.created_at).toLocaleDateString()}
        </p>
        
        {showPasswordModal ? (
          <form onSubmit={handleOpenTournament}>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Access Tournament
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Open Tournament
          </button>
        )}
      </div>
    </div>
  )
}

function HomePage() {
  const { admin } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTournaments = async () => {
    try {
      const response = await tournamentService.getAll()
      setTournaments(response.data)
    } catch (err) {
      console.error('Error fetching tournaments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

  const handleTournamentCreated = () => {
    setShowCreateModal(false)
    fetchTournaments()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
        {admin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + New Tournament
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-2xl mb-2">🎱</p>
          <p className="text-lg">No tournaments yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first tournament to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTournamentCreated}
        />
      )}
    </div>
  )
}

export default HomePage
