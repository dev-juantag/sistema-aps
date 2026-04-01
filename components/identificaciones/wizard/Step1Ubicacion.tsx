'use client'

import { useFormContext } from 'react-hook-form'
import { MapPin, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ESTADO_VISITA } from '@/lib/constants'

export default function Step1Ubicacion({ coords, capture, loading }: any) {
  const { register, formState: { errors } } = useFormContext()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MapPin size={24} className="text-blue-600" /> Georreferenciación
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
            {coords ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase">Ubicación Capturada</p>
                <p className="text-lg font-sans tracking-tight text-slate-800 dark:text-slate-200">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-blue-600/70 italic py-2">
                GPS no capturado aún. Es obligatorio para el Registro Tipo 2.
              </p>
            )}
          </div>
          
          <button 
            type="button"
            onClick={capture} 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? 'Accediendo al GPS...' : 'CAPTURAR COORDENADAS'}
          </button>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Info size={24} className="text-blue-600" /> Control de Visita
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estado de la Visita</Label>
            <select 
              {...register('estadoVisita')}
              className="w-full p-2.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800"
            >
              {ESTADO_VISITA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Fecha Diligenciamiento</Label>
            <Input type="date" {...register('fechaDiligenciamiento')} />
          </div>

          <div className="space-y-2">
            <Label>Departamento</Label>
            <Input placeholder="Ej: RISARALDA" {...register('departamento')} />
          </div>

          <div className="space-y-2">
            <Label>Municipio</Label>
            <Input placeholder="Ej: PEREIRA" {...register('municipio')} />
          </div>

          <div className="space-y-2">
            <Label>Barrio / Vereda</Label>
            <Input placeholder="Nombre del sector" {...register('barrioVereda')} />
          </div>

          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input placeholder="CR 12 # 34 - 56" {...register('direccion')} />
          </div>
        </div>
      </section>
    </div>
  )
}
