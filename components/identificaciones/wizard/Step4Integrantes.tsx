'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import {
  TIPO_DOCUMENTO, SEXO, PARENTESCO, NIVEL_EDUCATIVO, OCUPACION,
  REGIMEN_SALUD, ETNIA, GRUPO_POBLACIONAL, DISCAPACIDADES, BARRERAS_ACCESO, calcularEdad, calcularCursoVida
} from '@/lib/constants'
import { inp, sel, lbl, lblStyle, required as reqStyle, chk, chkLabel, btnGreen, btnGreenStyle } from './wizardStyles'

const defaultIntegrante = {
  primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
  tipoDoc: 'CC', numDoc: '', fechaNacimiento: '', parentesco: '', sexo: '', gestante: 'NA', mesesGestacion: '',
  telefono: '', nivelEducativo: '', ocupacion: '', regimen: '', eapb: '',
  etnia: '', puebloIndigena: '', grupoPoblacional: [] as number[], discapacidades: [] as number[],
  // Relaciones Avanzadas
  padreId: '', madreId: '', parejaId: '', tipoPareja: 'UNION_LIBRE', tipoHijo: 'BIOLOGICO', estadoVital: 'VIVO',
  // Evaluación Salud
  antecedentes: {} as Record<string, boolean>,
  antecTransmisibles: {} as Record<string, boolean>,
  peso: '', talla: '', perimetroBraquial: '', diagNutricional: '',
  practicaDeportiva: false, lactanciaMaterna: false, lactanciaMeses: '',
  esquemaAtenciones: false, intervencionesPendientes: [] as number[],
  enfermedadAguda: false, recibeAtencionMedica: false,
  remisiones: [] as string[],
}

export default function Step4Integrantes() {
  const { register, control, watch, setValue } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name: 'integrantes' })
  const [expanded, setExpanded] = useState<number[]>([0])

  const toggle = (i: number) => setExpanded(prev =>
    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{fields.length} integrante(s)</p>
        <button
          type="button"
          onClick={() => { append(defaultIntegrante); setExpanded(p => [...p, fields.length]) }}
          className={btnGreen} style={btnGreenStyle}
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {fields.map((field, i) => {
        const fnac = watch(`integrantes.${i}.fechaNacimiento`)
        const edad = fnac ? calcularEdad(fnac) : null
        const cursoVida = edad !== null ? calcularCursoVida(edad) : ''
        const etnia = watch(`integrantes.${i}.etnia`)
        const sexo = watch(`integrantes.${i}.sexo`)
        const gestanteStatus = watch(`integrantes.${i}.gestante`)
        const open = expanded.includes(i)

        return (
          <div key={field.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e4e8f0' }}>
            {/* Accordion Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggle(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i) } }}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer"
              style={{ background: '#f7f8fc', borderBottom: open ? '1px solid #e4e8f0' : 'none' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: '#081e69' }}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-xs text-gray-800">
                    {watch(`integrantes.${i}.primerNombre`) || 'Nuevo'}{' '}
                    {watch(`integrantes.${i}.primerApellido`) || 'Integrante'}
                  </p>
                  {edad !== null && (
                    <p className="text-[10px] text-gray-400">{edad} años · {cursoVida}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(i) }}
                    className="p-1 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {open
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {/* Body */}
            {open && (
              <div className="p-4 space-y-4 bg-white">
                {/* Datos básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Primer Nombre" required><input {...register(`integrantes.${i}.primerNombre`)} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '').replace(/(^|\s)\S/g, c => c.toUpperCase()); register(`integrantes.${i}.primerNombre`).onChange(e); }} className={inp} /></F>
                  <F label="Segundo Nombre"><input {...register(`integrantes.${i}.segundoNombre`)} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '').replace(/(^|\s)\S/g, c => c.toUpperCase()); register(`integrantes.${i}.segundoNombre`).onChange(e); }} className={inp} /></F>
                  <F label="Primer Apellido" required><input {...register(`integrantes.${i}.primerApellido`)} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '').replace(/(^|\s)\S/g, c => c.toUpperCase()); register(`integrantes.${i}.primerApellido`).onChange(e); }} className={inp} /></F>
                  <F label="Segundo Apellido" required><input {...register(`integrantes.${i}.segundoApellido`)} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-ZñÑáéíóúÁÉÍÓÚ\s]/g, '').replace(/(^|\s)\S/g, c => c.toUpperCase()); register(`integrantes.${i}.segundoApellido`).onChange(e); }} className={inp} /></F>
                  <F label="Tipo Doc." required>
                    <select {...register(`integrantes.${i}.tipoDoc`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {TIPO_DOCUMENTO.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="N° Documento" required><input {...register(`integrantes.${i}.numDoc`)} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); register(`integrantes.${i}.numDoc`).onChange(e); }} minLength={7} className={inp} /></F>
                  <F label="Fecha de Nacimiento" required>
                    <input type="date" min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]} max={new Date().toISOString().split('T')[0]} {...register(`integrantes.${i}.fechaNacimiento`)} className={inp} />
                  </F>
                  <F label="Edad y Curso de Vida">
                    <input
                      type="text"
                      className={`${inp} bg-gray-100 cursor-not-allowed font-bold text-[#0a8c32]`}
                      value={edad !== null ? `${edad} años · ${cursoVida}` : ''}
                      disabled
                      placeholder="Autocalculado"
                    />
                  </F>
                  <F label="Parentesco" required>
                    <select {...register(`integrantes.${i}.parentesco`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {PARENTESCO.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="Sexo" required>
                    <select {...register(`integrantes.${i}.sexo`)} onChange={(e) => { register(`integrantes.${i}.sexo`).onChange(e); if (e.target.value === 'HOMBRE') setValue(`integrantes.${i}.gestante`, 'NA'); }} className={sel}>
                      <option value="">— Selecciona —</option>
                      {SEXO.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="Gestante">
                    <select {...register(`integrantes.${i}.gestante` as const)} onChange={(e) => { register(`integrantes.${i}.gestante`).onChange(e); if (e.target.value !== 'SI') setValue(`integrantes.${i}.mesesGestacion`, null); }} className={sel}>
                      {sexo === 'HOMBRE' ? (
                        <option value="NA">NO APLICA</option>
                      ) : sexo === 'INDETERMINADO' ? (
                        <>
                          <option value="NA">NO APLICA</option>
                          <option value="SI">Sí</option>
                          <option value="NO">No</option>
                        </>
                      ) : (
                        <>
                          <option value="">— Selecciona —</option>
                          <option value="SI">Sí</option>
                          <option value="NO">No</option>
                          <option value="En duda">En duda</option>
                        </>
                      )}
                    </select>
                  </F>
                  {gestanteStatus === 'SI' && (
                    <F label="Meses de Gestante" required>
                      <select {...register(`integrantes.${i}.mesesGestacion`, { valueAsNumber: true })} className={sel}>
                        <option value="">— Selecciona —</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(m => (
                          <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                    </F>
                  )}
                  <F label="Teléfono" required>
                    <input type="tel" {...register(`integrantes.${i}.telefono`)} onInput={(e) => { let val = e.currentTarget.value.replace(/[^0-9]/g, ''); if (val.length > 0 && val[0] !== '3') val = '3' + val.substring(1); if (val.length > 10) val = val.substring(0, 10); e.currentTarget.value = val; register(`integrantes.${i}.telefono`).onChange(e); }} minLength={10} maxLength={10} className={inp} placeholder="3XX XXX XXXX" />
                  </F>
                </div>

                {/* Educación y Afiliación */}
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#081e6966', borderTop: '1px solid #e8ecf5', paddingTop: '10px' }}>
                  Educación y Afiliación
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Nivel Educativo">
                    <select {...register(`integrantes.${i}.nivelEducativo`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {NIVEL_EDUCATIVO.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="Ocupación">
                    <select {...register(`integrantes.${i}.ocupacion`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {OCUPACION.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="Régimen de Salud">
                    <select {...register(`integrantes.${i}.regimen`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {REGIMEN_SALUD.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  <F label="EAPB / EPS">
                    <input {...register(`integrantes.${i}.eapb`)} list="eps-list" placeholder="Escriba o elija EPS..." className={inp} />
                    <datalist id="eps-list">
                      <option value="Nueva EPS" />
                      <option value="EPS Sanitas" />
                      <option value="EPS Sura" />
                      <option value="Salud Total EPS" />
                      <option value="Compensar EPS" />
                      <option value="Famisanar EPS" />
                      <option value="Servicio Occidental de Salud (S.O.S)" />
                      <option value="Aliansalud EPS" />
                      
                      <option value="Coosalud EPS" />
                      <option value="Mutual Ser EPS" />
                      <option value="Asmet Salud EPS" />
                      <option value="Emssanar EPS" />
                      <option value="Capital Salud EPS" />
                      <option value="Savia Salud EPS" />
                      <option value="Cajacopi EPS" />
                      <option value="Comfenalco Valle EPS" />
                      <option value="Comfaoriente" />
                      
                      <option value="Anas Wayuu EPSI" />
                      <option value="Mallamas EPSI" />
                      <option value="Pijaos Salud EPSI" />
                      <option value="Asociación Indígena del Cauca (AIC EPSI)" />
                      <option value="Dusakawi EPSI" />
                      
                      <option value="Fuerzas Militares y Policía Nacional" />
                      <option value="Fomag" />
                      <option value="Ecopetrol" />
                      <option value="Universidades Públicas" />
                    </datalist>
                  </F>
                </div>

                {/* Enfoque diferencial */}
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#081e6966', borderTop: '1px solid #e8ecf5', paddingTop: '10px' }}>
                  Enfoque Diferencial
                </p>
                <div className="space-y-2.5">
                  <F label="Pertenencia Étnica">
                    <select {...register(`integrantes.${i}.etnia`)} className={sel}>
                      <option value="">— Selecciona —</option>
                      {ETNIA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </F>
                  {String(etnia) === '1' && (
                    <F label="Pueblo Indígena">
                      <input {...register(`integrantes.${i}.puebloIndigena`)} className={inp} placeholder="Nombre del pueblo" />
                    </F>
                  )}
                  <F label="Grupo Pob. Especial Protección (múltiple)">
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {GRUPO_POBLACIONAL.map(o => (
                        <label key={o.id} className={chkLabel}>
                          <input type="checkbox" value={o.id} {...register(`integrantes.${i}.grupoPoblacional`)} className={chk} />
                          <span className="text-xs leading-tight">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </F>
                  <F label="Barreras de Acceso (múltiple)">
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {BARRERAS_ACCESO.map(o => (
                        <label key={o.id} className={chkLabel}>
                          <input type="checkbox" value={o.id} {...register(`integrantes.${i}.barrerasAcceso`)} className={chk} />
                          <span className="text-xs leading-tight">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </F>
                  <F label="Discapacidades (múltiple)">
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {DISCAPACIDADES.map(o => (
                        <label key={o.id} className={chkLabel}>
                          <input type="checkbox" value={o.id} {...register(`integrantes.${i}.discapacidades`)} className={chk} />
                          <span className="text-xs leading-tight">{o.label}</span>
                        </label>
                      ))}
                    </div>
                  </F>
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function F({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className={lbl} style={lblStyle}>
        {label} {required && <span style={reqStyle}>*</span>}
      </label>
      {children}
    </div>
  )
}
