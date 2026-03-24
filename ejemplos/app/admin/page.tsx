'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'
import { Users, Home, MapPin, HeartPulse, ShieldAlert, Baby, PersonStanding, AlertTriangle, Activity } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalViviendas: number
  totalHogares: number
  totalPersonas: number
  Hombres: number
  Mujeres: number
  piramide: { ageGroup: string, Hombres: number, Mujeres: number }[]
  densidadTerritorio: { name: string, value: number, y: number }[]
  apgarDisfuncional: number
  cuidadores: number
  riesgoVulnerabilidad: number
  riesgoCronico: number
  gestantes: number
  menores5: number
  mayores60: number
}

const PyramidTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const mujeres = payload.find((p:any)=>p.dataKey==='Mujeres')?.value || 0
    const hombres = payload.find((p:any)=>p.dataKey==='Hombres')?.value || 0
    return (
      <div className="bg-white p-3 shadow-xl rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <p className="font-black text-slate-800 dark:text-white mb-2">Edad: {label}</p>
        <p className="text-pink-500 font-medium">Mujeres: {mujeres}</p>
        <p className="text-blue-500 font-medium">Hombres: {Math.abs(hombres)}</p>
      </div>
    )
  }
  return null
}

const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 shadow-xl rounded-xl border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
        <p className="font-black text-slate-800 dark:text-white mb-2">Territorio {data.name}</p>
        <p className="text-purple-600 font-medium">{data.value} Hogares</p>
      </div>
    )
  }
  return null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

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
          setMounted(true)
          fetchStats()
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Verificando Credenciales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Funcional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Análisis Poblacional</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Monitoreo Oficial de Atención Primaria en Salud (APS)</p>
        </div>
      </div>

      {/* Consolidados de Campo (Supremos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Total Personas', value: stats?.totalPersonas ?? '—', icon: Users, colors: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
          { label: 'Total Hogares', value: stats?.totalHogares ?? '—', icon: Home, colors: 'from-orange-400 to-red-500', shadow: 'shadow-orange-500/20' },
          { label: 'Viviendas Únicas', value: stats?.totalViviendas ?? '—', icon: MapPin, colors: 'from-purple-500 to-fuchsia-600', shadow: 'shadow-purple-500/20' },
        ].map((kpi, i) => (
          <div key={i} className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className={`absolute -right-4 -top-4 w-28 h-28 bg-gradient-to-br ${kpi.colors} opacity-[0.08] dark:opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            <div className={`inline-flex p-3 rounded-2xl mb-4 bg-gradient-to-br ${kpi.colors} text-white shadow-lg ${kpi.shadow}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
              {loading ? <span className="animate-pulse text-slate-300">...</span> : kpi.value}
            </p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Central Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Piramide Demografica */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-7 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-6 rounded-full bg-blue-500" />
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Pirámide Poblacional</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-6 font-medium">Radiografía demográfica base orientando programas de salud.</p>
          
          {loading || !stats?.piramide?.length ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Sincronizando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={stats.piramide} margin={{ top: 10, right: 30, left: 20, bottom: 5 }} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="ageGroup" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} dx={-10} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<PyramidTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                <Bar dataKey="Mujeres" name="Mujeres" fill="#ec4899" stackId="stack" radius={[0, 4, 4, 0]} barSize={18} />
                <Bar dataKey="Hombres" name="Hombres" fill="#3b82f6" stackId="stack" radius={[4, 0, 0, 4]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Mapa Territorial Saturación */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-7 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-6 rounded-full bg-purple-500" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Densidad Territorial</h3>
          </div>
          <p className="text-xs text-slate-500 mb-6 font-medium">Concentración geográfica de recolección de equipos en campo.</p>
          
          {loading || !stats?.densidadTerritorio?.length ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Sincronizando...</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} opacity={0.3} />
                  <XAxis type="category" dataKey="name" name="Territorio" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} dy={10} />
                  <YAxis type="number" dataKey="y" hide />
                  <ZAxis type="number" dataKey="value" range={[60, 2000]} name="Hogares" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ScatterTooltip />} />
                  <Scatter data={stats.densidadTerritorio} fill="#8b5cf6" opacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="absolute inset-x-0 bottom-0 text-center text-xs text-slate-400 font-medium pb-2">Identificadores de Territorio (T01 - T43)</div>
            </div>
          )}
        </div>
      </div>

      {/* Indicadores Salud y Familia */}
      <h3 className="font-black text-xl text-slate-800 dark:text-white pt-4 px-2">Vulnerabilidad y Riesgo Clínico</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { icon: Baby, label: 'Gestantes Activas', val: stats?.gestantes, color: 'text-pink-600', bg: 'bg-pink-100' },
          { icon: Activity, label: 'Bajo < 5 Años', val: stats?.menores5, color: 'text-blue-600', bg: 'bg-blue-100' },
          { icon: PersonStanding, label: 'Mayor > 60 Años', val: stats?.mayores60, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { icon: AlertTriangle, label: 'Riesgo Social', val: stats?.riesgoVulnerabilidad, color: 'text-orange-600', bg: 'bg-orange-100' },
          { icon: HeartPulse, label: 'Alarmas Crónicas', val: stats?.riesgoCronico, color: 'text-red-600', bg: 'bg-red-100' },
          { icon: ShieldAlert, label: 'Disfuncion APGAR', val: stats?.apgarDisfuncional, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-full ${item.bg}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {loading ? '-' : item.val}
            </p>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
