import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard/Dashboard'
import ZonesPage from './pages/Zones/ZoneList'
import MonitoringPage from './pages/Monitoring/Monitoring'
import SecurityPage from './pages/Security/Security'
import DiagnosticsPage from './pages/Diagnostics/Diagnostics'
import UsersPage from './pages/Users/Users'
import AuditPage from './pages/Audit/Audit'

export default function App(){
  return React.createElement(
    Routes,
    null,
    React.createElement(Route, { path: '/', element: React.createElement(Dashboard) }),
    React.createElement(Route, { path: '/zones', element: React.createElement(ZonesPage) }),
    React.createElement(Route, { path: '/monitoring', element: React.createElement(MonitoringPage) }),
    React.createElement(Route, { path: '/security', element: React.createElement(SecurityPage) }),
    React.createElement(Route, { path: '/diagnostics', element: React.createElement(DiagnosticsPage) }),
    React.createElement(Route, { path: '/users', element: React.createElement(UsersPage) }),
    React.createElement(Route, { path: '/audit', element: React.createElement(AuditPage) }),
    React.createElement(Route, { path: '*', element: React.createElement(Dashboard) })
  )
}
