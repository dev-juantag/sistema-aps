"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/lib/auth-context"
import { 
  Database, ShieldAlert, AlertTriangle, Loader2, Download, Trash2, 
  Calendar, MapPin, Users, Eye, Edit, X, Save, Plus, Upload, FileSpreadsheet, Search 
} from "lucide-react"
import { IdentificacionesWizard } from "./identificaciones-wizard"
import FacturaFicha from "@/components/ui/FacturaFicha"
import ResumenFicha from "@/components/ui/ResumenFicha"
import { toast } from "sonner"
import ConfirmModal from "@/components/ui/ConfirmModal"

export function IdentificacionesModule() {
  const { user, isSuperAdmin, isAdmin } = useAuth()
  const isAuxiliar = user?.rol === "auxiliar"

  const [qBusqueda, setQBusqueda] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 50

  const [myIdentifications, setMyIdentifications] = useState(false)
  
  const apiUrl = user ? `/api/identificaciones?role=${user.rol}&territorioId=${user.territorioId || ''}&page=${page}&limit=${limit}${activeSearch ? `&search=${encodeURIComponent(activeSearch)}` : ''}${myIdentifications ? '&myOnly=true' : ''}` : null
  const { data: rawFichas, isLoading: loading, mutate: mutateFichas } = useSWR<any>(apiUrl, fetcher)
  
  const { data: rawProgramas } = useSWR<any>("/api/programas", fetcher)
  const programas: any[] = Array.isArray(rawProgramas) ? rawProgramas : []



  const isEnfermeria = () => {
    if (!user || user.rol !== 'profesional' || !user.programaId) return false;
    const prog = programas.find((p: any) => String(p.id) === String(user.programaId));
    return prog ? prog.nombre.toLowerCase().includes('enfermer') : false;
  }

  
  const fichasData: any[] = rawFichas?.fichas || (Array.isArray(rawFichas) ? rawFichas : [])
  const pagination = rawFichas?.pagination || { page: 1, totalPages: 1, totalCount: fichasData.length }

  const [exporting, setExporting] = useState(false)
  
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [showMicroModal, setShowMicroModal] = useState(false)
  const [selectedMicro, setSelectedMicro] = useState("MT01")

  // Estados para Modal de Vista Detallada
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFichaDetail, setSelectedFichaDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editFicha, setEditFicha] = useState<any>(null)

  // Importación
  const [showImportModal, setShowImportModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<{success?: string, error?: string, errors?: string[]} | null>(null)

  const [showNewIdConfirm, setShowNewIdConfirm] = useState(false)
  const [deleteConfirmFicha, setDeleteConfirmFicha] = useState<{id: string, consecutivo: number} | null>(null)
  
  useEffect(() => {
    if (showDetailModal || showNewIdConfirm || showImportModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    }
  }, [showDetailModal, showNewIdConfirm, showImportModal])
  
  // Mostrar aviso de vacío
  const [notifiedEmpty, setNotifiedEmpty] = useState(false)
  
  useEffect(() => {
    if (!loading && fichasData && fichasData.length === 0 && !notifiedEmpty && !activeSearch) {
      if (user?.rol === 'auxiliar') {
        toast.warning("Aviso: No tienes identificaciones registradas en este territorio.", { duration: 5000 })
      }
      setNotifiedEmpty(true)
    }
  }, [loading, fichasData, notifiedEmpty, activeSearch, user?.rol])

  // Filtros visuales adicionales
  const [qHogar, setQHogar] = useState("")
  const [qEstado, setQEstado] = useState("")

  const handleSearch = () => {
    setActiveSearch(qBusqueda)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  const filteredFichas = useMemo(() => {
    return fichasData.filter((f) => {
      const matchEstado = !qEstado || f.estadoVisita === qEstado
      return matchEstado
    })
  }, [fichasData, qEstado])

  // Reset page to 1 if user types in search so they don't get stuck on empty pages
  // (Though note that filtering only applies to the current fetched page)
  // To avoid circular or frequent updates, we don't automatically reset page here, 
  // but it's something to consider for future advanced search.

  const handleDeleteFicha = (id: string, consecutivo: number) => {
    setDeleteConfirmFicha({ id, consecutivo })
  }

  const executeDeleteFicha = async () => {
    if (!deleteConfirmFicha) return
    const { id, consecutivo } = deleteConfirmFicha
    setDeleteConfirmFicha(null)
    const toastId = toast.loading(`Eliminando ficha #${consecutivo}...`)
    try {
      const resp = await fetch(`/api/identificaciones/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const d = await resp.json()
        toast.error(d.error || 'Error eliminando Ficha', { id: toastId })
        return
      }
      toast.success("Ficha eliminada correctamente", { id: toastId })
      mutateFichas()
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
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
      toast.error(e.message)
      setShowDetailModal(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    const toastId = toast.loading("Preparando exportación...")
    try {
      const exportUrl = user ? `/api/identificaciones/exportar?role=${user.rol}&territorioId=${user.territorioId || ''}&userId=${user.id || ''}` : '/api/identificaciones/exportar'
      
      const token = localStorage.getItem("salud-pereira-token");
      const response = await fetch(exportUrl, {
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      })
      if (!response.ok) throw new Error("Error al exportar los datos")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Base_Completa_Identificaciones_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Exportación descargada", { id: toastId })
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const link = document.createElement("a")
    link.href = "/plantilla_importar_identificaciones.csv"
    link.download = "plantilla_importar_identificaciones.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    if (!importFile) return
    setIsImporting(true)
    setImportStatus(null)
    
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer
        const decoder = new TextDecoder('utf-8')
        let text = decoder.decode(buffer)
        
        // Detectar si UTF-8 falló (caracteres extraños como ) o si parece estar en Latin-1
        // Un indicio común es buscar el carácter de reemplazo  (U+FFFD)
        if (text.includes('\uFFFD')) {
          const isoDecoder = new TextDecoder('iso-8859-1')
          text = isoDecoder.decode(buffer)
        }

        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
        if (lines.length < 2) {
          setImportStatus({ error: "El archivo está vacío o no tiene datos" })
          setIsImporting(false)
          return
        }

        const resp = await fetch('/api/identificaciones/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: text })
        })

        const result = await resp.json()
        if (resp.ok) {
          setImportStatus({ 
            success: result.message || `Importación exitosa: ${result.imported} fichas creadas.`,
            errors: result.errors
          })
          mutateFichas()
        } else {
          setImportStatus({ error: result.error || "Error en la importación" })
        }
        setIsImporting(false)
      }
      reader.readAsArrayBuffer(importFile)
    } catch (err) {
      setImportStatus({ error: "Error de lectura de archivo" })
      setIsImporting(false)
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
          existingFicha={editFicha}
          onClose={() => {
            setIsWizardOpen(false)
            setEditFicha(null)
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
    <div className="flex flex-col gap-6 w-full pb-10">
      
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
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSuperAdmin && (
             <button
               disabled={isImporting}
               onClick={() => setShowImportModal(true)}
               className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
             >
               <Upload className="h-4 w-4" />
               Importar CSV
             </button>
          )}
          {(isSuperAdmin || isAdmin || isEnfermeria()) && (
            <button
              disabled={exporting}
              onClick={handleExport}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto text-center"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="whitespace-nowrap sm:whitespace-normal">
                {user?.rol === 'auxiliar' ? 'Descargar Excel' : 'Descargar Todo'}
              </span>
            </button>
          )}
          </div>
          {(isAuxiliar || isSuperAdmin) && (
            <button
              onClick={() => setShowNewIdConfirm(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm hover:shadow-md w-full sm:w-auto text-center whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Nueva identificación
            </button>
          )}
        </div>
      </div>

      {/* PANEL DE MÓDULO TABULAR */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden print:hidden">
        
        {/* FILTROS GENERALES */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Filtros de Búsqueda</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                title="Buscar por documento de integrante, documento encuestador, microterritorio o dirección"
                placeholder="C.C. Paciente / Encuestador / Micro / Dir" 
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-semibold bg-background border-input outline-none focus:ring-2 focus:ring-primary" 
                value={qBusqueda} 
                onChange={e => setQBusqueda(e.target.value)} 
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={handleSearch}
                className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
              >
                Buscar
              </button>
              {activeSearch && (
                <button 
                  onClick={() => { setQBusqueda(""); setActiveSearch(""); setPage(1); }}
                  className="w-full sm:w-auto px-4 py-2.5 border border-border bg-background text-foreground font-bold rounded-xl shadow-sm hover:bg-muted transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
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

          {isAuxiliar && (
            <button
              onClick={() => { setMyIdentifications(!myIdentifications); setPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                myIdentifications 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                  : 'bg-background text-foreground border-border hover:bg-muted'
              }`}
            >
              <Users className="w-4 h-4" />
              Mis Identificaciones
            </button>
          )}
        </div>

        {/* CONTENIDO TABULAR */}
        {loading ? (
          <div className="h-48 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredFichas.length === 0 ? (
          <div className="h-48 flex flex-col justify-center items-center text-muted-foreground text-sm p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ShieldAlert className="w-10 h-10 mb-4 opacity-40 text-orange-500" />
            <p className="font-black text-lg text-foreground mb-1 tracking-tight">
              {myIdentifications ? "Aún no has creado identificaciones" : "No existen fichas registradas"}
            </p>
            <p className="max-w-md text-muted-foreground font-medium">
              {myIdentifications 
                ? "Bajo tu usuario no se registran fichas en este territorio. ¡Haz clic en el botón superior para comenzar la primera!"
                : "No se encontraron resultados disponibles para los filtros aplicados bajo este perfil de acceso."}
            </p>
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
                  <th className="font-bold py-4 px-6 border-b border-border">Fecha Diligenciamiento</th>
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

        {/* PAGINACIÓN */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground font-medium">
              Mostrando página <span className="font-bold text-foreground">{pagination.page}</span> de <span className="font-bold text-foreground">{pagination.totalPages}</span>
              {' '}(Total: {pagination.totalCount} registros)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-4 py-2 border border-border bg-background hover:bg-muted text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border border-border bg-background hover:bg-muted text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>



      {/* MODAL VISTA DETALLADA Y PRINT */}
      {showDetailModal && (
        <div 
          className="fixed inset-0 z-[200] flex justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto print:static print:bg-white print:p-0 print:overflow-visible print:inset-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailModal(false);
              setSelectedFichaDetail(null);
            }
          }}
        >
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
                      onStartNew={(micro: string) => {
                        setShowDetailModal(false); 
                        setSelectedFichaDetail(null);
                        setSelectedMicro(micro);
                        setIsWizardOpen(true);
                      }}
                      onEnableUpdate={async (id, current) => {
                        await fetch(`/api/identificaciones/${id}/actualizar`, {
                          method: 'PATCH', body: JSON.stringify({ puedeActualizarse: !current })
                        });
                        setSelectedFichaDetail({...selectedFichaDetail, puedeActualizarse: !current})
                        mutateFichas()
                      }}
                      onGoToEdit={() => {
                        setShowDetailModal(false)
                        setEditFicha(selectedFichaDetail)
                        setIsWizardOpen(true)
                      }}
                      onRefreshFicha={() => handleViewFicha(selectedFichaDetail.id)}
                    />
                  </div>
                  {/* Elemento reservado SÓLO para el momento crítico de imprimir */}
                  <div className="fixed top-[-9999px] left-[-9999px] print:static print:top-auto print:left-auto print:block w-[1024px] print:w-full bg-white overflow-visible">
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

      {/* Import Modal */}
      {/* MODAL CONFIRMACIÓN NUEVA IDENTIFICACIÓN */}
      {showNewIdConfirm && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto w-full h-full"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewIdConfirm(false) }}
        >
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300 border-none overflow-y-auto max-h-[90vh]">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mb-6 border border-orange-100 shadow-inner">
                <ShieldAlert className="w-10 h-10" />
              </div>
              
              <h2 className="text-3xl font-black text-orange-600 mb-4 tracking-tight">
                Nueva Identificación
              </h2>
              
              <p className="text-slate-600 font-medium text-lg leading-relaxed mb-6 px-4 text-center">
                ¿Estás seguro de que deseas iniciar una nueva identificación para este territorio? 
              </p>

              <div className="w-full bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-left">
                  Selecciona el Microterritorio (MT)
                </label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-white font-bold text-slate-700 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all appearance-none cursor-pointer"
                  value={selectedMicro}
                  onChange={(e) => setSelectedMicro(e.target.value)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1.25rem center',
                    backgroundSize: '1.25rem'
                  }}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={`MT0${num}`}>
                      Microterritorio {num} (MT0{num})
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-[11px] text-slate-400 font-bold uppercase text-left">
                  📍 Requerido para la ubicación exacta del hogar
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setShowNewIdConfirm(false)}
                  className="rounded-2xl border-2 border-slate-100 bg-white px-6 py-4 text-lg font-black text-slate-500 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowNewIdConfirm(false)
                    setIsWizardOpen(true)
                  }}
                  className="rounded-2xl bg-orange-500 px-6 py-4 text-lg font-black text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                >
                  Sí, iniciar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto w-full h-full"
          onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false) }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg overflow-y-auto max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Importar Identificaciones</h2>
              <button 
                onClick={() => setShowImportModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Sube un archivo CSV con la información demográfica base.
              </p>

              <button
                onClick={handleDownloadTemplate}
                className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors w-full"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Descargar Plantilla CSV
              </button>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-sm font-medium text-foreground">Archivo CSV (Separado por ;)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              {importStatus && (
                <div className={`p-3 rounded-lg text-sm ${importStatus?.error ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {importStatus?.error || importStatus?.success}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                  disabled={isImporting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                  disabled={!importFile || isImporting}
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isImporting ? "Importando..." : "Subir e Importar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmFicha}
        title="Eliminar Ficha"
        message={`PELIGRO: ¿Estás totalmente seguro de eliminar todo el registro de la Ficha #${deleteConfirmFicha?.consecutivo}? Esto borrará también a la familia e integrantes de forma irreversible.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        danger={true}
        onConfirm={() => {
          if (deleteConfirmFicha) executeDeleteFicha()
        }}
        onCancel={() => setDeleteConfirmFicha(null)}
      />
    </div>
  )
}
