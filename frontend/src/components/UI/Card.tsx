import React from 'react'

export default function Card({children, className}:{children:React.ReactNode, className?:string}){
  return (
    <div className={`bg-white rounded shadow-sm p-4 ${className||''}`}>
      {children}
    </div>
  )
}
