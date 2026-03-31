"use client"

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { 
  TrendingUp, 
  Target, 
  Users, 
  AlertTriangle, 
  RefreshCcw, 
  FileText, 
  Activity, 
  Map, 
  ShieldAlert, 
  Baby, 
  Accessibility, 
  HeartPulse,
  Heart,
  Briefcase,
  Layers,
  Home
} from "lucide-react"
import { CONFIG } from "@/lib/config"

const COLORS = [
  "oklch(0.50 0.18 285)",
  "oklch(0.60 0.15 200)",
  "oklch(0.55 0.20 150)",
  "oklch(0.70 0.15 60)",
  "oklch(0.65 0.18 330)",
  "oklch(0.55 0.12 250)",
  "oklch(0.60 0.18 30)",
  "oklch(0.50 0.15 170)",
  "oklch(0.65 0.14 100)",
]

export function AdminReportes() {
  const { data: rawAtenciones, isLoading: loadingAtenciones } = useSWR<any>("/api/atenciones", fetcher)
  const { data: rawProgramas, isLoading: loadingProgramas } = useSWR<any>("/api/programas", fetcher)
  const { data: rawUsers, isLoading: loadingUsers } = useSWR<any>("/api/users", fetcher)
  const { data: stageSettings, isLoading: loadingStage } = useSWR<any>("/api/settings/stage", fetcher)
  const { data: idStats, isLoading: loadingStats } = useSWR<any>("/api/identificaciones/stats", fetcher)
  
  const atenciones: any[] = Array.isArray(rawAtenciones) ? rawAtenciones : []
  const programas: any[] = Array.isArray(rawProgramas) ? rawProgramas : []
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : []
  const currentStageStart = stageSettings?.currentStageStart || null
  
  const loading = loadingAtenciones || loadingProgramas || loadingUsers || loadingStage || loadingStats

  const [activeTab, setActiveTab] = useState<"atenciones" | "identificaciones">("atenciones")
  const [filterMode, setFilterMode] = useState<"etapa" | "fechas" | "todo">("etapa")
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().slice(0, 10), 
    end: new Date().toISOString().slice(0, 10) 
  })

  const [isRestarting, setIsRestarting] = useState(false)
  const [showRestartModal, setShowRestartModal] = useState(false)
  const [vistaTablet, setVistaTablet] = useState<"programa" | "profesional">("programa")

  const handleRestartStage = async () => {
    setIsRestarting(true)
    try {
      const res = await fetch("/api/settings/stage", { method: "POST" })
      if (res.ok) {
        setShowRestartModal(false)
        mutate("/api/settings/stage")
        mutate("/api/atenciones")
      } else {
        alert("Hubo un error al reiniciar la etapa")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsRestarting(false)
    }
  }

  const filteredAtenciones = useMemo(() => {
    if (filterMode === "todo") return atenciones
    if (filterMode === "etapa") {
      if (!currentStageStart) return atenciones
      return atenciones.filter(a => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) >= new Date(currentStageStart))
    }
    if (filterMode === "fechas") {
      const start = new Date(dateRange.start + "T00:00:00")
      const end = new Date(dateRange.end + "T23:59:59")
      return atenciones.filter(a => {
        const d = new Date(a.createdAtISO || (a.fecha + "T00:00:00"))
        return d >= start && d <= end
      })
    }
    return atenciones
  }, [atenciones, currentStageStart, filterMode, dateRange])

  const atencionesPerPrograma = useMemo(() => {
    return programas.map((p) => {
      const count = filteredAtenciones.filter((a) => a.programaId === p.id).length
      if (filterMode !== "etapa") return { id: p.id, nombre: p.nombre, atenciones: count, meta: "N/A", porcentaje: "N/A" }
      const profCount = users.filter((u) => u.programaId === p.id && u.rol === "profesional").length
      const metaIndividual = p.meta ?? CONFIG.META_INDIVIDUAL_POR_DEFECTO
      const meta = profCount > 0 ? (profCount * metaIndividual) : metaIndividual
      const porcentaje = meta > 0 ? Math.round((count / meta) * 100) : 0
      return { id: p.id, nombre: p.nombre, atenciones: count, meta, porcentaje }
    }).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [filteredAtenciones, programas, users, filterMode])

  const atencionesPerProfesional = useMemo(() => {
    const profesionales = users.filter((u) => u.rol === "profesional")
    return profesionales.map((prof) => {
      const count = filteredAtenciones.filter((a) => a.profesionalId === prof.id).length
      const programaDelProf = programas.find((p) => p.id === prof.programaId)
      if (filterMode !== "etapa") return { id: prof.id, nombre: `${prof.nombre} ${prof.apellidos}`, programa: programaDelProf?.nombre || "Sin programa", atenciones: count, meta: "N/A", porcentaje: "N/A" }
      const meta = programaDelProf?.meta ?? CONFIG.META_INDIVIDUAL_POR_DEFECTO
      const porcentaje = meta > 0 ? Math.round((count / meta) * 100) : 0
      return { id: prof.id, nombre: `${prof.nombre} ${prof.apellidos}`, programa: programaDelProf?.nombre || "Sin programa", atenciones: count, meta, porcentaje }
    }).sort((a, b) => b.atenciones - a.atenciones)
  }, [filteredAtenciones, users, programas, filterMode])

  const pieAtenciones = useMemo(() => {
    return atencionesPerPrograma.filter((p) => p.atenciones > 0).map((p) => ({ name: p.nombre, value: p.atenciones }))
  }, [atencionesPerPrograma])

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 overflow-hidden pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análisis de Gestión Territorial</h1>
          <p className="text-sm text-muted-foreground">
            Monitoreo en tiempo real de atenciones, metas e indicadores poblacionales
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select 
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
          >
            <option value="etapa">Etapa Actual</option>
            <option value="fechas">Período Personalizado</option>
            <option value="todo">Histórico Total</option>
          </select>

          {activeTab === "atenciones" && (
            <button
              onClick={() => setShowRestartModal(true)}
              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
            >
              <RefreshCcw className="h-4 w-4" />
              Reiniciar Etapa
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("atenciones")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "atenciones" 
            ? "border-primary text-primary" 
            : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Gestión de Atenciones
        </button>
        <button
          onClick={() => setActiveTab("identificaciones")}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "identificaciones" 
            ? "border-primary text-primary" 
            : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Reporte Poblacional (ID)
        </button>
      </div>

      {loading && (
        <div className="flex w-full items-center justify-center p-20 text-muted-foreground text-sm flex-col gap-4">
          <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
          Procesando grandes volúmenes de datos territoriales...
        </div>
      )}

      {!loading && activeTab === "atenciones" && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bar Chart */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Atenciones por Programa</h2>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={atencionesPerPrograma} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.02 285)" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-40} textAnchor="end" height={80} interval={0} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "1px solid var(--border)" }} />
                    <Bar dataKey="atenciones" name="Atenciones" fill="oklch(0.50 0.18 285)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Distribución Institucional</h2>
              </div>
              <div className="h-80">
                {pieAtenciones.length === 0 ? (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">Sin registros</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieAtenciones}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                      >
                        {pieAtenciones.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
             <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Metas Institucionales</h2>
                </div>
                <div className="flex items-center bg-muted/40 p-1 rounded-lg">
                  <button 
                    onClick={() => setVistaTablet("programa")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${vistaTablet === "programa" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >Por Programa</button>
                  <button 
                    onClick={() => setVistaTablet("profesional")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${vistaTablet === "profesional" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >Por Profesional</button>
                </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-4 py-4 text-left font-bold text-foreground">Descripción</th>
                      {vistaTablet === "profesional" && <th className="px-4 py-4 text-left">Programa</th>}
                      <th className="px-4 py-4 text-center">Registros</th>
                      {filterMode === "etapa" && (
                        <>
                          <th className="px-4 py-4 text-center">Meta</th>
                          <th className="px-4 py-4 text-center">Cumplimiento</th>
                          <th className="px-4 py-4 text-left">Progreso</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(vistaTablet === "programa" ? atencionesPerPrograma : atencionesPerProfesional).map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/10">
                        <td className="px-4 py-4 font-medium">{item.nombre}</td>
                        {vistaTablet === "profesional" && <td className="px-4 py-4 text-muted-foreground">{(item as any).programa}</td>}
                        <td className="px-4 py-4 text-center font-bold">{item.atenciones}</td>
                        {filterMode === "etapa" && (
                          <>
                            <td className="px-4 py-4 text-center text-muted-foreground">{item.meta}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${Number(item.porcentaje) >= 100 ? "bg-emerald-100 text-emerald-700" : Number(item.porcentaje) >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                {item.porcentaje}%
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${Number(item.porcentaje) >= 100 ? "bg-emerald-500" : "bg-primary"}`} 
                                  style={{ width: `${Math.min(100, Number(item.porcentaje))}%` }} 
                                />
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </>
      )}

      {/* REPORTE POBLACIONAL (ID) - NEW MODULE */}
      {!loading && activeTab === "identificaciones" && idStats && (
        <div className="flex flex-col gap-6">
          {/* Main Indicators Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Home className="h-6 w-6" /></div>
                 <span className="text-[10px] text-blue-600 font-black uppercase">Consolidado</span>
               </div>
               <p className="text-sm text-muted-foreground font-medium mb-1">Total Hogares</p>
               <h3 className="text-4xl font-black text-foreground tabular-nums">{idStats?.kpis?.totalFichas || 0}</h3>
               <div className="absolute -right-4 -bottom-4 h-24 w-24 text-blue-500/5 group-hover:text-blue-500/10 transition-colors"><Home className="h-full w-full" /></div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Users className="h-6 w-6" /></div>
                 <span className="text-[10px] text-indigo-600 font-black uppercase">Población</span>
               </div>
               <p className="text-sm text-muted-foreground font-medium mb-1">Total Personas</p>
               <h3 className="text-4xl font-black text-foreground tabular-nums">{idStats?.kpis?.totalPacientes || 0}</h3>
               <div className="absolute -right-4 -bottom-4 h-24 w-24 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors"><Users className="h-full w-full" /></div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><Activity className="h-6 w-6" /></div>
                 <span className="text-[10px] text-rose-600 font-black uppercase">Materno</span>
               </div>
               <p className="text-sm text-muted-foreground font-medium mb-1">Total Gestantes</p>
               <h3 className="text-4xl font-black text-foreground tabular-nums">{idStats?.kpis?.gestantes || 0}</h3>
               <div className="absolute -right-4 -bottom-4 h-24 w-24 text-rose-500/5 group-hover:text-rose-500/10 transition-colors"><Activity className="h-full w-full" /></div>
            </div>

            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                 <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Briefcase className="h-6 w-6" /></div>
                 <span className="text-[10px] text-amber-600 font-black uppercase">SocioEc</span>
               </div>
               <p className="text-sm text-muted-foreground font-medium mb-1">Rég. Subsidiado</p>
               <h3 className="text-4xl font-black text-foreground tabular-nums">
                 {idStats?.aseguramiento?.regimen?.find((r: any) => r.name === "SUBSIDIADO")?.value || 0}
               </h3>
               <div className="absolute -right-4 -bottom-4 h-24 w-24 text-amber-500/5 group-hover:text-amber-500/10 transition-colors"><Briefcase className="h-full w-full" /></div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
             {/* 1. Ciclo de Vida y Genero */}
             <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-2">
                     <Layers className="h-5 w-5 text-primary" />
                     <h3 className="text-lg font-bold">Población por Curso de Vida y Género</h3>
                   </div>
                   <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                     <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#081e69]"></div>Hom</div>
                     <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#eb3b5a]"></div>Muj</div>
                   </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={idStats?.piramide || []} margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                       <XAxis type="number" hide />
                       <YAxis dataKey="label" type="category" width={140} tick={{ fontSize: 11, fontWeight: 600, fill: "var(--foreground)" }} />
                       <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 20px -5px rgba(0,0,0,0.1)" }} />
                       <Bar dataKey="hombres" name="Hombres" fill="#081e69" stackId="a" radius={[0, 4, 4, 0]} barSize={25} />
                       <Bar dataKey="mujeres" name="Mujeres" fill="#eb3b5a" stackId="a" radius={[4, 0, 0, 4]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* 2. Régimen de Afiliación */}
             <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center">
                <div className="w-full mb-6 flex items-center gap-2">
                  <HeartPulse className="h-5 w-5 text-rose-500" />
                  <h3 className="text-lg font-bold">Aseguramiento</h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={idStats?.aseguramiento?.regimen || []}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                         {idStats?.aseguramiento?.regimen?.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
             {/* 3. Riesgos Prioritarios */}
             <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <ShieldAlert className="h-5 w-5 text-rose-500" />
                  <h3 className="text-lg font-bold text-foreground">Alertas de Salud y Vulnerabilidades</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-100/30 border border-orange-200">
                     <AlertTriangle className="h-10 w-10 text-orange-500" />
                     <div>
                       <span className="text-[10px] font-black text-orange-600 block mb-0.5">ESTADO NUTRICIONAL</span>
                       <p className="text-2xl font-black text-foreground leading-none">{idStats?.kpis?.signosDesnutricion || 0}</p>
                       <p className="text-[10px] text-orange-700 font-medium">Casos con riesgo/signos</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-100/30 border border-rose-200">
                     <ShieldAlert className="h-10 w-10 text-rose-500" />
                     <div>
                       <span className="text-[10px] font-black text-rose-600 block mb-0.5">ENF. HUÉRFANAS</span>
                       <p className="text-2xl font-black text-foreground leading-none">{idStats?.kpis?.hogaresHuerfanas || 0}</p>
                       <p className="text-[10px] text-rose-700 font-medium">Hogares con casos crónicos</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-100/30 border border-blue-200">
                     <Accessibility className="h-10 w-10 text-blue-500" />
                     <div>
                       <span className="text-[10px] font-black text-blue-600 block mb-0.5">DISCAPACIDAD</span>
                       <p className="text-2xl font-black text-foreground leading-none">{idStats?.kpis?.conDiscapacidad || 0}</p>
                       <p className="text-[10px] text-blue-700 font-medium">Personas identificadas</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-indigo-100/30 border border-indigo-200">
                     <Users className="h-10 w-10 text-indigo-500" />
                     <div>
                       <span className="text-[10px] font-black text-indigo-600 block mb-0.5">VÍCTIMAS</span>
                       <p className="text-2xl font-black text-foreground leading-none">{idStats?.kpis?.victimas || 0}</p>
                       <p className="text-[10px] text-indigo-700 font-medium">Víctimas del conflicto</p>
                     </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                   <h4 className="text-xs font-black uppercase text-muted-foreground mb-4">Ranking de Vulnerabilidades Reportadas</h4>
                   <div className="space-y-3">
                     {idStats?.vulnerabilidades?.slice(0, 5).map((v: any, i: number) => (
                       <div key={v.name} className="flex items-center gap-3">
                         <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-bold w-6 text-center">{i+1}</span>
                         <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                               <span className="text-xs font-bold">{v.name}</span>
                               <span className="text-xs font-black text-primary">{v.value}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-primary" style={{ width: `${Math.min(100, (v.value / (idStats?.kpis?.totalFichas || 1)) * 300)}%` }}></div>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
             </div>

             {/* 4. Estrato y Hábitos */}
             <div className="flex flex-col gap-6">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex-1">
                   <div className="flex items-center gap-2 mb-6">
                     <Briefcase className="h-5 w-5 text-indigo-500" />
                     <h3 className="text-lg font-bold">Estrato Socioeconómico</h3>
                   </div>
                   <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={idStats?.estratos || []}>
                           <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                           <XAxis dataKey="name" label={{ value: "Estrato", position: "insideBottom", offset: -5 }} />
                           <YAxis />
                           <Tooltip contentStyle={{ borderRadius: "12px" }} />
                           <Bar dataKey="value" name="Familias" fill="oklch(0.60 0.15 200)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-2xl p-6 shadow-sm">
                   <div className="flex items-center gap-2 mb-4">
                     <Heart className="h-5 w-5 text-emerald-500" />
                     <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-500">Hábitos Saludables</h3>
                   </div>
                   <div className="flex items-center justify-between">
                      <div className="flex-1">
                         <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{idStats?.kpis?.habitosSaludables || 0}</p>
                         <p className="text-xs text-emerald-600 font-bold mt-2 uppercase tracking-tighter">Realizan actividad física diaria</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-black/20 rounded-2xl shadow-inner border border-emerald-100">
                         <Activity className="h-12 w-12 text-emerald-500 animate-pulse" />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Restart Stage Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 shadow-2xl">
            <div className="mb-6 flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-destructive/10 rounded-full text-destructive"><AlertTriangle className="h-10 w-10" /></div>
              <h2 className="text-2xl font-black text-foreground">¿Reiniciar Estadísticas?</h2>
              <p className="text-muted-foreground text-sm">
                Esta acción marcará el inicio de una nueva etapa. Se archivarán los registros actuales para el histórico y los contadores volverán a cero.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRestartStage}
                disabled={isRestarting}
                className="w-full rounded-xl bg-destructive py-3.5 text-sm font-black text-white hover:bg-destructive/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {isRestarting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : "SÍ, REINICIAR ETAPA"}
              </button>
              <button
                onClick={() => setShowRestartModal(false)}
                disabled={isRestarting}
                className="w-full rounded-xl border border-border bg-muted/30 py-3.5 text-sm font-bold hover:bg-muted transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
