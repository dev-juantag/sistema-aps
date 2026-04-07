'use client'

import { useFormContext } from 'react-hook-form'
import { TIPO_FAMILIA, APGAR_PREGUNTAS, APGAR_OPCIONES, ZARIT_OPCIONES, ECOMAPA_OPCIONES, VULNERABILIDADES } from '@/lib/constants'
import { useState, useEffect } from 'react'
import { inp, sel, card, cardBorder, lbl, lblStyle, required as reqStyle, chk, chkLabel } from './wizardStyles'

export default function Step3Familia() {
  const { register, watch, setValue, getValues } = useFormContext()
  const cuidador = watch('cuidadorPrincipal')
  const [apgarScores, setApgarScores] = useState<number[]>(() => {
    const savedRespuestas = getValues('apgarRespuestas');
    if (Array.isArray(savedRespuestas) && savedRespuestas.length === 5) {
      return savedRespuestas;
    }
    const saved = getValues('apgar');
    if (saved === '1') return [4, 4, 3, 3, 3]; // 17 pts
    if (saved === '2') return [3, 3, 3, 2, 2]; // 13 pts
    if (saved === '3') return [2, 2, 2, 2, 2]; // 10 pts
    if (saved === '4') return [1, 1, 1, 1, 1]; // 5 pts
    return [0, 0, 0, 0, 0];
  })

  const total = apgarScores.reduce((a, b) => a + b, 0)
  const apgarCat = total >= 17 ? 1 : total >= 13 ? 2 : total >= 10 ? 3 : 4
  const apgarLabel = APGAR_OPCIONES.find(o => o.id === apgarCat)?.label || ''
  const APGAR_VALORES = ['Nunca (0)', 'Casi nunca (1)', 'A veces (2)', 'Casi siempre (3)', 'Siempre (4)']

  const handleApgar = (index: number, value: number) => {
    const updated = [...apgarScores]
    updated[index] = value
    setApgarScores(updated)
  }

  useEffect(() => {
    setValue('apgarRespuestas', apgarScores, { shouldValidate: true })
    setValue('apgar', String(apgarCat), { shouldValidate: true })
  }, [apgarCat, apgarScores, setValue])

  return (
    <div className="space-y-4">

      {/* Estructura familiar */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>Estructura Familiar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Tipo de familia" required>
            <select {...register('tipoFamilia')} className={sel}>
              <option value="">— Selecciona —</option>
              {TIPO_FAMILIA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="N° de integrantes" required>
            <input type="number" min="1" {...register('numIntegrantes')} className={inp} />
          </F>
        </div>
      </div>

      {/* APGAR */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>APGAR Familiar</p>
        <p className="text-[11px] text-gray-400 -mt-2">Califique cada pregunta del 0 al 4. Máx: 20 pts.</p>
        <div className="space-y-3">
          {APGAR_PREGUNTAS.map((pregunta, i) => (
            <div key={i} className="space-y-1.5">
              <p className="text-xs text-gray-700 font-medium">{i + 1}. {pregunta}</p>
              <div className="flex flex-wrap gap-1.5">
                {APGAR_VALORES.map((label, v) => (
                  <label
                    key={v}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg cursor-pointer border transition-all font-medium"
                    style={apgarScores[i] === v
                      ? { background: '#081e69', color: '#fff', borderColor: '#081e69' }
                      : { borderColor: '#e2e8f0', color: '#64748b', background: '#fff' }}
                  >
                    <input type="radio" name={`apgar_q${i}`} value={v} checked={apgarScores[i] === v}
                      onChange={() => handleApgar(i, v)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: '#f0f4ff', border: '1px solid #c7d4f0', color: '#081e69' }}>
          Puntaje: {total}/20 → {apgarLabel}
          <input type="hidden" {...register('apgar')} />
        </div>
      </div>

      {/* Ecomapa */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>Ecomapa Familiar</p>
        <F label="Calificación ecomapa">
          <select {...register('ecomapa')} className={sel}>
            <option value="">— Selecciona —</option>
            {ECOMAPA_OPCIONES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
      </div>

      {/* Riesgo Psicosocial */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>Riesgo Psicosocial</p>
        <F label="¿Existe cuidador principal?">
          <label className={chkLabel}>
            <input type="checkbox" {...register('cuidadorPrincipal')} className={chk} />
            <span className="text-xs">Sí hay cuidador principal</span>
          </label>
        </F>
        {cuidador && (
          <F label="Resultado Escala ZARIT">
            <select {...register('zarit')} className={sel}>
              <option value="">— Selecciona resultado —</option>
              {ZARIT_OPCIONES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Escala de 22 preguntas Likert 0-4.</p>
          </F>
        )}
        <F label="Vulnerabilidad Social (múltiple)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
            {VULNERABILIDADES.map(v => (
              <label key={v.id} className={chkLabel}>
                <input type="checkbox" value={v.id} {...register('vulnerabilidades')} className={chk} />
                <span className="text-xs">{v.label}</span>
              </label>
            ))}
          </div>
        </F>
      </div>
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
