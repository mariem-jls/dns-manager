import React from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard/Dashboard'
import ZonesPage from './pages/Zones/ZoneList'
import MonitoringPage from './pages/Monitoring/Monitoring'
import SecurityPage from './pages/Security/Security'
import DiagnosticsPage from './pages/Diagnostics/Diagnostics'
import UsersPage from './pages/Users/Users'
import AuditPage from './pages/Audit/Audit'
import LoginPage from './pages/Login/Login'
import AuthCallback from './pages/Auth/Callback'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'


// Helper pour envelopper une page dans ProtectedRoute
const protect = (element: React.ReactElement) =>
  React.createElement(ProtectedRoute, null, element)

export default function App(){
  return React.createElement(
    Routes,
    null,
    // ============================================
    // Pages publiques (non protégées)
    // ============================================
    React.createElement(Route, { path: '/login', element: React.createElement(LoginPage) }),
    React.createElement(Route, { path: '/forgot-password', element: React.createElement(ForgotPassword) }),
    React.createElement(Route, { path: '/auth/callback', element: React.createElement(AuthCallback) }),
    React.createElement(Route, { path: '/auth/reset-password', element: React.createElement(ResetPassword) }),

    // ============================================
    // Pages protégées
    // ============================================
    React.createElement(Route, { path: '/', element: protect(React.createElement(Dashboard)) }),
    React.createElement(Route, { path: '/zones', element: protect(React.createElement(ZonesPage)) }),
    React.createElement(Route, { path: '/monitoring', element: protect(React.createElement(MonitoringPage)) }),
    React.createElement(Route, { path: '/security', element: protect(React.createElement(SecurityPage)) }),
    React.createElement(Route, { path: '/diagnostics', element: protect(React.createElement(DiagnosticsPage)) }),
    React.createElement(Route, { path: '/users', element: protect(React.createElement(UsersPage)) }),
    React.createElement(Route, { path: '/audit', element: protect(React.createElement(AuditPage)) }),
    React.createElement(Route, { path: '*', element: protect(React.createElement(Dashboard)) })
  )
}