import React from 'react'

type AlertVariant = 'info' | 'warning' | 'danger' | 'success'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'border-[#0969da] bg-[#ddf4ff] text-[#0969da]',
  warning: 'border-[#d4a72c] bg-[#fff8c5] text-[#9a6700]',
  danger: 'border-[#cf222e] bg-[#ffebe9] text-[#cf222e]',
  success: 'border-[#1a7f37] bg-[#dafbe1] text-[#1a7f37]',
}

export default function Alert({
  variant = 'info',
  title,
  children,
  className = '',
}: AlertProps) {
  return (
    <div
      className={`mb-4 rounded-md border border-l-4 p-3 text-sm ${variantStyles[variant]} ${className}`}
    >
      {title && <span className="font-semibold">{title} : </span>}
      {children}
    </div>
  )
}