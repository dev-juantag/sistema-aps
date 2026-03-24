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
} from "recharts"
import { TrendingUp, Target, Users, AlertTriangle, RefreshCcw } from "lucide-react"
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

  const atenciones: any[] = Array.isArray(rawAtenciones) ? rawAtenciones : []
  const programas: any[] = Array.isArray(rawProgramas) ? rawProgramas : []
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : []
  const { data: stageSettings, isLoading: loadingStage } = useSWR<any>("/api/settings/stage", fetcher)
  
  const currentStageStart = stageSettings?.currentStageStart || null
  const loading = loadingAtenciones || loadingProgramas || loadingUsers || loadingStage

  // Tipos de filtro: "etapa" = etapa actual, "fechas" = rango personalizado, "todo" = historico
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
      const res = await fetch("/api/settings/stage", {
        method: "POST"
      })
      if (res.ok) {
        setShowRestartModal(false)
        mutate("/api/settings/stage")
        mutate("/api/atenciones")
        mutate("/api/programas")
        mutate("/api/users")
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
      
      if (filterMode !== "etapa") {
         return {
           id: p.id,
           nombre: p.nombre,
           atenciones: count,
           meta: "N/A",
           porcentaje: "N/A"
         }
      }

      const profCount = users.filter((u) => u.programaId === p.id && u.rol === "profesional").length
      const metaIndividual = p.meta !== null && p.meta !== undefined ? p.meta : CONFIG.META_INDIVIDUAL_POR_DEFECTO;
      const meta = profCount > 0 ? (profCount * metaIndividual) : metaIndividual;
      const porcentaje = meta > 0 ? Math.round((count / meta) * 100) : 0;
      
      return {
        id: p.id,
        nombre: p.nombre,
        atenciones: count,
        meta: meta,
        porcentaje: porcentaje,
      }
    }).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [filteredAtenciones, programas, users, filterMode])

  const atencionesPerProfesional = useMemo(() => {
    const profesionales = users.filter((u) => u.rol === "profesional")
    return profesionales.map((prof) => {
      const count = filteredAtenciones.filter((a) => a.profesionalId === prof.id).length
      const programaDelProf = programas.find((p) => p.id === prof.programaId)

      if (filterMode !== "etapa") {
        return {
          id: prof.id,
          nombre: `${prof.nombre} ${prof.apellidos}`,
          programa: programaDelProf?.nombre || "Sin programa",
          atenciones: count,
          meta: "N/A",
          porcentaje: "N/A"
        }
      }
      
      // La meta de un solo profesional equivale a la meta indiviudal del programa (o la global)
      const meta = programaDelProf?.meta !== null && programaDelProf?.meta !== undefined ? programaDelProf.meta : CONFIG.META_INDIVIDUAL_POR_DEFECTO;
      const porcentaje = meta > 0 ? Math.round((count / meta) * 100) : 0
      
      return {
        id: prof.id,
        nombre: `${prof.nombre} ${prof.apellidos}`,
        programa: programaDelProf?.nombre || "Sin programa",
        atenciones: count,
        meta: meta,
        porcentaje: porcentaje,
      }
    }).sort((a, b) => b.atenciones - a.atenciones) // Ordenamos por cantidad de atenciones de mayor a menor
  }, [filteredAtenciones, users, programas, filterMode])

  const pieData = useMemo(() => {
    return atencionesPerPrograma
      .filter((p) => p.atenciones > 0)
      .map((p) => ({
        name: p.nombre,
        value: p.atenciones,
      }))
  }, [atencionesPerPrograma])

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes y Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Análisis de atenciones por programa y cumplimiento de metas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {filterMode === "fechas" && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="rounded border border-border px-2 py-1.5 text-sm"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                max={dateRange.end}
              />
              <span className="text-muted-foreground">-</span>
              <input 
                type="date" 
                className="rounded border border-border px-2 py-1.5 text-sm"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                min={dateRange.start}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}

          <select 
            className="rounded border border-border px-3 py-2 text-sm max-w-[200px]"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as "etapa" | "fechas" | "todo")}
          >
            <option value="etapa">Etapa Actual</option>
            <option value="fechas">Por Período de Fechas</option>
            <option value="todo">Todo el historial</option>
          </select>

          <button
            onClick={() => setShowRestartModal(true)}
            className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4" />
            Reiniciar Estadísticas
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex w-full items-center justify-center p-8 text-muted-foreground text-sm">
          Cargando reportes y procesando información...
        </div>
      )}

      {!loading && (
        <>
          {/* Charts grid */}
          <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: Atenciones per Programa */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Atenciones por Programa
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={atencionesPerPrograma}
                margin={{ top: 5, right: 10, left: -10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.02 285)" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11 }}
                  angle={-40}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(1 0 0)",
                    border: "1px solid oklch(0.90 0.02 285)",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Bar dataKey="atenciones" name="Atenciones" fill="oklch(0.50 0.18 285)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart: Distribution */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Distribucion por Programa
            </h2>
          </div>
          <div className="h-80">
            {pieData.length === 0 ? (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No hay reportes por mostrar</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Metas vs Registros table */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Metas vs Registros Procesados
              </h2>
            </div>
            
            {/* Toggle para cambiar vista vistaTablet */}
            <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border">
              <button
                onClick={() => setVistaTablet("programa")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  vistaTablet === "programa" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Target className="h-3.5 w-3.5" />
                Por Programa
              </button>
              <button
                onClick={() => setVistaTablet("profesional")}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  vistaTablet === "profesional" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Por Profesional
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    {vistaTablet === "programa" ? "Programa" : "Profesional"}
                  </th>
                  {vistaTablet === "profesional" && (
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Programa</th>
                  )}
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Registros</th>
                  {filterMode === "etapa" && (
                    <>
                      <th className="px-4 py-3 text-center font-semibold text-foreground">Meta</th>
                      <th className="px-4 py-3 text-center font-semibold text-foreground">Cumplimiento</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">Progreso</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(vistaTablet === "programa" ? atencionesPerPrograma : atencionesPerProfesional).map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.nombre}</td>
                    {vistaTablet === "profesional" && (
                      <td className="px-4 py-3 text-muted-foreground">{(item as any).programa}</td>
                    )}
                    <td className="px-4 py-3 text-center font-semibold text-foreground">{item.atenciones}</td>
                    {filterMode === "etapa" && (
                      <>
                        <td className="px-4 py-3 text-center text-muted-foreground">{item.meta}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              (item.porcentaje as number) >= 100
                                ? "bg-chart-3/15 text-chart-3"
                                : (item.porcentaje as number) >= 50
                                ? "bg-chart-4/15 text-chart-4"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {item.porcentaje}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-full max-w-[200px] rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                (item.porcentaje as number) >= 100 ? "bg-chart-3" : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, item.porcentaje as number)}%` }}
                            />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                
                {vistaTablet === "programa" && atencionesPerPrograma.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">No hay datos de programas para mostrar</td>
                  </tr>
                )}
                {vistaTablet === "profesional" && atencionesPerProfesional.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No hay profesionales registrados para procesar sus metas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Restart Stage Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-destructive bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Reiniciar Estadísticas</h2>
            </div>
            
            <p className="text-foreground text-sm mb-4">
              ¿Está seguro que desea reiniciar el programa? Esto reiniciará las estadísticas a cero para la nueva etapa y <strong>desactivará a todos los profesionales actuales</strong>. El historial antiguo de atenciones seguirá existiendo en la base de datos y se podrán ver las estadisticas historicas en "Ver todo el historial".
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRestartModal(false)}
                disabled={isRestarting}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestartStage}
                disabled={isRestarting}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRestarting ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Sí, Reiniciar Etapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

