import React from 'react'

export default function Gauge({ label, value, suffix = '%' }: { label: string; value: number; suffix?: string }){
  const bounded = Math.max(0, Math.min(100, value))

  return (
    <div className="rounded-xl border border-[#d0d7de] bg-white p-4 shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#586069]">{label}</span>
        <span className="text-sm font-semibold text-[#24292f]">{bounded}{suffix}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eaeef2]">
        <div
          className="h-full rounded-full bg-[#0366d6] transition-all"
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
  )
}
