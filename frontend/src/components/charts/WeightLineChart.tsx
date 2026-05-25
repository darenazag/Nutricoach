import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import './charts.css'

interface WeightPoint {
  day: string
  weight: number
}

interface WeightLineChartProps {
  data: WeightPoint[]
}

export function WeightLineChart({ data }: WeightLineChartProps) {
  if (data.length === 0) return null

  const weights = data.map(d => d.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const padding = (max - min) * 1 || 0.5

  return (
    <div className="chart-card">
      <h3>Evolución semanal</h3>
      <p>Progreso de peso corporal en los últimos 7 días</p>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d8" />
            <XAxis dataKey="day" tick={{ fontSize: 13, fill: '#7a6b5a' }} />
            <YAxis
              domain={[min - padding, max + padding]}
              tick={{ fontSize: 12, fill: '#7a6b5a' }}
              tickFormatter={v => `${v}kg`}
            />
            <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#fea50a"
              strokeWidth={3}
              dot={{ r: 5, fill: '#fea50a', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
