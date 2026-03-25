export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { PARENTESCO, SEXO } from "@/lib/constants"

import { generateFamiliogramaMermaid } from "@/lib/familiograma"

export async function GET(request: Request) {

  try {
    const { searchParams } = new URL(request.url)
    const territorioId = searchParams.get('territorioId')
    const role = searchParams.get('role')

    let whereClause: any = {}

    // Si es superadmin o admin, ve todo el historial (a menos que pase un filtro de territorio explícito).
    if (role === 'SUPERADMIN' || role === 'ADMIN') {
      if (territorioId) whereClause.territorioId = territorioId
    } else {
      // Para roles normales, forzar filtro estricto por Territorio y por FECHA (solo historial de esta etapa)
      if (role === "auxiliar" && territorioId) {
        whereClause.territorioId = territorioId
      } else if (territorioId) {
        whereClause.territorioId = territorioId
      }
      
      const settings = await prisma.systemSettings.findFirst()
      if (settings?.currentStageStart) {
        whereClause.createdAt = { gte: settings.currentStageStart }
      }
    }

    const fichas = await prisma.fichaHogar.findMany({
      where: whereClause,
      include: {
        territorio: true,
        encuestador: {
          select: {
            nombre: true,
            apellidos: true,
            documento: true
          }
        },
        _count: {
          select: { pacientes: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedFichas = fichas.map(f => ({
      id: f.id,
      consecutivo: f.consecutivo,
      estadoVisita: f.estadoVisita,
      territorio: f.territorio?.nombre || f.territorioId || 'Sin asignar',
      territorioCodigo: f.territorio?.codigo || '',
      microterritorio: f.microterritorio || 'No esp.',
      fechaDiligenciamiento: f.fechaDiligenciamiento.toISOString(),
      direccion: f.direccion,
      centroPoblado: f.centroPoblado,
      descripcionUbicacion: f.descripcionUbicacion,
      estratoSocial: f.estratoSocial,
      numEBS: f.numEBS,
      numHogar: f.numHogar,
      numFamilia: f.numFamilia,
      codFicha: f.codFicha,
      encuestador: f.encuestador ? {
        nombre: f.encuestador.nombre,
        apellidos: f.encuestador.apellidos,
        documento: f.encuestador.documento
      } : null,
      integrantesCount: f._count.pacientes
    }))

    return NextResponse.json(formattedFichas)

  } catch (error) {
    console.error("GET FICHAS ERROR:", error)
    return NextResponse.json(
      { error: "Error al obtener identificaciones (fichas)" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { integrantes, territorio, microterritorio, encuestadorId, userId, ...hogarData } = body

    const isEfectiva = String(hogarData.estadoVisita) === '1';
    const finalIntegrantes = isEfectiva ? (integrantes || []) : [];

    const toIntArray = (arr: any): number[] => {

      const arrayToProcess = Array.isArray(arr) ? arr : (arr ? [arr] : [])
      return arrayToProcess.map((val: any) => parseInt(String(val))).filter((n: number) => !isNaN(n))
    }

    const fichaData = {
      estadoVisita: String(hogarData.estadoVisita || '1'),
      departamento: String(hogarData.departamento || 'RISARALDA'),
      municipio: String(hogarData.municipio || 'PEREIRA'),
      territorioId: String(territorio || ''), // This should match a UUID from Territorio now
      microterritorio: String(microterritorio || 'M1'),
      uzpe: hogarData.uzpe || null,
      centroPoblado: hogarData.centroPoblado || null,
      descripcionUbicacion: hogarData.descripcionUbicacion || null,
      direccion: String(hogarData.direccion || ''),
      latitud: hogarData.latitud ? parseFloat(hogarData.latitud) : null,
      longitud: hogarData.longitud ? parseFloat(hogarData.longitud) : null,
      fechaDiligenciamiento: (() => {
        if (!hogarData.fechaDiligenciamiento) return new Date();
        const dateStr = String(hogarData.fechaDiligenciamiento);
        // If it's just "YYYY-MM-DD", add current local time so it doesn't default to 7PM UTC problem
        if (dateStr.length <= 10 && dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const now = new Date();
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), now.getHours(), now.getMinutes(), now.getSeconds());
          }
        }
        return new Date(dateStr);
      })(),
      encuestadorId: encuestadorId || userId || null,
      numEBS: hogarData.numEBS || null,
      prestadorPrimario: hogarData.prestadorPrimario || null,
      observacionesRechazo: hogarData.observacionesRechazo || null,
      numHogar: hogarData.numHogar || null,
      numFamilia: hogarData.numFamilia || null,
      codFicha: hogarData.codFicha || null,
      
      // Vivienda
      tipoVivienda: hogarData.tipoVivienda ? parseInt(hogarData.tipoVivienda) : null,
      tipoViviendaDesc: hogarData.tipoViviendaDesc || null,
      matParedes: hogarData.matParedes ? parseInt(hogarData.matParedes) : null,
      matPisos: hogarData.matPisos ? parseInt(hogarData.matPisos) : null,
      matTechos: hogarData.matTechos ? parseInt(hogarData.matTechos) : null,
      numHogares: hogarData.numHogares ? parseInt(hogarData.numHogares) : null,
      numDormitorios: hogarData.numDormitorios ? parseInt(hogarData.numDormitorios) : null,
      estratoSocial: hogarData.estratoSocial ? parseInt(hogarData.estratoSocial) : null,
      hacinamiento: hogarData.hacinamiento === true || hogarData.hacinamiento === 'true',
      fuenteAgua: toIntArray(hogarData.fuenteAgua),
      dispExcretas: toIntArray(hogarData.dispExcretas),
      aguasResiduales: toIntArray(hogarData.aguasResiduales),
      dispResiduos: toIntArray(hogarData.dispResiduos),
      riesgoAccidente: toIntArray(hogarData.riesgoAccidente),
      fuenteEnergia: hogarData.fuenteEnergia ? parseInt(hogarData.fuenteEnergia) : null,
      presenciaVectores: hogarData.presenciaVectores === true || hogarData.presenciaVectores === 'true',
      animales: toIntArray(hogarData.animales),
      cantAnimales: hogarData.cantAnimales ? parseInt(hogarData.cantAnimales) : null,
      vacunacionMascotas: hogarData.vacunacionMascotas === true || hogarData.vacunacionMascotas === 'true',
      
      // Familia
      tipoFamilia: isEfectiva ? (hogarData.tipoFamilia ? parseInt(hogarData.tipoFamilia) : null) : null,
      numIntegrantes: isEfectiva ? (hogarData.numIntegrantes ? parseInt(hogarData.numIntegrantes) : null) : 0,
      apgar: isEfectiva ? (hogarData.apgar ? parseInt(hogarData.apgar) : null) : null,
      ecomapa: isEfectiva ? (hogarData.ecomapa ? parseInt(hogarData.ecomapa) : null) : null,
      cuidadorPrincipal: isEfectiva ? (hogarData.cuidadorPrincipal === true || hogarData.cuidadorPrincipal === 'true') : false,
      zarit: isEfectiva ? (hogarData.zarit ? parseInt(hogarData.zarit) : null) : null,
      vulnerabilidades: isEfectiva ? (Array.isArray(hogarData.vulnerabilidades) ? hogarData.vulnerabilidades : []) : [],
      familiogramaCodigo: isEfectiva && hogarData.familiogramaCodigo ? hogarData.familiogramaCodigo : (finalIntegrantes.length > 0 ? generateFamiliogramaMermaid(finalIntegrantes) : null),
    }

    const result = await prisma.$transaction(async (tx) => {
      const ficha = await tx.fichaHogar.create({ data: fichaData as any })

      if (finalIntegrantes.length > 0) {
        for (const int of finalIntegrantes) {
          const nombresArr = [int.primerNombre, int.segundoNombre].filter(Boolean)
          const apellidosArr = [int.primerApellido, int.segundoApellido].filter(Boolean)
          
          const integranteData = {
            fichaId: ficha.id,
            nombres: nombresArr.join(" ").toUpperCase(),
            apellidos: apellidosArr.join(" ").toUpperCase(),
            tipoDoc: String(int.tipoDoc || 'CC'),
            documento: String(int.numDoc || ''),
            fechaNacimiento: String(int.fechaNacimiento || ''),
            parentesco: parseInt(int.parentesco) || 1,
            sexo: String(int.sexo || 'HOMBRE'),
            gestante: int.gestante || 'NA',
            mesesGestacion: int.gestante === 'SI' && int.mesesGestacion ? parseInt(int.mesesGestacion) : null,
            telefono: int.telefono || null,
            direccion: String(hogarData.direccion || ''), // Added direccion from hogar
            nivelEducativo: int.nivelEducativo ? parseInt(int.nivelEducativo) : null,
            ocupacion: int.ocupacion ? parseInt(int.ocupacion) : null,
            regimen: int.regimen || null,
            eapb: int.eapb || null,
            etnia: int.etnia ? parseInt(int.etnia) : null,
            puebloIndigena: int.puebloIndigena || null,
            grupoPoblacional: toIntArray(int.grupoPoblacional),
            barrerasAcceso: toIntArray(int.barrerasAcceso),
            discapacidades: toIntArray(int.discapacidades),
            antecedentes: int.antecedentes || {},
            antecTransmisibles: int.antecTransmisibles || {},
            peso: int.peso ? parseFloat(int.peso) : null,
            talla: int.talla ? parseFloat(int.talla) : null,
            perimetroBraquial: int.perimetroBraquial ? parseFloat(int.perimetroBraquial) : null,
            diagNutricional: int.diagNutricional ? parseInt(int.diagNutricional) : null,
            practicaDeportiva: Boolean(int.practicaDeportiva),
            lactanciaMaterna: Boolean(int.lactanciaMaterna),
            lactanciaMeses: int.lactanciaMeses ? parseInt(int.lactanciaMeses) : null,
            esquemaAtenciones: Boolean(int.esquemaAtenciones),
            esquemaVacunacion: Boolean(int.esquemaVacunacion),
            intervencionesPendientes: toIntArray(int.intervencionesPendientes),
            enfermedadAguda: Boolean(int.enfermedadAguda),
            recibeAtencionMedica: Boolean(int.recibeAtencionMedica),
            remisiones: Array.isArray(int.remisiones) ? int.remisiones.map((r: any) => String(r)) : [],
          } as any

          await tx.paciente.upsert({
            where: {
              documento: String(int.numDoc || ''),
            },
            update: integranteData,
            create: integranteData,
          })
        }
      }
      return ficha
    })

    return NextResponse.json({
      success: true,
      id: result.id,
      consecutivo: result.consecutivo,
      territorioId: result.territorioId
    })
  } catch (error: any) {
    console.error('[API Identificaciones POST Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
