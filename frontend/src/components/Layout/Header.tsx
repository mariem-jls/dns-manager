import React from 'react'

export default function Header() {
  return (
    <header className="bg-white border-b">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Primary: <span className="text-green-600">UP</span>
          </div>
          <div className="text-sm text-gray-600">
            Secondary: <span className="text-green-600">UP</span>
          </div>
        </div>
        <div className="text-xs text-[#586069]">DNS Manager v1.0</div>
      </div>
    </header>
  )
}