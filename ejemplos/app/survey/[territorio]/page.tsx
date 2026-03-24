'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Search, PlusCircle, ChevronRight, FileText, User, ArrowLeft } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface FichaResumen {
  id: string
  consecutivo: number
  direccion: string
  numDocEncuestador?: string
  encuestador?: { nombre: string; apellidos: string; documento: string }
  estadoVisita: string
  createdAt: string
  integrantes: { numDoc: string; primerNombre: string; primerApellido: string }[]
}

export default function TerritoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const territorio = params.territorio as string
  const microterritorio = searchParams.get('micro') || ''

  const [cedula, setCedula] = useState('')
  const [estado, setEstado] = useState('')
  const [fichas, setFichas] = useState<FichaResumen[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleBuscar = async () => {
    if (!cedula.trim() && !searched) {
      // Cargar todas las fichas del territorio sin filtro
    }
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ territorio })
      if (cedula.trim()) params.set('cedula', cedula.trim())
      if (estado) params.set('estado', estado)
      const res = await fetch(`/api/survey/buscar?${params}`)
      const data = await res.json()
      setFichas(data.fichas || [])
    } catch {
      setFichas([])
    } finally {
      setLoading(false)
    }
  }

  // Load all fichas for this territory on mount
  useEffect(() => {
    handleBuscar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNueva = () => setConfirmOpen(true)

  const handleConfirmNueva = () => {
    setConfirmOpen(false)
    router.push(`/survey/${territorio}/nueva?micro=${microterritorio}`)
  }

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-300 bg-[#f7f8fc]">
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: '#081e69' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">
              {territorio} · {microterritorio}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(186,210,255,0.7)' }}>
              Identificaciones del territorio
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Search + New */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              placeholder="Buscar por documento de integrante, documento creador, dirección..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#076b26]/50 transition-all text-sm"
            />
          </div>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none focus:ring-2 focus:ring-[#076b26]/50 shadow-sm"
          >
            <option value="">Todas</option>
            <option value="1">Efectivas</option>
            <option value="2">No Efectivas</option>
            <option value="3">Rechazadas</option>
          </select>
          <button
            onClick={handleBuscar}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 font-semibold transition-all flex items-center gap-2 text-slate-700"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
          <button
            onClick={handleNueva}
            className="px-6 py-3 rounded-xl hover:opacity-90 text-white font-bold transition-all active:scale-95 shadow-lg flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #076b26, #054a1a)' }}
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Identificación
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex gap-2 text-slate-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span>Cargando fichas...</span>
          </div>
        </div>
      ) : fichas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <FileText className="w-14 h-14 text-slate-200 dark:text-slate-700" />
          <p className="text-slate-500 font-medium">
            {searched && cedula ? `No se encontraron fichas para la cédula "${cedula}"` : 'No hay identificaciones en este territorio aún.'}
          </p>
          <button onClick={handleNueva} className="mt-2 text-[#076b26] hover:text-[#054a1a] font-semibold flex items-center gap-1">
            <PlusCircle className="w-4 h-4" /> Crear primera identificación
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 font-medium">{fichas.length} ficha(s) encontrada(s)</p>
          {fichas.map((ficha) => (
            <div
              key={ficha.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => router.push(`/survey/${territorio}/${ficha.id}`)}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#076b26] text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#076b2615' }}>
                      #{ficha.consecutivo}
                    </span>
                    {ficha.estadoVisita === '1' && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-wider">Efectiva</span>}
                    {ficha.estadoVisita === '2' && <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-wider">No Efectiva</span>}
                    {ficha.estadoVisita === '3' && <span className="bg-red-100 text-red-700 text-[10px] font-black uppercase px-2 py-1 rounded-full tracking-wider">Rechazada</span>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#076b26] transition-colors flex-shrink-0" />
                </div>
                
                <p className="text-sm text-slate-700 font-semibold">{ficha.direccion}</p>
                
                {ficha.integrantes && ficha.integrantes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ficha.integrantes.slice(0, 3).map((int, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        <User className="w-3 h-3" />
                        {int.primerNombre} {int.primerApellido}
                      </span>
                    ))}
                    {ficha.integrantes.length > 3 && (
                      <span className="text-[11px] text-slate-400">+{ficha.integrantes.length - 3}</span>
                    )}
                  </div>
                )}
                
                <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                  <div className="text-[10px] text-slate-500 flex flex-col gap-0.5">
                    <p className="font-bold text-slate-700 uppercase tracking-widest text-[9px]">Creador</p>
                    <p>{ficha.encuestador ? `${ficha.encuestador.nombre} ${ficha.encuestador.apellidos}` : (ficha.numDocEncuestador || 'Público')}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    <p className="font-medium text-slate-600">{new Date(ficha.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p>{new Date(ficha.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Confirm New Survey Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Nueva Identificación"
        message="¿Estás seguro de que deseas iniciar una nueva identificación para este territorio? Asegúrate de que el hogar no haya sido identificado anteriormente."
        confirmLabel="Sí, iniciar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmNueva}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
