import { 
  ESTADO_VISITA, TIPO_VIVIENDA, MATERIAL_PAREDES, MATERIAL_PISOS, MATERIAL_TECHOS,
  FUENTE_AGUA, DISPOSICION_EXCRETAS, AGUAS_RESIDUALES, DISPOSICION_RESIDUOS, RIESGO_ACCIDENTE,
  FUENTE_ENERGIA, ANIMALES, TIPO_FAMILIA, APGAR_OPCIONES, ZARIT_OPCIONES, ECOMAPA_OPCIONES,
  VULNERABILIDADES, DIAGNOSTICO_NUTRICIONAL
} from '@/lib/constants'

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

  const Th = ({ children, className }: { children: React.ReactNode, className?: string }) => <th className={`${thCls} ${className || ''}`}>{children}</th>
  const Td = ({ children, className }: { children: React.ReactNode, className?: string }) => <td className={`${tdCls} ${className || ''}`}>{children}</td>

  return (
    <div className={`${showOnScreen ? 'block' : 'hidden print:block'} font-sans text-black bg-white w-full max-w-none mx-auto p-4 md:p-8 leading-normal print:p-0`}>
      
      {/* ========================================================= */}
      {/* PÁGINA 1: INFORMACIÓN GENERAL Y UBICACIÓN                 */}
      {/* ========================================================= */}
      <div className={sectionCls} style={{ pageBreakAfter: 'always' }}>
        <div className="text-center mb-8 pb-4" style={{ borderBottom: '4px solid black' }}>
          <h1 className="font-black text-3xl uppercase tracking-widest">Identificación APS</h1>
          <p className="font-bold text-lg mt-2 tracking-widest text-gray-600">FICHA OFICIAL NO. {ficha.consecutivo || ficha.id?.substring(0,8)}</p>
          <p className="mt-1 font-mono text-sm text-gray-500">Documento impreso el {new Date().toLocaleString('es-CO')}</p>
        </div>

        <h2 className={headerCls}>1. Control y Responsables</h2>
        <table className={tblCls}>
          <tbody>
            <tr><Th>Estado de la Visita</Th><Td><span className="font-bold uppercase bg-gray-200 px-2 py-1 rounded">{getLabel(ESTADO_VISITA, ficha.estadoVisita)}</span></Td></tr>
            <tr><Th>Fecha de Diligenciamiento</Th><Td>{new Date(ficha.fechaDiligenciamiento).toLocaleString('es-CO')}</Td></tr>
            <tr><Th>Prestador Primario</Th><Td>{ficha.prestadorPrimario || 'N/A'}</Td></tr>
            <tr><Th>Código EBS (No. Identificación)</Th><Td>{ficha.numEBS || 'N/A'}</Td></tr>
            <tr><Th>Responsable / Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.nombre} ${ficha.encuestador.apellidos}` : ficha.perfilEncuestador}</Td></tr>
            <tr><Th>Doc. Encuestador</Th><Td>{ficha.encuestador ? `${ficha.encuestador.documento}` : ficha.numDocEncuestador}</Td></tr>
          </tbody>
        </table>

        <h2 className={headerCls}>2. Códigos de Identificación</h2>
        <table className={tblCls}>
          <tbody>
            <tr><Th>Código de Ficha Física</Th><Td>{ficha.codFicha || 'N/A'}</Td></tr>
            <tr><Th>Código / Número de Hogar</Th><Td className="font-mono">{ficha.numHogar || 'N/A'}</Td></tr>
            <tr><Th>Código / Número de Familia</Th><Td className="font-mono">{ficha.numFamilia || 'N/A'}</Td></tr>
            <tr><Th>Código UZPE</Th><Td>{ficha.uzpe || 'N/A'}</Td></tr>
          </tbody>
        </table>

        <h2 className={headerCls}>3. Ubicación y Georreferenciación</h2>
        <table className={tblCls}>
          <tbody>
            <tr><Th>Departamento</Th><Td>{ficha.departamento}</Td></tr>
            <tr><Th>Municipio</Th><Td>{ficha.municipio}</Td></tr>
            <tr><Th>Territorio / Micro</Th><Td>{ficha.territorio} / {ficha.microterritorio}</Td></tr>
            <tr><Th>Clase de Centro Poblado</Th><Td>{ficha.centroPoblado || 'N/A'}</Td></tr>
            <tr><Th>Dirección</Th><Td>{ficha.direccion}</Td></tr>
            <tr><Th>Descripción de Ubicación</Th><Td>{ficha.descripcionUbicacion || 'N/A'}</Td></tr>
            <tr><Th>Georreferenciación (GPS)</Th><Td className="font-mono text-xs">{(ficha.latitud != null && ficha.longitud != null) ? `Lat: ${ficha.latitud}, Lng: ${ficha.longitud}` : 'Sin coordenadas registradas'}</Td></tr>
          </tbody>
        </table>
      </div>


      {/* ========================================================= */}
      {/* PÁGINA 2: VIVIENDA, SANEAMIENTO Y ENTORNO                 */}
      {/* ========================================================= */}
      {ficha.estadoVisita === '1' && (
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
            <tr><Th>Disposición Residuos Sólidos</Th><Td>{getLabels(DISPOSICION_RESIDUOS, ficha.dispResiduos)}</Td></tr>
            <tr><Th>Riesgos en la Vivienda</Th><Td>{getLabels(RIESGO_ACCIDENTE, ficha.riesgoAccidente)}</Td></tr>
          </tbody>
        </table>

        <h2 className={headerCls}>6. Zoonosis y Vectores</h2>
        <table className={tblCls}>
          <tbody>
            <tr><Th>Presencia de Vectores (Plagas)</Th><Td>{ficha.presenciaVectores ? 'Sí, detectado en el entorno' : 'No reportado'}</Td></tr>
            <tr><Th>Convive con Animales</Th><Td>{getLabels(ANIMALES, ficha.animales)}</Td></tr>
            {ficha.cantAnimales > 0 && (
              <>
                <tr><Th>Cantidad de Animales</Th><Td>{ficha.cantAnimales}</Td></tr>
                <tr><Th>Vacunación de Mascotas</Th><Td>{ficha.vacunacionMascotas ? 'Esquema completo / Vigente' : 'Incompleto / No reportado'}</Td></tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ========================================================= */}
      {/* PÁGINA 3: ESTRUCTURA FAMILIAR Y RIESGO PSICOSOCIAL        */}
      {/* ========================================================= */}
      {ficha.estadoVisita === '1' && (
      <div className={sectionCls} style={{ pageBreakAfter: 'always' }}>
        <h2 className={headerCls}>7. Dinámica y Estructura Familiar</h2>
        <table className={tblCls}>
          <tbody>
            <tr><Th>Tipo de Familia</Th><Td>{getLabel(TIPO_FAMILIA, ficha.tipoFamilia)}</Td></tr>
            <tr><Th>Cuidador Principal Presente</Th><Td>{ficha.cuidadorPrincipal ? 'Sí, hay una persona dedicada al cuidado familiar' : 'No'}</Td></tr>
            <tr><Th>Riesgo Psicosocial (Vulnerabilidades)</Th><Td>{getLabels(VULNERABILIDADES, ficha.vulnerabilidades)}</Td></tr>
          </tbody>
        </table>

        <h2 className={headerCls}>8. Instrumentos de Evaluación Familiar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div className="p-4 border-2 border-slate-300 rounded">
            <h3 className="font-black mb-2 flex items-center justify-between">
              APGAR Familiar 
              <span className="bg-slate-800 text-white px-2 py-1 rounded text-xs">{ficha.apgar ? `${ficha.apgar} pts` : 'No medido'}</span>
            </h3>
            <p className="text-lg font-bold text-gray-700">{getLabel(APGAR_OPCIONES, ficha.apgar)}</p>
            <p className="text-xs text-gray-500 mt-2">Mide de manera rápida la funcionalidad y la satisfacción familiar (apoyo, comunicación, afecto).</p>
          </div>

          <div className="p-4 border-2 border-slate-300 rounded">
            <h3 className="font-black mb-2 flex items-center justify-between">
              Escala de ZARIT (Cuidador)
              <span className="bg-slate-800 text-white px-2 py-1 rounded text-xs">{ficha.zarit ? `${ficha.zarit} pts` : 'No aplica'}</span>
            </h3>
            <p className="text-lg font-bold text-gray-700">{getLabel(ZARIT_OPCIONES, ficha.zarit)}</p>
            <p className="text-xs text-gray-500 mt-2">Evalúa la sobrecarga o nivel de estrés del cuidador principal dentro del hogar.</p>
          </div>

          <div className="col-span-2 p-4 border-2 border-slate-300 rounded">
            <h3 className="font-black mb-2 flex items-center justify-between">
              Ecomapa Familiar y Redes de Apoyo
            </h3>
            <p className="text-lg font-bold text-gray-700">{getLabel(ECOMAPA_OPCIONES, ficha.ecomapa)}</p>
            <p className="text-xs text-gray-500 mt-2">Nivel de interacción de la familia con sistemas externos (salud, educación, comunidad).</p>
          </div>
        </div>
      </div>
      )}


      {/* ========================================================= */}
      {/* PÁGINA 4+: CENSOS Y DATOS DE SALUD (INTEGRANTES)          */}
      {/* ========================================================= */}
      {ficha.estadoVisita === '1' && (
        <>
          {integranteChunks.length > 0 ? (
            integranteChunks.map((chunk, chunkIdx) => (
              <div key={chunkIdx} className={chunkIdx < integranteChunks.length - 1 ? sectionCls : "mb-8"} style={chunkIdx < integranteChunks.length - 1 ? { pageBreakAfter: 'always' } : {}}>
                {chunkIdx === 0 && <h2 className={headerCls}>9. Censo e Información de Integrantes</h2>}
                
                {chunk.map((int: any, intIdx: number) => {
                  const globalIdx = chunkIdx * 3 + intIdx + 1;
                  return (
                    <div key={int.id || intIdx} className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                      <h3 className={subHeaderCls}>
                        Integrante {globalIdx}: {int.primerNombre} {int.segundoNombre || ''} {int.primerApellido} {int.segundoApellido || ''}
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <table className="w-full text-left text-sm border-collapse">
                          <tbody>
                            <tr><th className="font-bold py-1 w-2/5 border-b border-gray-100">Documento:</th><td className="py-1 border-b border-gray-100 uppercase">{int.tipoDoc} {int.numDoc}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Nacimiento:</th><td className="py-1 border-b border-gray-100">{int.fechaNacimiento} ({calculateAge(int.fechaNacimiento)} años)</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Sexo:</th><td className="py-1 border-b border-gray-100 uppercase">{int.sexo}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Parentesco:</th><td className="py-1 border-b border-gray-100 uppercase">Código {int.parentesco}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Teléfono:</th><td className="py-1 border-b border-gray-100">{int.telefono || 'N/A'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Régimen / EAPB:</th><td className="py-1 border-b border-gray-100 uppercase">{int.regimen || 'NO AFILIADO'} / {int.eapb || '-'}</td></tr>
                          </tbody>
                        </table>

                        <table className="w-full text-left text-sm border-collapse">
                          <tbody>
                            <tr><th className="font-bold py-1 w-2/5 border-b border-gray-100">Peso / Talla:</th><td className="py-1 border-b border-gray-100">{int.peso ? `${int.peso} kg` : '-'} / {int.talla ? `${int.talla} cm` : '-'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">P. Braquial:</th><td className="py-1 border-b border-gray-100">{int.perimetroBraquial ? `${int.perimetroBraquial} cm` : '-'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Diag. Nutricional:</th><td className="py-1 border-b border-gray-100">{getLabel(DIAGNOSTICO_NUTRICIONAL, int.diagNutricional)}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Gestante:</th><td className="py-1 border-b border-gray-100 font-bold">{int.gestante}{int.gestante === 'SI' && int.mesesGestacion ? ` (${int.mesesGestacion} meses)` : ''}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Lactancia:</th><td className="py-1 border-b border-gray-100">{int.lactanciaMaterna ? `Sí (${int.lactanciaMeses || 0} meses)` : 'No'}</td></tr>
                            <tr><th className="font-bold py-1 border-b border-gray-100">Esquemas P&M/Vac:</th><td className="py-1 border-b border-gray-100">{int.esquemaAtenciones ? 'Sí' : 'No'} / {int.esquemaVacunacion ? 'Sí' : 'No'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className={sectionCls}>
              <h2 className={headerCls}>9. Censo e Información de Integrantes</h2>
              <p className="italic text-gray-500 text-center py-4 border border-dashed border-gray-300">No hay integrantes registrados en esta visita.</p>
            </div>
          )}
        </>
      )}

      {/* Footer Legal Global (en la misma página final) */}
      <div className="mt-8 text-center text-xs text-gray-500 uppercase italic pt-4" style={{ borderTop: '2px solid black', pageBreakInside: 'avoid' }}>
        <p className="font-bold">** DOCUMENTO DE CARÁCTER CONFIDENCIAL Y RESTRINGIDO **</p>
        <p className="mt-1 normal-case text-[10px]">Los datos sensibles de historial de salud, morbilidad transmisible y enfermedades crónicas (Sección V) correspondientes al núcleo familiar fueron excluidos de esta impresión por disposiciones legales de protección de datos personales.</p>
        <p className="mt-1 font-mono text-[9px]">{ficha.id}</p>
      </div>
    </div>
  )
}
