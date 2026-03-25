import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const territorioId = searchParams.get('territorioId')
    const role = searchParams.get('role')

    let whereFicha: any = {}

    if (role === 'SUPERADMIN' || role === 'ADMIN') {
      if (territorioId) whereFicha.territorioId = territorioId
    } else {
      if (role === "auxiliar" && territorioId) {
        whereFicha.territorioId = territorioId
      } else if (territorioId) {
        whereFicha.territorioId = territorioId
      }
      
      const settings = await prisma.systemSettings.findFirst()
      if (settings?.currentStageStart) {
        whereFicha.createdAt = { gte: settings.currentStageStart }
      }
    }

    const fichas = await prisma.fichaHogar.findMany({
      where: whereFicha,
      select: {
        id: true,
        territorio: { select: { nombre: true, codigo: true } }
      }
    })

    const fichaIds = fichas.map(f => f.id)

    const pacientes = await prisma.paciente.findMany({
      where: {
        fichaId: { in: fichaIds }
      },
      select: {
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
      }
    })

    // 1. KPIs Generales
    let gestantes = 0
    let menores5 = 0
    let mayores60 = 0
    let conDiscapacidad = 0

    // 2. Pirámide Poblacional
    const piramideMap: Record<string, { hombres: number, mujeres: number, label: string, sort: number }> = {
      "0-4": { hombres: 0, mujeres: 0, label: "0-4", sort: 0 },
      "5-14": { hombres: 0, mujeres: 0, label: "5-14", sort: 1 },
      "15-24": { hombres: 0, mujeres: 0, label: "15-24", sort: 2 },
      "25-44": { hombres: 0, mujeres: 0, label: "25-44", sort: 3 },
      "45-64": { hombres: 0, mujeres: 0, label: "45-64", sort: 4 },
      "65+": { hombres: 0, mujeres: 0, label: "65+", sort: 5 },
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

    pacientes.forEach(p => {
      // Demografía
      if (p.gestante === "SI") gestantes++
      if (p.grupoPoblacional?.includes(8)) conDiscapacidad++
      
      if (p.fechaNacimiento) {
        const bd = new Date(p.fechaNacimiento)
        let age = today.getFullYear() - bd.getFullYear()
        const m = today.getMonth() - bd.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--

        if (age < 5) menores5++
        if (age >= 60) mayores60++

        let rango = ""
        if (age >= 0 && age <= 4) rango = "0-4"
        else if (age >= 5 && age <= 14) rango = "5-14"
        else if (age >= 15 && age <= 24) rango = "15-24"
        else if (age >= 25 && age <= 44) rango = "25-44"
        else if (age >= 45 && age <= 64) rango = "45-64"
        else if (age >= 65) rango = "65+"

        if (rango && p.sexo) {
          if (p.sexo === "HOMBRE") piramideMap[rango].hombres++
          else if (p.sexo === "MUJER") piramideMap[rango].mujeres++
        }
      }

      // Aseguramiento
      if (p.regimen) regimenMap[p.regimen] = (regimenMap[p.regimen] || 0) + 1
      if (p.eapb) eapbMap[p.eapb] = (eapbMap[p.eapb] || 0) + 1

      // Etnia
      if (p.etnia) etniaMap[p.etnia] = (etniaMap[p.etnia] || 0) + 1

      // Brechas 3280
      if (p.esquemaAtenciones && p.esquemaVacunacion) cumpleEsquema++
      p.intervencionesPendientes?.forEach(id => {
        intervencionesMap[id] = (intervencionesMap[id] || 0) + 1
      })

      // Barreras
      p.barrerasAcceso?.forEach(id => {
        barrerasMap[id] = (barrerasMap[id] || 0) + 1
      })

      // Nutrición
      if (p.diagNutricional) nutricionMap[p.diagNutricional] = (nutricionMap[p.diagNutricional] || 0) + 1

      // Morbilidad
      if (p.enfermedadAguda) enfermedadAgudaCount++
      if (p.recibeAtencionMedica) recibeAtencionCount++

      if (p.antecedentes && typeof p.antecedentes === 'object') {
        Object.entries(p.antecedentes).forEach(([k, v]) => {
          if (v === true) cronicasMap[k] = (cronicasMap[k] || 0) + 1
        })
      }
      if (p.antecTransmisibles && typeof p.antecTransmisibles === 'object') {
        Object.entries(p.antecTransmisibles).forEach(([k, v]) => {
          if (v === true) transmisiblesMap[k] = (transmisiblesMap[k] || 0) + 1
        })
      }
    })

    // Preparar Densidad Map
    const densidadMap: Record<string, number> = {}
    fichas.forEach(f => {
      const nom = f.territorio?.nombre || "Sin Asignar"
      densidadMap[nom] = (densidadMap[nom] || 0) + 1
    })

    return NextResponse.json({
      kpis: {
        totalFichas: fichas.length,
        totalPacientes: pacientes.length,
        gestantes,
        menores5,
        mayores60,
        conDiscapacidad,
        cumpleEsquema,
        enfermedadAguda: enfermedadAgudaCount,
        recibeAtencion: recibeAtencionCount
      },
      piramide: Object.values(piramideMap).sort((a, b) => a.sort - b.sort),
      territorios: Object.entries(densidadMap).map(([name, count]) => ({ name, value: count })),
      aseguramiento: {
        regimen: Object.entries(regimenMap).map(([name, value]) => ({ name, value })),
        eapb: Object.entries(eapbMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10)
      },
      etnia: Object.entries(etniaMap).map(([name, value]) => ({ name, value })),
      intervenciones: Object.entries(intervencionesMap).map(([name, value]) => ({ name, value })),
      barreras: Object.entries(barrerasMap).map(([name, value]) => ({ name, value })),
      nutricion: Object.entries(nutricionMap).map(([name, value]) => ({ name, value })),
      morbilidad: {
        cronicas: Object.entries(cronicasMap).map(([name, value]) => ({ name, value })),
        transmisibles: Object.entries(transmisiblesMap).map(([name, value]) => ({ name, value }))
      }
    })

  } catch (error: any) {
    console.error("STATS ERROR:", error)
    return NextResponse.json({ error: "Error calculando estadisticas" }, { status: 500 })
  }
}
