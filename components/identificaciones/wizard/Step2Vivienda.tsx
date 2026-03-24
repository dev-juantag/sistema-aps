'use client'

import { useFormContext } from 'react-hook-form'
import {
  TIPO_VIVIENDA, MATERIAL_PAREDES, MATERIAL_PISOS, MATERIAL_TECHOS,
  FUENTE_AGUA, DISPOSICION_EXCRETAS, AGUAS_RESIDUALES, DISPOSICION_RESIDUOS,
  RIESGO_ACCIDENTE, FUENTE_ENERGIA, ANIMALES
} from '@/lib/constants'
import { inp, sel, card, cardBorder, lbl, lblStyle, required as reqStyle, chk, chkLabel, sectionTitle, sectionTitleStyle } from './wizardStyles'
import { useEffect } from 'react'

export default function Step2Vivienda() {
  const { register, watch, setValue, getValues } = useFormContext()
  const tipoVivienda = watch('tipoVivienda')
  const animales = watch('animales') || []
  const tieneAnimales = Array.isArray(animales) && animales.length > 0 && !animales.includes('9') && !animales.includes(9)
  const numEBS = watch('numEBS')

  useEffect(() => {
    if (!numEBS) return

    const fetchConsecutivos = async () => {
      const currentHogar = getValues('numHogar')
      const currentFamilia = getValues('numFamilia')
      const currentFicha = getValues('codFicha')
      
      if (currentHogar && currentFamilia && currentFicha && currentHogar !== "AUTOGENERADO") return

      try {
        const res = await fetch(`/api/identificaciones/consecutivos?numEBS=${numEBS}`)
        const json = await res.json()
        if (json.success && json.data) {
          setValue('numHogar', json.data.numHogar)
          setValue('numFamilia', json.data.numFamilia)
          setValue('codFicha', json.data.codFicha)
        }
      } catch (e) {
        console.error('Error fetching consecutivos', e)
      }
    }

    fetchConsecutivos()
  }, [numEBS, setValue, getValues])

  return (
    <div className="space-y-4">
    
      {/* Identificadores Matrioshka */}
      <div className={card} style={cardBorder}>
        <p className={sectionTitle} style={sectionTitleStyle}>Códigos de Identificación (Autogenerados)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <F label="ID Hogar (Casa)" required>
            <input {...register('numHogar')} className={`${inp} transition-colors focus:ring-2 focus:ring-emerald-500`} placeholder={`T00H0001`} />
          </F>
          <F label="ID Familia" required>
            <input {...register('numFamilia')} className={`${inp} transition-colors focus:ring-2 focus:ring-emerald-500`} placeholder={`T00H0001F0001`} />
          </F>
          <F label="Código Ficha" required>
            <input {...register('codFicha')} className={`${inp} transition-colors focus:ring-2 focus:ring-emerald-500`} placeholder={`T00H0001F0001CF001`} />
          </F>
        </div>
      </div>

      {/* Características físicas */}
      <Sec title="Características Físicas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Tipo de Vivienda" required>
            <select {...register('tipoVivienda')} className={sel}>
              <option value="">— Selecciona —</option>
              {TIPO_VIVIENDA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          {String(tipoVivienda) === '12' && (
            <F label="Descripción (Otro tipo)">
              <input {...register('tipoViviendaDesc')} maxLength={30} className={inp} placeholder="Máx. 30 caracteres" />
            </F>
          )}
          <F label="Material de paredes" required>
            <select {...register('matParedes')} className={sel}>
              <option value="">— Selecciona —</option>
              {MATERIAL_PAREDES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="Material del piso" required>
            <select {...register('matPisos')} className={sel}>
              <option value="">— Selecciona —</option>
              {MATERIAL_PISOS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="Material del techo" required>
            <select {...register('matTechos')} className={sel}>
              <option value="">— Selecciona —</option>
              {MATERIAL_TECHOS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="N° hogares / familias" required>
            <input type="number" min="1" {...register('numHogares')} className={inp} />
          </F>
          <F label="N° dormitorios" required>
            <input type="number" min="0" {...register('numDormitorios')} className={inp} />
          </F>
          <F label="Estrato socioeconómico" required>
            <select {...register('estratoSocial')} className={sel}>
              <option value="">— Selecciona —</option>
              {[1,2,3,4,5,6].map(e => <option key={e} value={e}>Estrato {e}</option>)}
            </select>
          </F>
          <F label="¿Hacinamiento?">
            <label className={chkLabel}>
              <input type="checkbox" {...register('hacinamiento')} className={chk} />
              <span className="text-xs">Sí hay hacinamiento</span>
            </label>
          </F>
        </div>
      </Sec>

      {/* Saneamiento */}
      <Sec title="Saneamiento Básico">
        <Multi label="Fuente de agua" options={FUENTE_AGUA} name="fuenteAgua" register={register} />
        <Multi label="Disposición de excretas" options={DISPOSICION_EXCRETAS} name="dispExcretas" register={register} />
        <Multi label="Aguas residuales" options={AGUAS_RESIDUALES} name="aguasResiduales" register={register} />
        <Multi label="Disposición de residuos" options={DISPOSICION_RESIDUOS} name="dispResiduos" register={register} />
        <Multi label="Riesgos de accidente" options={RIESGO_ACCIDENTE} name="riesgoAccidente" register={register} />
        <F label="Fuente de energía para cocinar" required>
          <select {...register('fuenteEnergia')} className={sel}>
            <option value="">— Selecciona —</option>
            {FUENTE_ENERGIA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
      </Sec>

      {/* Vectores */}
      <Sec title="Vectores y Zoonosis">
        <F label="¿Se observan criaderos de vectores?" required>
          <div className="flex gap-4 mt-1">
            {['true', 'false'].map(v => (
              <label key={v} className={chkLabel}>
                <input type="radio" {...register('presenciaVectores')} value={v} className={chk} />
                <span className="text-xs">{v === 'true' ? 'Sí' : 'No'}</span>
              </label>
            ))}
          </div>
        </F>
        <Multi label="Animales en la vivienda" options={ANIMALES} name="animales" register={register} required={true} />
        {tieneAnimales && (
          <>
            <F label="Cantidad de animales">
              <input type="number" min="0" {...register('cantAnimales')} className={inp} />
            </F>
            <F label="¿Requiere vacunación mascotas?">
              <label className={chkLabel}>
                <input type="checkbox" {...register('vacunacionMascotas')} className={chk} />
                <span className="text-xs">Sí requiere</span>
              </label>
            </F>
          </>
        )}
      </Sec>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={card} style={cardBorder}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>{title}</p>
      {children}
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

function Multi({ label, options, name, register, required }: { label: string; options: {id: number; label: string}[]; name: string; register: any, required?: boolean }) {
  return (
    <F label={label} required={required}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
        {options.map(o => (
          <label key={o.id} className={chkLabel}>
            <input type="checkbox" value={o.id} {...register(name)} className={chk} />
            <span className="text-xs leading-tight">{o.label}</span>
          </label>
        ))}
      </div>
    </F>
  )
}
