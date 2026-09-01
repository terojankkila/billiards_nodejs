function StandingsTable({ standings }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frames Won</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {standings.map((player) => (
            <tr key={player.player_id} className={player.rank <= 8 ? 'bg-green-50' : ''}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{player.rank}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{player.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{player.matches_won}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{player.frames_won}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">{player.total_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StandingsTable