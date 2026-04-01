'use client'

import { useFormContext } from 'react-hook-form'
import FamiliogramaViewer from '@/components/ui/FamiliogramaViewer'
import FamiliogramaCanvas from './FamiliogramaCanvas'
import { inp, sel, lbl, lblStyle } from './wizardStyles'
import { Code, Eye, RefreshCw, AlertTriangle, MousePointerSquareDashed } from 'lucide-react'

// Capa de Negocio Externa
import { useFamiliogramaManager } from '@/lib/familiograma/hooks'
import { FAMILY_TYPE_NAMES } from '@/lib/familiograma/constants'
import { Integrante } from '@/lib/familiograma/types'

export default function Step6Familiograma() {
  const { register } = useFormContext()
  const {
    integrantes,
    internalCode,
    declaredType,
    mode,
    setMode,
    handleUpdateCode,
    validation,
    setValue
  } = useFamiliogramaManager()

  const { inferredType, reason, mismatch } = validation

  const handleIntegrantesUpdate = (updater: (prev: Integrante[]) => Integrante[]) => {
    // Para simplificar la mutación desde ReactFlow
    const newInt = updater(integrantes)
    setValue('integrantes', newInt, { shouldDirty: true })
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER EXPLICATIVO */}
      <div className="bg-[#081e69]/5 rounded-2xl p-4 border border-[#081e69]/20 flex gap-4">
        <div className="w-12 h-12 rounded-full bg-[#081e69]/10 flex items-center justify-center shrink-0">
          <Eye className="w-6 h-6 text-[#081e69]" />
        </div>
        <div>
          <h3 className="font-bold text-[#081e69] text-base">Consolidación del Familiograma</h3>
          <p className="text-sm text-gray-600 mt-1 leading-snug">
            El sistema ha generado un diagrama base calculando las relaciones familiares. Usa los <b>Selectores de Ajuste</b> a continuación, o prueba la nueva herramienta <b>Canvas Interactivo</b> para dibujar arreglos de vínculos manualmente arrastrando líneas.
          </p>
        </div>
      </div>

      {/* INTELLIGENT VALIDATOR */}
      {mismatch && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 shadow-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wide">Validación Inteligente de Estructura</h4>
            <p className="text-sm mt-1">
              Declaraste la familia como <b>{FAMILY_TYPE_NAMES[declaredType] || 'Otra'}</b>, 
              pero tu diagrama parece <b>{FAMILY_TYPE_NAMES[inferredType] || 'Otra'}</b>.
            </p>
            <p className="text-xs mt-1 text-amber-700 opacity-80">Razón de la IA: {reason}</p>
          </div>
        </div>
      )}

      {/* SPLIT VIEW */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 bg-white p-4 rounded-2xl border border-gray-200">
        
        {/* LADO IZQUIERDO: VISOR / EDITOR / CANVAS */}
        <div className="flex flex-col gap-3 min-h-[500px]">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-gray-700">Previsualización</h4>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <button 
                type="button" 
                onClick={() => setMode('visualizar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'visualizar' ? 'bg-[#081e69] text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Mermaid Visual
              </button>
              <button 
                type="button" 
                onClick={() => setMode('interactivo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'interactivo' ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-indigo-700 hover:bg-indigo-100'} flex items-center gap-1.5`}
              >
                <MousePointerSquareDashed className="w-3.5 h-3.5" /> Canvas Interactivo
              </button>
              <button 
                type="button" 
                onClick={() => setMode('codigo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'codigo' ? 'bg-[#081e69] text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} flex items-center gap-1.5`}
                title="Para usuarios avanzados que dominan Mermaid JS"
              >
                <Code className="w-3.5 h-3.5" /> Código (Pro)
              </button>
            </div>
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col justify-center relative">
            {mode === 'visualizar' && (
               <FamiliogramaViewer code={internalCode} />
            )}
            
            {mode === 'interactivo' && (
               <FamiliogramaCanvas 
                  integrantes={integrantes} 
                  onUpdateIntegrantes={handleIntegrantesUpdate}
               />
            )}

            {mode === 'codigo' && (
              <textarea 
                value={internalCode}
                onChange={(e) => handleUpdateCode(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 ring-inset ring-[#081e69]/20 bg-slate-900 text-slate-50"
                placeholder="Escribe código Mermaid aquí..."
              />
            )}
          </div>
        </div>

        {/* LADO DERECHO: SELECTORES */}
        <div className="flex flex-col gap-3 max-h-[600px] xl:max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="border-b pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-gray-400" />
              <h4 className="font-bold text-gray-700">Ajustar Vínculos (Filtro Humano)</h4>
            </div>
          </div>

          {!integrantes || integrantes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Agrega integrantes en el Paso 4 para ver las conexiones.</p>
          ) : (
            <>
              {integrantes.map((int: Integrante, i: number) => {
                const nac = int.fechaNacimiento;
                let edad = 0;
                if (nac) {
                  const today = new Date();
                  const dob = new Date(nac);
                  edad = today.getFullYear() - dob.getFullYear();
                  if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
                    edad--;
                  }
                }

                return (
                  <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <p className="font-bold text-[11px] uppercase tracking-wide text-[#081e69] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[#081e69] text-white flex items-center justify-center font-black">#{i+1}</span>
                      {int.primerNombre || int.nombres || `Integrante ${i+1}`} {int.primerApellido || int.apellidos}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <label className={lbl} style={lblStyle}>Padre</label>
                        <select {...register(`integrantes.${i}.padreId`)} className={`${sel} !h-8 !text-xs`}>
                          <option value="">— N/A —</option>
                          {integrantes.map((f: any, idx: number) => (
                            idx !== i && <option key={idx} value={String(idx)}>#{idx+1} {f.primerNombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className={lbl} style={lblStyle}>Madre</label>
                        <select {...register(`integrantes.${i}.madreId`)} className={`${sel} !h-8 !text-xs`}>
                          <option value="">— N/A —</option>
                          {integrantes.map((f: any, idx: number) => (
                            idx !== i && <option key={idx} value={String(idx)}>#{idx+1} {f.primerNombre}</option>
                          ))}
                        </select>
                      </div>

                      {edad >= 12 && (
                        <div className="col-span-2 space-y-1 mt-1 p-2 bg-indigo-50 rounded-lg">
                          <label className={lbl} style={lblStyle}>Pareja (En el hogar)</label>
                          <div className="flex gap-2">
                            <select {...register(`integrantes.${i}.parejaId`)} className={`${sel} !h-8 !text-xs w-1/2`}>
                              <option value="">— N/A —</option>
                              {integrantes.map((f: any, idx: number) => (
                                idx !== i && <option key={idx} value={String(idx)}>#{idx+1} {f.primerNombre}</option>
                              ))}
                            </select>
                            <select {...register(`integrantes.${i}.tipoPareja`)} className={`${sel} !h-8 !text-xs w-1/2`}>
                              <option value="UNION_LIBRE">Unión Libre</option>
                              <option value="MATRIMONIO">Matrimonio</option>
                              <option value="SEPARADO">Separado/a</option>
                              <option value="DIVORCIADO">Divorciado/a</option>
                              <option value="VIUDO">Viudo/a</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="col-span-1 space-y-1 mt-1">
                        <label className={lbl} style={lblStyle}>Tipo de Hijo</label>
                        <select {...register(`integrantes.${i}.tipoHijo`)} className={`${sel} !h-8 !text-xs`}>
                          <option value="BIOLOGICO">Biológico</option>
                          <option value="ADOPTADO">Adoptivo</option>
                          <option value="HIJASTRO">Crianza</option>
                        </select>
                      </div>
                      <div className="col-span-1 space-y-1 mt-1">
                        <label className={lbl} style={lblStyle}>Estado Vital</label>
                        <select {...register(`integrantes.${i}.estadoVital`)} className={`${sel} !h-8 !text-xs`}>
                          <option value="VIVO">Vivo</option>
                          <option value="FALLECIDO">Fallecido</option>
                          <option value="ABORTO">Aborto</option>
                        </select>
                      </div>

                    </div>
                  </div>
                )
              })}
            </>
          )}

        </div>

      </div>

    </div>
  )
}
