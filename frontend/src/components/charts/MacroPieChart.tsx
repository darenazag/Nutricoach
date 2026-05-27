import { useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import './charts.css'

const COLORS = ['#2196f3', '#9c27b0', '#ff5722']

interface MacroItem {
  name: string
  consumed: number
  goal: number
  color: string
}

interface MacroPieChartProps {
  data: MacroItem[]
}

export function MacroPieChart({ data }: MacroPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + d.consumed, 0)

  const pieData = data.map(d => ({ name: d.name, value: d.consumed }))

  return (
    <div className="pcm-wrap">
      <div className="pcm-chart">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[index % COLORS.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.25}
                  style={{
                    transition: 'opacity 0.25s, transform 0.25s',
                    cursor: 'pointer',
                    transformOrigin: 'center center',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {total > 0 && (
          <div className="pcm-center-label">
            <span className="pcm-center-total">{total}</span>
            <span className="pcm-center-unit">g</span>
          </div>
        )}
      </div>

      <div className="pcm-legend">
        {data.map((item, i) => {
          const isActive = activeIndex === null || activeIndex === i
          const pct = total > 0 ? Math.round((item.consumed / total) * 100) : 0
          const pctGoal = item.goal > 0 ? Math.round((item.consumed / item.goal) * 100) : 0

          return (
            <div
              key={item.name}
              className={`pcm-item ${activeIndex === i ? 'pcm-item--active' : ''} ${activeIndex !== null && activeIndex !== i ? 'pcm-item--dim' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              role="button"
              tabIndex={0}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
            >
              <span className="pcm-item-dot" style={{ background: item.color, opacity: isActive ? 1 : 0.35 }} />
              <div className="pcm-item-body">
                <div className="pcm-item-row">
                  <span className="pcm-item-name" style={{ opacity: isActive ? 1 : 0.5 }}>{item.name}</span>
                  <span className="pcm-item-grams">
                    <span className="pcm-item-consumed">{item.consumed}</span>
                    <span className="pcm-item-sep"> / </span>
                    <span className="pcm-item-goal">{item.goal} g</span>
                  </span>
                </div>
                <div className="pcm-item-sub">
                  <span className="pcm-item-pct">{pct}% del total</span>
                  <span className="pcm-item-pct-goal">{pctGoal}% de la meta</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
