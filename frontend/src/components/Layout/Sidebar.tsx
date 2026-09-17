import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  to: string
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            label: 'Dashboard',   roles: ['admin', 'operator', 'viewer'] },
  { to: '/zones',       label: 'Zones',       roles: ['admin', 'operator', 'viewer'] },
  { to: '/monitoring',  label: 'Monitoring',  roles: ['admin', 'operator', 'viewer'] },
  { to: '/security',    label: 'Security',    roles: ['admin', 'operator'] },
  { to: '/diagnostics', label: 'Diagnostics', roles: ['admin', 'operator'] },
  { to: '/users',       label: 'Users',       roles: ['admin'] },
  { to: '/audit',       label: 'Audit',       roles: ['admin', 'operator', 'viewer'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const role = user?.role ?? 'viewer'
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b flex items-center gap-3">
        <img src="/favicon1.svg" alt="Dynamix" className="h-10" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-[#ddf4ff] text-[#0969da] font-medium'
                  : 'text-[#24292f] hover:bg-[#f6f8fa]'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Profil + logout en bas */}
      {user && (
        <div className="border-t border-[#d0d7de] p-4 space-y-3">
          <div>
            <div className="text-xs text-[#586069]">Connecté en tant que</div>
            <div className="mt-1 truncate text-sm font-medium text-[#24292f]">
              {user.email}
            </div>
            <div className="mt-1">
              <span className="inline-block rounded-full bg-[#ddf4ff] px-2 py-0.5 text-xs font-semibold text-[#0969da] capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-[#d0d7de] bg-white px-3 py-1.5 text-sm text-[#24292f] hover:bg-[#f6f8fa]"
          >
            Déconnexion
          </button>
        </div>
      )}
    </aside>
  )
}