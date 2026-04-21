"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/lib/auth-context"
import { type Paciente, GENEROS } from "@/lib/data"
import { REGIMEN_SALUD, TIPO_DOCUMENTO, calcularEdad, calcularCursoVida } from "@/lib/constants"
import {
  Search,
  Download,
  Edit2,
  Trash2,
  X,
  Users,
  Eye,
} from "lucide-react"
import { PacienteDetail } from "./paciente-detail"
import { toast } from "sonner"
import ConfirmModal from "@/components/ui/ConfirmModal"

export function AdminPacientes() {
  const { user, isSuperAdmin } = useAuth()
  const { data: rawPacientes, isLoading: loading, mutate: mutatePacientes } = useSWR<any>("/api/pacientes", fetcher)
  const pacientes: Paciente[] = Array.isArray(rawPacientes) ? rawPacientes : []

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const limit = 50

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Paciente>>({})
  const [errorEdit, setErrorEdit] = useState("")
  // Estado de Visualización (Expediente Único)
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null)
  
  // Estado confirmación borrar
  const [deleteConfirmInfo, setDeleteConfirmInfo] = useState<{id: string, name: string} | null>(null)

  useEffect(() => {
    if (editingId || selectedPacienteId || deleteConfirmInfo) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [editingId, selectedPacienteId, deleteConfirmInfo])

  const filtered = useMemo(() => {
    return pacientes.filter((p) => {
      const term = search.toLowerCase()
      return (
        (p.nombreCompleto && p.nombreCompleto.toLowerCase().includes(term)) ||
        (p.documento && p.documento.includes(term)) ||
        (p.telefono && p.telefono.includes(term)) ||
        ((p as any).tipoDocumentoDinamico && (p as any).tipoDocumentoDinamico.toLowerCase().includes(term)) ||
        (p.tipoDocumento && p.tipoDocumento.toLowerCase().includes(term))
      )
    })
  }, [pacientes, search])

  const paginatedPacientes = useMemo(() => {
    const startIndex = (page - 1) * limit
    return filtered.slice(startIndex, startIndex + limit)
  }, [filtered, page])
  
  const totalPages = Math.ceil(filtered.length / limit)

  // Reset page when search changes
  useMemo(() => setPage(1), [search])

  const handleExport = () => {
    if (pacientes.length === 0) return toast.warning("No hay pacientes para exportar.")

    const headers = [
      "Nombre_Completo",
      "Tipo_Documento",
      "Num_Documento",
      "Genero",
      ...(isSuperAdmin ? ["Telefono"] : []),
      "Direccion",
      "Fecha_Nacimiento",
      "Edad"
    ]

    const calcularEdad = (fechaNac: any) => {
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

    const escapeCsv = (str?: string) => {
      if (!str) return '""';
      return `"${str.toString().replace(/"/g, '""')}"`;
    }

    const rows = pacientes.map(p => [
      escapeCsv(p.nombreCompleto),
      escapeCsv(p.tipoDocumento),
      escapeCsv(p.documento),
      escapeCsv(p.genero),
      ...(isSuperAdmin ? [escapeCsv(p.telefono)] : []),
      escapeCsv(p.direccion),
      p.fechaNacimiento ? new Date(p.fechaNacimiento).toISOString().split('T')[0] : "",
      p.fechaNacimiento ? calcularEdad(p.fechaNacimiento).toString() : ""
    ])

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `directorio_pacientes.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmInfo({ id, name })
  }

  const executeDelete = async () => {
    if (!deleteConfirmInfo) return;
    const { id, name } = deleteConfirmInfo;
    setDeleteConfirmInfo(null);
    const toastId = toast.loading(`Eliminando paciente ${name}...`);

    try {
      const res = await fetch(`/api/pacientes/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Paciente eliminado correctamente", { id: toastId });
        mutatePacientes((prev: Paciente[] | undefined) => prev?.filter((p: Paciente) => p.id !== id), { revalidate: false });
      } else {
        const error = await res.json()
        toast.error((error.error || "Error al eliminar el paciente") + (error.details ? "\nDetalles: " + error.details : ""), { id: toastId })
      }
    } catch (e) {
      console.error(e)
      toast.error("Error de conexión.", { id: toastId })
    }
  }

  const startEdit = (p: Paciente) => {
    setEditingId(p.id)
    setEditForm({
      ...p,
      fechaNacimiento: new Date(p.fechaNacimiento).toISOString().split('T')[0] as any 
    })
    setErrorEdit("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setErrorEdit("")
  }

  const saveEdit = async () => {
    if (!editingId) return
    if (!editForm.nombreCompleto || !editForm.documento || !editForm.telefono || !editForm.direccion || !editForm.fechaNacimiento) {
      setErrorEdit("Todos los campos principales son obligatorios.")
      return
    }

    const wordCount = editForm.nombreCompleto.trim().split(/\s+/).length
    if (wordCount < 2 || wordCount > 4) {
      setErrorEdit("El nombre completo del paciente debe tener entre 2 y 4 palabras.")
      return
    }

    try {
      const res = await fetch(`/api/pacientes/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        mutatePacientes()
        cancelEdit()
      } else {
        const error = await res.json()
        setErrorEdit((error.error || "Error al actualizar") + (error.details ? ` - ${error.details}` : ""))
      }
    } catch (e) {
      console.error(e)
      setErrorEdit("Error de conexión.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Directorio general de todos los pacientes registrados en el sistema
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 hover:bg-muted font-medium text-sm transition-colors"
        >
          <Download className="h-4 w-4" /> Exportar a Excel
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo Doc</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Género</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Edad</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Cargando base de datos de pacientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron pacientes registrados.
                  </td>
                </tr>
              ) : (
                paginatedPacientes.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.nombreCompleto}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(p as any).tipoDocumentoDinamico || p.tipoDocumento}</td>
                    <td className="px-4 py-3 font-medium">{p.documento}</td>
                    <td className="px-4 py-3">{p.genero}</td>
                    <td className="px-4 py-3">{p.telefono}</td>
                    <td className="px-4 py-3">
                      {calcularEdad(p.fechaNacimiento)} años
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedPacienteId(p.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-[#0a8c32]/10 hover:text-[#0a8c32] transition-colors"
                          title="Ver Expediente Único"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nombreCompleto)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl shadow-sm">
          <p className="text-sm text-muted-foreground">
            Mostrando página <span className="font-bold">{page}</span> de <span className="font-bold">{totalPages}</span> (Total: {filtered.length})
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-border bg-background rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 border border-border bg-background rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Expediente Único Modal */}
      {selectedPacienteId && (
        <PacienteDetail 
          pacienteId={selectedPacienteId} 
          onClose={() => setSelectedPacienteId(null)} 
        />
      )}

      {editingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) cancelEdit() }}
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4 flex-shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Editar Paciente</h2>
              <button
                onClick={cancelEdit}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {errorEdit && (
                <div className="mb-4 rounded-lg bg-destructive/15 px-4 py-3 text-sm text-destructive border border-destructive/20">
                  {errorEdit}
                </div>
              )}
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Nombre Completo</label>
                  <input
                    type="text"
                    value={editForm.nombreCompleto || ""}
                    onChange={e => setEditForm({...editForm, nombreCompleto: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "")})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipo Documento</label>
                  <select
                    value={editForm.tipoDocumento || ""}
                    onChange={e => setEditForm({...editForm, tipoDocumento: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  >
                     <option value="">Selecciona Doc.</option>
                     {TIPO_DOCUMENTO.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Documento</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editForm.documento || ""}
                    onChange={e => setEditForm({...editForm, documento: e.target.value.replace(/\D/g, "")})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Género</label>
                  <select
                    value={editForm.genero || ""}
                    onChange={e => setEditForm({...editForm, genero: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  >
                     {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Teléfono</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={editForm.telefono || ""}
                    onChange={e => setEditForm({...editForm, telefono: e.target.value.replace(/\D/g, "")})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Fecha Nacimiento</label>
                  <input
                    type="date"
                    value={editForm.fechaNacimiento as any || ""}
                    onChange={e => setEditForm({...editForm, fechaNacimiento: e.target.value as any})}
                    max={new Date().toISOString().split('T')[0]} // Previene fechas futuras
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                  {editForm.fechaNacimiento && (
                     <p className="text-xs text-muted-foreground mt-1 font-medium bg-muted/50 p-2 rounded line-clamp-1 truncate">
                        Curso vida: {calcularCursoVida(calcularEdad(editForm.fechaNacimiento as string))}
                     </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1 block">Dirección</label>
                  <input
                    type="text"
                    value={editForm.direccion || ""}
                    onChange={e => setEditForm({...editForm, direccion: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                  />
                </div>

                {isSuperAdmin && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Régimen</label>
                      <select
                        value={editForm.regimen || ""}
                        onChange={e => setEditForm({...editForm, regimen: e.target.value})}
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                      >
                         <option value="">Seleccione Régimen</option>
                         {REGIMEN_SALUD.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-1 block">EAPB / EPS</label>
                      <input
                        type="text"
                        value={editForm.eapb || ""}
                        onChange={e => setEditForm({...editForm, eapb: e.target.value})}
                        placeholder="Nombre de la EPS"
                        className="w-full h-10 px-3 rounded-lg border border-input bg-background"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteConfirmInfo}
        title="Eliminar Paciente"
        message={`¿Está seguro de que desea eliminar permanentemente al paciente ${deleteConfirmInfo?.name}?\n\n¡ADVERTENCIA!\nSi el paciente tiene atenciones registradas el sistema no le dejará borrarlo para proteger la integridad de los datos.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        danger={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmInfo(null)}
      />

    </div>
  )
}
