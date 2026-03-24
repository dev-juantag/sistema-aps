import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
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
              notIn: ["FINALIZADO", "RECHAZADA"]
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
  // Retorna todos los contratos, independientemente de si son historicos o activos
  try {
    const contratos = await prisma.contrato.findMany({
      include: {
        user: true,
        territorio: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(contratos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
