export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Force reload cache next.js

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { PARENTESCO, SEXO } from "@/lib/constants"
import { verifyToken } from "@/lib/verify-token"
import { generateFamiliogramaAutoLayout } from "@/lib/familiograma"
export async function GET(req: Request) {

  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url)
    const requestedTerritorioId = searchParams.get('territorioId')
    
    const userRole = auth.decoded?.rol?.toUpperCase();
    const userId = auth.decoded?.userId;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { territoriosAsignados: true }
    });

    let whereClause: any = {}

    // Si es superadmin o admin, ve todo el historial (a menos que pase un filtro de territorio explícito).
    if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
      if (requestedTerritorioId) whereClause.territorioId = requestedTerritorioId
    } else {
      // Para roles normales, forzar filtro estricto por Territorio y por FECHA (solo historial de esta etapa)
      if (userRole === 'FACTURADOR') {
        const assignedTIds = currentUser?.territoriosAsignados?.map((t: any) => t.id) || [];
        if (assignedTIds.length > 0) {
          whereClause.territorioId = { in: assignedTIds };
        } else if (currentUser?.territorioId) {
          whereClause.territorioId = currentUser.territorioId;
        }
      } else if (userRole === 'AUXILIAR' || userRole === 'PROFESIONAL') {
        // Forzar el territorio asignado al usuario para estos roles
        if (currentUser?.territorioId) {
          whereClause.territorioId = currentUser.territorioId;
        } else if (requestedTerritorioId) {
          whereClause.territorioId = requestedTerritorioId;
        }
      } else if (requestedTerritorioId) {
        whereClause.territorioId = requestedTerritorioId
      }
      
      const settings = await prisma.systemSettings.findFirst()
      if (settings?.currentStageStart) {
        whereClause.createdAt = { gte: settings.currentStageStart }
      }
    }

    const myOnly = searchParams.get('myOnly') === 'true'
    if (myOnly && userId) {
      whereClause.encuestadorId = userId
    }

    const searchStr = searchParams.get('search')
    if (searchStr) {
      whereClause.OR = [
        { direccion: { contains: searchStr, mode: 'insensitive' } },
        { microterritorio: { contains: searchStr, mode: 'insensitive' } },
        { pacientes: { some: { documento: { contains: searchStr } } } },
        { encuestador: { nombre: { contains: searchStr, mode: 'insensitive' } } },
        { encuestador: { documento: { contains: searchStr } } },
        { encuestadorDocRaw: { contains: searchStr } },
        { encuestadorNombreRaw: { contains: searchStr, mode: 'insensitive' } },
      ]
    }

    const pageStr = searchParams.get('page')
    const limitStr = searchParams.get('limit')
    
    // Pagination defaults: if provided use them, else return all.
    const hasPagination = pageStr && limitStr
    const page = hasPagination ? parseInt(pageStr) : 1
    const limit = hasPagination ? parseInt(limitStr) : 0
    const skip = hasPagination ? (page - 1) * limit : 0

    let fichas;
    let totalCount = 0;

    if (hasPagination) {
      [totalCount, fichas] = await prisma.$transaction([
        (prisma.fichaHogar as any).count({ where: whereClause }),
        (prisma.fichaHogar as any).findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            territorio: { select: { id: true, nombre: true, codigo: true } },
            encuestador: { select: { nombre: true, apellidos: true, documento: true } },
            pacientes: { select: { documento: true } },
            _count: { select: { pacientes: true } }
          },
          orderBy: { createdAt: 'desc' }
        })
      ])
    } else {
      fichas = await (prisma.fichaHogar as any).findMany({
        where: whereClause,
        include: {
          territorio: { select: { id: true, nombre: true, codigo: true } },
          encuestador: { select: { nombre: true, apellidos: true, documento: true } },
          pacientes: { select: { documento: true } },
          _count: { select: { pacientes: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      totalCount = fichas.length
    }

    const formattedFichas = fichas.map((f: any) => ({
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
      } : ((f as any).encuestadorNombreRaw || (f as any).encuestadorDocRaw) ? {
        nombre: (f as any).encuestadorNombreRaw || 'Sin nombre',
        apellidos: '',
        documento: (f as any).encuestadorDocRaw || ''
      } : null,
      integrantesCount: f._count.pacientes,
      integrantesDocs: f.pacientes.map((p: any) => p.documento),
    }))

    if (hasPagination) {
      return NextResponse.json({
        fichas: formattedFichas,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      })
    }

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
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json()
    const { integrantes, territorio, microterritorio, encuestadorId, userId, ...hogarData } = body

    const authenticatedUserId = auth.decoded?.userId;

    const isEfectiva = String(hogarData.estadoVisita || '1') === '1';
    
    // Punto 4: Validación de Miembros
    if (isEfectiva && (!integrantes || integrantes.length === 0)) {
       return NextResponse.json({ 
         success: false, 
         error: "Una visita marcada como EFECTIVA debe tener al menos un integrante registrado." 
       }, { status: 400 });
    }

    const finalIntegrantes = isEfectiva ? (integrantes || []) : [];

    // Validación para prevenir Fichas Huérfanas (Robo de Integrantes)
    if (finalIntegrantes.length > 0) {
      const documentos = finalIntegrantes.map((int: any) => String(int.numDoc || '')).filter(Boolean);
      if (documentos.length > 0) {
        const pacientesExistentes = await prisma.paciente.findMany({
          where: { documento: { in: documentos } },
          select: { documento: true, ficha: { select: { numFamilia: true, id: true } } }
        });
        
        if (pacientesExistentes.length > 0) {
          const conflictos = pacientesExistentes.map((p: any) => `${p.documento} (Familia: ${p.ficha?.numFamilia || 'Desconocida'})`).join(', ');
          return NextResponse.json({
            success: false,
            error: `No se puede guardar la ficha. Los siguientes documentos ya se encuentran registrados en otra identificación: ${conflictos}`
          }, { status: 400 });
        }
      }
    }

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
      encuestadorId: authenticatedUserId || encuestadorId || userId || null,
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
      apgarRespuestas: isEfectiva && Array.isArray(hogarData.apgarRespuestas) ? hogarData.apgarRespuestas : [],
      ecomapa: isEfectiva ? (hogarData.ecomapa ? parseInt(hogarData.ecomapa) : null) : null,
      cuidadorPrincipal: isEfectiva ? (hogarData.cuidadorPrincipal === true || hogarData.cuidadorPrincipal === 'true') : false,
      zarit: isEfectiva ? (hogarData.zarit ? parseInt(hogarData.zarit) : null) : null,
      vulnerabilidades: isEfectiva ? (Array.isArray(hogarData.vulnerabilidades) ? hogarData.vulnerabilidades : []) : [],
      familiogramaCodigo: isEfectiva && hogarData.familiogramaCodigo ? hogarData.familiogramaCodigo : (finalIntegrantes.length > 0 ? generateFamiliogramaAutoLayout(finalIntegrantes) : null),
      otrosJson: {
        fuenteAguaOtro: hogarData.fuenteAguaOtro || null,
        dispExcretasOtro: hogarData.dispExcretasOtro || null,
        aguasResidualesOtro: hogarData.aguasResidualesOtro || null,
        dispResiduosOtro: hogarData.dispResiduosOtro || null,
        riesgoAccidenteOtro: hogarData.riesgoAccidenteOtro || null,
        animalesOtro: hogarData.animalesOtro || null,
      }
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
            barrerasAccesoOtro: int.barrerasAccesoOtro || null,
            otrosJson: {
              grupoPoblacionalOtro: int.grupoPoblacionalOtro || null,
              discapacidadesOtro: int.discapacidadesOtro || null,
              antecedentesOtro: int.antecedentesOtro || null,
              antecTransmisiblesOtro: int.antecTransmisiblesOtro || null,
            }
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
    }, {
      maxWait: 15000, 
      timeout: 30000 
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
