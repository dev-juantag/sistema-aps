import { 
  ESTADO_VISITA, TIPO_VIVIENDA, MATERIAL_PAREDES, MATERIAL_PISOS, MATERIAL_TECHOS,
  FUENTE_AGUA, DISPOSICION_EXCRETAS, AGUAS_RESIDUALES, DISPOSICION_RESIDUOS, RIESGO_ACCIDENTE,
  FUENTE_ENERGIA, ANIMALES, TIPO_FAMILIA, APGAR_OPCIONES, ZARIT_OPCIONES, ECOMAPA_OPCIONES,
  VULNERABILIDADES, DIAGNOSTICO_NUTRICIONAL, PARENTESCO, REGIMEN_SALUD, OCUPACION,
  APGAR_PREGUNTAS
} from '@/lib/constants'
import FamiliogramaViewer from './FamiliogramaViewer'
import FamiliogramaStaticViewer from './FamiliogramaStaticViewer'

export default function FacturaFicha({ ficha, autoPrint, showOnScreen }: { ficha: any, autoPrint?: boolean, showOnScreen?: boolean }) {
  if (!ficha) return null

  const calculateAge = (dob: string) => {
    if (!dob) return '-';
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const chunkArray = (arr: any[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };
  const integranteChunks = chunkArray(ficha.pacientes || [], 3);

  const getLabel = (arr: any[], id: any) => arr.find(x => String(x.id) === String(id))?.label || id || 'N/A'
  
  const getLabels = (arr: any[], ids: any[]) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 'Ninguno';
    return ids.map(id => getLabel(arr, id)).join(', ');
  }

  // Estilos base para la impresión
  const sectionCls = "mb-8 break-after-page"
  const headerCls = "font-black text-xl uppercase mb-4 pb-2 border-b-2 border-black"
  const subHeaderCls = "font-bold text-lg uppercase mb-3 bg-gray-100 p-2"
  const tblCls = "w-full text-left border-collapse mb-6"
  const thCls = "font-bold text-sm w-1/3 py-1.5 align-top uppercase border-b border-gray-300"
  const tdCls = "text-sm py-1.5 align-top border-b border-gray-200"

  const Th = ({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => <th className={`${thCls} ${className || ''}`} style={style}>{children}</th>
  const Td = ({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => <td className={`${tdCls} ${className || ''}`} style={style}>{children}</td>

  return (
    <div className={`${showOnScreen ? 'block' : 'absolute w-[1024px] h-[500px] overflow-hidden -z-50 opacity-0 pointer-events-none print:static print:w-full print:h-auto print:opacity-100 print:overflow-visible print:pointer-events-auto'} font-sans text-black bg-white max-w-none mx-auto p-4 md:p-8 leading-normal print:p-0`}>
      
      {/* HEADER GLOBAL */}
      <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: '4px solid black' }}>
        <img src="/logo-gobernacion-risaralda.png" alt="Logo Gobernación" className="w-24 h-24 shrink-0 object-contain" />
        <div className="text-center px-4 flex-1">
          <h1 className="font-black text-3xl uppercase tracking-widest">Identificación APS</h1>
          <p className="font-bold text-lg mt-2 tracking-widest text-gray-600">FICHA OFICIAL NO. {ficha.consecutivo || ficha.id?.substring(0,8)}</p>
          <p className="mt-1 font-sans text-sm text-gray-500">Documento impreso el {new Date().toLocaleString('es-CO')}</p>
        </div>
        <img src="/icono-ese-salud-pereira.png" alt="Logo ESE Salud Pereira" className="w-24 h-24 shrink-0 object-contain" />
      </div>

      {/* CASO A: FICHA RECHAZADA O NO EFECTIVA (VERSIÓN CORTA) */}
      {ficha.estadoVisita !== '1' ? (
        <div className="space-y-8">
          <div>
            <h2 className={headerCls}>1. Control y Responsables</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Estado de la Visita</Th><Td><span className="font-bold uppercase bg-gray-200 px-2 py-1 rounded">{getLabel(ESTADO_VISITA, ficha.estadoVisita)}</span></Td></tr>
                <tr><Th>Fecha de Diligenciamiento</Th><Td>{new Date(ficha.fechaDiligenciamiento).toLocaleString('es-CO')}</Td></tr>
                <tr><Th>Responsable / Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.nombre} ${ficha.encuestador.apellidos}` : (ficha.encuestadorNombreRaw || ficha.perfilEncuestador || 'N/A')}</Td></tr>
                <tr><Th>Doc. Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.documento}` : (ficha.encuestadorDocRaw || ficha.numDocEncuestador || 'N/A')}</Td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h2 className={headerCls}>2. Ubicación y Georreferenciación</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Municipio</Th><Td>{ficha.municipio}</Td></tr>
                <tr><Th>Territorio / Micro</Th><Td>{typeof ficha.territorio === 'object' && ficha.territorio ? `${ficha.territorio.codigo} | ${ficha.territorio.nombre}` : (ficha.territorio || ficha.territorioId)} / {ficha.microterritorio}</Td></tr>
                <tr><Th>Dirección</Th><Td>{ficha.direccion}</Td></tr>
                <tr><Th>GPS</Th><Td className="font-sans text-xs">{(ficha.latitud != null && ficha.longitud != null) ? `Lat: ${ficha.latitud}, Lng: ${ficha.longitud}` : 'Sin coordenadas'}</Td></tr>
              </tbody>
            </table>
          </div>

          <div className="p-6 border-4 border-black rounded-xl">
             <h2 className="font-black text-lg uppercase mb-2">3. Motivo de No Efectividad / Rechazo</h2>
             <p className="text-xl font-bold italic">
               &quot;{ficha.observacionesRechazo || 'No se registraron observaciones adicionales por parte del encuestador.'}&quot;
             </p>
          </div>
        </div>
      ) : (
        /* CASO B: FICHA EFECTIVA (VERSIÓN COMPLETA) */
        <>
          <div className={sectionCls} style={{ pageBreakAfter: 'always' }}>
            <h2 className={headerCls}>1. Control y Responsables</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Estado de la Visita</Th><Td><span className="font-bold uppercase bg-gray-200 px-2 py-1 rounded">{getLabel(ESTADO_VISITA, ficha.estadoVisita)}</span></Td></tr>
                <tr><Th>Fecha de Diligenciamiento</Th><Td>{new Date(ficha.fechaDiligenciamiento).toLocaleString('es-CO')}</Td></tr>
                <tr><Th>Prestador Primario</Th><Td>{ficha.prestadorPrimario || 'N/A'}</Td></tr>
                <tr><Th>Código EBS (No. Identificación)</Th><Td>{ficha.numEBS || 'N/A'}</Td></tr>
                <tr><Th>Responsable / Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.nombre} ${ficha.encuestador.apellidos}` : (ficha.encuestadorNombreRaw || ficha.perfilEncuestador || 'N/A')}</Td></tr>
                <tr><Th>Doc. Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.documento}` : (ficha.encuestadorDocRaw || ficha.numDocEncuestador || 'N/A')}</Td></tr>
              </tbody>
            </table>

            <h2 className={headerCls}>2. Códigos de Identificación</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Código de Ficha</Th><Td>{ficha.codFicha || 'N/A'}</Td></tr>
                <tr><Th>Código / Número de Hogar</Th><Td className="font-sans">{ficha.numHogar || 'N/A'}</Td></tr>
                <tr><Th>Código / Número de Familia</Th><Td className="font-sans">{ficha.numFamilia || 'N/A'}</Td></tr>
                <tr><Th>Código UZPE</Th><Td>{ficha.uzpe || 'N/A'}</Td></tr>
              </tbody>
            </table>

            <h2 className={headerCls}>3. Ubicación y Georreferenciación</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Departamento</Th><Td>{ficha.departamento}</Td></tr>
                <tr><Th>Municipio</Th><Td>{ficha.municipio}</Td></tr>
                <tr><Th>Territorio / Micro</Th><Td>{typeof ficha.territorio === 'object' && ficha.territorio ? `${ficha.territorio.codigo} | ${ficha.territorio.nombre}` : (ficha.territorio || ficha.territorioId)} / {ficha.microterritorio}</Td></tr>
                <tr><Th>Clase de Centro Poblado</Th><Td>{ficha.centroPoblado || 'N/A'}</Td></tr>
                <tr><Th>Dirección</Th><Td>{ficha.direccion}</Td></tr>
                <tr><Th>Descripción de Ubicación</Th><Td>{ficha.descripcionUbicacion || 'N/A'}</Td></tr>
                <tr><Th>Georreferenciación (GPS)</Th><Td className="font-sans text-xs">{(ficha.latitud != null && ficha.longitud != null) ? `Lat: ${ficha.latitud}, Lng: ${ficha.longitud}` : 'Sin coordenadas registradas'}</Td></tr>
              </tbody>
            </table>
          </div>

          <div className={sectionCls} style={{ pageBreakAfter: 'always' }}>
            <h2 className={headerCls}>4. Características Físicas de la Vivienda</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Tipo de Vivienda</Th><Td>{getLabel(TIPO_VIVIENDA, ficha.tipoVivienda)}{ficha.tipoViviendaDesc ? ` - ${ficha.tipoViviendaDesc}` : ''}</Td></tr>
                <tr><Th>Material de Paredes</Th><Td>{getLabel(MATERIAL_PAREDES, ficha.matParedes)}</Td></tr>
                <tr><Th>Material de Pisos</Th><Td>{getLabel(MATERIAL_PISOS, ficha.matPisos)}</Td></tr>
                <tr><Th>Material de Techos</Th><Td>{getLabel(MATERIAL_TECHOS, ficha.matTechos)}</Td></tr>
                <tr><Th>Total Hogares en Vivienda</Th><Td>{ficha.numHogares || 1}</Td></tr>
                <tr><Th>Dormitorios Exclusivos</Th><Td>{ficha.numDormitorios || 0}</Td></tr>
                <tr><Th>Estrato Social</Th><Td>{ficha.estratoSocial || 'N/A'}</Td></tr>
                <tr><Th>Hacinamiento Habitacional</Th><Td>{ficha.hacinamiento ? 'Sí (Crítico)' : 'No'}</Td></tr>
                <tr><Th>Fuente de Energía Principal</Th><Td>{getLabel(FUENTE_ENERGIA, ficha.fuenteEnergia)}</Td></tr>
              </tbody>
            </table>

            <h2 className={headerCls}>5. Saneamiento Básico</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Fuente de Agua</Th><Td>{getLabels(FUENTE_AGUA, ficha.fuenteAgua)}</Td></tr>
                <tr><Th>Servicio Sanitario / Excretas</Th><Td>{getLabels(DISPOSICION_EXCRETAS, ficha.dispExcretas)}</Td></tr>
                <tr><Th>Disposición Aguas Residuales</Th><Td>{getLabels(AGUAS_RESIDUALES, ficha.aguasResiduales)}</Td></tr>
                <tr><Th>Recolección de Residuos</Th><Td>{getLabels(DISPOSICION_RESIDUOS, ficha.dispResiduos)}</Td></tr>
                <tr><Th>Riesgos en la Vivienda</Th><Td>{getLabels(RIESGO_ACCIDENTE, ficha.riesgoAccidente)}</Td></tr>
                <tr><Th>Presencia de Vectores</Th><Td>{ficha.presenciaVectores ? 'Identificada' : 'No identificada'}</Td></tr>
                <tr><Th>Tenencia de Mascotas</Th><Td>{getLabels(ANIMALES, ficha.animales)} (Total: {ficha.cantAnimales || 0})</Td></tr>
                {(ficha.cantAnimales > 0) && (
                  <tr><Th>Vacunación de Mascotas</Th><Td>{ficha.vacunacionMascotas ? 'Requiere / Pendiente' : 'Al día'}</Td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={sectionCls}>
            <h2 className={headerCls}>6. Composición y Dinámica Familiar</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Tipo de Familia</Th><Td>{getLabel(TIPO_FAMILIA, ficha.tipoFamilia)}</Td></tr>
                <tr><Th>Número de Integrantes</Th><Td>{ficha.numIntegrantes || 0}</Td></tr>
              </tbody>
            </table>

            <h2 className={headerCls}>7. Funcionamiento Familiar (Apgar)</h2>
            <table className={tblCls}>
              <tbody>
                {APGAR_PREGUNTAS.map((pregunta: string, idx: number) => {
                  const valorRespuesta = ficha.apgarRespuestas ? ficha.apgarRespuestas[idx] : null;
                  const APGAR_VALORES = ['Nunca (0)', 'Casi nunca (1)', 'A veces (2)', 'Casi siempre (3)', 'Siempre (4)'];
                  const textoRespuesta = valorRespuesta != null ? APGAR_VALORES[valorRespuesta] : 'No respondido';
                  return (
                    <tr key={idx}>
                      <Th className="font-medium text-xs">{pregunta}</Th>
                      <Td className="font-bold text-xs">{textoRespuesta}</Td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-100 italic">
                  <Th className="font-black">Nivel de satisfacción (Apgar Global)</Th>
                  <Td className="font-black" style={{ fontSize: '1.2rem' }}>
                    {(() => {
                      let cat = getLabel(APGAR_OPCIONES, ficha.apgar).split(' (')[0];
                      let pts = '?';
                      if (ficha.apgarRespuestas && Array.isArray(ficha.apgarRespuestas)) {
                        const valid = ficha.apgarRespuestas.filter((v:any) => v !== null && v !== undefined);
                        if (valid.length > 0) {
                          const score = ficha.apgarRespuestas.reduce((a: number,b: number) => a + (b || 0), 0);
                          pts = score.toString();
                          if (score >= 17) cat = 'Normal';
                          else if (score >= 13) cat = 'Disfunción leve';
                          else if (score >= 10) cat = 'Disfunción moderada';
                          else cat = 'Disfunción severa';
                        } else {
                          cat = 'Sin respuesta / Manual';
                        }
                      }
                      return `${cat} - Puntaje Final: ${pts} / 20`;
                    })()}
                  </Td>
                </tr>
              </tbody>
            </table>

            <h2 className={headerCls}>8. Carga del Cuidador (Zarit)</h2>
            <table className={tblCls}>
              <tbody>
                <tr><Th>Cuidador Principal en Casa</Th><Td>{ficha.cuidadorPrincipal ? 'Sí' : 'No'}</Td></tr>
                {ficha.cuidadorPrincipal && (
                  <tr><Th>Nivel de Sobrecarga (Zarit)</Th><Td className="font-bold">{getLabel(ZARIT_OPCIONES, ficha.zarit)}</Td></tr>
                )}
              </tbody>
            </table>

            <div className="col-span-2 p-4 border-2 border-slate-300 rounded">
              <h3 className="font-black mb-2 flex items-center justify-between">
                Ecomapa Familiar y Redes de Apoyo
              </h3>
              <p className="text-lg font-bold text-gray-700">{getLabel(ECOMAPA_OPCIONES, ficha.ecomapa)}</p>
              <p className="text-xs text-gray-500 mt-2">Nivel de interacción de la familia con sistemas externos (salud, educación, comunidad).</p>
            </div>
            
            {ficha.familiogramaCodigo && (
              <div className="mt-8 mb-6 print:break-inside-avoid">
                <h2 className={headerCls}>9. Familiograma Clínico</h2>
                <div className="border border-slate-300 rounded overflow-hidden min-h-[500px] h-[500px] relative">
                  {!String(ficha.familiogramaCodigo).startsWith('{') ? (
                    <FamiliogramaViewer code={ficha.familiogramaCodigo} />
                  ) : (
                    <FamiliogramaStaticViewer jsonString={ficha.familiogramaCodigo} isPrintView={true} />
                  )}
                </div>
              </div>
            )}
          </div>

          {integranteChunks.length > 0 ? (
            integranteChunks.map((chunk, chunkIdx) => (
              <div key={chunkIdx} className={chunkIdx < integranteChunks.length - 1 ? sectionCls : "mb-8 print:mb-0"} style={chunkIdx < integranteChunks.length - 1 ? { pageBreakAfter: 'always' } : {}}>
                {chunkIdx === 0 && <h2 className={headerCls}>10. Censo e Información de Integrantes</h2>}
                {chunk.map((int: any, intIdx: number) => {
                  const globalIdx = chunkIdx * 3 + intIdx + 1;
                  return (
                    <div key={int.id || intIdx} className="mb-8 print:last:mb-0 border-b-2 border-dashed border-gray-400 pb-4 last:border-0 page-break-inside-avoid">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">#{globalIdx}</div>
                         <h3 className="font-black text-base uppercase">
                           {int.nombres ? `${int.nombres} ${int.apellidos}` : `${int.primerNombre || ''} ${int.segundoNombre || ''} ${int.primerApellido || ''} ${int.segundoApellido || ''}`.trim()}
                         </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-x-8">
                        <table className="w-full text-left text-sm border-collapse">
                          <tbody>
                            <tr><th className="font-bold py-1 w-2/5 border-b border-gray-100">Documento:</th><td className="py-1 border-b border-gray-100 uppercase">{int.tipoDoc} {int.documento || int.numDoc}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Nacimiento:</th><td className="py-1 border-b border-gray-100">{int.fechaNacimiento} ({calculateAge(int.fechaNacimiento)} años)</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Género:</th><td className="py-1 border-b border-gray-100 uppercase">{int.sexo}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Parentesco:</th><td className="py-1 border-b border-gray-100 uppercase">{getLabel(PARENTESCO, int.parentesco)}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Régimen / EAPB:</th><td className="py-1 border-b border-gray-100 uppercase">{getLabel(REGIMEN_SALUD, int.regimen)} / {int.eapb || '-'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Ocupación:</th><td className="py-1 border-b border-gray-100 uppercase">{getLabel(OCUPACION, int.ocupacion)}</td></tr>
                          </tbody>
                        </table>

                        <table className="w-full text-left text-sm border-collapse">
                          <tbody>
                            <tr><th className="font-bold py-1 w-2/5 border-b border-gray-100">Peso / Talla:</th><td className="py-1 border-b border-gray-100">{int.peso ? `${int.peso} kg` : '-'} / {int.talla ? `${int.talla} cm` : '-'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">P. Braquial:</th><td className="py-1 border-b border-gray-100">{int.perimetroBraquial ? `${int.perimetroBraquial} cm` : '-'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Diag. Nutricional:</th><td className="py-1 border-b border-gray-100">{getLabel(DIAGNOSTICO_NUTRICIONAL, int.diagNutricional)}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Gestante:</th><td className="py-1 border-b border-gray-100 font-bold">{int.gestante}{int.gestante === 'SI' && int.mesesGestacion ? ` (${int.mesesGestacion} meses)` : ''}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Lactancia:</th><td className="py-1 border-b border-gray-100">{int.lactanciaMaterna ? `Sí (${int.lactanciaMeses || 0} meses)` : 'No'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Vulnerabilidades:</th><td className="py-1 border-b border-gray-100">{getLabels(VULNERABILIDADES, int.vulnerabilidades)}</td></tr>
                          </tbody>
                        </table>
                      </div>

                      {/* HISTORIAL DE ATENCIONES IMPRESO */}
                      {int.atenciones && int.atenciones.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-300 print:break-inside-avoid">
                           <h4 className="font-bold text-xs uppercase tracking-widest text-gray-500 mb-2">Historial de atenciones</h4>
                           <table className="w-full text-left text-[10px] border-collapse">
                             <thead>
                               <tr className="text-gray-400">
                                 <th className="border-b border-gray-200 py-1 font-bold">Fecha / Programa</th>
                                 <th className="border-b border-gray-200 py-1 font-bold">Profesional</th>
                                 <th className="border-b border-gray-200 py-1 font-bold">Nota Clínica</th>
                               </tr>
                             </thead>
                             <tbody>
                               {int.atenciones.slice(0, 3).map((at: any) => (
                                 <tr key={at.id}>
                                   <td className="py-1.5 border-b border-gray-50 pr-2 align-top">
                                     <div className="font-bold">{new Date(at.createdAt).toLocaleDateString('es-CO')}</div>
                                     <div className="uppercase">{at.programa?.nombre}</div>
                                   </td>
                                   <td className="py-1.5 border-b border-gray-50 pr-2 align-top font-medium">
                                     {at.profesional?.nombre} {at.profesional?.apellidos}
                                   </td>
                                   <td className="py-1.5 border-b border-gray-50 align-top italic text-gray-600">
                                     &quot;{at.motivo || at.nota || 'Consulta registrada'}&quot;
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className={sectionCls}>
              <h2 className={headerCls}>10. Censo e Información de Integrantes</h2>
              <p className="italic text-gray-500 text-center py-4 border border-dashed border-gray-300">No hay integrantes registrados en esta visita.</p>
            </div>
          )}
        </>
      )}

      {/* FOOTER LEGAL GLOBAL */}
      <div className="mt-4 print:mt-1 text-center text-xs text-gray-500 uppercase italic pt-3 font-sans" style={{ borderTop: '2px solid black', pageBreakInside: 'avoid' }}>
        <p className="font-bold text-black" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>** DOCUMENTO DE CARÁCTER CONFIDENCIAL Y RESTRINGIDO **</p>
        <p className="mt-0.5 normal-case text-[10px]">Los datos de salud e identificación familiar (APS) pertenecen al sistema departamental y su uso está regulado por la Ley de Protección de Datos Personales.</p>
        <p className="mt-1 font-sans text-[9px]">{ficha.id}</p>
      </div>
    </div>
  )
}
