import React from 'react'
import { LineChart as ReLine, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function LineChart({data}:{data:any[]}){
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ReLine data={data}>
        <XAxis dataKey="ts" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#0366d6" />
      </ReLine>
    </ResponsiveContainer>
  )
}
