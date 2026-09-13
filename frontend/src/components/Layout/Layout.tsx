import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({children}:{children:React.ReactNode}){
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      </div>
    </div>
  )
}
