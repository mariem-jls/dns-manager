import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-[#d0d7de] bg-white py-4 text-center text-xs text-[#586069]">
      <p>© {new Date().getFullYear()} Dynamix Service — Tous droits réservés</p>
      <p className="mt-1">DNS Manager v1.0</p>
    </footer>
  )
}