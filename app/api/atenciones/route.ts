export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { capitalizeWords } from "@/lib/utils"
import { verifyToken } from "@/lib/verify-token";

export async function GET(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const requestedProfesionalId = searchParams.get('profesionalId');
    const userRole = auth.decoded?.rol?.toUpperCase();
    const userId = auth.decoded?.userId;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        programa: true,
        territoriosAsignados: true 
      }
    });

    let isEnfermeria = false;
    if (currentUser?.rol === 'PROFESIONAL' && currentUser?.programa?.nombre) {
      if (currentUser.programa.nombre.toLowerCase().includes('enfermer')) {
         isEnfermeria = true;
      }
    }

    let whereClause: any = {};

    // For non-admins, strict stage filtering
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.currentStageStart) {
        whereClause.createdAt = { gte: settings.currentStageStart };
      }
      
      // If user is precisely PROFESIONAL, force scope to themselves or their territory if isEnfermeria
      if (userRole === "PROFESIONAL") {
        if (isEnfermeria && currentUser?.territorioId) {
          whereClause.profesional = {
            territorioId: currentUser.territorioId
          };
        } else {
          whereClause.profesionalId = userId;
        }
      }
      if (userRole === "FACTURADOR") {
        const assignedTIds = currentUser?.territoriosAsignados?.map((t: any) => t.id) || [];
        
        if (assignedTIds.length > 0) {
          whereClause.OR = [
            { territorioId: { in: assignedTIds } },
            { profesional: { territorioId: { in: assignedTIds } } }
          ];
        } else if (currentUser?.territorioId) {
          whereClause.OR = [
            { territorioId: currentUser.territorioId },
            { profesional: { territorioId: currentUser.territorioId } }
          ];
        } else {
          // Si es facturador pero no tiene territorios asignados, mostrar nada (seguridad)
          whereClause.territorioId = "NONE";
        }
      }

      // Admins can filter by specific profesional if they want
      if (requestedProfesionalId) {
        whereClause.profesionalId = requestedProfesionalId;
      }
    }

    const atenciones = await prisma.atencion.findMany({
      where: whereClause,
      include: {
        paciente: true,
        profesional: true,
        programa: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedAtenciones = atenciones.map(a => ({
      id: a.id,
      programaId: a.programaId,
      pacienteId: a.pacienteId,
      pacienteNombre: `${a.paciente.nombres} ${a.paciente.apellidos}`.trim() || "",
      pacienteDocumento: a.paciente.documento || "",
      pacienteTipoDoc: a.paciente.tipoDoc || "",
      pacienteGenero: a.paciente.sexo || "",
      pacienteTelefono: a.paciente.telefono || "",
      pacienteDireccion: a.paciente.direccion || "",
      pacienteRegimen: a.paciente.regimen || "",
      pacienteEapb: a.paciente.eapb || "",
      pacienteFechaNac: a.paciente.fechaNacimiento ? String(a.paciente.fechaNacimiento) : "",
      notaValoracion: a.nota,
      profesionalId: a.profesionalId,
      profesionalNombre: a.profesional ? `${a.profesional.nombre} ${a.profesional.apellidos}` : "No asignado",
      fecha: a.createdAt.toISOString().split('T')[0],
      createdAtISO: a.createdAt.toISOString(),
      estadoFacturacion: a.estadoFacturacion,
      observacionFacturacion: a.observacionFacturacion || "",
    }));

    return NextResponse.json(formattedAtenciones);

  } catch (error) {
    console.error("GET ATENCIONES ERROR:", error);
    return NextResponse.json(
      { error: "Error al obtener atenciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json()

    let {
      nombreCompleto,
      tipoDocumento,
      documento,
      genero,
      telefono,
      direccion,
      fechaNacimiento,
      nota,
      profesionalId, // Extracted but we will enforce it via JWT
      programaId,
    } = body

    // Prevent ID Spoofing by enforcing authenticated user ID
    const authenticatedUserId = auth.decoded?.userId;
    const finalProfesionalId = auth.decoded?.rol === "SUPERADMIN" || auth.decoded?.rol === "ADMIN" 
      ? (profesionalId || authenticatedUserId) 
      : authenticatedUserId;

    const currentUser = await prisma.user.findUnique({
      where: { id: finalProfesionalId },
      select: { territorioId: true }
    });

    let nombres = "";
    let apellidos = "";

    if (nombreCompleto) {
      nombreCompleto = capitalizeWords(nombreCompleto)
      const wordCount = nombreCompleto.split(/\s+/).length
      if (wordCount < 2 || wordCount > 4) {
        return NextResponse.json({ error: "El nombre del paciente debe tener entre 2 y 4 palabras" }, { status: 400 })
      }
      const words = nombreCompleto.split(/\s+/)
      const splitIndex = Math.ceil(words.length / 2)
      nombres = words.slice(0, splitIndex).join(" ").toUpperCase()
      apellidos = words.slice(splitIndex).join(" ").toUpperCase()
    }

    let paciente = await prisma.paciente.findUnique({
      where: { documento }
    })

    if (!paciente) {
      paciente = await prisma.paciente.create({
        data: {
          nombres,
          apellidos,
          tipoDoc: tipoDocumento,
          documento,
          sexo: genero,
          telefono,
          direccion,
          fechaNacimiento: String(fechaNacimiento),
          // Additional items to map from request body if they exist in the incoming POST
          ...(body.regimen && { regimen: body.regimen }),
          ...(body.eapb && { eapb: body.eapb })
        },
      })
    } else {
      paciente = await prisma.paciente.update({
        where: { id: paciente.id },
        data: {
          nombres,
          apellidos,
          tipoDoc: tipoDocumento,
          sexo: genero,
          telefono,
          direccion,
          fechaNacimiento: String(fechaNacimiento),
          ...(body.regimen && { regimen: body.regimen }),
          ...(body.eapb && { eapb: body.eapb })
        },
      })
    }

    const nuevaAtencion = await prisma.atencion.create({
      data: {
        pacienteId: paciente.id,
        profesionalId: finalProfesionalId,
        programaId,
        nota,
        territorioId: currentUser?.territorioId,
      },
      include: {
        paciente: true,
        profesional: true,
        programa: true,
      }
    })

    const responseFormat = {
      id: nuevaAtencion.id,
      programaId: nuevaAtencion.programaId,
      pacienteId: nuevaAtencion.pacienteId,
      pacienteNombre: `${nuevaAtencion.paciente.nombres} ${nuevaAtencion.paciente.apellidos}`.trim() || "",
      pacienteDocumento: nuevaAtencion.paciente.documento || "",
      pacienteTipoDoc: nuevaAtencion.paciente.tipoDoc || "",
      pacienteGenero: nuevaAtencion.paciente.sexo || "",
      pacienteTelefono: nuevaAtencion.paciente.telefono || "",
      pacienteDireccion: nuevaAtencion.paciente.direccion || "",
      pacienteRegimen: nuevaAtencion.paciente.regimen || "",
      pacienteEapb: nuevaAtencion.paciente.eapb || "",
      pacienteFechaNac: nuevaAtencion.paciente.fechaNacimiento ? String(nuevaAtencion.paciente.fechaNacimiento) : "",
      notaValoracion: nuevaAtencion.nota,
      profesionalId: nuevaAtencion.profesionalId,
      profesionalNombre: nuevaAtencion.profesional ? `${nuevaAtencion.profesional.nombre} ${nuevaAtencion.profesional.apellidos}` : "No asignado",
      fecha: nuevaAtencion.createdAt.toISOString().split('T')[0],
      createdAtISO: nuevaAtencion.createdAt.toISOString(),
      estadoFacturacion: nuevaAtencion.estadoFacturacion,
    }

    return NextResponse.json(responseFormat)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error al guardar atención" }, { status: 500 })
  }
}