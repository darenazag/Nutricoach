import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import './charts.css'

interface CaloriesBarChartProps {
  consumed: number
  goal: number
}

export function CaloriesBarChart({ consumed, goal }: CaloriesBarChartProps) {
  const data = [
    { name: 'Consumidas', value: consumed },
    { name: 'Objetivo', value: goal },
  ]

  return (
    <div className="chart-card">
      <h3>Calorías de hoy</h3>
      <p>Comparación entre registradas y objetivo diario</p>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d8" />
            <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#7a6b5a' }} />
            <YAxis tick={{ fontSize: 12, fill: '#7a6b5a' }} />
            <Tooltip />
            <Bar
              dataKey="value"
              fill="#fea50a"
              radius={[8, 8, 0, 0]}
              label={{ position: 'top', fontSize: 13, fontWeight: 700, fill: '#3d2c1a' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
