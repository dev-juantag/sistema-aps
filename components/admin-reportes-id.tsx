"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, Area
} from "recharts"
import { 
  ShieldAlert, Database, Download, Loader2, Users, HeartPulse, 
  Baby, Accessibility, Activity, Scale, Stethoscope, AlertTriangle, Info, Layers
} from "lucide-react"
import { 
  REGIMEN_SALUD, ETNIA, INTERVENCIONES_PENDIENTES, 
  BARRERAS_ACCESO, DIAGNOSTICO_NUTRICIONAL, ANTECEDENTES_CRONICOS, 
  ANTECEDENTES_TRANSMISIBLES 
} from "@/lib/constants"

const COLORS = [
  "#081e69", "#09753d", "#0fb9b1", "#fa8231", "#8854d0", 
  "#4b7bec", "#26de81", "#eb3b5a", "#f7b731", "#a55eea"
]

export function AdminReportesId() {
  const [activeTab, setActiveTab] = useState<"general" | "salud" | "barreras">("general")
  const [filterMode, setFilterMode] = useState<"etapa" | "fechas" | "todo">("etapa")
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().slice(0, 10), 
    end: new Date().toISOString().slice(0, 10) 
  })

  // Para mantener compatibilidad con reportes a nivel territorio, Jefes, etc.
  const { data: stats, isLoading: loadingStats } = useSWR<any>(
    `/api/identificaciones/stats?role=ADMIN&filterMode=${filterMode}&startDate=${dateRange.start}&endDate=${dateRange.end}`,
    fetcher
  )

  if (loadingStats) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center p-8 text-muted-foreground text-sm flex-col gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        Generando indicadores de salud pública...
      </div>
    )
  }

  const kpis = stats?.kpis || {}

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#081e69]">Reportes Avanzados APS</h1>
          <p className="text-sm text-muted-foreground">
            Análisis demográfico, morbilidad y barreras según Resolución 3280
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {filterMode === "fechas" && (
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1 shadow-sm">
              <input 
                type="date" 
                className="bg-transparent text-sm font-medium outline-none" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
              />
              <span className="text-muted-foreground font-medium">-</span>
              <input 
                type="date" 
                className="bg-transparent text-sm font-medium outline-none" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
              />
            </div>
          )}

          <select 
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary outline-none"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
          >
            <option value="etapa">Etapa Actual</option>
            <option value="fechas">Período Personalizado</option>
            <option value="todo">Histórico Total</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard title="Total Pacientes" value={kpis.totalPacientes} icon={<Users className="w-4 h-4" />} color="#081e69" />
        <KPICard title="Gestantes" value={kpis.gestantes} icon={<HeartPulse className="w-4 h-4" />} color="#eb3b5a" />
        <KPICard 
          title="Niños < 10" 
          value={kpis.menores10} 
          icon={<Baby className="w-4 h-4" />} 
          color="#0fb9b1" 
          subtitle={(kpis?.ninosDesnutricion || 0) > 0 ? <span className="text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> {kpis.ninosDesnutricion} con riesgo</span> : null}
        />
        <KPICard title="Adulto Mayor" value={kpis.mayores60} icon={<Activity className="w-4 h-4" />} color="#fa8231" />
        <KPICard title="Discapacidad" value={kpis.conDiscapacidad} icon={<Accessibility className="w-4 h-4" />} color="#8854d0" />
        <KPICard title="Cumple 3280" value={`${Math.round((kpis.cumpleEsquema / (kpis.totalPacientes || 1)) * 100)}%`} icon={<ShieldAlert className="w-4 h-4" />} color="#09753d" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button onClick={() => setActiveTab("general")} className={`pb-2 text-sm font-bold transition-all ${activeTab === "general" ? "border-b-2 border-[#081e69] text-[#081e69]" : "text-muted-foreground"}`}>
          Demografía y Aseguramiento
        </button>
        <button onClick={() => setActiveTab("salud")} className={`pb-2 text-sm font-bold transition-all ${activeTab === "salud" ? "border-b-2 border-[#081e69] text-[#081e69]" : "text-muted-foreground"}`}>
          Salud y Nutrición
        </button>
        <button onClick={() => setActiveTab("barreras")} className={`pb-2 text-sm font-bold transition-all ${activeTab === "barreras" ? "border-b-2 border-[#081e69] text-[#081e69]" : "text-muted-foreground"}`}>
          Brechas y Barreras
        </button>
      </div>

      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pirámide Poblacional */}
          <ChartContainer title="Cursos de Vida y Género" icon={<Layers className="w-4 h-4 ml-1" />}>
               <div className="w-full flex items-center justify-end mb-4">
                 <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#081e69]"></div>
                      <span className="font-bold">HOMBRES: {kpis?.totalHombres || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#eb3b5a]"></div>
                      <span className="font-bold">MUJERES: {kpis?.totalMujeres || 0}</span>
                    </div>
                 </div>
               </div>
               <div className="w-full h-80">
                 {(stats?.piramide?.length || 0) > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart layout="vertical" data={stats?.piramide || []} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="oklch(0.9 0.02 285)" />
                       <XAxis type="number" hide />
                       <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                       <Tooltip
                         cursor={{ fill: 'transparent' }}
                         contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                         formatter={(value: any, name: string) => [Math.abs(value), name === "mujeres" ? "Mujeres" : "Hombres"]}
                       />
                       <Bar dataKey="hombres" name="Hombres" fill="#081e69" stackId="a" radius={[0, 4, 4, 0]} barSize={20} />
                       <Bar dataKey="mujeres" name="Mujeres" fill="#eb3b5a" stackId="a" radius={[4, 0, 0, 4]} barSize={20} />
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <p className="text-muted-foreground mt-20 text-center text-sm">Sin datos para la pirámide poblacional.</p>
                 )}
               </div>
          </ChartContainer>

          {/* Aseguramiento */}
          <ChartContainer title="Distribución por Régimen" icon={<ShieldAlert className="w-4 h-4" />}>
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.aseguramiento?.regimen || []}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(stats?.aseguramiento?.regimen || []).map((_:any, index:number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </ChartContainer>

          {/* EAPB Ranking */}
          <ChartContainer className="lg:col-span-2" title="Principales EAPB / EPS en el Territorio" icon={<Stethoscope className="w-4 h-4" />}>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.aseguramiento?.eapb || []} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} fontSize={10} height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Pacientes" fill="#09753d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </div>
      )}

      {activeTab === "salud" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nutrición */}
          <ChartContainer title="Estado Nutricional" icon={<Scale className="w-4 h-4" />}>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats?.nutricion || []).map((n:any) => ({
                    name: DIAGNOSTICO_NUTRICIONAL.find(d => String(d.id) === n.name)?.label || 'No aplica',
                    value: n.value
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Casos" fill="#fa8231" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </ChartContainer>

          {/* Morbilidad Cronica */}
          <ChartContainer title="Enfermedades Crónicas Prevalentes" icon={<AlertTriangle className="w-4 h-4" />}>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats?.morbilidad?.cronicas || []).map((n:any) => ({
                    name: ANTECEDENTES_CRONICOS.find(d => d.id === n.name)?.label || n.name,
                    value: n.value
                  }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" name="Pacientes" fill="#eb3b5a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </ChartContainer>

          <div className="lg:col-span-2 p-4 bg-[#081e69]/5 border border-[#081e69]/10 rounded-xl flex items-start gap-4">
             <Info className="w-5 h-5 text-[#081e69] mt-1 shrink-0" />
             <div className="text-sm">
                <p className="font-bold text-[#081e69]">Indicador de Morbilidad Aguda</p>
                <p className="text-muted-foreground mt-1">
                  Se han identificado <b>{kpis.enfermedadAguda || 0}</b> casos de enfermedad aguda reciente (IRAS/EDAS). 
                  De estos, el <b>{Math.round(((kpis.recibeAtencion || 0) / (kpis.enfermedadAguda || 1)) * 100)}%</b> está recibiendo atención médica.
                </p>
             </div>
          </div>
        </div>
      )}

      {activeTab === "barreras" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Intervenciones Pendientes */}
          <ChartContainer title="Brechas en Resalución 3280 (Intervenciones Pendientes)" icon={<AlertTriangle className="w-4 h-4" />}>
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats?.intervenciones || []).map((n:any) => ({
                    name: INTERVENCIONES_PENDIENTES.find(d => String(d.id) === n.name)?.label || n.name,
                    value: n.value
                  }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} fontSize={9} />
                    <Tooltip />
                    <Bar dataKey="value" name="Pendientes" fill="#fa8231" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </ChartContainer>

          {/* Barreras de Acceso */}
          <ChartContainer title="Barreras de Acceso Reportadas" icon={<AlertTriangle className="w-4 h-4" />}>
             <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(stats?.barreras || []).map((n:any) => ({
                    name: BARRERAS_ACCESO.find(d => String(d.id) === n.name)?.label || n.name,
                    value: n.value
                  }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} fontSize={9} />
                    <Tooltip />
                    <Bar dataKey="value" name="Casos" fill="#8854d0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}

function KPICard({ title, value, icon, color, subtitle }: any) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="text-2xl font-black mt-1" style={{ color }}>{value}</p>
      </div>
      {subtitle && <div className="mt-2 text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis truncate">{subtitle}</div>}
      <div className="absolute bottom-0 left-0 h-1 w-full" style={{ background: color, opacity: 0.2 }}></div>
    </div>
  )
}

function ChartContainer({ title, children, icon, className }: any) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-5 shadow-sm ${className || ""}`}>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-muted text-primary">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-[#081e69]">{title}</h3>
      </div>
      {children}
    </div>
  )
}
