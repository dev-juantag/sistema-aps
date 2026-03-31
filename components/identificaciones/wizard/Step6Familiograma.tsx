'use client'

import { useFormContext } from 'react-hook-form'
import { useEffect, useState } from 'react'
import FamiliogramaViewer from '@/components/ui/FamiliogramaViewer'
import { inp, sel, lbl, lblStyle, chk, chkLabel, required as reqStyle } from './wizardStyles'
import { Code, Eye, RefreshCw, AlertTriangle } from 'lucide-react'

// --- Mermaid Generator Logic ---
function getMermaidCode(integrantes: any[]): string {
  if (!integrantes || integrantes.length === 0) return ''

  let code = "graph TD\n"
  
  // Nodos (Personas)
  integrantes.forEach((int: any, idx: number) => {
    const isMale = int.sexo === "HOMBRE"
    let shapeStart = isMale ? "[" : "(("
    let shapeEnd = isMale ? "]" : "))"
    let styleClass = isMale ? "fill:#c2e0ff,stroke:#0f52ba" : "fill:#ffd1dc,stroke:#ff69b4"
    
    // Si sexo no es hombre ni mujer
    if (!["HOMBRE", "MUJER"].includes(int.sexo)) {
      shapeStart = "{"; shapeEnd = "}";
      styleClass = "fill:#e6e6fa,stroke:#8a2be2";
    }
    
    // Ajuste fallecidos
    if (int.estadoVital === "FALLECIDO" || int.estadoVital === "ABORTO") {
      styleClass += ",stroke-width:2px,stroke-dasharray: 5 5,color:#555";
    } else {
      styleClass += ",stroke-width:2px,color:#000";
    }

    const name = (int.primerNombre || `P${idx}`).replace(/[^a-zA-Z0-9]/g, "")
    // Agregamos un identificador numérico visible
    code += `  I${idx}${shapeStart}#${idx + 1} ${name}${shapeEnd}\n`
    code += `  style I${idx} ${styleClass}\n`
  })

  code += "\n"

  // Parejas
  const procesados = new Set<string>()
  integrantes.forEach((int: any, idx: number) => {
    if (int.parejaId && int.parejaId !== "") {
      const pId = parseInt(int.parejaId)
      const pairKey = [idx, pId].sort().join('-')
      if (!procesados.has(pairKey)) {
        procesados.add(pairKey)
        const tipoP = int.tipoPareja || 'UNION_LIBRE'
        let connector = "---"
        if (tipoP === "MATRIMONIO") connector = "==="
        if (tipoP === "SEPARADO" || tipoP === "DIVORCIADO") connector = "-.-"
        if (tipoP === "VIUDO") connector = "x--x"
        
        // El nodo puente de la pareja
        const bridgeId = `U_${idx}_${pId}`
        code += `  I${idx} ${connector} ${bridgeId}((💟)) ${connector} I${pId}\n`
        code += `  style ${bridgeId} fill:#fff,stroke:none,font-size:10px\n`
      }
    }
  })

  code += "\n"

  // Hijos
  integrantes.forEach((int: any, idx: number) => {
    const padre = int.padreId ? parseInt(int.padreId) : null
    const madre = int.madreId ? parseInt(int.madreId) : null

    // Si tiene ambos padres, buscar si son pareja para conectarlos desde la unión
    if (padre !== null && madre !== null) {
      const pairKey = [padre, madre].sort().join('-')
      if (procesados.has(pairKey)) {
        // Enlazar desde la unión
        code += `  U_${Math.min(padre, madre)}_${Math.max(padre, madre)} --> I${idx}\n`
      } else {
        // Enlaces separados
        code += `  I${padre} --> I${idx}\n`
        code += `  I${madre} --> I${idx}\n`
      }
    } else if (padre !== null) {
      code += `  I${padre} --> I${idx}\n`
    } else if (madre !== null) {
      code += `  I${madre} --> I${idx}\n`
    }
  })

  return code
}

// Lógica para autoenlazar basado en rol (solo en el 1er render)
function autoLinkRelatives(integrantes: any[]) {
  const newList = JSON.parse(JSON.stringify(integrantes));
  let changed = false;

  const jefeIdx = newList.findIndex((i: any) => String(i.parentesco) === '1');
  const conyugeIdx = newList.findIndex((i: any) => String(i.parentesco) === '2');

  // Enlazar Jefe y Conyuge
  if (jefeIdx >= 0 && conyugeIdx >= 0) {
    if (!newList[jefeIdx].parejaId && !newList[conyugeIdx].parejaId) {
      newList[jefeIdx].parejaId = String(conyugeIdx);
      newList[conyugeIdx].parejaId = String(jefeIdx);
      changed = true;
    }
  }

  // Enlazar hijos (parentesco=3) al Jefe y al Conyuge por defecto (si aplicara)
  newList.forEach((int: any, idx: number) => {
    if (String(int.parentesco) === '3') {
      if (jefeIdx >= 0 && !int.padreId && !int.madreId) {
        // Buscar el hombre y la mujer entre jefe y conyuge (si aplica)
        const isJefeHombre = newList[jefeIdx].sexo === 'HOMBRE';
        if (isJefeHombre) {
          int.padreId = String(jefeIdx);
          if (conyugeIdx >= 0) int.madreId = String(conyugeIdx);
        } else {
          int.madreId = String(jefeIdx);
          if (conyugeIdx >= 0) int.padreId = String(conyugeIdx);
        }
        changed = true;
      }
    }
  });

  return { newList, changed };
}


export default function Step6Familiograma() {
  const { register, watch, setValue, getValues } = useFormContext()
  const integrantes = watch('integrantes') || []
  const currentCode = watch('familiogramaCodigo') || ''
  const declaredType = watch('tipoFamilia')

  const [mode, setMode] = useState<'visualizar' | 'codigo'>('visualizar')
  const [internalCode, setInternalCode] = useState(currentCode)

  useEffect(() => {
    // 1. Autoenlace inicial (solo si NO hay código existente para no pisar ediciones)
    if (!currentCode && integrantes.length > 0) {
      const { newList, changed } = autoLinkRelatives(integrantes);
      if (changed) {
        setValue('integrantes', newList);
        const code = getMermaidCode(newList);
        setValue('familiogramaCodigo', code);
        setInternalCode(code);
        return;
      }
    }
    
    // 2. Si el usuaro no está editando el código escrito, actualizar desde Selectors
    if (mode === 'visualizar') {
      const genCode = getMermaidCode(integrantes);
      if (genCode !== currentCode) {
        setValue('familiogramaCodigo', genCode);
        setInternalCode(genCode);
      }
    }
  }, [integrantes, mode]) // Re-run al cambiar integrantes

  const handleUpdateCode = (val: string) => {
    setInternalCode(val)
    setValue('familiogramaCodigo', val)
  }

  // Inferencia para la Validación Inteligente
  const numInt = integrantes.length;
  const numParejas = integrantes.filter((i: any) => i.parejaId && i.parejaId !== '').length;
  const numHijos = integrantes.filter((i: any) => String(i.parentesco) === '3' || i.padreId || i.madreId).length;
  const numPadresSuegrosNietos = integrantes.filter((i: any) => ['4','5','6','7','8'].includes(String(i.parentesco))).length;

  let inferredType = '7'; // Otro
  let reason = '';
  if (numInt === 1) {
    inferredType = '5'; reason = 'Hay un solo integrante registrado.';
  } else if (numPadresSuegrosNietos > 0) {
    inferredType = '3'; reason = 'Hay miembros de generaciones altas (abuelos, suegros, tíos).';
  } else if (numParejas >= 2 && numHijos > 0) {
    inferredType = '1'; reason = 'Existen vínculos formales de pareja y registro paterno de hijos.';
  } else if (numParejas >= 2 && numHijos === 0) {
    inferredType = '1'; reason = 'Pareja sin hijos convivientes directos.';
  } else if (numParejas === 0 && numHijos > 0) {
    inferredType = '2'; reason = 'Hay hijos pero no se registran parejas dentro del hogar actual.';
  }
  
  const typeNames: Record<string, string> = { '1': 'Nuclear', '2': 'Monoparental', '3': 'Extensa', '4': 'Compuesta', '5': 'Unipersonal', '6': 'Homoparental' };
  const mismatch = declaredType && inferredType !== declaredType && declaredType !== '7' && inferredType !== '7';

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
            El sistema ha generado un diagrama base calculando las relaciones familiares (Ej. uniendo al Jefe y al Cónyuge con los Hijos). Usa los <b>Selectores de Ajuste</b> a continuación para corregir las conexiones incorrectas. El gráfico se actualizará en tiempo real.
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
              Declaraste la familia como <b>{typeNames[declaredType as string] || 'Otra'}</b>, 
              pero tu diagrama parece <b>{typeNames[inferredType] || 'Otra'}</b>.
            </p>
            <p className="text-xs mt-1 text-amber-700 opacity-80">Razón de la IA: {reason}</p>
          </div>
        </div>
      )}

      {/* SPLIT VIEW (Or Stacked on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-4 rounded-2xl border border-gray-200">
        
        {/* LADO IZQUIERDO: VISOR O EDITOR */}
        <div className="flex flex-col gap-3 min-h-[400px]">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-bold text-gray-700">Previsualización</h4>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setMode('visualizar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'visualizar' ? 'bg-[#081e69] text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Gráfico Visual
              </button>
              <button 
                type="button" 
                onClick={() => setMode('codigo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'codigo' ? 'bg-[#081e69] text-white shadow' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} flex items-center gap-1.5`}
              >
                <Code className="w-3.5 h-3.5" /> Mermaid (Pro)
              </button>
            </div>
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col justify-center">
            {mode === 'visualizar' ? (
               <FamiliogramaViewer code={internalCode} />
            ) : (
              <textarea 
                value={internalCode}
                onChange={(e) => handleUpdateCode(e.target.value)}
                className="w-full h-full min-h-[400px] p-4 font-sans text-sm resize-none focus:outline-none focus:ring-2 ring-inset ring-[#081e69]/20"
                placeholder="Escribe código Mermaid aquí..."
              />
            )}
          </div>
          {mode === 'codigo' && (
            <p className="text-[10px] text-gray-400">Las modificaciones al código manual no actualizarán retroactivamente los dropdowns a la derecha, pero sí se guardarán en la ficha.</p>
          )}
        </div>

        {/* LADO DERECHO: SELECTORES */}
        <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="border-b pb-2 flex items-center gap-2">
             <RefreshCw className="w-4 h-4 text-gray-400" />
             <h4 className="font-bold text-gray-700">Ajustar Vínculos (Filtro Humano)</h4>
          </div>

          {!integrantes || integrantes.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Agrega integrantes en el Paso 4 para ver las conexiones.</p>
          ) : (
            <>
              {integrantes.map((int: any, i: number) => {
                // Cálculo de edad
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
                      {int.primerNombre || `Integrante ${i+1}`} {int.primerApellido}
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

                      {/* Mostrar edición de Pareja solo mayores a 12 */}
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
