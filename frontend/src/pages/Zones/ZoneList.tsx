import React, { useState } from 'react'
import Layout from '../../components/Layout/Layout'
import Card from '../../components/UI/Card'
import Button from '../../components/UI/Button'
import Modal from '../../components/UI/Modal'
import { useZones, useCreateZone } from '../../hooks/useZones'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({ name: z.string().min(3), type: z.enum(['master','slave']).default('master') })

export default function ZonesPage(){
  const { data: zones = [], isLoading } = useZones()
  const create = useCreateZone()
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, reset } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data:any) => {
    try{
      await create.mutateAsync(data)
      reset()
      setOpen(false)
    }catch(e){
      console.error(e)
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#586069]">Gestion DNS</p>
          <h2 className="mt-1 text-3xl font-bold text-[#24292f]">Zones</h2>
          <p className="mt-2 text-sm text-[#586069]">Créer, valider et administrer les zones hébergées par BIND9.</p>
        </div>
        <Button onClick={()=>setOpen(true)}>Nouvelle zone</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[#d0d7de] bg-white shadow-[0_1px_2px_rgba(27,31,36,0.04)]">
        <div className="border-b border-[#d0d7de] bg-[#f6f8fa] px-4 py-3 text-sm font-medium text-[#24292f]">
          Liste des zones
        </div>
        <div className="divide-y divide-[#d0d7de]">
          {isLoading && <div className="px-4 py-6 text-sm text-[#586069]">Chargement des zones...</div>}
          {!isLoading && zones.length===0 && (
            <div className="px-4 py-8 text-sm text-[#586069]">Aucune zone disponible pour le moment.</div>
          )}
          {zones.map((z:any)=> (
            <div key={z.name} className="flex items-center justify-between px-4 py-4 transition-colors hover:bg-[#f6f8fa]">
              <div>
                <div className="font-medium text-[#24292f]">{z.name}</div>
                <div className="mt-1 text-sm text-[#586069]">{z.file}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#dafbe1] px-2.5 py-1 text-xs font-semibold text-[#1a7f37]">Actif</span>
                <button className="rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm hover:bg-[#f6f8fa]">Voir</button>
                <button className="rounded-md border border-[#d0d7de] bg-white px-3 py-2 text-sm hover:bg-[#f6f8fa]">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Créer une zone">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">Nom</label>
            <input {...register('name')} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#24292f]">Type</label>
            <select {...register('type')} className="w-full rounded-md border border-[#d0d7de] p-2.5 outline-none focus:border-[#0969da] focus:ring-2 focus:ring-[#0969da]/20">
              <option value="master">master</option>
              <option value="slave">slave</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={()=>setOpen(false)} className="border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]">Annuler</Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
