import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tournamentService, playerService, setActiveTournament } from '../services/api'
import { useAuth } from '../context/AuthContext'
import StandingsTable from '../components/StandingsTable'
import MatchCard from '../components/MatchCard'
import PlayerSelector from '../components/PlayerSelector'
import PerformanceChart from '../components/PerformanceChart'

function UnlockModal({ onClose, onUnlocked }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onUnlocked(password)
    } catch (err) {
      setError(err.response?.status === 401 ? 'Invalid password' : (err.response?.data?.error || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Unlock to add results</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
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
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TournamentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { admin } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [tournamentPlayers, setTournamentPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // A user can edit results if they're an admin, or if they hold a valid
  // tournament token for this tournament (obtained via the tournament password).
  const hasTournamentToken = localStorage.getItem(`tournament_token_${id}`)
  const canEdit = !!admin || !!hasTournamentToken

  useEffect(() => {
    setActiveTournament(id)
    fetchTournamentData()
    return () => setActiveTournament(null)
  }, [id])

  const fetchTournamentData = async () => {
    try {
      const [tournamentData, playersData, tournamentPlayersData, matchesData, standingsData] = await Promise.all([
        tournamentService.getById(id),
        playerService.getAll(),
        tournamentService.getPlayers(id),
        tournamentService.getMatches(id),
        tournamentService.getStandings(id),
      ])
      setTournament(tournamentData.data)
      setPlayers(playersData.data)
      setTournamentPlayers(tournamentPlayersData.data)
      setMatches(matchesData.data)
      setStandings(standingsData.data)
    } catch (err) {
      if (err.response?.status === 404) {
        navigate('/')
        return
      }
      console.error('Error fetching tournament data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async (password) => {
    const result = await tournamentService.verifyPassword(id, password)
    if (result.data.valid) {
      localStorage.setItem(`tournament_token_${id}`, result.data.token)
      setShowUnlockModal(false)
    } else {
      throw new Error('Invalid password')
    }
  }

  const handleAddPlayers = async (selectedPlayerIds) => {
    try {
      await tournamentService.addPlayers(id, selectedPlayerIds)
      setShowPlayerSelector(false)
      fetchTournamentData()
    } catch (err) {
      alert(`Error adding players: ${err.response?.data?.error || err.message}`)
    }
  }

  const handleStartTournament = async () => {
    if (window.confirm('Start the tournament? This will randomize matches between all players.')) {
      try {
        await tournamentService.start(id)
        fetchTournamentData()
      } catch (err) {
        alert(`Error starting tournament: ${err.response?.data?.error || err.message}`)
      }
    }
  }

  const handleStartPlayoffs = async () => {
    if (window.confirm('Start playoffs with the top 8 players?')) {
      try {
        await tournamentService.startPlayoffs(id)
        fetchTournamentData()
      } catch (err) {
        alert(`Error starting playoffs: ${err.response?.data?.error || err.message}`)
      }
    }
  }

  const handleDataChanged = () => {
    fetchTournamentData()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!tournament) {
    return <div>Tournament not found</div>
  }

  // Check if all round-robin matches are completed
  const roundRobinMatches = matches.filter(m => m.round === 'round_robin')
  const allRoundRobinComplete = roundRobinMatches.length > 0 && roundRobinMatches.every(m => m.status === 'completed')

  // Group round-robin matches into rounds (each round every player plays once)
  const roundRobinByRound = roundRobinMatches.reduce((byRound, match) => {
    const r = match.round_number || 1
    if (!byRound[r]) byRound[r] = []
    byRound[r].push(match)
    return byRound
  }, {})
  const roundRobinRounds = Object.entries(roundRobinByRound)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
  const currentRound = roundRobinRounds.find(([, rm]) => !rm.every(m => m.status === 'completed'))?.[0] ?? null

  // Show player selector if in setup phase
  const showPlayerSetup = tournament.status === 'setup'

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
          <span className="text-sm text-gray-500">
            Status: {tournament.status === 'setup' ? 'Setup - Adding Players' : tournament.status === 'round_robin' ? 'Round Robin In Progress' : tournament.status === 'playoffs' ? 'Playoffs In Progress' : 'Completed'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {!canEdit && (
            <button
              onClick={() => setShowUnlockModal(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              title="Enter the tournament password to add results"
            >
              Unlock to Add Results
            </button>
          )}
          {canEdit && tournament.status === 'setup' && (
            <>
              <button
                onClick={() => setShowPlayerSelector(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Players
              </button>
              {tournamentPlayers.length >= 2 && (
                <button
                  onClick={handleStartTournament}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Start Tournament
                </button>
              )}
            </>
          )}
          {canEdit && allRoundRobinComplete && tournament.status === 'round_robin' && (
            <button
              onClick={handleStartPlayoffs}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Start Playoffs
            </button>
          )}
        </div>
      </div>

      {showPlayerSetup && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Selected Players</h2>
          <div className="bg-white rounded-lg shadow p-4">
            {tournamentPlayers.length === 0 ? (
              <p className="text-gray-500">No players selected yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tournamentPlayers.map((player) => (
                  <span
                    key={player.id}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPlayerSelector && (
        <PlayerSelector
          players={players}
          selectedPlayerIds={tournamentPlayers.map(p => p.id)}
          onAdd={handleAddPlayers}
          onClose={() => setShowPlayerSelector(false)}
        />
      )}

      {showUnlockModal && (
        <UnlockModal
          onClose={() => setShowUnlockModal(false)}
          onUnlocked={handleUnlock}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Standings</h2>
          <StandingsTable standings={standings} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Performance Trend</h2>
          <PerformanceChart standings={standings} />
        </div>
      </div>

      {tournament.status !== 'setup' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {tournament.status === 'playoffs' ? 'Playoff Matches' : 'Round Robin Matches'}
          </h2>
          {matches.length === 0 ? (
            <p className="text-gray-500">No matches yet</p>
          ) : (
            <div>
              {tournament.status === 'playoffs' && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Quarter Finals</h3>
                    <div className="flex flex-wrap gap-4">
                      {matches.filter(m => m.round === 'quarter_final').map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isCurrentRound
                          canEdit={canEdit}
                          onDataChanged={handleDataChanged}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Semi Finals</h3>
                    <div className="flex flex-wrap gap-4">
                      {matches.filter(m => m.round === 'semi_final').map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isCurrentRound
                          canEdit={canEdit}
                          onDataChanged={handleDataChanged}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Final</h3>
                    <div className="flex flex-wrap gap-4">
                      {matches.filter(m => m.round === 'final').map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isCurrentRound
                          canEdit={canEdit}
                          onDataChanged={handleDataChanged}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              {tournament.status === 'completed' && matches.some(m => m.round === 'final' && m.status === 'completed') && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-green-800 mb-2">🏆 Tournament Champion</h3>
                  <p className="text-green-700 text-xl font-semibold">
                    {matches.find(m => m.round === 'final' && m.status === 'completed').winner_name}
                  </p>
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                {tournament.status === 'playoffs' || tournament.status === 'completed' ? 'Round Robin Results' : 'Round Robin'}
              </h3>
              <div className="space-y-6">
                {roundRobinRounds.length === 0 ? (
                  <p className="text-gray-500">No matches yet</p>
                ) : (
                  roundRobinRounds.map(([round, roundMatches]) => {
                    const allComplete = roundMatches.every(m => m.status === 'completed')
                    return (
                      <div key={round}>
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-semibold text-gray-800 text-base">Round {round}</h4>
                          {allComplete ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              In Progress
                            </span>
                          )}
                        </div>
                        <div className={`flex flex-wrap gap-4 ${round === currentRound ? '' : 'opacity-70'}`}>
                          {roundMatches.map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              isCurrentRound={round === currentRound}
                              canEdit={canEdit}
                              onDataChanged={handleDataChanged}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TournamentPage
