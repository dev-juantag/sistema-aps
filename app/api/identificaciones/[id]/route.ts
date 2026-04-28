import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDocumentoDinamico } from "@/lib/constants";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la identificación" }, { status: 400 });
    }

    const ficha = await (prisma.fichaHogar as any).findUnique({
      where: { id },
      include: {
        encuestador: {
          select: {
            nombre: true,
            apellidos: true,
            documento: true,
          }
        },
        territorio: true,
        pacientes: {
          include: {
            atenciones: {
              include: {
                programa: true,
                profesional: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
      }
    });

    if (!ficha) {
      return NextResponse.json({ error: "Identificación no encontrada" }, { status: 404 });
    }

    // Generar familiograma si no existe o para asegurar frescura en visualización
    if (!ficha.familiogramaCodigo && ficha.pacientes && ficha.pacientes.length > 0) {
       const { generateFamiliogramaAutoLayout } = await import("@/lib/familiograma");
       ficha.familiogramaCodigo = generateFamiliogramaAutoLayout(ficha.pacientes);
    }

    // Aplicar tipoDoc dinamico
    if (ficha.pacientes) {
       ficha.pacientes = ficha.pacientes.map((p: any) => ({
           ...p,
           tipoDocumentoDinamico: getDocumentoDinamico(p.fechaNacimiento || '', p.tipoDoc)
       }));
    }

    return NextResponse.json(ficha);

  } catch (error: any) {
    console.error("GET FICHA ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor", detail: error?.message, stack: error?.stack }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    // 1. Eliminar derivaciones relacionadas a esta ficha
    await prisma.derivacion.deleteMany({
      where: { fichaId: id }
    });

    // 2. Eliminar pacientes asociados a esta ficha
    // En el schema el modelo es 'paciente' y el campo es 'fichaId'
    await prisma.paciente.deleteMany({
      where: { fichaId: id }
    });

    // 3. Finalmente eliminamos la ficha
    await prisma.fichaHogar.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: "Registro eliminado con éxito.",
      success: true 
    });

  } catch (error: any) {
    console.error("DELETE IDENTIFICACION ERROR:", error);
    
    // Si falla por dependencias (ej: atenciones) informamos al usuario
    const msg = error.code === 'P2003' 
      ? "No se puede eliminar porque esta ficha tiene registros vinculados (Atenciones)."
      : "Error al intentar eliminar el registro.";

    return NextResponse.json(
      { error: msg }, 
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { integrantes, territorio, microterritorio, encuestadorId, userId, ...hogarData } = body

    const isEfectiva = String(hogarData.estadoVisita) === '1';
    const finalIntegrantes = isEfectiva ? (integrantes || []) : [];

    // Validación para prevenir Fichas Huérfanas (Robo de Integrantes)
    if (finalIntegrantes.length > 0) {
      const documentos = finalIntegrantes.map((int: any) => String(int.numDoc || '')).filter(Boolean);
      if (documentos.length > 0) {
        const pacientesExistentes = await prisma.paciente.findMany({
          where: { 
            documento: { in: documentos },
            fichaId: { not: id } // Excluimos la ficha actual, ya que es normal que ya existan aquí
          },
          select: { documento: true, ficha: { select: { numFamilia: true, id: true } } }
        });
        
        if (pacientesExistentes.length > 0) {
          const conflictos = pacientesExistentes.map((p: any) => `${p.documento} (Familia: ${p.ficha?.numFamilia || 'Desconocida'})`).join(', ');
          return NextResponse.json({
            success: false,
            error: `No se puede actualizar la ficha. Los siguientes documentos ya se encuentran registrados en OTRA identificación: ${conflictos}`
          }, { status: 400 });
        }
      }
    }

    const toIntArray = (arr: any): number[] => {
      const arrayToProcess = Array.isArray(arr) ? arr : (arr ? [arr] : [])
      return arrayToProcess.map((val: any) => parseInt(String(val))).filter((n: number) => !isNaN(n))
    }
    
    // Al actualizar, se deshabilita la edición y se marcan los datos nuevos
    const fichaData: any = {
      estadoVisita: String(hogarData.estadoVisita || '1'),
      departamento: String(hogarData.departamento || 'RISARALDA'),
      municipio: String(hogarData.municipio || 'PEREIRA'),
      microterritorio: String(microterritorio || 'M1'),
      uzpe: hogarData.uzpe || null,
      centroPoblado: hogarData.centroPoblado || null,
      descripcionUbicacion: hogarData.descripcionUbicacion || null,
      direccion: String(hogarData.direccion || ''),
      latitud: hogarData.latitud ? parseFloat(hogarData.latitud) : null,
      longitud: hogarData.longitud ? parseFloat(hogarData.longitud) : null,
      numEBS: hogarData.numEBS || null,
      prestadorPrimario: hogarData.prestadorPrimario || null,
      observacionesRechazo: hogarData.observacionesRechazo || null,
      numHogar: hogarData.numHogar || null,
      numFamilia: hogarData.numFamilia || null,
      codFicha: hogarData.codFicha || null,
      puedeActualizarse: false,

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

      tipoFamilia: isEfectiva ? (hogarData.tipoFamilia ? parseInt(hogarData.tipoFamilia) : null) : null,
      numIntegrantes: isEfectiva ? (hogarData.numIntegrantes ? parseInt(hogarData.numIntegrantes) : null) : 0,
      apgar: isEfectiva ? (hogarData.apgar ? parseInt(hogarData.apgar) : null) : null,
      apgarRespuestas: isEfectiva && Array.isArray(hogarData.apgarRespuestas) ? hogarData.apgarRespuestas : [],
      ecomapa: isEfectiva ? (hogarData.ecomapa ? parseInt(hogarData.ecomapa) : null) : null,
      cuidadorPrincipal: isEfectiva ? (hogarData.cuidadorPrincipal === true || hogarData.cuidadorPrincipal === 'true') : false,
      zarit: isEfectiva ? (hogarData.zarit ? parseInt(hogarData.zarit) : null) : null,
      vulnerabilidades: isEfectiva ? (Array.isArray(hogarData.vulnerabilidades) ? hogarData.vulnerabilidades : []) : [],
      otrosJson: {
        fuenteAguaOtro: hogarData.fuenteAguaOtro || null,
        dispExcretasOtro: hogarData.dispExcretasOtro || null,
        aguasResidualesOtro: hogarData.aguasResidualesOtro || null,
        dispResiduosOtro: hogarData.dispResiduosOtro || null,
        riesgoAccidenteOtro: hogarData.riesgoAccidenteOtro || null,
        animalesOtro: hogarData.animalesOtro || null,
      }
    }

    // Transferir propiedad al auxiliar que actualiza (usando connect de Prisma)
    const nuevoEncuestadorId = encuestadorId || userId || null
    if (nuevoEncuestadorId) {
      fichaData.encuestador = { connect: { id: nuevoEncuestadorId } }
    }
    if (hogarData.encuestadorNombreRaw) fichaData.encuestadorNombreRaw = hogarData.encuestadorNombreRaw
    if (hogarData.numDocEncuestador) fichaData.encuestadorDocRaw = hogarData.numDocEncuestador

    if (territorio) fichaData.territorio = { connect: { id: String(territorio) } };

    const { generateFamiliogramaAutoLayout } = await import("@/lib/familiograma");
    fichaData.familiogramaCodigo = isEfectiva && hogarData.familiogramaCodigo ? hogarData.familiogramaCodigo : (finalIntegrantes.length > 0 ? generateFamiliogramaAutoLayout(finalIntegrantes) : null)


    const result = await prisma.$transaction(async (tx: any) => {
      const ficha = await tx.fichaHogar.update({
        where: { id },
        data: fichaData
      })

      if (finalIntegrantes.length > 0) {
        for (const int of finalIntegrantes) {
          const nombresArr = [int.primerNombre, int.segundoNombre].filter(Boolean)
          const apellidosArr = [int.primerApellido, int.segundoApellido].filter(Boolean)
          
          const integranteData = {
            fichaId: ficha.id,
            nombres: nombresArr.join(" ").toUpperCase(),
            apellidos: apellidosArr.join(" ").toUpperCase(),
            tipoDoc: String(int.tipoDoc || 'CC'),
            fechaNacimiento: String(int.fechaNacimiento || ''),
            parentesco: parseInt(int.parentesco) || 1,
            sexo: String(int.sexo || 'HOMBRE'),
            gestante: int.gestante || 'NA',
            mesesGestacion: int.gestante === 'SI' && int.mesesGestacion ? parseInt(int.mesesGestacion) : null,
            telefono: int.telefono || null,
            direccion: String(hogarData.direccion || ''),
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
            create: { ...integranteData, documento: String(int.numDoc || '') },
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
  } catch (err: any) {
    console.error("PUT IDENTIFICACION ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
