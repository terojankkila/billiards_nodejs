import { useState } from 'react'
import { playerService } from '../services/api'

function PlayerSelector({ players, selectedPlayerIds, onAdd, onClose }) {
  const [selected, setSelected] = useState([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [allPlayers, setAllPlayers] = useState(players)

  const togglePlayer = (playerId) => {
    setSelected(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) return
    try {
      const result = await playerService.create({ name: newPlayerName.trim() })
      setAllPlayers(prev => [...prev, result.data])
      setSelected(prev => [...prev, result.data.id])
      setNewPlayerName('')
    } catch (err) {
      alert(`Error creating player: ${err.response?.data?.error || err.message}`)
    }
  }

  const handleAdd = () => {
    onAdd(selected)
  }

  const unselectedPlayers = allPlayers.filter(p => !selectedPlayerIds.includes(p.id))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[40rem] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900">Select Players</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Player</h4>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name..."
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreatePlayer}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              + Create
            </button>
          </div>
        </div>

        <h4 className="text-sm font-medium text-gray-700 mb-2">Select Existing Players</h4>
        <div className="space-y-2 mb-4">
          {unselectedPlayers.length === 0 ? (
            <p className="text-sm text-gray-500">No more players to add</p>
          ) : (
            unselectedPlayers.map((player) => (
              <label
                key={player.id}
                className="flex items-center p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-800">{player.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Players ({selected.length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlayerSelector