import React from 'react'
import { PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#0366d6', '#28a745', '#f66a0a', '#6f42c1', '#586069']

export default function PieChart({ data }: { data: any[] }){
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RePie>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RePie>
    </ResponsiveContainer>
  )
}
