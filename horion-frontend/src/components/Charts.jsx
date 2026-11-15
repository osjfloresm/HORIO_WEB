import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
} from 'recharts'
import { DataTable, Empty } from './ui'
export const metrics = {
  frecuencia_cardiaca: { label: 'Frecuencia cardíaca', unit: 'bpm', color: '#38BDF8' },
  spo2: { label: 'Saturación de oxígeno', unit: '%', color: '#10B981' },
  hrv: { label: 'Variabilidad cardíaca', unit: 'ms', color: '#A78BFA' },
  horas_sueno: { label: 'Horas de sueño', unit: 'h', color: '#F59E0B' },
}
const tooltipStyle = {
  background: '#0F1626',
  border: '1px solid #334155',
  borderRadius: 8,
  color: '#F1F5F9',
}
export function MetricChart({
  records,
  metric = 'frecuencia_cardiaca',
  publicData = false,
  aggregate = false,
}) {
  const config = metrics[metric]
  // Combining subjects must not imply a single person's continuous signal.
  const daily = new Map()
  if (aggregate) {
    for (const row of records) {
      const day = new Date(row.timestamp_utc).toISOString().slice(0, 10)
      const current = daily.get(day) || { total: 0, count: 0 }
      daily.set(day, { total: current.total + Number(row[metric]), count: current.count + 1 })
    }
  }
  const series = aggregate
    ? [...daily.entries()].map(([day, values]) => ({
        timestamp_utc: `${day}T00:00:00Z`,
        [metric]: Number((values.total / values.count).toFixed(2)),
      }))
    : records
  const points = series.map((row, index) => ({
    ...row,
    value: Number(row[metric]),
    x: publicData
      ? `D${row.dia_mision}`
      : row.timestamp_utc
        ? new Date(row.timestamp_utc).toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC',
          })
        : index,
  }))
  if (!points.length) return <Empty title="Sin lecturas para esta selección" />
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`${config.label} en ${points.length} ${aggregate ? 'promedios diarios' : 'lecturas'}. Tabla de valores disponible debajo.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 20, right: 12, left: -18, bottom: 0 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.23} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1E293B" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="x"
              tick={{ fill: '#A3B2C7', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={45}
            />
            <YAxis
              tick={{ fill: '#A3B2C7', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`${value} ${config.unit}`, config.label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>Ver tabla de datos · {config.unit}</summary>
        <DataTable
          rows={points}
          columns={[
            { key: 'x', label: publicData ? 'Día de misión' : 'Fecha UTC' },
            { key: 'value', label: `${config.label} (${config.unit})` },
          ]}
        />
      </details>
    </>
  )
}
export function CorrelationChart({ records, xMetric, yMetric }) {
  const points = records.map((row) => ({ x: Number(row[xMetric]), y: Number(row[yMetric]) }))
  if (!points.length) return <Empty title="Sin datos para cruzar variables" />
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`Dispersión de ${metrics[xMetric].label} y ${metrics[yMetric].label}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 20, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke="#1E293B" strokeDasharray="3 5" />
            <XAxis
              type="number"
              dataKey="x"
              name={metrics[xMetric].label}
              unit={metrics[xMetric].unit}
              tick={{ fill: '#A3B2C7', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={metrics[yMetric].label}
              unit={metrics[yMetric].unit}
              tick={{ fill: '#A3B2C7', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={points} fill="#38BDF8" fillOpacity={0.65} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>Ver valores de las variables</summary>
        <DataTable
          rows={points}
          columns={[
            { key: 'x', label: metrics[xMetric].label },
            { key: 'y', label: metrics[yMetric].label },
          ]}
        />
      </details>
    </>
  )
}
