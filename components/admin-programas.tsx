"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Settings, Users, ClipboardList, Plus, Pencil, X, Trash2 } from "lucide-react"
import { CONFIG } from "@/lib/config"

export function AdminProgramas() {
  const [selectedPrograma, setSelectedPrograma] = useState("")

  const { data: rawProgramas, mutate: mutateProgramas } = useSWR<any>("/api/programas", fetcher)
  const { data: rawAtenciones } = useSWR<any>("/api/atenciones", fetcher)
  const { data: rawUsers } = useSWR<any>("/api/users", fetcher)

  const programas: any[] = Array.isArray(rawProgramas) ? rawProgramas : []
  const atenciones: any[] = Array.isArray(rawAtenciones) ? rawAtenciones : []
  const users: any[] = Array.isArray(rawUsers) ? rawUsers : []
  const { data: stageSettings } = useSWR<any>("/api/settings/stage", fetcher)
  const currentStageStart = stageSettings?.currentStageStart || null

  const [showForm, setShowForm] = useState(false)
  const [editingPrograma, setEditingPrograma] = useState<any | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este programa? Esta acción eliminará permanentemente el programa. (Asegúrese de que no contenga profesionales o atenciones activas).")) return
    try {
      const res = await fetch(`/api/programas/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error al eliminar programa")
      } else {
        mutateProgramas()
        if (selectedPrograma === id) setSelectedPrograma("")
      }
    } catch (e) {
      console.error(e)
      alert("Error de conexión.")
    }
  }

  // Eliminamos el bloque useEffect completo que obtenía los datos manualmente

  const filteredAtenciones = useMemo(() => {
    if (!currentStageStart) return atenciones;
    return atenciones.filter(a => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) >= new Date(currentStageStart));
  }, [atenciones, currentStageStart]);

  const programaStats = useMemo(() => {
    return programas.map((p) => {
      const atencionCount = filteredAtenciones.filter((a) => a.programaId === p.id).length
      const profCount = users.filter((u) => u.programaId === p.id && u.rol === "profesional").length
      // Calcula la meta en base a cantidad de profesionales por una meta individual.
      // Si el programa tiene su propia meta base guardada se considera, de lo contrario toma el valor global.
      const metaIndividual = p.meta !== null && p.meta !== undefined ? p.meta : CONFIG.META_INDIVIDUAL_POR_DEFECTO;
      const metaTotal = profCount > 0 ? (profCount * metaIndividual) : metaIndividual;
      
      return {
        ...p,
        atenciones: atencionCount,
        profesionales: profCount,
        metaBase: p.meta, // Valor real en DB (puede ser null)
        metaIndividual: metaIndividual,
        meta: metaTotal
      }
    })
  }, [filteredAtenciones, users, programas])

  const selected = programaStats.find((p) => p.id === selectedPrograma)
  const profesionalesDelPrograma = useMemo(() => {
    if (!selectedPrograma) return []
    return users.filter((u) => u.programaId === selectedPrograma && u.rol === "profesional")
  }, [users, selectedPrograma])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Programas de Atención</h1>
          <p className="text-sm text-muted-foreground">
            Configuración y estado de los programas de salud
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPrograma(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Crear programa
        </button>
      </div>

      {/* Programs grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {programaStats.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPrograma(p.id)}
            className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition-all cursor-pointer ${
              selectedPrograma === p.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{p.nombre}</h3>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                {p.atenciones} atenciones
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {p.profesionales} prof.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((p.atenciones / p.meta) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round((p.atenciones / p.meta) * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Meta: {p.meta} atenciones
            </p>
          </button>
        ))}
      </div>

      {/* Selected programa details */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {selected.nombre} — Detalle
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingPrograma(selected)
                  setShowForm(true)
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                Editar programa
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-2 rounded-lg border border-destructive bg-card px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">Total atenciones</p>
              <p className="text-2xl font-bold text-foreground">{selected.atenciones}</p>
            </div>
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">Meta del programa</p>
              <p className="text-2xl font-bold text-foreground">{selected.meta}</p>
            </div>
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">Profesionales activos</p>
              <p className="text-2xl font-bold text-foreground">{selected.profesionales}</p>
            </div>
          </div>

          {profesionalesDelPrograma.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Profesionales asignados
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-semibold text-foreground">Nombre</th>
                      <th className="px-4 py-2 text-left font-semibold text-foreground">Documento</th>
                      <th className="px-4 py-2 text-left font-semibold text-foreground">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profesionalesDelPrograma.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 font-medium text-foreground">
                          {u.nombre} {u.apellidos}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{u.documento}</td>
                        <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showForm && (
        <ProgramaFormModal
          programa={editingPrograma}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            mutateProgramas()
          }}
        />
      )}
    </div>
  )
}

function ProgramaFormModal({ programa, onClose, onSuccess }: any) {
  const [nombre, setNombre] = useState(programa?.nombre || "")
  // Carga metaBase si existe personalizado, de lo contrario muestra un string vacío para placeholder
  const [meta, setMeta] = useState(programa?.metaBase || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      let res;
      if (programa) {
        // Edit
        res = await fetch(`/api/programas/${programa.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, meta }),
        })
      } else {
        // Create
        res = await fetch("/api/programas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, meta }),
        })
      }

      if (!res.ok) {
        const errorData = await res.json()
        alert(errorData.error || "Error al guardar el programa")
      } else {
        onSuccess()
      }
    } catch (e) {
      console.error(e)
      alert("Error de conexión al guardar")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto w-full h-full"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[400px] rounded-2xl bg-card p-6 shadow-2xl relative overflow-y-auto max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6">
          {programa ? "Editar Programa" : "Crear Programa"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Nombre del Programa</label>
            <input
              required
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Odontología"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Meta individual de atenciones 
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Por defecto global: {CONFIG.META_INDIVIDUAL_POR_DEFECTO})
              </span>
            </label>
            <input
              type="number"
              min="1"
              value={meta}
              onChange={(e) => setMeta(e.target.value)}
              placeholder={`Ej. ${CONFIG.META_INDIVIDUAL_POR_DEFECTO} (Dejar vacío para global)`}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : programa ? "Guardar cambios" : "Crear programa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
