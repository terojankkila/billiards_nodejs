import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

function PerformanceChart({ standings }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const chartData = standings.map(player => ({
    name: player.name,
    frames_won: parseInt(player.frames_won),
    matches_won: parseInt(player.matches_won),
    total_points: player.total_points,
  }))

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="frames_won" fill="#3B82F6" name="Frames Won" />
          <Bar dataKey="matches_won" fill="#10B981" name="Match Wins" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PerformanceChart