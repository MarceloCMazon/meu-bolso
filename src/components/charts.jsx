import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { IN_COLOR, LINE_INVESTED, LINE_VALUE, OUT_COLOR } from '../lib/constants'
import { brl, isHidden } from '../lib/format'

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  color: 'var(--ink)',
  fontSize: 15,
}

const compact = (v) => {
  if (isHidden()) return '•••'
  return v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : String(v)
}


export function Donut({ slices, centerLabel, centerValue, ariaLabel }) {
  return (
    <div className="donut" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer key={isHidden() ? 'oculto' : 'visivel'}width="100%" height={220}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="94%"
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span>{centerLabel}</span>
        <strong>{centerValue}</strong>
      </div>
    </div>
  )
}

export function MonthlyBars({ data, ariaLabel }) {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer key={isHidden() ? 'oculto' : 'visivel'}width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.18} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 14 }}
          />
          <YAxis
            width={60}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 13 }}
            tickFormatter={compact}
          />
          <Tooltip
            cursor={{ fill: 'currentColor', fillOpacity: 0.08 }}
            formatter={(v) => brl(v)}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="Entrou" fill={IN_COLOR} radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Saiu" fill={OUT_COLOR} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Uma linha só: crescimento do patrimônio. */
export function NetWorthLine({ data, ariaLabel }) {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer key={isHidden() ? 'oculto' : 'visivel'}width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.18} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 14 }} />
          <YAxis
            width={60}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 13 }}
            tickFormatter={compact}
          />
          <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="Patrimônio"
            stroke="#1F8A84"
            strokeWidth={3.5}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Simulador: quanto foi guardado e quanto vira com o rendimento. */
export function GrowthChart({ data, ariaLabel }) {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer key={isHidden() ? 'oculto' : 'visivel'}width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.18} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 13 }} />
          <YAxis
            width={60}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 13 }}
            tickFormatter={compact}
          />
          <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="Você guardou"
            stroke="#7F95A0"
            strokeWidth={3}
            strokeDasharray="6 5"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Com rendimento"
            stroke="#1F8A84"
            strokeWidth={3.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


export function EvolutionLines({ data, ariaLabel }) {
  return (
    <div className="chart" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer key={isHidden() ? 'oculto' : 'visivel'}width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.18} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 14 }}
          />
          <YAxis
            width={60}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 13 }}
            tickFormatter={compact}
          />
          <Tooltip formatter={(v) => brl(v)} contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="Investido"
            stroke={LINE_INVESTED}
            strokeWidth={3}
            strokeDasharray="6 5"
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="Valor hoje"
            stroke={LINE_VALUE}
            strokeWidth={3.5}
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
