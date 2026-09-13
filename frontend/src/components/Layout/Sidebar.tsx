import React from 'react'
import { Link } from 'react-router-dom'

export default function Sidebar(){
  return (
    <aside className="w-64 bg-white border-r h-screen sticky top-0">
      <div className="p-4 font-semibold text-lg border-b">Dynamix</div>
      <nav className="p-4 space-y-2">
        <Link to="/" className="block px-3 py-2 rounded hover:bg-gray-50">Dashboard</Link>
        <Link to="/zones" className="block px-3 py-2 rounded hover:bg-gray-50">Zones</Link>
        <Link to="/monitoring" className="block px-3 py-2 rounded hover:bg-gray-50">Monitoring</Link>
        <Link to="/security" className="block px-3 py-2 rounded hover:bg-gray-50">Security</Link>
        <Link to="/diagnostics" className="block px-3 py-2 rounded hover:bg-gray-50">Diagnostics</Link>
        <Link to="/users" className="block px-3 py-2 rounded hover:bg-gray-50">Users</Link>
        <Link to="/audit" className="block px-3 py-2 rounded hover:bg-gray-50">Audit</Link>
      </nav>
    </aside>
  )
}
