import { PrismaClient } from '@repo/database'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, Users, Calendar, Activity, Info, Building2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import ExportPdfButton from '@/components/ExportPdfButton'
import FacturaFicha from '@/components/ui/FacturaFicha'
import PrintButton from '@/components/ui/PrintButton'

const prisma = new PrismaClient()

// No forzamos re-render dinámico si queremos cache, pero siendo un dashboard es mejor dinámico
export const dynamic = 'force-dynamic'

export default async function FichaResumenPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ territorio: string; id: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const isSuccess = resolvedSearchParams?.success === 'true'

  const ficha = await prisma.fichaHogar.findUnique({
    where: { id: resolvedParams.id },
    include: {
      integrantes: {
        orderBy: { parentesco: 'asc' }
      },
      encuestador: {
        select: { nombre: true, apellidos: true, documento: true }
      }
    }
  })

  if (!ficha) {
    notFound()
  }

  const f: any = ficha

  const calculateAge = (dob: string) => {
    if (!dob) return '-';
    // Se espera que dob venga formato AAAA-MM-DD
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getEstado = (s: string) => {
    switch (s) {
      case '1': return <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs font-black tracking-widest">EFECTIVA</span>
      case '2': return <span className="text-orange-700 bg-orange-100 px-3 py-1 rounded-full text-xs font-black tracking-widest">NO EFECTIVA</span>
      case '3': return <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full text-xs font-black tracking-widest">RECHAZADA</span>
      default: return <span>{s}</span>
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f8fc] pb-12 print:bg-white">
      {isSuccess && (
        <div className="print:hidden mt-6 mb-8 bg-emerald-50 border-l-4 border-emerald-500 py-6 px-8 rounded-r-3xl rounded-b-3xl shadow-lg border-b border-emerald-100 flex flex-col sm:flex-row gap-6 justify-between items-center sm:items-start" style={{ marginLeft: '-1px' }}>
          <div>
             <h2 className="text-2xl font-black text-emerald-800 tracking-tight leading-tight">¡Identificación guardada!</h2>
             <p className="font-semibold text-emerald-600/90 mt-1">Los datos han sido registrados exitosamente en el sistema.</p>
          </div>
          <div className="flex gap-3">
             <ExportPdfButton />
          </div>
        </div>
      )}

      {/* ── Componente Oculto de Impresión Estilo Factura ── */}
      <FacturaFicha ficha={f} autoPrint={isSuccess /* or we use PrintButton autoPrint logic */} />

      {/* ── Header ── */}
      <header className="print:hidden px-6 py-5 flex items-center justify-between shadow-md relative z-10" style={{ backgroundColor: '#081e69' }}>
        <div className="flex items-center gap-4">
          <Link
            href={`/survey/${resolvedParams.territorio}?micro=${f.microterritorio}`}
            className="p-2.5 rounded-xl text-white hover:bg-white/10 transition-colors shadow-sm bg-white/5 border border-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Resumen de Identificación <span className="text-blue-300">#{f.consecutivo}</span>
            </h1>
            <p className="text-sm mt-0.5 text-blue-200/70 font-medium">
              Capturada el {new Date(f.fechaDiligenciamiento).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 print:hidden">
          <PrintButton />
          {getEstado(f.estadoVisita)}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="print:hidden max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 mt-4">
        
        {/* Rejected Note */}
        {(f.estadoVisita === '2' || f.estadoVisita === '3') ? (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 shadow-sm mb-2">
            <h2 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Motivo de Rechazo / No Efectividad
            </h2>
            <p className="mt-2 text-red-700 font-medium">
              {f.observacionesRechazo || 'Sin nota de rechazo proporcionada'}
            </p>
          </div>
        ) : null}
        
        {/* Ficha & Ubicacion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Ubicación y Geografía</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Sección I</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mt-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Territorio</p>
                <p className="font-semibold text-slate-700">{f.territorio} / {f.microterritorio}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Municipio</p>
                <p className="font-semibold text-slate-700">{f.municipio}, {f.departamento}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dirección</p>
                <p className="font-semibold text-slate-700">{f.direccion} {f.centroPoblado ? `(${f.centroPoblado})` : ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción de la Ubicación</p>
                <p className="font-semibold text-slate-700">{f.descripcionUbicacion || 'Sin descripción'}</p>
              </div>
              {f.latitud && (
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Coordenadas</p>
                  <p className="font-mono text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                    {f.latitud}, {f.longitud}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Datos Institucionales</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Responsable</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-y-4 mt-2">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Prestador Primario</p>
                <p className="font-semibold text-slate-700">{f.prestadorPrimario || 'N/A'} (EBS: {f.numEBS || 'N/A'})</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Encuestador Creador</p>
                {f.encuestador ? (
                  <p className="font-semibold text-slate-700 flex items-center gap-2">
                    {f.encuestador.nombre} {f.encuestador.apellidos}
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">CC {f.encuestador.documento}</span>
                  </p>
                ) : (
                  <p className="font-semibold text-slate-500 flex items-center gap-2">
                    {f.prestadorPrimario || 'Mapeo Institucional'}
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">ID {f.numDocEncuestador || 'N/A'}</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Núm Hogar</p>
                  <p className="font-black text-slate-800">{f.numHogar || '-'}</p>
                 </div>
                 <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Familia ID</p>
                  <p className="font-black text-slate-800">{f.numFamilia || '-'}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vivienda & Saneamiento */}
        {f.estadoVisita === '1' && (
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Vivienda, Familia y Entorno</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Secciones II y III</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dormitorios</p>
                <div className="text-xl font-bold text-slate-700">{f.numDormitorios || '-'}</div>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estrato Social</p>
                <div className="text-xl font-bold text-slate-700">{f.estratoSocial || '-'}</div>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Hogares</p>
                <div className="text-xl font-bold text-slate-700">{f.numHogares || '-'}</div>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hacinamiento</p>
                <div className="text-xl font-bold text-slate-700">
                  {f.hacinamiento ? <span className="text-red-500">Sí</span> : <span className="text-emerald-500">No</span>}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">APGAR Familiar</p>
                <div className="text-xl font-bold text-slate-700">{f.apgar ? `${f.apgar} pts` : '-'}</div>
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vectores/Plagas</p>
                <div className="text-xl font-bold text-slate-700">
                  {f.presenciaVectores ? <span className="text-orange-500">Detectado</span> : 'No'}
                </div>
              </div>
               <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Animales</p>
                <div className="text-xl font-bold text-slate-700">{f.cantAnimales || '0'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Integrantes */}
        {f.estadoVisita === '1' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-7 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Censo de Integrantes</h2>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Miembros del Hogar ({f.integrantes.length})</p>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {f.integrantes.map((rawInt: any, i: number) => {
                const int: any = rawInt;
                return (
                <div key={int.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 text-lg border-2 border-slate-50 shadow-sm">
                        {int.primerNombre.charAt(0)}{int.primerApellido.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg">
                          {int.primerNombre} {int.segundoNombre || ''} {int.primerApellido} {int.segundoApellido || ''}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-white bg-slate-400 px-2 py-0.5 rounded">
                            {int.tipoDoc} {int.numDoc}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            NAC: {String(int.fechaNacimiento)} ({calculateAge(String(int.fechaNacimiento))} años)
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            P-{int.parentesco}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 sm:text-right">
                       <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-center flex-1 sm:flex-none">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Sexo</p>
                         <p className="text-sm font-black text-slate-700">{int.sexo.charAt(0) + int.sexo.slice(1).toLowerCase()}</p>
                       </div>
                       <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-center flex-1 sm:flex-none">
                         <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Régimen</p>
                         <p className="text-sm font-black text-slate-700 truncate max-w-[120px]" title={int.eapb || 'N/A'}>
                           {int.regimen || 'NO ASIG'}
                         </p>
                       </div>
                    </div>
                  </div>
                </div>
              )})}

              {f.integrantes.length === 0 && (
                <div className="p-12 text-center text-slate-400 font-medium">
                  No hay integrantes registrados en esta ficha.
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
