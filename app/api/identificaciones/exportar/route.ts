import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  ESTADO_VISITA, TIPO_VIVIENDA, MATERIAL_PAREDES, MATERIAL_PISOS, MATERIAL_TECHOS,
  FUENTE_AGUA, DISPOSICION_EXCRETAS, AGUAS_RESIDUALES, DISPOSICION_RESIDUOS, RIESGO_ACCIDENTE,
  FUENTE_ENERGIA, ANIMALES, TIPO_FAMILIA, APGAR_OPCIONES, ZARIT_OPCIONES, ECOMAPA_OPCIONES,
  VULNERABILIDADES, DIAGNOSTICO_NUTRICIONAL, TIPO_DOCUMENTO, SEXO, PARENTESCO, NIVEL_EDUCATIVO,
  OCUPACION, REGIMEN_SALUD, ETNIA, GRUPO_POBLACIONAL, DISCAPACIDADES, ANTECEDENTES_CRONICOS, 
  ANTECEDENTES_TRANSMISIBLES, INTERVENCIONES_PENDIENTES, REMISIONES_APS 
} from '@/lib/constants'

// Helper para limpiar el texto y evitar que rompa el CSV
const cleanCsv = (val: any) => {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')
  return `"${str}"`
}

const safeParseJsonArray = (val: any): any[] => {
  if (!val) return []
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  if (Array.isArray(val)) return val
  return [val]
}

const getLabel = (arr: any[], id: any) => arr.find(x => String(x.id) === String(id))?.label || id || ''
const getLabels = (arr: any[], ids: any[]) => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return ''
  return ids.map(id => getLabel(arr, id)).join(', ')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const territorioId = searchParams.get('territorioId')

    let whereClause: any = {}

    if (role === 'auxiliar' && territorioId) {
      whereClause.territorioId = territorioId
    }

    const fichas = await prisma.fichaHogar.findMany({
      where: whereClause,
      include: {
        encuestador: true,
        pacientes: true,
        territorio: true
      },
      orderBy: { consecutivo: 'asc' }
    })

    const headers = [
      'globalid', 'consecutivo', 'estadoVisita', 'departamento', 'codMunicipio', 'municipio', 
      'territorio', 'microterritorio', 'uzpe', 'centroPoblado', 'direccion', 'numEBS',
      'prestadorPrimario', 'numHogar', 'numFamilia', 'codFicha', 'latitud', 'longitud',
      'fechaDiligenciamiento', 'encuestadorNombre', 'encuestadorDoc', 
      // VIVIENDA
      'tipoVivienda', 'matParedes', 'matPisos', 'matTechos', 'numHogares', 'numDormitorios', 
      'estratoSocial', 'hacinamiento', 'fuenteAgua', 'dispExcretas', 'aguasResiduales', 
      'dispResiduos', 'riesgoAccidente', 'fuenteEnergia', 'presenciaVectores', 'animales', 
      'cantAnimales', 'vacunacionMascotas',
      // FAMILIA
      'tipoFamilia', 'numIntegrantes', 'apgar', 'ecomapa', 'cuidadorPrincipal', 'zarit', 'vulnerabilidades',
      // INTEGRANTES
      'pacienteId', 'nombres', 'apellidos', 'tipoDoc', 'documento', 'fechaNacimiento', 'sexo',
      'generoIdentidad', 'parentesco', 'gestante', 'mesesGestacion', 'telefono', 'nivelEducativo',
      'ocupacion', 'regimen', 'eapb', 'etnia', 'puebloIndigena', 'grupoPoblacional', 'discapacidades',
      'peso', 'talla', 'perimetroBraquial', 'diagNutricional', 'practicaDeportiva', 'lactanciaMaterna',
      'lactanciaMeses', 'esquemaAtenciones', 'esquemaVacunacion', 'intervencionesPendientes',
      'enfermedadAguda', 'recibeAtencionMedica', 'remisiones', 'antecedentesCronicos', 'antecedentesTransmisibles'
    ]

    const rows: string[] = []

    // Por cada ficha iteramos sus pacientes para crear la estructura plana
    fichas.forEach(f => {
      // Datos Base del Hogar
      const baseRowData = [
        cleanCsv(f.id),
        cleanCsv(f.consecutivo),
        cleanCsv(getLabel(ESTADO_VISITA, f.estadoVisita)),
        cleanCsv(f.departamento),
        cleanCsv('66001'), // Pereira código
        cleanCsv(f.municipio),
        cleanCsv(f.territorio?.nombre || 'N/A'),
        cleanCsv(f.microterritorio),
        cleanCsv(f.uzpe),
        cleanCsv(f.centroPoblado),
        cleanCsv(f.direccion),
        cleanCsv(f.numEBS),
        cleanCsv(f.prestadorPrimario),
        cleanCsv(f.numHogar),
        cleanCsv(f.numFamilia),
        cleanCsv(f.codFicha),
        cleanCsv(f.latitud),
        cleanCsv(f.longitud),
        cleanCsv(f.fechaDiligenciamiento ? new Date(f.fechaDiligenciamiento).toISOString().split('T')[0] : ''),
        cleanCsv(f.encuestador ? `${f.encuestador.nombre} ${f.encuestador.apellidos}` : ''),
        cleanCsv(f.encuestador?.documento || ''),
        // VIVIENDA
        cleanCsv(getLabel(TIPO_VIVIENDA, f.tipoVivienda)),
        cleanCsv(getLabel(MATERIAL_PAREDES, f.matParedes)),
        cleanCsv(getLabel(MATERIAL_PISOS, f.matPisos)),
        cleanCsv(getLabel(MATERIAL_TECHOS, f.matTechos)),
        cleanCsv(f.numHogares),
        cleanCsv(f.numDormitorios),
        cleanCsv(f.estratoSocial),
        cleanCsv(f.hacinamiento ? 'SI' : 'NO'),
        cleanCsv(getLabels(FUENTE_AGUA, f.fuenteAgua)),
        cleanCsv(getLabels(DISPOSICION_EXCRETAS, f.dispExcretas)),
        cleanCsv(getLabels(AGUAS_RESIDUALES, f.aguasResiduales)),
        cleanCsv(getLabels(DISPOSICION_RESIDUOS, f.dispResiduos)),
        cleanCsv(getLabels(RIESGO_ACCIDENTE, f.riesgoAccidente)),
        cleanCsv(getLabel(FUENTE_ENERGIA, f.fuenteEnergia)),
        cleanCsv(f.presenciaVectores ? 'SI' : 'NO'),
        cleanCsv(getLabels(ANIMALES, f.animales)),
        cleanCsv(f.cantAnimales),
        cleanCsv(f.vacunacionMascotas ? 'SI' : 'NO'),
        // FAMILIA
        cleanCsv(getLabel(TIPO_FAMILIA, f.tipoFamilia)),
        cleanCsv(f.numIntegrantes),
        cleanCsv(getLabel(APGAR_OPCIONES, f.apgar)),
        cleanCsv(getLabel(ECOMAPA_OPCIONES, f.ecomapa)),
        cleanCsv(f.cuidadorPrincipal ? 'SI' : 'NO'),
        cleanCsv(getLabel(ZARIT_OPCIONES, f.zarit)),
        cleanCsv(getLabels(VULNERABILIDADES, f.vulnerabilidades))
      ]

      if (!f.pacientes || f.pacientes.length === 0) {
         // Si no tiene pacientes, añadimos celdas vacías al final
         const emptyPatientCols = Array(35).fill('""');
         rows.push([...baseRowData, ...emptyPatientCols].join(';'))
      } else {
         f.pacientes.forEach(p => {
            // Helper parsing for JSONs (Prisma already returns objects for Json types)
            const antcArray = safeParseJsonArray(p.antecedentes);
            const antcTransArray = safeParseJsonArray(p.antecTransmisibles);

            const patientRowData = [
              cleanCsv(p.id),
              cleanCsv(p.nombres),
              cleanCsv(p.apellidos),
              cleanCsv(getLabel(TIPO_DOCUMENTO, p.tipoDoc)),
              cleanCsv(p.documento),
              cleanCsv(p.fechaNacimiento),
              cleanCsv(getLabel(SEXO, p.sexo)),
              cleanCsv(p.generoIdentidad),
              cleanCsv(getLabel(PARENTESCO, p.parentesco)),
              cleanCsv(p.gestante),
              cleanCsv(p.mesesGestacion),
              cleanCsv(p.telefono),
              cleanCsv(getLabel(NIVEL_EDUCATIVO, p.nivelEducativo)),
              cleanCsv(getLabel(OCUPACION, p.ocupacion)),
              cleanCsv(getLabel(REGIMEN_SALUD, p.regimen)),
              cleanCsv(p.eapb),
              cleanCsv(getLabel(ETNIA, p.etnia)),
              cleanCsv(p.puebloIndigena),
              cleanCsv(getLabels(GRUPO_POBLACIONAL, p.grupoPoblacional)),
              cleanCsv(getLabels(DISCAPACIDADES, p.discapacidades)),
              cleanCsv(p.peso),
              cleanCsv(p.talla),
              cleanCsv(p.perimetroBraquial),
              cleanCsv(getLabel(DIAGNOSTICO_NUTRICIONAL, p.diagNutricional)),
              cleanCsv(p.practicaDeportiva ? 'SI' : 'NO'),
              cleanCsv(p.lactanciaMaterna ? 'SI' : 'NO'),
              cleanCsv(p.lactanciaMeses),
              cleanCsv(p.esquemaAtenciones ? 'SI' : 'NO'),
              cleanCsv(p.esquemaVacunacion ? 'SI' : 'NO'),
              cleanCsv(getLabels(INTERVENCIONES_PENDIENTES, p.intervencionesPendientes)),
              cleanCsv(p.enfermedadAguda ? 'SI' : 'NO'),
              cleanCsv(p.recibeAtencionMedica ? 'SI' : 'NO'),
              cleanCsv(getLabels(REMISIONES_APS, p.remisiones)),
              cleanCsv(getLabels(ANTECEDENTES_CRONICOS, antcArray)),
              cleanCsv(getLabels(ANTECEDENTES_TRANSMISIBLES, antcTransArray))
            ]

            rows.push([...baseRowData, ...patientRowData].join(';'))
         })
      }
    })

    const csvContent = "\uFEFF" + headers.join(';') + "\n" + rows.join("\n")

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Base_Completa_Identicaciones_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error("GET EXPORTAR ERROR:", error)
    return NextResponse.json({ error: "Error interno al exportar CSV" }, { status: 500 })
  }
}
