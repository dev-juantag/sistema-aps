'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, ShieldAlert, Loader2, Download, Trash2, Calendar, MapPin, Users, HeartPulse, Eye, Edit, X, Save } from 'lucide-react'
import Link from 'next/link'

type FichaDTO = {
  id: string;
  consecutivo: number;
  estadoVisita: string;
  territorio: string;
  microterritorio: string;
  fechaDiligenciamiento: string;
  direccion: string | null;
  centroPoblado: string | null;
  descripcionUbicacion: string | null;
  estratoSocial: number | null;
  numEBS: string | null;
  numHogar: string | null;
  numDocEncuestador: string | null;
  observacionesRechazo?: string | null;
  encuestador: { nombre: string | null; apellidos: string | null; documento: string } | null;
  _count: { integrantes: number };
}

export default function FichasDatabase() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [fichas, setFichas] = useState<FichaDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [editingFicha, setEditingFicha] = useState<FichaDTO | null>(null)
  const [updating, setUpdating] = useState(false)

  const [qHogar, setQHogar] = useState('')
  const [qFamilia, setQFamilia] = useState('')
  const [qCreador, setQCreador] = useState('')
  const [qEstado, setQEstado] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          document.cookie = 'session=; path=/; max-age=0'
          router.replace('/login')
        } else if (data.role === 'OPERADOR') {
          router.replace('/')
        } else {
          setMyRole(data.role)
          setMounted(true)
          fetchFichas()
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  const fetchFichas = async () => {
    setLoading(true)
    try {
      const qParams = new URLSearchParams()
      if (qHogar) qParams.append('hogar', qHogar)
      if (qFamilia) qParams.append('familia', qFamilia)
      if (qCreador) qParams.append('creador', qCreador)
      if (qEstado) qParams.append('estado', qEstado)

      const res = await fetch(`/api/admin/fichas?${qParams.toString()}`)
      if (res.ok) setFichas(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFicha = async (id: string, consecutivo: number) => {
    if (!confirm(`PELIGRO: ¿Estás totalmente seguro de eliminar todo el registro de la Ficha #${consecutivo}? Esto borrará también a la familia e integrantes de forma irreversible.`)) return
    
    try {
      const resp = await fetch(`/api/admin/fichas/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const d = await resp.json()
        alert(d.error || 'Error eliminando Ficha')
        return
      }
      fetchFichas()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleUpdateFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFicha) return
    setUpdating(true)
    try {
       const resp = await fetch(`/api/admin/fichas/${editingFicha.id}`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            estadoVisita: editingFicha.estadoVisita,
            direccion: editingFicha.direccion,
            centroPoblado: editingFicha.centroPoblado,
            descripcionUbicacion: editingFicha.descripcionUbicacion,
            estratoSocial: editingFicha.estratoSocial,
            numEBS: editingFicha.numEBS,
            numHogar: editingFicha.numHogar
         })
       })
       if (!resp.ok) {
         const { error } = await resp.json()
         throw new Error(error || 'Fallo actualizando la ficha')
       }
       setEditingFicha(null)
       fetchFichas()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/admin/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fichas_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error en Exportación de Base de Datos')
    } finally {
      setExporting(false)
    }
  }

  const translateEstado = (s: string) => {
    switch (s) {
      case '1': return <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">EFECTIVA</span>
      case '2': return <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">NO EFECTIVA</span>
      case '3': return <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">RECHAZADA</span>
      default: return <span>{s}</span>
    }
  }

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Base de Identificaciones</h1>
            <p className="text-sm text-slate-500 font-medium">CRUD y Exportación General de Fichas Si-APS</p>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Exportando Datos...' : 'Exportar Fichas a CSV'}
        </button>
      </div>

      {/* Table grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        
        {/* Filtros */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-4 items-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:block">Filtros Búsqueda</p>
          <input 
            type="text" 
            placeholder="N° Hogar" 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-slate-800 text-white border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px] placeholder:text-slate-400" 
            value={qHogar} 
            onChange={e => setQHogar(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Familia ID" 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-slate-800 text-white border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px] placeholder:text-slate-400" 
            value={qFamilia} 
            onChange={e => setQFamilia(e.target.value)} 
          />
          <input 
            type="text" 
            title="Buscar por documento de integrante, documento creador, dirección o código de ficha..."
            placeholder="Doc Integrante / Creador / Dirección" 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-slate-800 text-white border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[300px] placeholder:text-slate-400" 
            value={qCreador} 
            onChange={e => setQCreador(e.target.value)} 
          />
          <select 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-slate-800 text-white border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
            value={qEstado}
            onChange={e => setQEstado(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="1">Efectivas</option>
            <option value="2">No Efectivas</option>
            <option value="3">Rechazadas / Negadas</option>
          </select>
          <button 
            onClick={fetchFichas} 
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm ml-auto sm:ml-0"
          >
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : fichas.length === 0 ? (
          <div className="h-48 flex flex-col justify-center items-center text-slate-400 text-sm">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
            No existen capturas en la base de datos
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-widest whitespace-nowrap">
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Ficha #</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Estado</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Ubicación</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Integrantes</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Encuestador (número de documento)</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Fecha Creada</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800 text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {fichas.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-black text-slate-900 dark:text-white">#{f.consecutivo}</p>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {translateEstado(f.estadoVisita)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {f.territorio} <span className="text-slate-400">|</span> {f.microterritorio}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
                        <Users className="w-4 h-4 text-blue-500" />
                        {f._count.integrantes}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {f.encuestador ? `${f.encuestador.nombre || ''} ${f.encuestador.apellidos || ''}` : <span className="text-slate-400">Público</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {f.encuestador ? f.encuestador.documento : (f.numDocEncuestador || '')}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="w-4 h-4" />
                        {new Date(f.fechaDiligenciamiento).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                      <Link 
                        href={`/survey/${f.territorio}/${f.id}`} 
                        target="_blank"
                        className="inline-flex p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                        title="Ver Resumen de la Ficha"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      {myRole === 'SUPER_ADMIN' && (
                        <>
                          <button 
                            onClick={() => setEditingFicha(f)}
                            className="inline-flex p-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                            title="Editar Datos Generales"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteFicha(f.id, f.consecutivo)}
                            className="inline-flex p-2 text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                            title="Eliminar Base Ficha Completamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingFicha && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-black text-lg text-slate-800 dark:text-white">Editar Ficha Base #{editingFicha.consecutivo}</h3>
                <p className="text-xs text-slate-500">Únicamente variables estructurales (Territorio: {editingFicha.territorio})</p>
              </div>
              <button onClick={() => setEditingFicha(null)} className="p-2 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500 dark:text-slate-300" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateFicha} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Visita</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingFicha.estadoVisita}
                    onChange={(e) => setEditingFicha({...editingFicha, estadoVisita: e.target.value})}
                  >
                    <option value="1">Efectiva</option>
                    <option value="2">No Efectiva</option>
                    <option value="3">Rechazada</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estrato Social</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingFicha.estratoSocial || ''}
                    onChange={(e) => setEditingFicha({...editingFicha, estratoSocial: parseInt(e.target.value) || null})}
                  >
                    <option value="">Desconocido / N/A</option>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    <option value="4">4</option><option value="5">5</option><option value="6">6</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dirección Fija</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingFicha.direccion || ''}
                    onChange={(e) => setEditingFicha({...editingFicha, direccion: e.target.value})}
                  />
                </div>
                
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barrio / Vereda</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingFicha.centroPoblado || ''}
                    onChange={(e) => setEditingFicha({...editingFicha, centroPoblado: e.target.value})}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Num. Ficha EBS</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingFicha.numEBS || ''}
                    onChange={(e) => setEditingFicha({...editingFicha, numEBS: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción Visual Ubicación</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px]"
                    value={editingFicha.descripcionUbicacion || ''}
                    onChange={(e) => setEditingFicha({...editingFicha, descripcionUbicacion: e.target.value})}
                  />
                </div>

              </div>

              <div className="flex gap-4 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingFicha(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {updating ? 'Guardando...' : 'Aplicar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
