import { ArrowLeft, Printer, MapPin, Info, Home, Users, Activity, Stethoscope, FileText, Network } from 'lucide-react'
import { ESTADO_VISITA, APGAR_OPCIONES, calcularEdad } from '@/lib/constants'
import FamiliogramaViewer from './FamiliogramaViewer'

export default function ResumenFicha({ ficha, onClose, onStartNew }: { ficha: any, onClose: () => void, onStartNew?: (micro: string) => void }) {
  if (!ficha) return null

  const fechaText = new Date(ficha.fechaDiligenciamiento).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric'
  })

  const getLabel = (arr: any[], id: any) => arr.find(x => String(x.id) === String(id))?.label || id || 'N/A'

  const nombreEncuestador = ficha.encuestador 
    ? `${ficha.encuestador.nombre} ${ficha.encuestador.apellidos}`
    : 'Auxiliar'
  const docEncuestador = ficha.encuestador?.documento || ficha.numDocEncuestador || 'N/A'

  const estadoVisitaLabel = getLabel(ESTADO_VISITA, ficha.estadoVisita)

  return (
    <div className="w-full flex flex-col font-sans bg-gray-50/50 min-h-[70vh]">
      
      {/* Header Modal */}
      <div className="bg-[#081e69] text-white p-6 pb-8 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-black">
              Resumen de Identificación <span className="text-blue-300">#{ficha.consecutivo}</span>
            </h1>
            <p className="text-sm text-blue-100 mt-1 opacity-80">
              Capturada el {fechaText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#081e69] rounded-full font-bold text-sm shadow hover:bg-blue-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir Identificación
          </button>
          <div className={`px-4 py-1.5 rounded-full font-black text-xs tracking-widest border ${
            ficha.estadoVisita === '1' ? 'bg-teal-100 text-teal-800 border-teal-200' :
            ficha.estadoVisita === '2' ? 'bg-orange-100 text-orange-800 border-orange-200' :
            'bg-red-100 text-red-800 border-red-200'
          }`}>
            {estadoVisitaLabel}
          </div>
        </div>
      </div>

      {/* Body / Tarjetas */}
      <div className="p-6 md:p-8 space-y-6">

        {/* Fila 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card Ubicación */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Ubicación y Geografía</h2>
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Sección I</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Territorio</p>
                <p className="font-bold text-gray-800 text-sm">
                  {typeof ficha.territorio === 'object' && ficha.territorio 
                    ? `${ficha.territorio.codigo} | ${ficha.territorio.nombre}` 
                    : (ficha.territorio || ficha.territorioId)} / {ficha.microterritorio}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Municipio</p>
                <p className="font-bold text-gray-800 text-sm uppercase">{ficha.municipio}, {ficha.departamento}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Dirección</p>
                <p className="font-bold text-gray-800 text-sm">{ficha.direccion}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Descripción de la Ubicación</p>
                <p className="font-bold text-gray-800 text-sm">{ficha.descripcionUbicacion || 'No registrada'}</p>
              </div>
            </div>
          </div>

          {/* Card Institucional */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Datos Institucionales</h2>
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Responsable</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="col-span-2">
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Prestador Primario</p>
                <p className="font-bold text-gray-800 text-sm uppercase">{ficha.prestadorPrimario || 'ESE SALUD PEREIRA'} (EBS: {ficha.numEBS})</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Encuestador Creador</p>
                <p className="font-bold text-gray-800 text-sm uppercase flex items-center gap-2">
                  {nombreEncuestador} <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-mono">ID {docEncuestador}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Núm Hogar</p>
                <p className="font-bold text-gray-800 text-sm">{ficha.numHogar || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Familia ID</p>
                <p className="font-bold text-gray-800 text-sm">{ficha.numFamilia || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* REZHAZADA / NO EFECTIVA */}
        {ficha.estadoVisita !== '1' && (
          <div className={`border-2 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 ${
            ficha.estadoVisita === '2' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
          }`}>
            <div>
              <h3 className={`font-bold mb-1 ${ficha.estadoVisita === '2' ? 'text-orange-800' : 'text-red-800'}`}>
                Motivo: Identificación {estadoVisitaLabel}
              </h3>
              <p className={`text-sm font-medium ${ficha.estadoVisita === '2' ? 'text-orange-600' : 'text-red-600'}`}>
                {ficha.observacionesRechazo || "No se registró ninguna observación exacta en el sistema."}
              </p>
            </div>
            {onStartNew && (
              <button 
                onClick={() => onStartNew(ficha.microterritorio)}
                className={`px-6 py-2.5 rounded-xl font-bold shadow transition-colors flex items-center justify-center whitespace-nowrap text-white ${
                  ficha.estadoVisita === '2' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Nuevo Intento de Identificación
              </button>
            )}
          </div>
        )}

        {/* Fila 2: Vivienda etc */}
        {ficha.estadoVisita === '1' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Vivienda, Familia y Entorno</h2>
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Secciones II y III</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Dormitorios</p>
              <p className="font-bold text-gray-800 text-xl">{ficha.numDormitorios || 1}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Estrato Social</p>
              <p className="font-bold text-gray-800 text-xl">{ficha.estratoSocial || 2}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Total Hogares</p>
              <p className="font-bold text-gray-800 text-xl">{ficha.numHogares || 1}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Hacinamiento</p>
              <p className={`font-bold text-xl ${ficha.hacinamiento ? 'text-red-600' : 'text-emerald-600'}`}>{ficha.hacinamiento ? 'Sí' : 'No'}</p>
            </div>
            
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">APGAR Familiar</p>
              <p className="font-bold text-gray-800 text-xl">{getLabel(APGAR_OPCIONES, ficha.apgar) ? `${ficha.apgar} pts` : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Vectores/Plagas</p>
              <p className="font-bold text-gray-800 text-xl">{ficha.presenciaVectores ? 'Sí' : 'No'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-wider uppercase mb-1">Animales</p>
              <p className="font-bold text-gray-800 text-xl">{ficha.cantAnimales || 0}</p>
            </div>
          </div>
        </div>
        )}

        {/* Fila 3: Censo */}
        {ficha.estadoVisita === '1' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Censo de Integrantes</h2>
              <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Miembros del Hogar ({ficha.pacientes?.length || 0})</p>
            </div>
          </div>

          <div className="space-y-4">
            {ficha.pacientes?.map((pac: any, i: number) => {
              const iniciales = `${pac.nombres.charAt(0)}${pac.apellidos.charAt(0)}`.toUpperCase()
              return (
                  <div className="flex flex-col gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 font-black text-lg flex items-center justify-center flex-shrink-0">
                          {iniciales}
                        </div>
                        <div>
                          <h3 className="font-black text-gray-800 uppercase text-sm">{pac.nombres} {pac.apellidos}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 uppercase font-bold tracking-wider">
                              {pac.tipoDoc} {pac.numDoc}
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              NAC: {pac.fechaNacimiento} ({calcularEdad(pac.fechaNacimiento)} años)
                            </span>
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                              P-{pac.parentesco || '1'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-6 self-start sm:self-auto border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase text-left sm:text-right">Sexo</p>
                          <p className="font-bold text-sm text-gray-800 capitalize leading-tight">{pac.sexo?.toLowerCase() || 'N/A'}</p>
                        </div>
                        <div className="bg-white border text-center border-gray-200 rounded-lg px-4 py-1.5 shadow-sm">
                          <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase">Régimen</p>
                          <p className="font-black text-sm text-gray-800 uppercase leading-tight">{pac.regimen || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Historial de Atención Si Existe */}
                    {pac.atenciones && pac.atenciones.length > 0 && (
                      <div className="mt-2 pt-4 border-t border-dashed border-gray-200">
                        <div className="flex items-center gap-2 mb-3 text-[#097b2c]">
                          <Activity className="w-4 h-4" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">Historial de Atenciones (SGA)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pac.atenciones.map((at: any) => (
                            <div key={at.id} className="flex gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-100 group transition-all">
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-400 shrink-0">
                                <Stethoscope className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mb-0.5">
                                  {new Date(at.createdAt).toLocaleDateString('es-CO')} · {at.programa?.nombre}
                                </p>
                                <p className="text-xs text-gray-700 font-medium truncate">
                                  Por: {at.profesional?.nombre} {at.profesional?.apellidos}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic italic-gray-400 border-l-2 border-gray-200 pl-2 leading-tight">
                                  "{at.nota.slice(0, 100)}..."
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
              )
            })}
          </div>
        </div>
        )}

        {/* FAMILIOGRAMA AUTO-GENERADO */}
        {ficha.estadoVisita === '1' && ficha.familiogramaCodigo && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">Familiograma Inteligente</h2>
                <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Generado Automáticamente</p>
              </div>
            </div>
            
            <FamiliogramaViewer code={ficha.familiogramaCodigo} />
          </div>
        )}

      </div>

    </div>
  )
}
