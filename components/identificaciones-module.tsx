"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/lib/auth-context"
import { 
  Database, ShieldAlert, AlertTriangle, Loader2, Download, Trash2, 
  Calendar, MapPin, Users, Eye, Edit, X, Save, Plus 
} from "lucide-react"
import { IdentificacionesWizard } from "./identificaciones-wizard"
import FacturaFicha from "@/components/ui/FacturaFicha"
import ResumenFicha from "@/components/ui/ResumenFicha"

export function IdentificacionesModule() {
  const { user, isSuperAdmin, isAdmin } = useAuth()
  const isAuxiliar = user?.rol === "auxiliar"

  // Obtenemos los datos desde el nuevo endpoint pasándole los parámetros según los permisos
  const apiUrl = user ? `/api/identificaciones?role=${user.rol}&territorioId=${user.territorioId || ''}` : null
  const { data: rawFichas, isLoading: loading, mutate: mutateFichas } = useSWR<any>(apiUrl, fetcher)
  const fichasData: any[] = Array.isArray(rawFichas) ? rawFichas : []

  const [exporting, setExporting] = useState(false)
  
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [showMicroModal, setShowMicroModal] = useState(false)
  const [selectedMicro, setSelectedMicro] = useState("M1")

  // Estados para Modal de Vista Detallada
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFichaDetail, setSelectedFichaDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Filtros visuales
  const [qHogar, setQHogar] = useState("")
  const [qEstado, setQEstado] = useState("")
  const [qBusqueda, setQBusqueda] = useState("")

  const filteredFichas = useMemo(() => {
    return fichasData.filter((f) => {
      const matchEstado = !qEstado || f.estadoVisita === qEstado
      const matchHogar = !qHogar || f.consecutivo.toString().includes(qHogar)
      
      const searchLine = `${f.encuestador?.documento} ${f.direccion} ${f.territorio} ${f.microterritorio}`.toLowerCase()
      const matchBusqueda = !qBusqueda || searchLine.includes(qBusqueda.toLowerCase())

      return matchEstado && matchHogar && matchBusqueda
    })
  }, [fichasData, qEstado, qHogar, qBusqueda])

  const handleDeleteFicha = async (id: string, consecutivo: number) => {
    if (!confirm(`PELIGRO: ¿Estás totalmente seguro de eliminar todo el registro de la Ficha #${consecutivo}? Esto borrará también a la familia e integrantes de forma irreversible.`)) return
    
    try {
      const resp = await fetch(`/api/identificaciones/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const d = await resp.json()
        alert(d.error || 'Error eliminando Ficha')
        return
      }
      mutateFichas()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleViewFicha = async (id: string) => {
    try {
      setLoadingDetail(true)
      setShowDetailModal(true)
      const res = await fetch(`/api/identificaciones/${id}`)
      if (!res.ok) throw new Error("Error al obtener detalle de la identificación")
      const data = await res.json()
      setSelectedFichaDetail(data)
    } catch (e: any) {
      alert(e.message)
      setShowDetailModal(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      if (filteredFichas.length === 0) return alert("No hay datos para exportar")

      const headers = [
        "Ficha", "Estado_Visita", "Territorio", "Microterritorio", 
        "Ubicacion_Desc", "Direccion", "Estrato", "EBS", "Num_Integrantes",
        "Encuestador_Nombre", "Encuestador_Doc", "Fecha_Creacion"
      ]

      const escapeCsv = (str?: string) => {
        if (!str) return '""';
        return `"${str.toString().replace(/"/g, '""')}"`;
      }

      const rows = filteredFichas.map(f => [
        escapeCsv(f.consecutivo.toString()),
        escapeCsv(f.estadoVisita === "1" ? "Efectiva" : f.estadoVisita === "2" ? "No Efectiva" : "Rechazada"),
        escapeCsv(f.territorio),
        escapeCsv(f.microterritorio),
        escapeCsv(f.descripcionUbicacion),
        escapeCsv(f.direccion),
        escapeCsv(f.estratoSocial?.toString()),
        escapeCsv(f.numEBS),
        escapeCsv(f.integrantesCount?.toString() || "0"),
        escapeCsv(f.encuestador ? `${f.encuestador.nombre} ${f.encuestador.apellidos}` : "Sin asignación"),
        escapeCsv(f.encuestador?.documento),
        escapeCsv(f.fechaDiligenciamiento.split("T")[0])
      ])

      const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n")
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `FichasHogar_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setExporting(false)
    }
  }

  const translateEstado = (s: string) => {
    switch (s) {
      case '1': return <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded text-xs">EFECTIVA</span>
      case '2': return <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-xs">NO EFECTIVA</span>
      case '3': return <span className="text-destructive font-bold bg-destructive/10 px-2 py-0.5 rounded text-xs">RECHAZADA</span>
      default: return <span>{s}</span>
    }
  }

  if (isWizardOpen) {
    return (
      <div className="w-full animate-in fade-in duration-500">
        <IdentificacionesWizard 
          territorioId={user?.territorioId || ''} 
          microterritorio={selectedMicro} 
          onClose={() => {
            setIsWizardOpen(false)
            mutateFichas()
          }}
          onViewSaved={(id) => {
            setIsWizardOpen(false)
            mutateFichas()
            handleViewFicha(id)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-card p-6 rounded-3xl shadow-sm border border-border print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Fichas Hogar (Identificaciones)</h1>
            <p className="text-sm text-muted-foreground font-medium">Gestión de identificaciones del territorio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exportando Datos...' : 'Exportar Fichas a CSV'}
            </button>
          )}

          {isAuxiliar && (
            <button
              onClick={() => setShowMicroModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nueva Ficha Familiar
            </button>
          )}
        </div>
      </div>

      {/* PANEL DE MÓDULO TABULAR */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden print:hidden">
        
        {/* FILTROS GENERALES */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Filtros de Búsqueda</p>
          <input 
            type="text" 
            placeholder="N° O Consecutivo Ficha" 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-background border-input outline-none focus:ring-2 focus:ring-primary min-w-[120px]" 
            value={qHogar} 
            onChange={e => setQHogar(e.target.value)} 
          />
          <input 
            type="text" 
            title="Buscar por documento de encuestador, código territorio o dirección"
            placeholder="Documento Aux / Dirección / Territorio" 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-background border-input outline-none focus:ring-2 focus:ring-primary min-w-[300px]" 
            value={qBusqueda} 
            onChange={e => setQBusqueda(e.target.value)} 
          />
          <select 
            className="px-4 py-2.5 border rounded-xl text-sm font-semibold bg-background border-input outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
            value={qEstado}
            onChange={e => setQEstado(e.target.value)}
          >
            <option value="">Cualquier Estado</option>
            <option value="1">Efectivas</option>
            <option value="2">No Efectivas</option>
            <option value="3">Rechazadas / Negadas</option>
          </select>
        </div>

        {/* CONTENIDO TABULAR */}
        {loading ? (
          <div className="h-48 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredFichas.length === 0 ? (
          <div className="h-48 flex flex-col justify-center items-center text-muted-foreground text-sm">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-30" />
            No existen fichas registradas bajo tu perfil territorial
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-widest whitespace-nowrap">
                  <th className="font-bold py-4 px-6 border-b border-border">Ficha #</th>
                  <th className="font-bold py-4 px-6 border-b border-border">Estado</th>
                  <th className="font-bold py-4 px-6 border-b border-border">Ubicación Territorio</th>
                  <th className="font-bold py-4 px-6 border-b border-border">Integrantes</th>
                  <th className="font-bold py-4 px-6 border-b border-border">Encuestador Creador</th>
                  <th className="font-bold py-4 px-6 border-b border-border">Fecha Inicio</th>
                  <th className="font-bold py-4 px-6 border-b border-border text-right">Manejo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredFichas.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-black text-foreground">#{f.consecutivo}</p>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {translateEstado(f.estadoVisita)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {f.territorio} <span className="text-muted-foreground">|</span> {f.microterritorio}
                        </div>
                        <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                          {f.direccion}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        {f.integrantesCount} Fam.
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-bold text-foreground truncate max-w-[150px]">
                        {f.encuestador ? `${f.encuestador.nombre} ${f.encuestador.apellidos}` : <span className="text-muted-foreground">Sin Autor</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {f.encuestador ? f.encuestador.documento : 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-4 h-4" />
                        {f.fechaDiligenciamiento.split("T")[0]}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
                      <button 
                        onClick={() => handleViewFicha(f.id)}
                        className="inline-flex p-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                        title="Ver Identidad Detallada"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isSuperAdmin && (
                        <button 
                          onClick={() => handleDeleteFicha(f.id, f.consecutivo)}
                          className="inline-flex p-2 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                          title="Eliminar Base Ficha Completamente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showMicroModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden text-center">
            <div className="p-6 border-b border-border bg-muted/30 flex flex-col items-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Nueva Identificación</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
                ¿Estás seguro de que deseas iniciar una nueva identificación para este territorio? Asegúrate de que el hogar no haya sido identificado anteriormente.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Selecciona el Microterritorio</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background font-semibold text-sm focus:ring-2 focus:ring-primary outline-none"
                  value={selectedMicro}
                  onChange={(e) => setSelectedMicro(e.target.value)}
                >
                  <option value="M1">Microterritorio 1</option>
                  <option value="M2">Microterritorio 2</option>
                  <option value="M3">Microterritorio 3</option>
                  <option value="M4">Microterritorio 4</option>
                </select>
              </div>
            </div>
            <div className="flex bg-muted/50 border-t border-border p-4 gap-3">
              <button 
                onClick={() => setShowMicroModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-input bg-background hover:bg-muted transition-colors text-foreground text-sm shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowMicroModal(false)
                  setIsWizardOpen(true)
                }}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISTA DETALLADA Y PRINT */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[200] flex justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:inset-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-border print:shadow-none print:border-none print:rounded-none print:overflow-visible print:my-0">

            <div className="p-0 bg-gray-50/50 relative print:bg-white print:overflow-visible">
              {loadingDetail ? (
                <div className="h-[50vh] flex flex-col gap-4 items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-muted-foreground font-semibold animate-pulse">Cargando expediente matriz...</p>
                </div>
              ) : selectedFichaDetail ? (
                <>
                  <div className="max-h-[85vh] overflow-y-auto relative print:hidden">
                    <ResumenFicha 
                      ficha={selectedFichaDetail} 
                      onClose={() => { setShowDetailModal(false); setSelectedFichaDetail(null); }} 
                    />
                  </div>
                  {/* Elemento reservado SÓLO para el momento crítico de imprimir */}
                  <div className="hidden print:block w-full h-auto bg-white overflow-visible">
                    <FacturaFicha ficha={selectedFichaDetail} showOnScreen={false} />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground mt-10 p-10">
                  <p>Expediente no localizado.</p>
                  <button 
                    onClick={() => { setShowDetailModal(false); setSelectedFichaDetail(null); }}
                    className="mt-4 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-xl"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
