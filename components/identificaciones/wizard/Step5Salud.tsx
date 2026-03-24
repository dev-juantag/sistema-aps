'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  ANTECEDENTES_CRONICOS, ANTECEDENTES_TRANSMISIBLES, INTERVENCIONES_PENDIENTES,
  REMISIONES_APS, DIAGNOSTICO_NUTRICIONAL, calcularEdad
} from '@/lib/constants'
import { inp, sel, lbl, lblStyle, chk, chkLabel } from './wizardStyles'

export default function Step5Salud() {
  const { register, control, watch, formState: { errors } } = useFormContext()
  const { fields } = useFieldArray({ control, name: 'integrantes' })
  const [expanded, setExpanded] = useState<number[]>(Array.from({length: Math.max(1, fields.length)}, (_, i) => i))

  const toggle = (i: number) => setExpanded(prev =>
    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
  )

  return (
    <div className="space-y-3">
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#f0f4ff', border: '1px solid #c7d4f0', color: '#081e69' }}>
        Complete la sección de salud para cada integrante del paso anterior.
      </p>

      {fields.map((field, i) => {
        const fnac = watch(`integrantes.${i}.fechaNacimiento`)
        const edad = fnac ? calcularEdad(fnac) : null
        const nombre = `${watch(`integrantes.${i}.primerNombre`) || 'Integrante'} ${watch(`integrantes.${i}.primerApellido`) || ''}`
        const open = expanded.includes(i)
        const enfermedadAguda = watch(`integrantes.${i}.enfermedadAguda`)

        return (
          <div key={field.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e4e8f0' }}>
            {/* Header */}
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
              style={{ background: '#f7f8fc', borderBottom: open ? '1px solid #e4e8f0' : 'none' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: '#0a8c32' }}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-800">{nombre}</p>
                  {edad !== null && <p className="text-[10px] text-gray-400">{edad} años</p>}
                </div>
              </div>
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {/* Body */}
            {open && (
              <div className="p-4 space-y-4 bg-white">

                {/* Antecedentes Crónicos */}
                <FS title="Antecedentes Patológicos Crónicos">
                  <div className="grid grid-cols-2 gap-1">
                    {ANTECEDENTES_CRONICOS.map(a => (
                      <label key={a.id} className={chkLabel}>
                        <input type="checkbox" {...register(`integrantes.${i}.antecedentes.${a.id}`)} className={chk} />
                        <span className="text-xs leading-tight">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </FS>

                {/* Transmisibles */}
                <FS title="Enfermedades Transmisibles">
                  <div className="grid grid-cols-2 gap-1">
                    {ANTECEDENTES_TRANSMISIBLES.map(a => (
                      <label key={a.id} className={chkLabel}>
                        <input type="checkbox" {...register(`integrantes.${i}.antecTransmisibles.${a.id}`)} className={chk} />
                        <span className="text-xs leading-tight">{a.label}</span>
                      </label>
                    ))}
                  </div>
                </FS>

                {/* Antropometría */}
                <FS title="Medidas Antropométricas">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <F label="Peso (kg)" required>
                      <input type="number" step="0.1" {...register(`integrantes.${i}.peso`)} className={inp} placeholder="65.5" />
                    </F>
                    <F label="Talla (cm)" required>
                      <input type="number" step="0.1" {...register(`integrantes.${i}.talla`)} className={inp} placeholder="170" />
                    </F>
                    <F label="P. Braquial (cm)">
                      <input type="number" step="0.1" {...register(`integrantes.${i}.perimetroBraquial`)} className={inp} placeholder="25" />
                    </F>
                    <F label="Diag. Nutricional">
                      <select {...register(`integrantes.${i}.diagNutricional`)} className={sel}>
                        <option value="">—</option>
                        {DIAGNOSTICO_NUTRICIONAL.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </F>
                  </div>
                </FS>

                {/* Prevención */}
                <FS title="Prevención y Hábitos">
                  <div className="space-y-2">
                    <label className={chkLabel}>
                      <input type="checkbox" {...register(`integrantes.${i}.practicaDeportiva`)} className={chk} />
                      <span className="text-xs">¿Realiza práctica deportiva?</span>
                    </label>
                    {edad !== null && edad < 2 && (
                      <>
                        <label className={chkLabel}>
                          <input type="checkbox" {...register(`integrantes.${i}.lactanciaMaterna`)} className={chk} />
                          <span className="text-xs">Lactancia materna exclusiva (&lt;2 años)</span>
                        </label>
                        {watch(`integrantes.${i}.lactanciaMaterna`) && (
                          <F label="Duración lactancia (meses)">
                            <input type="number" min="0" max="24" {...register(`integrantes.${i}.lactanciaMeses`)} className={inp} />
                          </F>
                        )}
                      </>
                    )}
                    <label className={chkLabel}>
                      <input type="checkbox" {...register(`integrantes.${i}.esquemaAtenciones`)} className={chk} />
                      <span className="text-xs">¿Cumple esquema de atenciones de P&M?</span>
                    </label>
                    <label className={chkLabel}>
                      <input type="checkbox" {...register(`integrantes.${i}.esquemaVacunacion`)} className={chk} />
                      <span className="text-xs">¿Cumple esquema de vacunación?</span>
                    </label>
                  </div>
                </FS>

                {/* Intervenciones */}
                <FS title="Intervenciones Pendientes">
                  <div className="grid grid-cols-2 gap-1">
                    {INTERVENCIONES_PENDIENTES.map(o => (
                      <label key={o.id} className={chkLabel}>
                        <input type="checkbox" value={o.id} {...register(`integrantes.${i}.intervencionesPendientes`)} className={chk} />
                        <span className="text-xs leading-tight">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </FS>

                {/* Enfermedad Aguda */}
                <FS title="Enfermedad Aguda">
                  <div className="space-y-2">
                    <label className={chkLabel}>
                      <input type="checkbox" {...register(`integrantes.${i}.enfermedadAguda`)} className={chk} />
                      <span className="text-xs">¿Presenta enfermedad respiratoria, diarreica, alergia o accidente el último mes?</span>
                    </label>
                    {enfermedadAguda && (
                      <label className={chkLabel + ' ml-5'}>
                        <input type="checkbox" {...register(`integrantes.${i}.recibeAtencionMedica`)} className={chk} />
                        <span className="text-xs">¿Recibe atención médica actualmente?</span>
                      </label>
                    )}
                  </div>
                </FS>

                {/* Remisiones APS */}
                <FS title="Remisiones APS">
                  <div className="grid grid-cols-2 gap-1">
                    {REMISIONES_APS.map(o => (
                      <label key={o.id} className={chkLabel}>
                        <input type="checkbox" value={o.id} {...register(`integrantes.${i}.remisiones`)} className={chk} />
                        <span className="text-xs leading-tight">{o.label}</span>
                      </label>
                    ))}
                  </div>
                </FS>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FS({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#081e6966', borderTop: '1px solid #e8ecf5', paddingTop: '10px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function F({ label, children, required }: { label: string; children: React.ReactNode, required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className={lbl} style={lblStyle}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
