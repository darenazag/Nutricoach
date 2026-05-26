import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import './charts.css'

interface CaloriesBarChartProps {
  consumed: number
  goal: number
  protein?: number
  carbs?: number
  fat?: number
}

function CustomTooltip({
  active,
  payload,
  label,
  protein,
  carbs,
  fat,
}: {
  active: boolean
  payload: { dataKey: string; value: number }[]
  label: string
  protein: number
  carbs: number
  fat: number
}) {
  if (!active || !payload?.length) return null

  const consumedItem = payload.find(p => p.dataKey === 'consumed')
  const goalItem = payload.find(p => p.dataKey === 'goal')

  return (
    <div className="chart-tooltip bg-white dark:bg-slate-800 border border-[#f0e6d8] dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 min-w-[170px]">
      <p className="text-[13px] font-bold text-[#3d2c1a] dark:text-slate-100 mb-2">{label}</p>
      {consumedItem && (
        <div className="flex items-center justify-between gap-4 text-[13px]">
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ background: consumedItem.value > (goalItem?.value ?? 0) ? 'var(--color-error)' : 'var(--color-success)' }}
            />
            <span className="text-[#7a6b5a] dark:text-slate-400">Consumidas</span>
          </span>
          <span className="font-bold text-[#3d2c1a] dark:text-slate-100">{consumedItem.value.toLocaleString()} kcal</span>
        </div>
      )}
      {goalItem && (
        <div className="flex items-center justify-between gap-4 text-[13px] mt-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'var(--color-primary)' }} />
            <span className="text-[#7a6b5a] dark:text-slate-400">Objetivo</span>
          </span>
          <span className="font-bold text-[#3d2c1a] dark:text-slate-100">{goalItem.value.toLocaleString()} kcal</span>
        </div>
      )}
      <div className="border-t border-[#f0e6d8] dark:border-slate-700 mt-2 pt-2 space-y-1">
        <p className="text-[11px] font-semibold text-[#7a6b5a] dark:text-slate-400 uppercase tracking-wider">Macros</p>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#7a6b5a] dark:text-slate-400">Proteína</span>
          <span className="font-semibold text-[#3d2c1a] dark:text-slate-100">{protein.toFixed(1)}g</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#7a6b5a] dark:text-slate-400">Carbohidratos</span>
          <span className="font-semibold text-[#3d2c1a] dark:text-slate-100">{carbs.toFixed(1)}g</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#7a6b5a] dark:text-slate-400">Grasas</span>
          <span className="font-semibold text-[#3d2c1a] dark:text-slate-100">{fat.toFixed(1)}g</span>
        </div>
      </div>
    </div>
  )
}

export function CaloriesBarChart({ consumed, goal, protein = 0, carbs = 0, fat = 0 }: CaloriesBarChartProps) {
  const isOverGoal = consumed > goal
  const consumedColor = isOverGoal ? 'var(--color-error)' : 'var(--color-success)'

  const remaining = Math.abs(goal - consumed)
  const pct = goal > 0 ? Math.round((consumed / goal) * 100) : 0

  const data = useMemo(() => [{ name: 'Hoy', consumed, goal }], [consumed, goal])

  const maxValue = Math.max(consumed, goal)
  const yMax = Math.ceil(maxValue * 1.25 / 100) * 100

  const barSize = useMemo(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 480) return 50
    return 64
  }, [])

  return (
    <div className="chart-card">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔥</span>
        <h3 className="!m-0">Calorías de hoy</h3>
      </div>
      <p className="!mb-4">Comparación entre registradas y objetivo diario</p>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barSize={barSize}
            barGap={12}
            margin={{ top: 28, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: 'var(--color-text-light)', fontWeight: 600 }}
              axisLine={{ stroke: 'var(--color-border)', strokeOpacity: 0.5 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fontSize: 12, fill: 'var(--color-text-light)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={
                <CustomTooltip
                  active={false}
                  payload={[]}
                  label=""
                  protein={protein}
                  carbs={carbs}
                  fat={fat}
                />
              }
              cursor={{ fill: 'rgba(254, 165, 10, 0.04)' }}
            />
            <Bar
              dataKey="consumed"
              fill={consumedColor}
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationBegin={0}
              label={{
                position: 'top',
                offset: 4,
                fontSize: 13,
                fontWeight: 700,
                fill: 'var(--color-text-light)',
                formatter: (v: number) => `${v.toLocaleString()} ${v === 1 ? 'kcal' : 'kcal'}`,
              }}
            />
            <Bar
              dataKey="goal"
              fill="var(--color-primary)"
              fillOpacity={0.3}
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationBegin={150}
              label={{
                position: 'top',
                offset: 4,
                fontSize: 13,
                fontWeight: 700,
                fill: 'var(--color-text-light)',
                formatter: (v: number) => `${v.toLocaleString()} ${v === 1 ? 'kcal' : 'kcal'}`,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center mt-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
          isOverGoal
            ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
            : pct >= 90
              ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : pct >= 70
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
        }`}>
          {isOverGoal ? (
            <>
              <span className="text-lg">⚡</span>
              <span>
                Has superado tu objetivo en <strong>{remaining.toLocaleString()} kcal</strong>
                <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                  ({pct}% de la meta)
                </span>
              </span>
            </>
          ) : pct >= 90 ? (
            <>
              <span className="text-lg">🔥</span>
              <span>
                Te faltan <strong>{remaining.toLocaleString()} kcal</strong> para tu objetivo
                <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                  ({pct}% completado — ¡casi!)
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="text-lg">📊</span>
              <span>
                Te faltan <strong>{remaining.toLocaleString()} kcal</strong>
                ({pct}% completado)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
