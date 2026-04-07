import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/verify-token";

export async function POST(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    
    // Solo SUPERADMIN o ADMIN pueden gestionar contratos
    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para gestionar contratos." }, { status: 403 });
    }

    const data = await req.json();
    const { 
      documento, email, nombre, apellidos, rol, // Datos del usuario
      territorioId, perfil, numeroContrato, cdp, rp, numeroPoliza, // Datos del contrato
      estado
    } = data;

    // 1. Validar que la información crítica asocie a un usuario
    if (!documento || !email) {
      return NextResponse.json({ error: "Faltan datos críticos del contratista (documento, email)." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Buscar si el usuario ya existe
      let user = await tx.user.findUnique({ where: { documento } });

      // 3. Crear el usuario automáticamente si es un contratista nuevo
      if (!user) {
        // En un caso real, generar contraseña segura o usar el documento
        const hashedPassword = await bcrypt.hash(documento, 10);
        user = await tx.user.create({
          data: {
            documento,
            email,
            nombre,
            apellidos,
            password: hashedPassword,
            rol: rol || "PROFESIONAL",
            territorioId: territorioId || null,
          }
        });
      }

      // 4. Validar que no tenga ya un contrato activo (si el estado que mandan es ACTIVO)
      if (estado === "ACTIVO" || estado === "ASIGNACION_TERRITORIO") {
        const contratoActivo = await tx.contrato.findFirst({
          where: {
            userId: user.id,
            estado: {
              notIn: ["FINALIZADO"] // Eliminado el tipo "RECHAZADA" para que cumpla con el type de Prisma
            }
          }
        });

        if (contratoActivo) {
          throw new Error("El usuario ya posee un contrato en curso o activo. Debe finalizarse antes de crear otro.");
        }
      }

      // 5. Crear el contrato
      const nuevoContrato = await tx.contrato.create({
        data: {
          userId: user.id,
          territorioId: territorioId || null,
          perfil,
          estado: estado || "SELECCIONADO",
          numeroContrato,
          cdp,
          rp,
          numeroPoliza,
        }
      });

      return { user, contrato: nuevoContrato };
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error: any) {
    console.error("[Contratos POST Error]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Solo SUPERADMIN o ADMIN pueden consultar lista de contratos global
    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para ver contratos." }, { status: 403 });
    }

    const contratos = await prisma.contrato.findMany({
      include: {
        user: { select: { nombre: true, apellidos: true, documento: true, email: true } },
        territorio: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(contratos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
