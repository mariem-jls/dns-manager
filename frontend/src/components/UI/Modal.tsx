import React from 'react'

export default function Modal({open, onClose, title, children}:{open:boolean, onClose:()=>void, title?:string, children:React.ReactNode}){
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="relative bg-white rounded shadow-lg w-full max-w-xl p-6 z-10">
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
