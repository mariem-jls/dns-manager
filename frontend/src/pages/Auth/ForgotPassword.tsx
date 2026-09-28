import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setMessage('Un email de réinitialisation a été envoyé à ' + email)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/favicon1.svg" alt="Dynamix" className="h-16" />
          <h1 className="mt-4 text-2xl font-bold text-[#24292f]">
            Mot de passe oublié
          </h1>
          <p className="mt-1 text-sm text-[#586069]">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && <Alert variant="success" title="Email envoyé">{message}</Alert>}
            {error && <Alert variant="danger" title="Erreur">{error}</Alert>}

            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>

            <Link
              to="/login"
              className="block text-center text-sm text-[#0969da] hover:underline"
            >
              Retour au login
            </Link>
          </form>
        </Card>
      </div>
    </div>
  )
}