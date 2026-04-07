import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/verify-token";

export async function GET(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.decoded?.userId;

    // Buscar al usuario actual para obtener su territorioId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { territorioId: true, rol: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (!currentUser.territorioId) {
      return NextResponse.json({ error: "No tienes un territorio asignado" }, { status: 404 });
    }

    // Buscar el territorio con sus integrantes (usuarios)
    const territorio = await prisma.territorio.findUnique({
      where: { id: currentUser.territorioId },
      include: {
        usuarios: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            rol: true,
            email: true,
            telefono: true,
            documento: true,
            activo: true,
            programa: {
              select: {
                nombre: true
              }
            }
          },
          orderBy: { nombre: 'asc' }
        },
      },
    });

    if (!territorio) {
      return NextResponse.json({ error: "El territorio asignado no existe" }, { status: 404 });
    }

    return NextResponse.json(territorio);
  } catch (error: any) {
    console.error("[Mi Territorio GET Error]", error);
    return NextResponse.json({ error: "Error al obtener datos del territorio" }, { status: 500 });
  }
}
