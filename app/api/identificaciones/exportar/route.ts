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
import { verifyToken } from '@/lib/verify-token'

const cleanCsv = (val: any, isNumber = false) => {
  if (val === null || val === undefined || val === '') return '""'
  let str = String(val).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '')
  if (isNumber && (typeof val === 'number' || !isNaN(parseFloat(str)))) {
    str = str.replace('.', ',')
  }
  return `"${str}"`
}

const safeParseJsonArray = (val: any): any[] => {
  if (!val) return []
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  if (Array.isArray(val)) return val
  if (typeof val === 'object') {
    // Si es un objeto de Prisma (Map), lo convertimos a array de sus keys verdaderas
    return Object.entries(val).filter(([_, v]) => v === true).map(([k]) => k)
  }
  return [val]
}

const getLabel = (arr: any[], id: any) => {
  if (id === null || id === undefined) return ''
  return arr.find(x => String(x.id) === String(id))?.label || id || ''
}
const getLabels = (arr: any[], ids: any) => {
  const finalIds = safeParseJsonArray(ids)
  if (!finalIds || finalIds.length === 0) return '""'
  return `"${finalIds.map(id => getLabel(arr, id)).join(', ')}"`
}

export async function GET(request: Request) {
  try {
    const auth = await verifyToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url)
    const role = auth.decoded?.rol?.toLowerCase() || ''
    const userId = auth.decoded?.userId
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      include: { programa: true }
    });

    const territorioId = userInfo?.territorioId || searchParams.get('territorioId')

    let isEnfermeria = false;
    if (role === 'profesional' && userInfo?.programa?.nombre) {
       const progName = userInfo.programa.nombre.toLowerCase();
       if (progName.includes('enfermer')) isEnfermeria = true;
    }

    const isSuperAdmin = role === 'superadmin'
    const isAdmin = role === 'admin'
    const isAuxiliar = role === 'auxiliar'

    if (!isSuperAdmin && !isAdmin && !isAuxiliar && !isEnfermeria) {
       return NextResponse.json({ error: "No tienes permiso para descargar identificaciones" }, { status: 403 });
    }

    let whereClause: any = {}

    if (isAuxiliar) {
      if (territorioId) whereClause.territorioId = territorioId
      if (userId) whereClause.encuestadorId = userId
    } else if (isEnfermeria) {
      if (territorioId) whereClause.territorioId = territorioId
    }

    const fichas = await prisma.fichaHogar.findMany({
      where: whereClause,
      include: {
        encuestador: true,
        pacientes: true,
        territorio: true
      },
      orderBy: { consecutivo: 'desc' } // Punto 3: Orden Cronológico
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
      'tipoFamilia', 'numIntegrantes', 'apgar', 'apgar_P1', 'apgar_P2', 'apgar_P3', 'apgar_P4', 'apgar_P5', 'ecomapa', 'cuidadorPrincipal', 'zarit', 'vulnerabilidades',
      // INTEGRANTES
      'pacienteId', 'nombres', 'apellidos', 'tipoDoc', 'documento', 'fechaNacimiento', 'sexo',
      'generoIdentidad', 'parentesco', 'gestante', 'mesesGestacion', 'telefono', 'nivelEducativo',
      'ocupacion', 'regimen', 'eapb', 'etnia', 'puebloIndigena', 'grupoPoblacional', 'discapacidades',
      'peso', 'talla', 'perimetroBraquial', 'diagNutricional', 'practicaDeportiva', 'lactanciaMaterna',
      'lactanciaMeses', 'esquemaAtenciones', 'esquemaVacunacion', 'intervencionesPendientes',
      'enfermedadAguda', 'recibeAtencionMedica', 'remisiones', 'antecedentesCronicos', 'antecedentesTransmisibles'
    ]

    const rows: string[] = []

    fichas.forEach(f => {
      const baseRowData = [
        cleanCsv(f.id),
        cleanCsv(f.consecutivo),
        cleanCsv(getLabel(ESTADO_VISITA, f.estadoVisita)),
        cleanCsv(f.departamento),
        cleanCsv('66001'),
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
        cleanCsv(f.latitud, true),
        cleanCsv(f.longitud, true),
        cleanCsv(f.fechaDiligenciamiento ? new Date(f.fechaDiligenciamiento).toISOString().split('T')[0] : ''),
        cleanCsv(f.encuestador ? `${f.encuestador.nombre} ${f.encuestador.apellidos}` : ((f as any).encuestadorNombreRaw || '')),
        cleanCsv(f.encuestador?.documento || (f as any).encuestadorDocRaw || ''),
        // VIVIENDA
        cleanCsv(getLabel(TIPO_VIVIENDA, f.tipoVivienda)),
        cleanCsv(getLabel(MATERIAL_PAREDES, f.matParedes)),
        cleanCsv(getLabel(MATERIAL_PISOS, f.matPisos)),
        cleanCsv(getLabel(MATERIAL_TECHOS, f.matTechos)),
        cleanCsv(f.numHogares),
        cleanCsv(f.numDormitorios),
        cleanCsv(f.estratoSocial),
        cleanCsv(f.hacinamiento ? 'SI' : 'NO'),
        getLabels(FUENTE_AGUA, f.fuenteAgua),
        getLabels(DISPOSICION_EXCRETAS, f.dispExcretas),
        getLabels(AGUAS_RESIDUALES, f.aguasResiduales),
        getLabels(DISPOSICION_RESIDUOS, f.dispResiduos),
        getLabels(RIESGO_ACCIDENTE, f.riesgoAccidente),
        cleanCsv(getLabel(FUENTE_ENERGIA, f.fuenteEnergia)),
        cleanCsv(f.presenciaVectores ? 'SI' : 'NO'),
        getLabels(ANIMALES, f.animales),
        cleanCsv(f.cantAnimales),
        cleanCsv(f.vacunacionMascotas ? 'SI' : 'NO'),
        // FAMILIA
        cleanCsv(getLabel(TIPO_FAMILIA, f.tipoFamilia)),
        cleanCsv(f.numIntegrantes),
        cleanCsv(getLabel(APGAR_OPCIONES, f.apgar)),
        cleanCsv(Array.isArray((f as any).apgarRespuestas) ? (f as any).apgarRespuestas[0] : ''),
        cleanCsv(Array.isArray((f as any).apgarRespuestas) ? (f as any).apgarRespuestas[1] : ''),
        cleanCsv(Array.isArray((f as any).apgarRespuestas) ? (f as any).apgarRespuestas[2] : ''),
        cleanCsv(Array.isArray((f as any).apgarRespuestas) ? (f as any).apgarRespuestas[3] : ''),
        cleanCsv(Array.isArray((f as any).apgarRespuestas) ? (f as any).apgarRespuestas[4] : ''),
        cleanCsv(getLabel(ECOMAPA_OPCIONES, f.ecomapa)),
        cleanCsv(f.cuidadorPrincipal ? 'SI' : 'NO'),
        cleanCsv(getLabel(ZARIT_OPCIONES, f.zarit)),
        getLabels(VULNERABILIDADES, f.vulnerabilidades)
      ]

      if (!f.pacientes || f.pacientes.length === 0) {
         const emptyPatientCols = Array(35).fill('""');
         rows.push([...baseRowData, ...emptyPatientCols].join(';'))
      } else {
         f.pacientes.forEach(p => {
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
              cleanCsv(p.mesesGestacion, true),
              cleanCsv(p.telefono),
              cleanCsv(getLabel(NIVEL_EDUCATIVO, p.nivelEducativo)),
              cleanCsv(getLabel(OCUPACION, p.ocupacion)),
              cleanCsv(getLabel(REGIMEN_SALUD, p.regimen)),
              cleanCsv(p.eapb),
              cleanCsv(getLabel(ETNIA, p.etnia)),
              cleanCsv(p.puebloIndigena),
              getLabels(GRUPO_POBLACIONAL, p.grupoPoblacional),
              getLabels(DISCAPACIDADES, p.discapacidades),
              cleanCsv(p.peso, true),
              cleanCsv(p.talla, true),
              cleanCsv(p.perimetroBraquial, true),
              cleanCsv(getLabel(DIAGNOSTICO_NUTRICIONAL, p.diagNutricional)),
              cleanCsv(p.practicaDeportiva ? 'SI' : 'NO'),
              cleanCsv(p.lactanciaMaterna ? 'SI' : 'NO'),
              cleanCsv(p.lactanciaMeses),
              cleanCsv(p.esquemaAtenciones ? 'SI' : 'NO'),
              cleanCsv(p.esquemaVacunacion ? 'SI' : 'NO'),
              getLabels(INTERVENCIONES_PENDIENTES, p.intervencionesPendientes),
              cleanCsv(p.enfermedadAguda ? 'SI' : 'NO'),
              cleanCsv(p.recibeAtencionMedica ? 'SI' : 'NO'),
              getLabels(REMISIONES_APS, p.remisiones),
              getLabels(ANTECEDENTES_CRONICOS, p.antecedentes),
              getLabels(ANTECEDENTES_TRANSMISIBLES, p.antecTransmisibles)
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
