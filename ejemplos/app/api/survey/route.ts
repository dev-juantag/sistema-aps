import { NextResponse } from 'next/server'
import { PrismaClient } from '@repo/database'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { integrantes, territorio, microterritorio, ...hogarData } = body

    const toIntArray = (arr: any): number[] => {
      const arrayToProcess = Array.isArray(arr) ? arr : (arr ? [arr] : [])
      return arrayToProcess.map(val => parseInt(String(val))).filter(n => !isNaN(n))
    }

    const fichaData = {
      estadoVisita: String(hogarData.estadoVisita || '1'),
      departamento: String(hogarData.departamento || 'RISARALDA'),
      municipio: String(hogarData.municipio || 'PEREIRA'),
      territorio: String(territorio || 'T00'),
      microterritorio: String(microterritorio || 'M1'),
      uzpe: hogarData.uzpe || null,
      centroPoblado: hogarData.centroPoblado || null,
      descripcionUbicacion: hogarData.descripcionUbicacion || null,
      direccion: String(hogarData.direccion || ''),
      latitud: hogarData.coords?.lat ? parseFloat(hogarData.coords.lat) : null,
      longitud: hogarData.coords?.lng ? parseFloat(hogarData.coords.lng) : null,
      fechaDiligenciamiento: hogarData.fechaDiligenciamiento
        ? new Date(hogarData.fechaDiligenciamiento)
        : new Date(),
      numEBS: hogarData.numEBS || null,
      prestadorPrimario: hogarData.prestadorPrimario || null,
      tipoDocEncuestador: hogarData.tipoDocEncuestador || null,
      numDocEncuestador: hogarData.numDocEncuestador || null,
      perfilEncuestador: hogarData.perfilEncuestador || null,
      observacionesRechazo: hogarData.observacionesRechazo || null,
      // Matrioshka Identifiers
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
      tipoFamilia: hogarData.tipoFamilia ? parseInt(hogarData.tipoFamilia) : null,
      numIntegrantes: hogarData.numIntegrantes ? parseInt(hogarData.numIntegrantes) : null,
      apgar: hogarData.apgar ? parseInt(hogarData.apgar) : null,
      ecomapa: hogarData.ecomapa ? parseInt(hogarData.ecomapa) : null,
      cuidadorPrincipal: hogarData.cuidadorPrincipal === true || hogarData.cuidadorPrincipal === 'true',
      zarit: hogarData.zarit ? parseInt(hogarData.zarit) : null,
      vulnerabilidades: Array.isArray(hogarData.vulnerabilidades) ? hogarData.vulnerabilidades : [],
    }

    const result = await prisma.$transaction(async (tx) => {
      const ficha = await tx.fichaHogar.create({ data: fichaData as any })

      if (integrantes && Array.isArray(integrantes)) {
        for (const int of integrantes) {
          const integranteData = {
            fichaId: ficha.id,
            primerNombre: String(int.primerNombre || '').toUpperCase(),
            segundoNombre: int.segundoNombre ? String(int.segundoNombre).toUpperCase() : null,
            primerApellido: String(int.primerApellido || '').toUpperCase(),
            segundoApellido: int.segundoApellido ? String(int.segundoApellido).toUpperCase() : null,
            tipoDoc: String(int.tipoDoc || 'CC'),
            numDoc: String(int.numDoc || ''),
            fechaNacimiento: String(int.fechaNacimiento || ''),
            parentesco: parseInt(int.parentesco) || 1,
            sexo: String(int.sexo || 'HOMBRE'),
            gestante: int.gestante || 'NA',
            mesesGestacion: int.gestante === 'SI' && int.mesesGestacion ? parseInt(int.mesesGestacion) : null,
            telefono: int.telefono || null,
            nivelEducativo: int.nivelEducativo ? parseInt(int.nivelEducativo) : (null as any),
            ocupacion: int.ocupacion ? parseInt(int.ocupacion) : (null as any),
            regimen: int.regimen || null,
            eapb: int.eapb || null,
            etnia: int.etnia ? parseInt(int.etnia) : (null as any),
            puebloIndigena: int.puebloIndigena || null,
            grupoPoblacional: toIntArray(int.grupoPoblacional),
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
            remisiones: Array.isArray(int.remisiones) ? int.remisiones : [],
          } as any

          await tx.integrante.upsert({
            where: {
              // @ts-ignore - Prisma compound unique index mapping issue locally
              tipoDoc_numDoc: {
                tipoDoc: String(int.tipoDoc || 'CC'),
                numDoc: String(int.numDoc || ''),
              }
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
      territorio: result.territorio
    })
  } catch (error: any) {
    console.error('[Survey API Error]', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
