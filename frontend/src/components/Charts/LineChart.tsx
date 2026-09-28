import React from 'react'
import {
  LineChart as ReLine,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

export default function LineChart({ data }: { data: any[] }) {
  // Formater les données pour Recharts
  const formattedData = data.map((d) => {
    const date = new Date(d.ts * 1000)
    return {
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      value: d.value,
    }
  })

  // Calculer les bornes Y
  const values = formattedData.map((d) => d.value).filter((v) => !isNaN(v))
  const maxValue = values.length > 0 ? Math.max(...values) : 1
  const minValue = values.length > 0 ? Math.min(...values) : 0

  // Arrondir le max à une valeur "propre"
  const yMax = Math.ceil(maxValue * 1.2) || 10
  const yMin = Math.max(0, Math.floor(minValue * 0.8))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ReLine
        data={formattedData}
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
        <XAxis
          dataKey="time"
          stroke="#586069"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#586069"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[yMin, yMax]}
          tickFormatter={(value) => value.toFixed(1)}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#24292f',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value.toFixed(2)} req/s`, 'Requêtes']}
          labelFormatter={(label) => `À ${label}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0969da"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ReLine>
    </ResponsiveContainer>
  )
}