import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

export interface TrendPoint {
  scanId: string
  scannedAt: string
  score: number
  scanMode: string
}

interface ScoreTrendChartProps {
  points: TrendPoint[]
}

interface TooltipPayload {
  value: number
  payload: TrendPoint
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }): JSX.Element | null {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={tooltipStyles.box}>
      <div style={tooltipStyles.score}>{p.value}</div>
      <div style={tooltipStyles.label}>score</div>
      <div style={tooltipStyles.date}>
        {format(new Date(p.payload.scannedAt), 'MMM d, yyyy')}
      </div>
      <div style={tooltipStyles.mode}>{p.payload.scanMode} scan</div>
    </div>
  )
}

export function ScoreTrendChart({ points }: ScoreTrendChartProps): JSX.Element {
  if (points.length === 0) {
    return <div style={emptyStyle}>No scan data</div>
  }

  const data = points.map((p) => ({
    ...p,
    displayDate: format(new Date(p.scannedAt), 'MMM d'),
  }))

  // Score zone bands via reference lines
  const yTicks = [0, 20, 40, 60, 80, 100]

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="displayDate"
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={yTicks}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine y={80} stroke="rgba(34,197,94,0.2)" strokeDasharray="4 4" />
        <ReferenceLine y={60} stroke="rgba(234,179,8,0.2)" strokeDasharray="4 4" />
        <ReferenceLine y={40} stroke="rgba(249,115,22,0.2)" strokeDasharray="4 4" />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-brand)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--color-brand)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'var(--color-brand)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

const emptyStyle: React.CSSProperties = {
  height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, color: 'var(--color-text-muted)',
}

const tooltipStyles: Record<string, React.CSSProperties> = {
  box: {
    backgroundColor: 'var(--color-bg-raised)',
    border: '1px solid var(--color-border)',
    borderRadius: 8, padding: '8px 12px',
    textAlign: 'center',
  },
  score: { fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' },
  label: { fontSize: 10, color: 'var(--color-text-muted)', marginTop: -2 },
  date: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 },
  mode: { fontSize: 11, color: 'var(--color-text-muted)' },
}
