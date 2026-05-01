import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { 
  REGIMEN_SALUD, 
  ETNIA, 
  INTERVENCIONES_PENDIENTES, 
  BARRERAS_ACCESO, 
  DIAGNOSTICO_NUTRICIONAL, 
  ANTECEDENTES_CRONICOS, 
  ANTECEDENTES_TRANSMISIBLES, 
  VULNERABILIDADES 
} from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const territorioId = searchParams.get('territorioId')
    const role = searchParams.get('role')

    const filterMode = searchParams.get('filterMode') || "etapa"
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereFicha: any = {}

    if (territorioId) {
      if (territorioId.includes(',')) {
        whereFicha.territorioId = { in: territorioId.split(',') }
      } else {
        whereFicha.territorioId = territorioId
      }
    }

    if (filterMode === "etapa") {
      const settings = await prisma.systemSettings.findFirst()
      if (settings?.currentStageStart) {
        whereFicha.createdAt = { gte: settings.currentStageStart }
      }
    } else if (filterMode === "fechas" && startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereFicha.createdAt = { gte: start, lte: end }
    }
    // Si es "todo", no agregamos restricción de fechas

    const fichas = await prisma.fichaHogar.findMany({
      where: {
        ...whereFicha,
        estadoVisita: "1" // Solo visitas efectivas para las estadísticas principales
      },
      select: {
        id: true,
        estratoSocial: true,
        vulnerabilidades: true,
        territorio: { select: { nombre: true, codigo: true } }
      }
    })

    const fichaIds = fichas.map(f => f.id)

    const pacientes = await prisma.paciente.findMany({
      where: {
        fichaId: { in: fichaIds }
      },
      select: {
        fichaId: true,
        fechaNacimiento: true,
        sexo: true,
        gestante: true,
        etnia: true,
        grupoPoblacional: true,
        regimen: true,
        eapb: true,
        esquemaAtenciones: true,
        esquemaVacunacion: true,
        intervencionesPendientes: true,
        barrerasAcceso: true,
        peso: true,
        talla: true,
        perimetroBraquial: true,
        diagNutricional: true,
        antecedentes: true,
        antecTransmisibles: true,
        enfermedadAguda: true,
        recibeAtencionMedica: true,
        practicaDeportiva: true,
        remisiones: true,
      }
    })

    // 1. KPIs Generales
    let gestantes = 0
    let subsidiado = 0
    let contributivo = 0
    let menores5 = 0
    let menores10 = 0
    let mayores60 = 0
    let conDiscapacidad = 0
    let victimas = 0
    let signosDesnutricion = 0
    let ninosDesnutricion = 0
    let habitosSaludables = 0
    let sinAseguramiento = 0
    let remitidos = 0
    let totalHombres = 0
    let totalMujeres = 0
    let enfermedadHuerfanaHogares = new Set<string>()
    let apgarDisfuncion = 0

    // 2. Pirámide Poblacional - Cursos de Vida
    const piramideMap: Record<string, { hombres: number, mujeres: number, label: string, sort: number }> = {
      "Primera Infancia": { hombres: 0, mujeres: 0, label: "Primera Infancia (0-5)", sort: 0 },
      "Infancia": { hombres: 0, mujeres: 0, label: "Infancia (6-11)", sort: 1 },
      "Adolescencia": { hombres: 0, mujeres: 0, label: "Adolescencia (12-17)", sort: 2 },
      "Juventud": { hombres: 0, mujeres: 0, label: "Juventud (18-28)", sort: 3 },
      "Adultez": { hombres: 0, mujeres: 0, label: "Adultez (29-59)", sort: 4 },
      "Vejez": { hombres: 0, mujeres: 0, label: "Vejez (60+)", sort: 5 },
    }

    // 3. Afiliación / Aseguramiento
    const regimenMap: Record<string, number> = {}
    const eapbMap: Record<string, number> = {}

    // 4. Enfoque Diferencial: Etnia
    const etniaMap: Record<string, number> = {}

    // 5. Brechas 3280 e Intervenciones Pendientes
    let cumpleEsquema = 0
    const intervencionesMap: Record<string, number> = {}

    // 6. Barreras de Acceso
    const barrerasMap: Record<string, number> = {}

    // 7. Estado Nutricional
    const nutricionMap: Record<string, number> = {}

    // 8. Morbilidad
    let enfermedadAgudaCount = 0
    let recibeAtencionCount = 0
    const cronicasMap: Record<string, number> = {}
    const transmisiblesMap: Record<string, number> = {}

    const today = new Date()

    const vulnerabilidadesMap: Record<string, number> = {}
    const estratoMap: Record<string, number> = {}
    const densidadMap: Record<string, number> = {}

    fichas.forEach(f => {
      // Estrato
      const est = f.estratoSocial !== null ? String(f.estratoSocial) : "Sin registrar"
      estratoMap[est] = (estratoMap[est] || 0) + 1

      // Vulnerabilidades
      if (Array.isArray(f.vulnerabilidades)) {
        f.vulnerabilidades.forEach((v: string) => {
          if (v && !v.toLowerCase().includes('ningun') && !v.toLowerCase().includes('ningún')) {
            vulnerabilidadesMap[v] = (vulnerabilidadesMap[v] || 0) + 1
          }
        })
      }
      // APGAR
      if (f.apgar && f.apgar > 1) {
        apgarDisfuncion++
      }
      
      const nom = f.territorio?.nombre || "Sin Asignar"
      densidadMap[nom] = (densidadMap[nom] || 0) + 1
    })

    pacientes.forEach(p => {
      // Demografía
      if (p.gestante === "SI") gestantes++
      if (p.grupoPoblacional?.includes(8)) conDiscapacidad++
      if (p.grupoPoblacional?.includes(9)) victimas++
      if (p.practicaDeportiva === true) habitosSaludables++

      // Género total
      if (p.sexo === "HOMBRE") totalHombres++
      else if (p.sexo === "MUJER") totalMujeres++

      // Remisiones
      if (p.remisiones && p.remisiones.length > 0) remitidos++

      // Aseguramiento
      let regRaw = p.regimen && p.regimen.trim() !== "" ? p.regimen.trim().toUpperCase() : "NO_AFILIADO"
      let reg = regRaw.replace(/\s+/g, '_')
      if (reg === "SIN_AFILIACION" || reg === "SIN_AFILIACIÓN" || reg === "NO_TIENE") reg = "NO_AFILIADO"
      
      regimenMap[reg] = (regimenMap[reg] || 0) + 1
      if (reg === "NO_AFILIADO") {
        sinAseguramiento++
      } else if (reg === "SUBSIDIADO") {
        subsidiado++
      } else if (reg === "CONTRIBUTIVO") {
        contributivo++
      }
      
      let currentAge = -1
      if (p.fechaNacimiento) {
        const bd = new Date(p.fechaNacimiento)
        let age = today.getFullYear() - bd.getFullYear()
        const m = today.getMonth() - bd.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
        currentAge = age

        if (age < 5) menores5++
        if (age < 10) menores10++
        if (age >= 60) mayores60++

        let rango = ""
        if (age >= 0 && age <= 5) rango = "Primera Infancia"
        else if (age >= 6 && age <= 11) rango = "Infancia"
        else if (age >= 12 && age <= 17) rango = "Adolescencia"
        else if (age >= 18 && age <= 28) rango = "Juventud"
        else if (age >= 29 && age <= 59) rango = "Adultez"
        else if (age >= 60) rango = "Vejez"

        if (rango && p.sexo) {
          if (p.sexo === "HOMBRE") piramideMap[rango].hombres++
          else if (p.sexo === "MUJER") piramideMap[rango].mujeres++
        }
      }

      // Etnia
      if (p.etnia) etniaMap[p.etnia] = (etniaMap[p.etnia] || 0) + 1

      // Brechas 3280
      if (p.esquemaAtenciones && p.esquemaVacunacion) cumpleEsquema++
      p.intervencionesPendientes?.forEach(id => {
        intervencionesMap[id] = (intervencionesMap[id] || 0) + 1
      })

      // Barreras
      p.barrerasAcceso?.forEach((id: number) => {
        barrerasMap[id] = (barrerasMap[id] || 0) + 1
      })

      // Nutrición
      if (p.diagNutricional) {
        nutricionMap[p.diagNutricional] = (nutricionMap[p.diagNutricional] || 0) + 1
        if ([4, 5, 6].includes(p.diagNutricional)) {
          signosDesnutricion++
          if (currentAge >= 0 && currentAge < 10) {
            ninosDesnutricion++
          }
        }
      }

      // Morbilidad
      if (p.enfermedadAguda) enfermedadAgudaCount++
      if (p.recibeAtencionMedica) recibeAtencionCount++

      if (p.antecedentes && typeof p.antecedentes === 'object') {
        Object.entries(p.antecedentes).forEach(([k, v]) => {
          if (v === true) {
            cronicasMap[k] = (cronicasMap[k] || 0) + 1
            if (k === 'huerfana' && p.fichaId) enfermedadHuerfanaHogares.add(p.fichaId)
          }
        })
      }
      if (p.antecTransmisibles && typeof p.antecTransmisibles === 'object') {
        Object.entries(p.antecTransmisibles).forEach(([k, v]) => {
          if (v === true) transmisiblesMap[k] = (transmisiblesMap[k] || 0) + 1
        })
      }
    })

    // Preparar Densidad Map - Ya se hace en fichas.forEach

    // 9. Seguimientos
    let whereSeguimiento: any = {}
    let whereSeguimientoEtapa: any = {}
    
    if (territorioId) {
      if (territorioId.includes(',')) {
        whereSeguimiento.ficha = { territorioId: { in: territorioId.split(',') } }
        whereSeguimientoEtapa.ficha = { territorioId: { in: territorioId.split(',') } }
      } else {
        whereSeguimiento.ficha = { territorioId: territorioId }
        whereSeguimientoEtapa.ficha = { territorioId: territorioId }
      }
    }

    const settings = await prisma.systemSettings.findFirst()
    if (settings?.currentStageStart) {
      whereSeguimientoEtapa.fecha = { gte: settings.currentStageStart }
    }

    if (filterMode === "etapa") {
      if (settings?.currentStageStart) {
        whereSeguimiento.fecha = { gte: settings.currentStageStart }
      }
    } else if (filterMode === "fechas" && startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereSeguimiento.fecha = { gte: start, lte: end }
    }

    const seguimientosCount = await prisma.seguimientoFamiliar.count({
      where: whereSeguimiento
    })

    const seguimientosEtapaCount = await prisma.seguimientoFamiliar.count({
      where: whereSeguimientoEtapa
    })

    return NextResponse.json({
      kpis: {
        totalFichas: fichas.length,
        totalPacientes: pacientes.length,
        totalHombres,
        totalMujeres,
        gestantes,
        menores5,
        menores10,
        mayores60,
        conDiscapacidad,
        cumpleEsquema,
        enfermedadAguda: enfermedadAgudaCount,
        recibeAtencion: recibeAtencionCount,
        victimas,
        signosDesnutricion,
        ninosDesnutricion,
        habitosSaludables,
        sinAseguramiento,
        regimenSubsidiado: subsidiado,
        regimenContributivo: contributivo,
        remitidos,
        apgarDisfuncion,
        seguimientos: seguimientosCount,
        seguimientosEtapa: seguimientosEtapaCount,
        hogaresHuerfanas: enfermedadHuerfanaHogares.size
      },
      piramide: Object.values(piramideMap).sort((a, b) => a.sort - b.sort),
      territorios: Object.entries(densidadMap).map(([name, count]) => ({ name, value: count })),
      aseguramiento: {
        regimen: Object.entries(regimenMap).map(([name, value]) => ({ 
          name: REGIMEN_SALUD.find(r => r.id === name)?.label || name.replace(/_/g, ' '), 
          value 
        })),
        eapb: Object.entries(eapbMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10)
      },
      etnia: Object.entries(etniaMap).map(([name, value]) => ({ 
        name: ETNIA.find(e => String(e.id) === name)?.label || name.replace(/_/g, ' '), 
        value 
      })),
      intervenciones: Object.entries(intervencionesMap).map(([name, value]) => ({ 
        name: INTERVENCIONES_PENDIENTES.find(i => String(i.id) === name)?.label || name.replace(/_/g, ' '), 
        value 
      })),
      barreras: Object.entries(barrerasMap).map(([name, value]) => ({ 
        name: BARRERAS_ACCESO.find(b => String(b.id) === name)?.label || name.replace(/_/g, ' '), 
        value 
      })),
      nutricion: Object.entries(nutricionMap).map(([name, value]) => ({ 
        name: DIAGNOSTICO_NUTRICIONAL.find(d => String(d.id) === name)?.label || name.replace(/_/g, ' '), 
        value 
      })),
      morbilidad: {
        cronicas: Object.entries(cronicasMap).map(([name, value]) => ({ 
          name: ANTECEDENTES_CRONICOS.find(c => c.id === name)?.label || name.replace(/_/g, ' '), 
          value 
        })),
        transmisibles: Object.entries(transmisiblesMap).map(([name, value]) => ({ 
          name: ANTECEDENTES_TRANSMISIBLES.find(t => t.id === name)?.label || name.replace(/_/g, ' '), 
          value 
        }))
      },
      vulnerabilidades: Object.entries(vulnerabilidadesMap).map(([name, value]) => ({ 
        name: VULNERABILIDADES.find(v => v.id === name)?.label || name.replace(/_/g, ' '), 
        value 
      })),
      estratos: Object.entries(estratoMap).map(([name, value]) => ({ name: `Estrato ${name}`, value }))
    })


  } catch (error: any) {
    console.error("STATS ERROR:", error)
    return NextResponse.json({ error: "Error calculando estadisticas" }, { status: 500 })
  }
}
