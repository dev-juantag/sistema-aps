"use client"

import useSWR from "swr"
import { useState, useEffect } from "react"
import { fetcher } from "@/lib/fetcher"
import { FamiliogramaGlobalEditor } from "./familiograma-global-editor"
import {
  X,
  User,
  HeartPulse,
  MapPin,
  Calendar,
  FileText,
  Activity,
  History,
  Phone
} from "lucide-react"
import { calcularEdad, calcularCursoVida } from "@/lib/constants"

export function PacienteDetail({ pacienteId, onClose }: { pacienteId: string, onClose: () => void }) {
  const [showFamiliograma, setShowFamiliograma] = useState(false)
  const { data: paciente, error } = useSWR(`/api/pacientes/${pacienteId}`, fetcher)

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl">
          <p className="text-destructive font-medium">Error al cargar datos del paciente.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-muted text-foreground rounded-md">Cerrar</button>
        </div>
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl">
          <p className="text-muted-foreground animate-pulse text-center font-medium">Cargando expediente...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 md:p-12 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-5xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Fijo */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground leading-tight">Expediente Único</h2>
              <p className="text-sm font-medium text-muted-foreground">{paciente.nombreCompleto}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido Scrolleable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-muted/10">

          {/* Datos Personales y de Contacto */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
              <User className="h-4 w-4" /> 1. Información Personal
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DataCard title="Nombre Completo" value={paciente.nombreCompleto} />
              <DataCard title="Tipo y documento" value={`${paciente.tipoDocumentoDinamico || paciente.tipoDocumento} ${paciente.documento}`} />
              <DataCard title="Género" value={paciente.genero} />
              <DataCard title="Teléfono" value={paciente.telefono} />
              <DataCard title="Dirección" value={paciente.direccion} />
              <DataCard title="Fecha Nacimiento" value={paciente.fechaNacimiento ? new Date(paciente.fechaNacimiento).toLocaleDateString() : '-'} />
              <DataCard title="Edad" value={paciente.fechaNacimiento && calcularEdad(paciente.fechaNacimiento) !== null ? `${calcularEdad(paciente.fechaNacimiento)} años` : '-'} />
              <DataCard title="Curso de Vida" value={paciente.fechaNacimiento && calcularEdad(paciente.fechaNacimiento) !== null ? calcularCursoVida(calcularEdad(paciente.fechaNacimiento)!) : '-'} />
              <DataCard title="Régimen" value={paciente.regimen || '-'} />
              <DataCard title="EAPB/EPS" value={paciente.eapb || '-'} />
            </div>
          </section>

          {/* Atenciones registradas */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0a8c32] mb-4 flex items-center gap-2 pt-4 border-t border-border">
              <Activity className="h-4 w-4" /> 2. Historial de Atenciones ({paciente.atenciones?.length || 0})
            </h3>
            {paciente.atenciones?.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {paciente.atenciones.map((atencion: any) => (
                  <div key={atencion.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                        {atencion.programa?.nombre || "Programa"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(atencion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 mb-3">
                      {atencion.nota}
                    </p>
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      <span><strong>Profesional:</strong> {atencion.profesional?.nombre} {atencion.profesional?.apellidos}</span>
                      {atencion.territorio && <span><strong>Territorio:</strong> {atencion.territorio?.nombre}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic rounded-lg border border-dashed border-border p-8 text-center bg-card">
                No hay atenciones registradas para este paciente.
              </div>
            )}
          </section>

          {/* Derivaciones registradas */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-4 flex items-center gap-2 pt-4 border-t border-border">
              <History className="h-4 w-4" /> 3. Derivaciones ({paciente.derivaciones?.length || 0})
            </h3>
            {paciente.derivaciones?.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {paciente.derivaciones.map((deriv: any) => (
                  <div key={deriv.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-orange-600 bg-orange-600/10 px-2 py-1 rounded">
                        {deriv.estado}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(deriv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {deriv.notaIdentificacion && (
                      <p className="text-sm text-foreground line-clamp-3 mb-3">
                        {deriv.notaIdentificacion}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground flex flex-col gap-1">
                      {deriv.programa && <span><strong>Programa destino:</strong> {deriv.programa.nombre}</span>}
                      {deriv.profesional && <span><strong>Profesional:</strong> {deriv.profesional.nombre} {deriv.profesional.apellidos}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic rounded-lg border border-dashed border-border p-8 text-center bg-card">
                No hay derivaciones asociadas.
              </div>
            )}
          </section>

          {paciente.fichaId && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
              <span className="text-xs text-primary font-medium px-3 py-1 bg-primary/10 rounded-full">
                📌 Familia Identificada mediante Ficha APS (ID: {paciente.fichaId.slice(0, 8)}...)
              </span>
              <button 
                onClick={() => setShowFamiliograma(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0a8c32] text-white text-sm font-bold rounded-lg hover:bg-[#086a25] transition-colors shadow-sm"
              >
                <Activity className="w-4 h-4" />
                ABRIR EDITOR DE FAMILIOGRAMA
              </button>
            </div>
          )}

        </div>
      </div>
      
      {showFamiliograma && paciente?.fichaId && (
        <FamiliogramaGlobalEditor 
          fichaId={paciente.fichaId} 
          onClose={() => setShowFamiliograma(false)} 
        />
      )}
    </div>
  )
}

function DataCard({ title, value }: { title: string, value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm hover:border-primary/30 transition-colors">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="text-sm font-medium text-foreground truncate">{value || "-"}</p>
    </div>
  )
}
