"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  type Atencion,
} from "@/lib/data"
import {
  TIPO_DOCUMENTO,
  SEXO,
  REGIMEN_SALUD,
  calcularEdad,
  calcularCursoVida
} from "@/lib/constants"
import {
  Plus,
  Search,
  ChevronLeft,
  Calendar,
  User,
  FileText,
  Stethoscope,
  Eye,
  Download,
  X,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { useEffect } from "react"

type SubView = "list" | "form" | "detail"

export function AtencionesModule() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const [subView, setSubView] = useState<SubView>("list")
  const [selectedAtencion, setSelectedAtencion] = useState<Atencion | null>(null)
  const [search, setSearch] = useState("")
  const [filterPrograma, setFilterPrograma] = useState("")
  const [filterTime, setFilterTime] = useState("all")
  const [refreshKey, setRefreshKey] = useState(0)

  // Estado de exportación
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportType, setExportType] = useState<"currentStage" | "all" | "range">("currentStage")
  const [exportStart, setExportStart] = useState("")
  const [exportEnd, setExportEnd] = useState("")
  const [showExportAlert, setShowExportAlert] = useState(false)

  const atencionesUrl = isAdmin ? "/api/atenciones" : (user ? `/api/atenciones?profesionalId=${user.id}` : null)
  const { data: atencionesData, error: errAt, mutate: mutateAtenciones } = useSWR(atencionesUrl, fetcher)
  const { data: stageData, error: errSt } = useSWR(user ? "/api/settings/stage" : null, fetcher)
  const { data: programasData, error: errPr } = useSWR(user ? "/api/programas" : null, fetcher)

  const loading = !atencionesData || !stageData || !programasData
  const atenciones: Atencion[] = useMemo(() => Array.isArray(atencionesData) ? atencionesData : [], [atencionesData])
  const programas: {id: string, nombre: string}[] = useMemo(() => Array.isArray(programasData) ? programasData : [], [programasData])
  const currentStageStart: string | null = useMemo(() => stageData?.currentStageStart || null, [stageData])
  
  // Exponemos la función de mutate para cuando se crea o elimina un registro
  const triggerRefresh = () => {
    mutateAtenciones()
  }

  const filtered = useMemo(() => {
    return atenciones.filter((a) => {
      let roleAllowed = true;
      if (!isAdmin && currentStageStart) {
        if (new Date(a.fecha + "T00:00:00") < new Date(currentStageStart)) {
          roleAllowed = false;
        }
      }

      const matchSearch =
        !search ||
        a.pacienteNombre.toLowerCase().includes(search.toLowerCase()) ||
        a.pacienteDocumento.includes(search)
      const matchPrograma = !filterPrograma || a.programaId === filterPrograma
      
      let matchTime = true
      if (filterTime !== "all") {
        if (filterTime === "today") {
          const todayStr = new Date().toISOString().split('T')[0]
          matchTime = a.fecha === todayStr
        } else {
          const atencionDate = new Date(a.fecha + "T00:00:00")
          const now = new Date()
          now.setHours(0,0,0,0)
          
          const timeDiff = now.getTime() - atencionDate.getTime()
          const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24))
          
          if (filterTime === "30days") {
            matchTime = diffDays <= 30 && diffDays >= 0
          } else if (filterTime === "7days") {
            matchTime = diffDays <= 7 && diffDays >= 0
          }
        }
      }

      return matchSearch && matchPrograma && matchTime && roleAllowed
    })
  }, [atenciones, search, filterPrograma, filterTime, isAdmin, currentStageStart])

  const handleCreated = () => {
    triggerRefresh()
    setSubView("list")
  }

  if (subView === "form") {
    return <AtencionForm onBack={() => setSubView("list")} onCreated={handleCreated} programas={programas} />
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar esta atención? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/atenciones/${id}`, { method: "DELETE" });
      if (res.ok) {
        triggerRefresh()
      } else {
        const error = await res.json();
        alert(error.error || "Error al eliminar la atención");
      }
    } catch (e) {
      console.error(e);
      alert("Error al eliminar la atención");
    }
  }

  if (subView === "detail" && selectedAtencion) {
    return (
      <AtencionDetail 
        atencion={selectedAtencion}
        programas={programas}
        onBack={() => {
          setSubView("list")
          setSelectedAtencion(null)
        }} 
      />
    )
  }

  const handleExport = () => {
    let toExport = atenciones;

    if (!isSuperAdmin && currentStageStart) {
      toExport = toExport.filter(a => new Date(a.fecha + "T00:00:00") >= new Date(currentStageStart));
    }

    if (exportType === "currentStage" && currentStageStart) {
      toExport = toExport.filter(a => new Date(a.fecha + "T00:00:00") >= new Date(currentStageStart));
    } else if (exportType === "range") {
      toExport = atenciones.filter(a => {
        const afterStart = !exportStart || a.fecha >= exportStart;
        const beforeEnd = !exportEnd || a.fecha <= exportEnd;
        return afterStart && beforeEnd;
      });
    }

    if (toExport.length === 0) {
      alert("No hay atenciones para exportar en el rango seleccionado");
      return;
    }

    const calcularEdad = (fechaNac: string) => {
      if (!fechaNac) return "";
      const birth = new Date(fechaNac);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    const headers = [
      "Fecha y Hora de registro", "Paciente Nombre", "Documento", "Tipo_Doc", "Genero", 
      ...(isSuperAdmin ? ["Telefono"] : []), "Direccion", "Edad", "Fecha_Nacimiento", "Programa", 
      "Profesional", "Nota_Valoracion"
    ]
    
    const escapeCsv = (str?: string) => {
      if (!str) return '""';
      return `"${str.toString().replace(/"/g, '""')}"`;
    }

    const rows = toExport.map(a => [
      escapeCsv(a.createdAtISO ? new Date(a.createdAtISO).toLocaleString('es-CO') : a.fecha),
      escapeCsv(a.pacienteNombre),
      escapeCsv(a.pacienteDocumento),
      escapeCsv(a.pacienteTipoDoc),
      escapeCsv(a.pacienteGenero),
      ...(isSuperAdmin ? [escapeCsv(a.pacienteTelefono)] : []),
      escapeCsv(a.pacienteDireccion),
      calcularEdad(a.pacienteFechaNac)?.toString() || "",
      a.pacienteFechaNac || "",
      escapeCsv(programas.find(p => p.id === a.programaId)?.nombre),
      escapeCsv(a.profesionalNombre),
      escapeCsv(a.notaValoracion)
    ])
    
    // Auditory Watermark Metadata
    const watermark = [
      ["=== DOCUMENTO DE USO EXCLUSIVO Y CONFIDENCIAL ==="],
      ["Este documento contiene información sensible protegida por la Ley 1581 de 2012 (datos personales)."],
      [`Generado por: ${user?.nombre} ${user?.apellidos}`],
      [`Rol: ${user?.rol}`],
      [`Fecha y Hora de descarga: ${new Date().toLocaleString('es-CO')}`],
      ["--------------------------------------------------"],
      []
    ]

    // Usamos punto y coma (;) en vez de coma (,) para que Excel en español separe bien las columnas.
    const csvContent = "\uFEFF" + 
      watermark.map(e => e.join(";")).join("\n") + "\n" +
      headers.join(";") + "\n" + 
      rows.map(e => e.join(";")).join("\n")
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `atenciones_${exportType === "all" ? "historial" : (exportStart||"inicio")+"_al_"+(exportEnd||"fin")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setShowExportModal(false)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atenciones</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Historial completo de atenciones registradas"
              : "Historial de tus atenciones registradas"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Descargar Excel
          </button>
          {(!isAdmin || isSuperAdmin) && (
            <button
              onClick={() => setSubView("form")}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nueva atencion
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>
        {isAdmin && (
          <select
            value={filterPrograma}
            onChange={(e) => setFilterPrograma(e.target.value)}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          >
            <option value="">Todos los programas</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
        >
          <option value="all">Todas las atenciones</option>
          <option value="today">Hoy</option>
          <option value="7days">Últimos 7 días</option>
          <option value="30days">Últimos 30 días</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "atencion encontrada" : "atenciones encontradas"}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Paciente</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">
                  Documento
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden md:table-cell">
                  Programa
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden lg:table-cell">
                  Profesional
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden xl:table-cell">
                  Nota
                </th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando atenciones...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron atenciones.
                  </td>
                </tr>
              ) : (
                (() => {
                  const limitDate = currentStageStart ? new Date(currentStageStart) : new Date(0)
                  const currentAtenciones = isAdmin && currentStageStart 
                    ? filtered.filter(a => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) >= limitDate)
                    : filtered;
                  const historicalAtenciones = isAdmin && currentStageStart
                    ? filtered.filter(a => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) < limitDate)
                    : [];

                  const renderRow = (a: Atencion) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">{a.fecha}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.pacienteNombre}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {a.pacienteDocumento}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {a.pacienteTelefono}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {programas.find(p => p.id === a.programaId)?.nombre || "Desconocido"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {a.profesionalNombre}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell max-w-xs truncate">
                        {a.notaValoracion}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedAtencion(a)
                              setSubView("detail")
                            }}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted"
                            title="Ver detalles"
                            aria-label="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                              title="Eliminar atención"
                              aria-label="Eliminar atención"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );

                  return (
                    <>
                      {currentAtenciones.map(renderRow)}
                      
                      {historicalAtenciones.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={8} className="px-4 py-2 bg-muted/20 border-y border-border text-xs font-semibold text-muted-foreground uppercase opacity-80 tracking-wide text-center">
                              Atenciones anteriores / Histórico
                            </td>
                          </tr>
                          {historicalAtenciones.map(renderRow)}
                        </>
                      )}
                    </>
                  )
                })()
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Exportar Atenciones</h2>
              <button 
                onClick={() => setShowExportModal(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Opciones de exportación</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as "currentStage" | "all" | "range")}
                  className="form-input"
                >
                  <option value="currentStage">{isSuperAdmin ? "Etapa Actual" : "Descargar atenciones"}</option>
                  {isSuperAdmin && <option value="all">Todo el historial</option>}
                  <option value="range">Rango de fechas</option>
                </select>
              </div>

              {exportType === "range" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Fecha inicio</label>
                    <input
                      type="date"
                      value={exportStart}
                      onChange={(e) => setExportStart(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-foreground">Fecha fin</label>
                    <input
                      type="date"
                      value={exportEnd}
                      onChange={(e) => setExportEnd(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowExportAlert(true)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  Descargar (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Alert Modal for Export */}
      {showExportAlert && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-md rounded-xl border border-destructive bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Advertencia de Seguridad</h2>
            </div>
            
            <p className="text-foreground text-sm mb-4">
              Está a punto de exportar datos sensibles de salud. ¿Desea continuar?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowExportAlert(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowExportAlert(false)
                  handleExport()
                }}
                className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Sí, Exportar y Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────── Form Sub-component ────────────

function AtencionForm({
  onBack,
  onCreated,
  programas,
}: {
  onBack: () => void
  onCreated: () => void
  programas: {id: string, nombre: string}[]
}) {
  const { user } = useAuth()

  const [programaId, setProgramaId] = useState(user?.programaId || "")

  const availableProgramas = useMemo(() => {
    if (user?.rol === "admin") return programas
    if (user?.rol === "profesional" && user.programaId) {
      return programas.filter((p) => p.id === user.programaId)
    }
    return programas
  }, [programas, user])

  // Asegurar que programaId esté configurado correctamente
  useEffect(() => {
    if (user?.rol === "profesional") {
      if (user.programaId) {
        setProgramaId(user.programaId)
      } else if (availableProgramas.length === 1 && !programaId) {
        setProgramaId(availableProgramas[0].id)
      }
    }
  }, [user, availableProgramas, programaId])
  const [nombrePaciente, setNombrePaciente] = useState("")
  const [tipoDocumento, setTipoDocumento] = useState("")
  const [documentoPaciente, setDocumentoPaciente] = useState("")
  const [genero, setGenero] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [regimen, setRegimen] = useState("")
  const [eapb, setEapb] = useState("")
  const [notaValoracion, setNotaValoracion] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSearchingPaciente, setIsSearchingPaciente] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pacienteExistente, setPacienteExistente] = useState(false)

  const shouldDisablePacienteInfo = pacienteExistente && user?.rol !== "admin"

  // 1. Efecto onBlur para buscar auto-rellenar paciente
  const handleDocumentoBlur = async () => {
    if (!documentoPaciente.trim()) {
      setPacienteExistente(false)
      return
    }

    setIsSearchingPaciente(true)
    try {
      const res = await fetch(`/api/pacientes?documento=${documentoPaciente.trim()}`)
      if (res.ok) {
        setPacienteExistente(true)
        const paciente = await res.json()
        setNombrePaciente(paciente.nombreCompleto)
        
        // Match exact strings if present in TIPO_DOCUMENTO
        if (TIPO_DOCUMENTO.some(t => t.id === paciente.tipoDocumento || t.label === paciente.tipoDocumento)) {
          setTipoDocumento(paciente.tipoDocumento)
        } else {
          setTipoDocumento(paciente.tipoDocumento || '') // set arbitrarily as it comes from API
        }

        // Match exact strings for SEXO
        if (SEXO.some(s => s.id === paciente.genero || s.label === paciente.genero)) {
          setGenero(paciente.genero)
        } else {
          setGenero(paciente.genero || '')
        }

        setTelefono(paciente.telefono || '')
        setDireccion(paciente.direccion || '')
        setRegimen(paciente.regimen || '')
        setEapb(paciente.eapb || '')
        // Extraer solo la fecha local (YYYY-MM-DD)
        const fechaFormat = paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento).toISOString().split('T')[0] : ''
        setFechaNacimiento(fechaFormat)
      } else {
        setPacienteExistente(false)
        // Opcional: limpiar los demás campos si el usuario cambió el número por error y no existe
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearchingPaciente(false)
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!programaId) e.programaId = "Seleccione un programa"
    
    // Validar nombre (2 a 4 palabras, solo letras)
    const nombreLimpio = nombrePaciente.trim()
    const palabras = nombreLimpio.split(/\s+/)
    if (!nombreLimpio) {
      e.nombrePaciente = "Ingrese el nombre del paciente"
    } else if (palabras.length < 2 || palabras.length > 4) {
      e.nombrePaciente = "Debe ingresar entre 2 y 4 nombres/apellidos."
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombreLimpio)) {
      e.nombrePaciente = "El nombre solo puede contener letras"
    }

    // Validar telefono (exactamente 10 digitos y empieza con 3)
    if (!telefono.trim()) {
      e.telefono = "Ingrese el telefono"
    } else if (telefono.length !== 10 || !telefono.startsWith("3")) {
      e.telefono = "El telefono debe tener 10 digitos y comenzar por 3"
    }

    if (!direccion.trim()) e.direccion = "Ingrese la direccion"

    // Validar fecha nacimiento y tipo de documento logica
    if (!fechaNacimiento) {
      e.fechaNacimiento = "Seleccione la fecha de nacimiento"
    } else {
      const birthDate = new Date(fechaNacimiento + "T00:00:00")
      const now = new Date()
      if (birthDate > now) {
        e.fechaNacimiento = "La fecha no puede ser en el futuro"
      } else {
        let age = now.getFullYear() - birthDate.getFullYear()
        const m = now.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
          age--
        }

        // Validacion de documento unificada
        if (tipoDocumento !== "CE" && tipoDocumento !== "PPT" && tipoDocumento !== "PA") {
          if (age < 7 && tipoDocumento !== "RC" && tipoDocumento !== "MS" && tipoDocumento !== "NUIP") {
            e.tipoDocumento = "Menores de 7 años solo pueden usar Registro civil/NUIP/MS"
          } else if (age >= 7 && age < 14 && tipoDocumento !== "RC" && tipoDocumento !== "TI") {
            e.tipoDocumento = "De 7 a 13 años: Registro civil o Tarjeta de identidad"
          } else if (age >= 14 && age < 18 && tipoDocumento !== "TI") {
            e.tipoDocumento = "De 14 a 17 años: solo Tarjeta de identidad"
          } else if (age >= 18 && tipoDocumento !== "CC") {
            e.tipoDocumento = "Mayores de 18 años: documento de adultos (Cédula CC)"
          }
        }
      }
    }

    if (!tipoDocumento) e.tipoDocumento = "Seleccione el tipo de documento"
    if (!documentoPaciente.trim()) e.documentoPaciente = "Ingrese el documento"
    if (!genero) e.genero = "Seleccione el genero"
    
    if (!notaValoracion.trim()) e.notaValoracion = "Ingrese la nota de valoracion"
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/atenciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programaId,
          pacienteNombre: nombrePaciente.trim(),
          pacienteDocumento: documentoPaciente.trim(),
          pacienteTipoDoc: tipoDocumento,
          pacienteGenero: genero,
          pacienteTelefono: telefono.trim(),
          pacienteDireccion: direccion.trim(),
          pacienteFechaNac: fechaNacimiento,
          notaValoracion: notaValoracion.trim(),
          profesionalId: user!.id,
          // Mapeos antiguos de variables que coinciden con nuestra nueva API
          nombreCompleto: nombrePaciente.trim(),
          documento: documentoPaciente.trim(),
          tipoDocumento,
          genero,
          telefono: telefono.trim(),
          direccion: direccion.trim(),
          fechaNacimiento,
          nota: notaValoracion.trim(),
          regimen,
          eapb: eapb.trim(),
        })
      })

      if (res.ok) {
        onCreated()
      } else {
        const err = await res.json()
        alert(err.error || "Error al crear la atención")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Atencion</h1>
          <p className="text-sm text-muted-foreground">
            Complete todos los campos marcados con (*)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Section: Programa */}
        <FormSection icon={<Stethoscope className="h-5 w-5" />} title="Datos del Programa">
          <FormField label="Programa de atencion" required error={errors.programaId}>
            <select
              value={programaId}
              onChange={(e) => setProgramaId(e.target.value)}
              disabled={user?.rol === "profesional" && !!user?.programaId}
              className="form-input disabled:bg-muted disabled:text-muted-foreground"
            >
              <option value="">Seleccione un programa</option>
              {availableProgramas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </FormField>
        </FormSection>

        {/* Section: Paciente */}
        <FormSection icon={<User className="h-5 w-5" />} title="Datos del Paciente">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo de documento" required error={errors.tipoDocumento}>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                disabled={shouldDisablePacienteInfo}
                className="form-input disabled:bg-muted disabled:opacity-75"
              >
                <option value="">Seleccione tipo</option>
                {TIPO_DOCUMENTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Documento del paciente" required error={errors.documentoPaciente}>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={documentoPaciente}
                  onBlur={handleDocumentoBlur}
                  onChange={(e) => {
                    setDocumentoPaciente(e.target.value.replace(/\D/g, ""))
                    setPacienteExistente(false)
                  }}
                  placeholder="Numero de documento"
                  className="form-input w-full"
                />
                {isSearchingPaciente && (
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground animate-pulse">
                    Buscando...
                  </span>
                )}
              </div>
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Nombre completo del paciente" required error={errors.nombrePaciente}>
                <input
                  type="text"
                  value={nombrePaciente}
                  onChange={(e) => setNombrePaciente(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ""))}
                  placeholder="Nombre completo"
                  disabled={shouldDisablePacienteInfo}
                  className="form-input disabled:bg-muted disabled:opacity-75"
                />
              </FormField>
            </div>

            <FormField label="Genero o Sexo" required error={errors.genero}>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                disabled={shouldDisablePacienteInfo}
                className="form-input disabled:bg-muted disabled:opacity-75"
              >
                <option value="">Seleccione genero/sexo</option>
                {SEXO.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Telefono" required error={errors.telefono}>
              <input
                type="tel"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="3123456789"
                className="form-input"
              />
            </FormField>

            <FormField label="Direccion" required error={errors.direccion}>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle / Carrera # - barrio - ciudad"
                className="form-input"
              />
            </FormField>

            <FormField label="Fecha de nacimiento" required error={errors.fechaNacimiento}>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  disabled={shouldDisablePacienteInfo}
                  className="form-input disabled:bg-muted disabled:opacity-75"
                />
                {fechaNacimiento && (
                  <div className="text-xs font-semibold text-[#0a8c32] bg-[#0a8c32]/10 px-3 py-1.5 rounded-md inline-block">
                    {calcularEdad(fechaNacimiento) !== null && (
                      <>
                        {calcularEdad(fechaNacimiento)} años · {calcularCursoVida(calcularEdad(fechaNacimiento)!)}
                      </>
                    )}
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="Régimen de Salud" error={errors.regimen}>
              <select
                value={regimen}
                onChange={(e) => setRegimen(e.target.value)}
                disabled={shouldDisablePacienteInfo}
                className="form-input disabled:bg-muted disabled:opacity-75"
              >
                <option value="">Seleccione el régimen</option>
                {REGIMEN_SALUD.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="EAPB / EPS" error={errors.eapb}>
              <input
                type="text"
                list="eps-list-atencion"
                value={eapb}
                onChange={(e) => setEapb(e.target.value)}
                placeholder="Escriba o elija la EPS"
                disabled={shouldDisablePacienteInfo}
                className="form-input disabled:bg-muted disabled:opacity-75"
              />
              <datalist id="eps-list-atencion">
                <option value="Nueva EPS" />
                <option value="EPS Sanitas" />
                <option value="EPS Sura" />
                <option value="Salud Total EPS" />
                <option value="Compensar EPS" />
                <option value="Famisanar EPS" />
                <option value="Asmet Salud EPS" />
                <option value="Emssanar EPS" />
                <option value="Asociación Indígena del Cauca (AIC EPSI)" />
              </datalist>
            </FormField>
          </div>
        </FormSection>

        {/* Section: Atencion */}
        <FormSection icon={<FileText className="h-5 w-5" />} title="Datos de la Atencion">
          <FormField label="Nota por valoracion" required error={errors.notaValoracion}>
            <textarea
              rows={5}
              value={notaValoracion}
              onChange={(e) => setNotaValoracion(e.target.value)}
              placeholder="Escriba aqui la valoracion del paciente..."
              className="form-input min-h-[120px] resize-y"
            />
          </FormField>

        </FormSection>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? "Registrando..." : "Registrar atención"}
          </button>
        </div>
      </form>
    </div >
  )
}

// ──────────── Reusable Form Helpers ────────────

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2 text-primary">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function AtencionDetail({
  atencion,
  programas,
  onBack,
}: {
  atencion: Atencion
  programas: {id: string, nombre: string}[]
  onBack: () => void
}) {
  const programaNombre = programas.find((p) => p.id === atencion.programaId)?.nombre || "Desconocido"

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Detalle de Atención</h1>
          <p className="text-sm text-muted-foreground">
            {atencion.createdAtISO 
              ? `Registrado el ${atencion.fecha} a las ${new Date(atencion.createdAtISO).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })}`
              : `Registrado el ${atencion.fecha}`
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <FormSection icon={<User className="h-5 w-5" />} title="Datos del Paciente">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Nombre del Paciente" value={atencion.pacienteNombre} />
            <DetailItem label="Documento" value={atencion.pacienteDocumento} />
            {atencion.pacienteTipoDoc && <DetailItem label="Tipo Doc." value={atencion.pacienteTipoDoc} />}
            {atencion.pacienteGenero && <DetailItem label="Género" value={atencion.pacienteGenero} />}
            {atencion.pacienteTelefono && <DetailItem label="Teléfono" value={atencion.pacienteTelefono} />}
            {atencion.pacienteFechaNac && (
              <DetailItem 
                label="Fecha de Nacimiento" 
                value={new Date(atencion.pacienteFechaNac).toLocaleDateString()} 
              />
            )}
          </div>
          <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {atencion.pacienteFechaNac && calcularEdad(atencion.pacienteFechaNac) !== null && (
              <DetailItem 
                label="Edad" 
                value={`${calcularEdad(atencion.pacienteFechaNac)} años`} 
              />
            )}
            {atencion.pacienteFechaNac && calcularEdad(atencion.pacienteFechaNac) !== null && (
              <DetailItem 
                label="Curso de Vida" 
                value={calcularCursoVida(calcularEdad(atencion.pacienteFechaNac)!)} 
              />
            )}
            <DetailItem label="Régimen" value={atencion.pacienteRegimen || "-"} />
            <DetailItem label="EAPB/EPS" value={atencion.pacienteEapb || "-"} />
            
            {atencion.pacienteDireccion && (
              <div className="sm:col-span-2 lg:col-span-4 mt-2">
                <DetailItem label="Dirección" value={atencion.pacienteDireccion} />
              </div>
            )}
          </div>
        </FormSection>

        <FormSection icon={<Stethoscope className="h-5 w-5" />} title="Datos de la Consulta">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Programa Asignado" value={programaNombre} />
            <DetailItem label="Profesional que Atendió" value={atencion.profesionalNombre || "Desconocido"} />
          </div>
        </FormSection>

        <FormSection icon={<FileText className="h-5 w-5" />} title="Nota de Valoración">
          <div className="rounded-xl border border-border bg-muted/20 p-5 text-base text-foreground whitespace-pre-wrap leading-relaxed">
            {atencion.notaValoracion}
          </div>
        </FormSection>
      </div>
    </div>
  )
}

 function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/50 bg-card">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  )
}
