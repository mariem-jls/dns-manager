import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Alert from '../../components/UI/Alert'
import { createClient } from '@supabase/supabase-js'


export default function AuthCallback() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const supabaseCallback = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
    },
    })

  useEffect(() => {
    // Utiliser supabaseCallback (avec detectSessionInUrl: true)
    supabaseCallback.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message)
      } else if (session) {
        setLoading(false)
      } else {
        setError('Lien invalide ou expiré')
      }
      setLoading(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    try {
      // Utiliser supabaseCallback (avec detectSessionInUrl: true)
      const { error } = await supabaseCallback.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa]">
        <Card className="border border-[#d0d7de]">
          <div className="text-sm text-[#586069]">Vérification du lien...</div>
        </Card>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
        <Card className="w-full max-w-md border border-[#d0d7de]">
          <Alert variant="danger" title="Erreur">{error}</Alert>
          <Button onClick={() => navigate('/login')} className="mt-4 w-full justify-center">
            Retour au login
          </Button>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
        <Card className="w-full max-w-md border border-[#d0d7de]">
          <Alert variant="success" title="Succès">
            Mot de passe défini ! Redirection...
          </Alert>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/favicon1.svg" alt="Dynamix" className="h-16" />
          <h1 className="mt-4 text-2xl font-bold text-[#24292f]">
            Définir votre mot de passe
          </h1>
          <p className="mt-1 text-sm text-[#586069]">
            Choisissez un mot de passe pour activer votre compte.
          </p>
        </div>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="danger" title="Erreur">{error}</Alert>}

            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20"
              />
            </div>

            <Button type="submit" className="w-full justify-center">
              Définir le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}