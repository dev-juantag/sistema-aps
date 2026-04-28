'use client'

import { useFormContext } from 'react-hook-form'
import { Info, MapPin, Crosshair } from 'lucide-react'
import { ESTADO_VISITA, TIPO_DOCUMENTO_ENCUESTADOR, PERFIL_ENCUESTADOR } from '@/lib/constants'
import { inp, sel, card, cardBorder, lbl, lblStyle, required as reqStyle, chk, chkLabel, btnGreen, btnGreenStyle } from './wizardStyles'
import MapLocationPicker from '@/components/ui/MapLocationPicker'

export default function Step1InfoGeneral() {
  const { register, setValue, watch } = useFormContext()

  const handleGPS = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setValue('latitud', pos.coords.latitude.toString())
      setValue('longitud', pos.coords.longitude.toString())
    })
  }

  const lat = watch('latitud')
  const lng = watch('longitud')
  const estadoVisita = watch('estadoVisita')

  return (
    <div className="space-y-4">

      {/* Control de Visita */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#081e69' }}>
          <Info className="w-3.5 h-3.5" style={{ color: '#0a8c32' }} /> Control de Visita
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Estado de la Visita" required>
            <select {...register('estadoVisita')} className={sel}>
              {ESTADO_VISITA.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="Fecha de Diligenciamiento" required>
            <input type="date" max={new Date().toISOString().split('T')[0]} {...register('fechaDiligenciamiento')} className={inp} />
          </F>
        </div>
      </div>

      {/* Ubicación */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#081e69' }}>
          <MapPin className="w-3.5 h-3.5" style={{ color: '#0a8c32' }} /> Ubicación
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="Departamento" required>
            <input {...register('departamento')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Municipio" required>
            <input {...register('municipio')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Microterritorio" required>
            <input {...register('microterritorio')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="UZPE">
            <input {...register('uzpe')} placeholder="UZPE" readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Centro Poblado / Barrio" required>
            <input {...register('centroPoblado')} placeholder="Nombre del sector" className={inp} />
          </F>
          <F label="Dirección" required>
            <input {...register('direccion')} placeholder="CR 12 # 34-56" className={inp} maxLength={200} />
          </F>
          <F label="Descripción de la Ubicación" className="sm:col-span-2">
            <textarea {...register('descripcionUbicacion')} placeholder="Frente a la panadería, casa de portón verde, subir por las escaleras..." className={`${inp} min-h-[70px] resize-y`} />
          </F>
        </div>

        {/* GPS y Mapa */}
        <div className="rounded-xl p-4 sm:col-span-2 space-y-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-sm font-black flex items-center gap-2" style={{ color: '#081e69' }}>
                <Crosshair className="w-4 h-4 text-orange-500" /> Georreferenciación Exacta
              </p>
              <p className="text-xs text-slate-500 font-medium max-w-lg mt-1">
                Haz clic sobre el mapa para ajustar la ubicación exacta de la vivienda.
              </p>
            </div>
            <button type="button" onClick={handleGPS} className={btnGreen} style={{...btnGreenStyle, width: 'auto', padding: '0.5rem 1rem'}}>
              Usar mi GPS actual
            </button>
          </div>

          <MapLocationPicker 
            lat={lat} 
            lng={lng} 
            setFieldValue={setValue} 
            searchQuery={`${watch('centroPoblado') || ''} ${watch('direccion') || ''}`.trim()} 
          />

          <div className="grid grid-cols-2 gap-3 mt-2">
            <F label="Latitud (Auto)">
              <input {...register('latitud')} readOnly placeholder="-6.123456" className={`${inp} bg-slate-100 font-mono text-xs cursor-not-allowed`} />
            </F>
            <F label="Longitud (Auto)">
              <input {...register('longitud')} readOnly placeholder="-75.123456" className={`${inp} bg-slate-100 font-mono text-xs cursor-not-allowed`} />
            </F>
          </div>
        </div>
      </div>

      {/* Responsable */}
      <div className={card} style={cardBorder}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#081e69' }}>Responsable / Encuestador</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="No. Identificación EBS" required>
            <input {...register('numEBS')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Prestador Primario" required>
            <input {...register('prestadorPrimario')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Tipo Doc. Encuestador" required>
            <select {...register('tipoDocEncuestador')} className={sel}>
              <option value="">— Selecciona —</option>
              {TIPO_DOCUMENTO_ENCUESTADOR.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          <F label="N° Doc. Encuestador" required>
            <input {...register('numDocEncuestador')} readOnly className={`${inp} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`} />
          </F>
          <F label="Perfil Encuestador" required className="sm:col-span-2">
            <select {...register('perfilEncuestador')} className={`${sel} bg-gray-100 cursor-not-allowed text-gray-600 font-bold`}>
              {PERFIL_ENCUESTADOR.filter(o => o.id === 'auxiliar').map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </F>
          
          {estadoVisita !== '1' && (
            <F label="Observaciones / Motivo de Rechazo" required className="sm:col-span-2 pt-2">
              <textarea {...register('observacionesRechazo')} className={`${inp} min-h-[80px] resize-y`} placeholder="Ej. Lote baldío, Casa deshabitada, Rechazo rotundo..." />
            </F>
          )}
        </div>
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
