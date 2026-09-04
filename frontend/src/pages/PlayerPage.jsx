import { useState, useEffect } from 'react'
import { playerService } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts'

function AllPlayersStats({ stats, onSelectPlayer }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">All Players</h2>
      {stats.length === 0 ? (
        <p className="text-gray-500">No player data yet</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Played</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Won</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Match Win %</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Won</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Lost</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frame Win %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.map((s, i) => (
                <tr
                  key={s.id}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => onSelectPlayer(String(s.id))}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{s.matches_played}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center font-medium">{s.matches_won}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${s.match_win_pct >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.match_win_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{s.frames_won}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{s.frames_lost}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className={`font-medium ${s.frame_win_pct >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                      {s.frame_win_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PlayerPage() {
  const [players, setPlayers] = useState([])
  const [allStats, setAllStats] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerStats, setPlayerStats] = useState([])

  useEffect(() => {
    fetchAllStats()
  }, [])

  const fetchAllStats = async () => {
    try {
      const [allStatsRes, playersRes] = await Promise.all([
        playerService.getAllStats(),
        playerService.getAll(),
      ])
      setAllStats(allStatsRes.data)
      setPlayers(playersRes.data)
    } catch (err) {
      console.error('Error fetching player stats:', err)
    }
  }

  const handleSelectPlayer = async (playerId) => {
    if (!playerId) {
      setSelectedPlayer(null)
      setPlayerStats([])
      return
    }
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

  const selectedPlayerName = players.find(p => String(p.id) === String(selectedPlayer))?.name

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Player Statistics</h1>

      <AllPlayersStats stats={allStats} onSelectPlayer={handleSelectPlayer} />

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Player for Tournament Detail
        </label>
        <select
          onChange={(e) => handleSelectPlayer(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedPlayer || ''}
        >
          <option value="">Choose a player...</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>
      </div>

      {selectedPlayer && playerStats.length > 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              {selectedPlayerName} &mdash; Per-Tournament Breakdown
            </h2>
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
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tournament History</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournament</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Played</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Matches Won</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Won</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Lost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStats.map((tournament) => (
                    <tr key={tournament.tournament_id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{tournament.tournament_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{tournament.matches_played}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{tournament.matches_won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{tournament.frames_won}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{tournament.frames_lost}</td>
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
