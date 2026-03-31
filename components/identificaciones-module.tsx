"use client"

import { useState, useMemo } from "react"
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

  // Filtros visuales
  const [qHogar, setQHogar] = useState("")
  const [qEstado, setQEstado] = useState("")
  const [qBusqueda, setQBusqueda] = useState("")

  const filteredFichas = useMemo(() => {
    return fichasData.filter((f) => {
      const matchEstado = !qEstado || f.estadoVisita === qEstado
      
      const searchElements = [
        f.encuestador?.documento,
        f.encuestador?.nombre,
        f.direccion,
        f.microterritorio,
        ...(f.integrantesDocs || [])
      ].filter(Boolean).map(String).join(' ').toLowerCase()

      const matchBusqueda = !qBusqueda || searchElements.includes(qBusqueda.toLowerCase())

      return matchEstado && matchBusqueda
    })
  }, [fichasData, qEstado, qBusqueda])

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
      const exportUrl = user ? `/api/identificaciones/exportar?role=${user.rol}&territorioId=${user.territorioId || ''}&userId=${user.id || ''}` : '/api/identificaciones/exportar'
      
      const response = await fetch(exportUrl)
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
    } catch (e: any) {
      alert(e.message)
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
        const text = e.target?.result as string
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
      reader.readAsText(importFile)
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
        
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
          {isSuperAdmin && (
             <button
               disabled={isImporting}
               onClick={() => setShowImportModal(true)}
               className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
             >
               <Upload className="h-4 w-4" />
               Importar CSV
             </button>
          )}
          <button
            disabled={exporting}
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {user?.rol === 'auxiliar' ? 'Descargar Mis Identificaciones' : 'Descargar Todo'}
          </button>
          {(isAuxiliar || isSuperAdmin) && (
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Nueva Identificación
            </button>
          )}
        </div>
      </div>
    </div>

      {/* PANEL DE MÓDULO TABULAR */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden print:hidden">
        
        {/* FILTROS GENERALES */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">Filtros de Búsqueda</p>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              title="Buscar por documento de integrante, documento encuestador, microterritorio o dirección"
              placeholder="C.C. Paciente / Encuestador / Micro / Dir" 
              className="pl-9 pr-4 py-2.5 border rounded-xl text-sm font-semibold bg-background border-input outline-none focus:ring-2 focus:ring-primary min-w-[320px]" 
              value={qBusqueda} 
              onChange={e => setQBusqueda(e.target.value)} 
            />
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
                  <option value="MT01">Microterritorio 1</option>
                  <option value="MT02">Microterritorio 2</option>
                  <option value="MT03">Microterritorio 3</option>
                  <option value="MT04">Microterritorio 4</option>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
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
    </div>
  )
}
