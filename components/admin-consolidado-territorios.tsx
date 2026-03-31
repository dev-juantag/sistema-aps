"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/lib/auth-context"
import { Map, Users, ChevronDown, ChevronUp, MapPinned, UserCircle, ShieldCheck, Link2 } from "lucide-react"

export function AdminConsolidadoTerritorios() {
  const { user } = useAuth()
  const { data: rawUsers, isLoading: loadingUsers } = useSWR<any>("/api/users", fetcher)
  const { data: rawTerritorios, isLoading: loadingTerritorios } = useSWR<any>("/api/territorios", fetcher)

  const [expandedTerritorio, setExpandedTerritorio] = useState<string | null>(null)

  const users = Array.isArray(rawUsers) ? rawUsers : []
  const territorios = Array.isArray(rawTerritorios) ? rawTerritorios : []

  // Agrupar usuarios por territorio
  const consolidatedData = useMemo(() => {
    if (!territorios.length) return []

    return territorios.map(t => {
      const miembros = users.filter(u => u.territorioId === t.id && u.activo !== false)
      const profesionales = miembros.filter(u => u.rol === "profesional")
      const auxiliares = miembros.filter(u => u.rol === "auxiliar")
      
      const enfermeraJefe = miembros.find(u => 
        u.rol === "profesional" && 
        u.programa?.nombre?.toLowerCase().includes("enfermer")
      )

      // Ordenar: La jefa de enfermería siempre primero, luego el resto
      const sortedMiembros = [...miembros].sort((a, b) => {
        const isLeadA = a.id === enfermeraJefe?.id;
        const isLeadB = b.id === enfermeraJefe?.id;
        if (isLeadA && !isLeadB) return -1;
        if (!isLeadA && isLeadB) return 1;
        return 0;
      });

      return {
        ...t,
        miembros: sortedMiembros,
        stats: {
          total: miembros.length,
          profesionales: profesionales.length,
          auxiliares: auxiliares.length
        },
        lider: enfermeraJefe
      }
    }).sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [users, territorios])

  if (loadingUsers || loadingTerritorios) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        <p className="font-medium">Cargando consolidado de territorios...</p>
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedTerritorio(prev => prev === id ? null : id)
  }

  return (
    <div className="flex flex-col gap-8 pb-20 fade-in duration-500 animate-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
             <MapPinned className="h-8 w-8 text-primary" />
             Consolidado de Territorios
          </h1>
          <p className="text-muted-foreground">
            Vista administrativa del equipo de trabajo asignado a cada uno de los territorios.
          </p>
        </div>
      </div>

      {consolidatedData.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-muted/10">
          No hay territorios registrados en el sistema.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {consolidatedData.map(terr => {
             const isExpanded = expandedTerritorio === terr.id;

             return (
               <div key={terr.id} className="rounded-2xl border bg-card shadow-sm overflow-hidden transition-all duration-300">
                 {/* Header del Acordeon */}
                 <div 
                   onClick={() => toggleExpand(terr.id)}
                   className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                 >
                   <div className="flex items-center gap-4">
                     <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                       <Map className="h-6 w-6" />
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <h2 className="text-xl font-bold">{terr.nombre}</h2>
                         <span className="text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                           {terr.codigo}
                         </span>
                       </div>
                       
                       {terr.lider ? (
                         <div className="flex items-center gap-1.5 mt-1 text-sm text-blue-600 font-medium">
                           <ShieldCheck className="h-4 w-4" />
                           Líder Jefe: {terr.lider.nombre} {terr.lider.apellidos}
                         </div>
                       ) : (
                         <div className="mt-1 text-sm text-muted-foreground">
                           Sin Jefe de Enfermería asignada
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="flex items-center gap-6">
                     <div className="flex gap-4 items-center mr-4">
                       <div className="text-center">
                         <span className="block text-xl font-black">{terr.stats.total}</span>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80">Total</span>
                       </div>
                       <div className="h-8 w-px bg-border"></div>
                       <div className="text-center">
                         <span className="block text-xl font-black text-blue-600">{terr.stats.profesionales}</span>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80">Profesionales</span>
                       </div>
                       <div className="text-center">
                         <span className="block text-xl font-black text-rose-600">{terr.stats.auxiliares}</span>
                         <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-80">Auxiliares</span>
                       </div>
                     </div>
                     <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted/50 text-muted-foreground hover:bg-muted transition-colors shrink-0">
                       {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                     </div>
                   </div>
                 </div>

                 {/* Contenido Expandido */}
                 {isExpanded && (
                   <div className="border-t bg-slate-50/50 dark:bg-slate-900/10 p-0 animate-in slide-in-from-top-2 duration-300">
                     <div className="border-b px-5 py-3 flex items-center justify-between bg-muted/20">
                       <h3 className="text-sm font-bold flex items-center gap-2">
                         <Users className="h-4 w-4 text-primary" />
                         Equipo Asignado
                       </h3>
                       {terr.whatsappLink && (
                         <a href={terr.whatsappLink} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-green-600 font-bold hover:underline">
                           <Link2 className="h-3 w-3" /> Chat Comunidad
                         </a>
                       )}
                     </div>

                     <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                         <thead>
                           <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                             <th className="px-5 py-3 rounded-tl-lg">Colaborador</th>
                             <th className="px-5 py-3">Rol</th>
                             <th className="px-5 py-3">Documento</th>
                             <th className="px-5 py-3 text-right">Contacto</th>
                           </tr>
                         </thead>
                         <tbody>
                           {terr.miembros.map((u: any) => {
                             const esJefe = u.id === terr.lider?.id;
                             
                             return (
                              <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 transition-all ${esJefe ? 'bg-blue-50/80 dark:bg-blue-900/30 border-l-4 border-l-blue-600 shadow-[inset_0_1px_0_0_rgba(37,99,235,0.1)]' : ''}`}>
                               <td className="px-5 py-3">
                                 <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] ring-1 ${esJefe ? 'bg-blue-600 text-white ring-blue-400' : 'bg-primary/10 text-primary ring-primary/20'}`}>
                                      {esJefe ? <ShieldCheck className="h-4 w-4" /> : `${u.nombre.charAt(0)}${u.apellidos.charAt(0)}`}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-foreground flex items-center gap-2">
                                        {u.nombre} {u.apellidos} 
                                        {esJefe && <span className="text-[9px] bg-blue-600 text-white px-1.5 py-[1px] rounded uppercase font-black tracking-wider">Jefe</span>}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground">{u.programa?.nombre || 'Miembro del Equipo'}</span>
                                    </div>
                                 </div>
                               </td>
                               <td className="px-5 py-3">
                                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                                   esJefe ? 'bg-blue-600 text-white border-transparent' :
                                   u.rol === 'profesional' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                   u.rol === 'auxiliar' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                   'bg-gray-100 text-gray-700 border border-gray-200'
                                 }`}>
                                   {u.rol}
                                 </span>
                               </td>
                               <td className="px-5 py-3 font-sans text-xs text-muted-foreground">
                                 {u.documento}
                               </td>
                               <td className="px-5 py-3 text-right">
                                  <span className={`text-xs font-bold ${esJefe ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                                    {u.telefono || "—"}
                                  </span>
                               </td>
                             </tr>
                           )})}
                           
                           {terr.miembros.length === 0 && (
                             <tr>
                               <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground italic text-sm">
                                 No hay colaboradores asignados a este territorio.
                               </td>
                             </tr>
                           )}
                         </tbody>
                       </table>
                     </div>

                   </div>
                 )}
               </div>
             )
          })}
        </div>
      )}
    </div>
  )
}
