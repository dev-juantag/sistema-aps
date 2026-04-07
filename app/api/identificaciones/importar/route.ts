import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// ============================================================
// MAPA DE TERRITORIOS: codigo corto => nombre en BD
// Actualiza este mapa si agregas más territorios
// ============================================================
const TERRITORIO_MAP: Record<string, string> = {
  'T01': 'TERRITORIO DEL CAFE 1',
  'T02': 'TERRITORIO DEL CAFE 2',
  'T03': 'TERRITORIO DEL CAFE 3',
  'T04': 'TERRITORIO DEL CAFE 4',
  'T05': 'RIO DEL OTUN 1',
  'T06': 'RIO DEL OTUN 2',
  'T07': 'RIO DEL OTUN 3',
  'T08': 'RIO DEL OTUN 4',
  'T09': 'CONSOTA 1',
  'T10': 'CONSOTA 2',
  'T11': 'SAN JOAQUIN 1',
  'T12': 'SAN JOAQUIN 2',
  'T13': 'SAN JOAQUIN 3',
  'T14': 'SAN JOAQUIN 4',
  'T15': 'SAN JOAQUIN 5',
  'T16': 'CUBA 1',
  'T17': 'CUBA 2',
  'T18': 'CUBA 3',
  'T19': 'OSO 1',
  'T20': 'OSO 2',
  'T21': 'OSO 3',
  'T22': 'BOSTON 1',
  'T23': 'CUBA 4',
  'T24': 'POBLADO 1',
  'T25': 'POBLADO 2',
  'T26': 'VILLAVICENCIO (ITINERANTE)',
  'T27': 'ORIENTE',
  'T28': 'SAN NICOLAS',
  'T30': 'PERLA DEL OTUN 1',
  'T31': 'CORREGIMIENTO ARABIA',
  'T32': 'ALTA GRACIA',
  'T33': 'LA BELLA',
  'T34': 'LA FLORIDA',
  'T35': 'TRIBUNAS',
  'T36': 'COMBIA BAJA',
  'T37': 'COMBIA ALTA',
  'T38': 'ESTRELLA LA PALMILLA',
  'T39': 'MORELIA (ITINERANTE',
  'T41': 'ITINERANTES INDIGENA',
  'T42': 'VILLA SANTANA',
  'T43': 'CARCEL LA 40',
}

function safeFloat(val: string | undefined | null): number | null {
  if (!val || val.trim() === '') return null
  const parsed = parseFloat(val.trim().replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

function safeInt(val: string | undefined | null): number | null {
  if (!val || val.trim() === '') return null
  const parsed = parseInt(val.trim(), 10)
  return isNaN(parsed) ? null : parsed
}

function safeIntArray(val: string | undefined | null): number[] {
  if (!val || val.trim() === '' || val.toLowerCase() === 'na') return []
  return val.split(',').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n))
}

function getBoolean(val: string | undefined | null): boolean | null {
  if (!val || val.trim() === '') return null
  const l = val.trim().toLowerCase()
  if (l === '1' || l === 'si' || l === 'true' || l === 'yes') return true
  if (l === '2' || l === 'no' || l === 'false') return false
  return null
}

function normalizeMicro(val: string | null | undefined): string | null {
  if (!val || val.trim() === '') return null
  const v = val.trim()
  // "M1" => "MT01", "MT4" => "MT04", "MT01" => "MT01"
  const match = v.match(/^M(?:T)?(\d+)$/i)
  if (match) return `MT${match[1].padStart(2, '0')}`
  return v
}

// Convierte texto de estado del CSV al ID numérico del sistema
// El sistema usa: '1'=Efectiva, '2'=No Efectiva/Rechazada, '3'=Negada
function normalizeEstadoVisita(val: string): string {
  const v = (val || '').trim().toLowerCase()
  if (v === '1' || v === 'efectiva') return '1'
  if (v === '2' || v === 'no efectiva' || v === 'rechazada' || v === 'no_efectiva') return '2'
  if (v === '3' || v === 'negada' || v === 'deny') return '3'
  return '1' // default: Efectiva
}

// Lee valor del objeto con insensibilidad a mayúsculas en la clave
function get(obj: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    // Buscar la clave exacta primero
    if (obj[key] !== undefined) return obj[key]
    // Luego buscar en minúsculas
    const lower = key.toLowerCase()
    if (obj[lower] !== undefined) return obj[lower]
  }
  return ''
}

export async function POST(req: Request) {
  try {
    const { csv } = await req.json()
    if (!csv) return NextResponse.json({ error: "No CSV provided" }, { status: 400 })

    const lines = (csv as string).split(/\r?\n/).filter((l: string) => l.trim() !== '')
    if (lines.length < 2) return NextResponse.json({ error: "CSV vacío o sin datos" }, { status: 400 })

    // Leer headers exactamente como vienen (sin normalizar a minúsculas)
    // para poder compararlos luego con el mapeador get()
    const rawHeaders = lines[0].split(';').map((h: string) => h.trim())
    const dataLines = lines.slice(1)

    // Construir objetos con la clave original Y la clave en minúsculas
    const rows = dataLines.map((line: string, lineIndex: number) => {
      const columns = line.split(';')
      const obj: Record<string, string> = { _line: String(lineIndex + 2) }
      rawHeaders.forEach((h: string, i: number) => {
        if (h) {
          let cell = (columns[i] || '').trim()
          if (cell.startsWith('"') && cell.endsWith('"')) cell = cell.slice(1, -1)
          obj[h] = cell          // clave original: "encuestadorDoc"
          obj[h.toLowerCase()] = cell  // clave lowercase: "encuestadordoc"
        }
      })
      return obj
    }).filter((obj) => get(obj, 'globalid', 'consecutivo', 'codFicha', 'codfich') !== '')

    // Agrupar por globalid (una ficha = varios integrantes)
    const fichasMap = new Map<string, Record<string, string>[]>()
    rows.forEach((row) => {
      const key = get(row, 'globalid') || get(row, 'consecutivo') || get(row, 'codFicha') || `UNK-${row._line}`
      if (!fichasMap.has(key)) fichasMap.set(key, [])
      fichasMap.get(key)!.push(row)
    })

    // Cachear todos los territorios de la BD una sola vez
    const todosTerritorios = await prisma.territorio.findMany({ select: { id: true, nombre: true } })

    function resolverTerritorio(val: string): string | null {
      if (!val) return null
      const v = val.trim()
      // 1. Buscar por nombre exacto (insensible a mayúsculas)
      const porNombre = todosTerritorios.find(t => t.nombre.toLowerCase() === v.toLowerCase())
      if (porNombre) return porNombre.id
      // 2. Buscar por código corto (T14 => nombre en TERRITORIO_MAP => buscar en BD)
      const nombreMapeado = TERRITORIO_MAP[v.toUpperCase()]
      if (nombreMapeado) {
        const porCodigo = todosTerritorios.find(t => t.nombre.toLowerCase() === nombreMapeado.toLowerCase())
        if (porCodigo) return porCodigo.id
      }
      // 3. Buscar por UUID directo
      const porId = todosTerritorios.find(t => t.id === v)
      if (porId) return porId.id
      return null
    }

    let fichasActualizadas = 0
    let integrantesActualizados = 0
    const errors: string[] = []

    for (const [, integrantes] of Array.from(fichasMap.entries())) {
      const h = integrantes[0]

      try {
        // ── 1. Encuestador ──────────────────────────────────────────
        // Si no tiene user en el sistema, se guarda solo nombre/doc como texto
        let encuestadorId: string | null = null
        const docEnc = get(h, 'encuestadorDoc', 'encuestadordoc', 'nroIdentificacionResponsableEvaluacion')
        const nombreEnc = get(h, 'encuestadorNombre', 'encuestadornombre')
        if (docEnc) {
          const enc = await prisma.user.findUnique({ where: { documento: docEnc } })
          encuestadorId = enc?.id || null
          // No generamos error si no existe: se guarda nombre/doc como texto plano
        }

        // ── 2. Territorio ───────────────────────────────────────────
        const territorioRaw = get(h, 'territorio', 'codTerritorio', 'territorioid')
        let territorioId = resolverTerritorio(territorioRaw)

        if (!territorioId && encuestadorId) {
          const enc = await prisma.user.findUnique({ where: { id: encuestadorId } })
          territorioId = enc?.territorioId || null
        }

        if (!territorioId)
          errors.push(`Fila ${h._line}: Territorio '${territorioRaw}' no encontrado. La ficha quedará sin asignar.`)

        // ── 3. Ficha Hogar ──────────────────────────────────────────
        const globalid = get(h, 'globalid')
        const consec = get(h, 'consecutivo')
        const codFicha = get(h, 'codFicha', 'codfich')

        let fichaExistente = null
        if (consec && !isNaN(parseInt(consec)))
          fichaExistente = await prisma.fichaHogar.findUnique({ where: { consecutivo: parseInt(consec) } })
        if (!fichaExistente && codFicha)
          fichaExistente = await prisma.fichaHogar.findFirst({ where: { codFicha } })
        if (!fichaExistente && globalid)
          fichaExistente = await prisma.fichaHogar.findFirst({ where: { id: globalid } })

        // Fecha
        let fechaDiligenciamiento = new Date()
        const rawFecha = get(h, 'fechaDiligenciamientoFicha', 'fechadiligenciamiento', 'fechaDiligenciamiento')
        if (rawFecha) {
          const parsed = new Date(rawFecha.split(' ')[0])
          if (!isNaN(parsed.getTime())) fechaDiligenciamiento = parsed
        }

        const dataFicha = {
          estadoVisita: normalizeEstadoVisita(get(h, 'estadoVisita', 'estadovisita')),
          departamento: get(h, 'Departamento', 'departamento') || 'RISARALDA',
          municipio: get(h, 'municipio') || 'PEREIRA',
          territorioId,
          microterritorio: normalizeMicro(get(h, 'codMicroterritorio', 'microterritorio')),
          direccion: get(h, 'direccion') || 'Sin dirección',
          descripcionUbicacion: get(h, 'descripcionUbicacion', 'descripcionubicacion') || null,
          centroPoblado: get(h, 'centropoblado', 'centroPoblado') || null,
          latitud: safeFloat(get(h, 'latitud')),
          longitud: safeFloat(get(h, 'longitud')),
          fechaDiligenciamiento,
          encuestadorId,
          encuestadorNombreRaw: nombreEnc || null,
          encuestadorDocRaw: docEnc || null,
          numEBS: get(h, 'nroIdentificacionEBS', 'numebs') || null,
          prestadorPrimario: get(h, 'prestadorPrimario', 'prestadorprimario') || null,
          codFicha: codFicha || globalid || null,
          uzpe: get(h, 'codUzpe', 'coduzpe', 'uzpe') || null,
          numFamilia: get(h, 'numIdentificacionFamilia', 'numfamilia') || null,
          numHogar: get(h, 'numIdentificacionHogar', 'numhogar') || null,
          numIntegrantes: safeInt(get(h, 'nroPersonasVivienda', 'numintegrantes')) || integrantes.length,

          // ── Datos Físicos de Vivienda y Saneamiento ───────────────────
          tipoVivienda: safeInt(get(h, 'tipoVivienda', 'tipovivienda')),
          matParedes: safeInt(get(h, 'matParedes', 'matparedes')),
          matPisos: safeInt(get(h, 'matPisos', 'matpisos')),
          matTechos: safeInt(get(h, 'matTechos', 'mattechos')),
          numHogares: safeInt(get(h, 'nroHogaresVivienda', 'nrohogaresvivienda', 'numhogares')),
          estratoSocial: safeInt(get(h, 'estratoSocial', 'estratosocial')),
          hacinamiento: getBoolean(get(h, 'hacinamiento')),
          fuenteAgua: safeIntArray(get(h, 'principalFuenteAguaConsumoHumano', 'fuenteagua')),
          dispExcretas: safeIntArray(get(h, 'disposicionExcretas', 'disposicionexcretas', 'dispexcretas')),
          aguasResiduales: safeIntArray(get(h, 'disposicionAguaResidual', 'disposicionaguaresidual', 'aguasresiduales')),
          dispResiduos: safeIntArray(get(h, 'disposicionResiduosSolidos', 'disposicionresiduossolidos', 'dispresiduos')),
          riesgoAccidente: safeIntArray(get(h, 'codRiesgoAccidenteVivienda', 'codriesgoaccidentevivienda', 'riesgoaccidente')),
          fuenteEnergia: safeInt(get(h, 'fuentesEnergiaCombustibleCocinar', 'fuentesenergiacombustiblecocinar', 'fuenteenergia')),
          presenciaVectores: getBoolean(get(h, 'observaCriaderosVectores', 'observacriaderosvectores', 'presenciavectores')),
          animales: safeIntArray(get(h, 'animalesEnViviendaEntornoInmediato', 'animalesenviviendaentornoinmediato', 'animales')),
          cantAnimales: safeInt(get(h, 'numeroAnimales', 'numeroanimales', 'cantanimales')),
          vacunacionMascotas: getBoolean(get(h, 'vacunacionMascotas', 'vacunacionmascotas')),

          // ── Datos Familiares ──────────────────────────────────────────────
          tipoFamilia: safeInt(get(h, 'tipoFamilia', 'tipofamilia')),
          apgar: safeInt(get(h, 'codResultadoAPGAR', 'codresultadoapgar', 'apgar')),
          apgarRespuestas: [
            safeInt(get(h, 'apgar_P1', 'apgar_p1')) ?? 0,
            safeInt(get(h, 'apgar_P2', 'apgar_p2')) ?? 0,
            safeInt(get(h, 'apgar_P3', 'apgar_p3')) ?? 0,
            safeInt(get(h, 'apgar_P4', 'apgar_p4')) ?? 0,
            safeInt(get(h, 'apgar_P5', 'apgar_p5')) ?? 0,
          ].filter(x => x !== null),
          ecomapa: safeInt(get(h, 'ecomapa', 'ecomapa')),
          cuidadorPrincipal: getBoolean(get(h, 'cuidador', 'cuidadorprincipal')),
          zarit: safeInt(get(h, 'escalaZARIT', 'escalazarit', 'zarit')),
          vulnerabilidades: get(h, 'Vulnerabilidad', 'vulnerabilidad').split(',').map(s => s.trim()).filter(Boolean)
        }

        let ficha
        if (fichaExistente) {
          ficha = await prisma.fichaHogar.update({ where: { id: fichaExistente.id }, data: dataFicha })
        } else {
          ficha = await prisma.fichaHogar.create({ data: dataFicha })
        }
        fichasActualizadas++

        // ── 4. Integrantes ───────────────────────────────────────────
        for (const int of integrantes) {
          const doc = get(int, 'nroDocumento', 'documento', 'nrodocumento')
          if (!doc) continue

          // Sexo
          let sexo = get(int, 'sexo').trim()
          if (sexo === '1' || sexo.toLowerCase() === 'masculino') sexo = 'HOMBRE'
          else if (sexo === '2' || sexo.toLowerCase() === 'femenino') sexo = 'MUJER'
          else sexo = 'HOMBRE'

          // Fecha nacimiento
          let fechaNacimiento = '1900-01-01'
          const rawFN = get(int, 'fechaNacimiento', 'fechanacimiento')
          if (rawFN) {
            // Puede venir como "27/01/2001" o "2001-01-27"
            let fn = rawFN.split(' ')[0]
            if (fn.includes('/')) {
              const parts = fn.split('/')
              if (parts.length === 3) {
                // d/m/yyyy o dd/mm/yyyy
                fn = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
              }
            }
            const parsedFN = new Date(fn)
            if (!isNaN(parsedFN.getTime())) fechaNacimiento = fn
          }

          const nombres = get(int, 'nombres').trim() || get(int, 'primerNombre', 'primernombre')
          const apellidos = get(int, 'apellidos').trim() || get(int, 'primerApellido', 'primerapellido')
          const tipoDoc = get(int, 'tipoDocumento', 'tipodocumento', 'tipoDoc').toUpperCase() || 'CC'

          const dataInt = {
            nombres: nombres.toUpperCase(),
            apellidos: apellidos.toUpperCase(),
            tipoDoc,
            sexo,
            fechaNacimiento,
            telefono: get(int, 'telefono') || undefined,
            parentesco: parseInt(get(int, 'rolEnLaFamilia', 'parentesco')) || 1,
            peso: safeFloat(get(int, 'peso')),
            talla: safeFloat(get(int, 'talla')),
            perimetroBraquial: safeFloat(get(int, 'perimetroBraquial', 'perimetrobraquial')),
            eapb: get(int, 'eapb') || null,
            gestante: getBoolean(get(int, 'gestantes', 'gestante')) ? 'SI' : 'NO',
            mesesGestacion: safeFloat(get(int, 'mesesGestacion', 'mesesgestacion')),
            
            // Más campos csv
            generoIdentidad: get(int, 'generoIdentidad', 'genero') || undefined,
            nivelEducativo: safeInt(get(int, 'nivelEducativo', 'niveleducativo')),
            ocupacion: safeInt(get(int, 'ocupacion')),
            regimen: get(int, 'regimen') || undefined,
            etnia: safeInt(get(int, 'etnia')),
            puebloIndigena: get(int, 'pueblo indigena', 'puebloindigena') || null,
            grupoPoblacional: safeIntArray(get(int, 'grupo poblacional', 'grupopoblacional')),
            discapacidades: safeIntArray(get(int, 'discapacidad')),
            diagNutricional: safeInt(get(int, 'diagNutricional', 'diagnutricional')),
            practicaDeportiva: getBoolean(get(int, 'practicaDeportiva', 'practicadeportiva')),
            lactanciaMaterna: getBoolean(get(int, 'lactanciaMaterna', 'lactanciamaterna')),
            lactanciaMeses: safeInt(get(int, 'lactanciaMeses', 'lactanciameses')),
            esquemaAtenciones: getBoolean(get(int, 'esquemaAtenciones', 'esquemaatenciones')),
            esquemaVacunacion: getBoolean(get(int, 'esquemaVacunacion', 'esquemavacunacion')),
            intervencionesPendientes: safeIntArray(get(int, 'intervencionesPendientes', 'intervencionespendientes')),
            enfermedadAguda: getBoolean(get(int, 'enfermedadAguda', 'enfermedadaguda')),
            recibeAtencionMedica: getBoolean(get(int, 'recibeAtencionMedica', 'recibeatencionmedica')),
            remisiones: get(int, 'remisiones') ? get(int, 'remisiones').split(',') : [],
            
            fichaId: ficha.id,
          }

          await prisma.paciente.upsert({
            where: { documento: doc },
            update: dataInt,
            create: { documento: doc, ...dataInt }
          })
          integrantesActualizados++
        }

      } catch (e: any) {
        console.error('Import error row:', h._line, e.message)
        errors.push(`Error fila ${h._line}: ${e.message}`)
      }
    }

    return NextResponse.json({
      imported: fichasActualizadas,
      integrantes: integrantesActualizados,
      message: `✅ ${fichasActualizadas} fichas y ${integrantesActualizados} integrantes importados/actualizados.`,
      errors: errors.length > 0 ? errors.slice(0, 50) : null
    })

  } catch (error: any) {
    console.error('IMPORT FATAL:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
