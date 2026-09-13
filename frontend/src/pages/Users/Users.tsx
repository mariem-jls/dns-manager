import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, inviteUser } from '../../api/users'

export default function UsersPage(){
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers, refetchInterval: 30_000 })
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: async () => {
      setEmail('')
      setRole('viewer')
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Gestion des accès</p>
          <h1 className="mt-1 text-3xl font-bold text-[#24292f]">Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#586069]">Inviter des membres et suivre les rôles actifs.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Utilisateurs</h2>
            <span className="text-sm text-[#586069]">{usersQuery.data?.length ?? 0} comptes</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#d0d7de]">
            <div className="grid grid-cols-3 bg-[#f6f8fa] px-4 py-3 text-sm font-medium text-[#24292f]">
              <div>Email</div>
              <div>Rôle</div>
              <div>Statut</div>
            </div>
            <div className="divide-y divide-[#d0d7de] bg-white">
              {(usersQuery.data ?? []).map((user: any) => (
                <div key={user.id} className="grid grid-cols-3 px-4 py-3 text-sm text-[#24292f]">
                  <div>{user.email}</div>
                  <div className="capitalize">{user.role}</div>
                  <div><span className="rounded-full bg-[#dafbe1] px-2.5 py-1 text-xs font-semibold text-[#1a7f37]">Actif</span></div>
                </div>
              ))}
              {(usersQuery.data ?? []).length === 0 && <div className="px-4 py-6 text-sm text-[#586069]">Aucun utilisateur.</div>}
            </div>
          </div>
        </Card>

        <Card className="border border-[#d0d7de] shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#24292f]">Invitation</h2>
            <span className="text-sm text-[#586069]">Supabase / JWT</span>
          </div>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              inviteMutation.mutate({ email, role })
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Email</label>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#24292f]">Rôle</label>
              <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20">
                <option value="admin">Admin</option>
                <option value="operator">Opérateur</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button type="submit" disabled={inviteMutation.isPending}>Inviter</Button>
          </form>
          <div className="mt-4 rounded-lg border border-[#d0d7de] bg-[#f6f8fa] p-4 text-sm text-[#586069]">
            Dans cette version, l’invitation appelle simplement le backend et alimente le journal d’audit.
          </div>
        </Card>
      </div>
    </Layout>
  )
}