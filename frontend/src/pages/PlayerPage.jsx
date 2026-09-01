import { useState, useEffect } from 'react'
import { playerService } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts'

function PlayerPage() {
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerStats, setPlayerStats] = useState([])

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const result = await playerService.getAll()
      setPlayers(result.data)
    } catch (err) {
      console.error('Error fetching players:', err)
    }
  }

  const handleSelectPlayer = async (playerId) => {
    try {
      const result = await playerService.getStats(playerId)
      setSelectedPlayer(playerId)
      setPlayerStats(result.data)
    } catch (err) {
      console.error('Error fetching player stats:', err)
    }
  }

  const chartData = playerStats.map(tournament => ({
    name: tournament.tournament_name,
    frames_won: parseInt(tournament.frames_won),
    matches_won: parseInt(tournament.matches_won),
    matches_played: parseInt(tournament.matches_played),
    frames_lost: parseInt(tournament.frames_lost),
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Player Performance</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Player
        </label>
        <select
          onChange={(e) => handleSelectPlayer(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          defaultValue=""
        >
          <option value="" disabled>Choose a player...</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Player Performance Across All Tournaments</h2>
            {playerStats.length === 0 ? (
              <p className="text-gray-500">No tournament data for this player</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Frames Won vs Lost</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="frames_won" fill="#3B82F6" name="Frames Won" />
                      <Bar dataKey="frames_lost" fill="#EF4444" name="Frames Lost" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Match Wins Over Time</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="matches_won" stroke="#10B981" name="Match Wins" />
                      <Line type="monotone" dataKey="matches_played" stroke="#3B82F6" name="Matches Played" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tournament History</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournament</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Played</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Won</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Won</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Lost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStats.map((tournament) => (
                    <tr key={tournament.tournament_id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{tournament.tournament_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{tournament.matches_played}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{tournament.matches_won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{tournament.frames_won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{tournament.frames_lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default PlayerPage