import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/verify-token";

export async function POST(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { type, action } = await req.json();
    const userId = auth.decoded?.userId;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastDownloadAtenciones: true, lastDownloadIdentificaciones: true, rol: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Admins and Facturadores might not have limit, but we'll apply it for PROFESIONAL
    // The prompt says "limitar la descarga a 1 vez por semana, con una advertencia... esa limitación tanto para los profesionales al descargar las atenciones, como para la descarga de las identificaciones por territorio de los profesionales asignados al programa de enfermeria"
    if (user.rol === "SUPERADMIN" || user.rol === "ADMIN") {
      return NextResponse.json({ allowed: true });
    }

    const now = new Date();
    let lastDownloadDate = type === "atenciones" ? user.lastDownloadAtenciones : user.lastDownloadIdentificaciones;

    if (action === "check") {
      if (lastDownloadDate) {
        const diffTime = Math.abs(now.getTime() - new Date(lastDownloadDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const nextDate = new Date(lastDownloadDate);
          nextDate.setDate(nextDate.getDate() + 7);
          return NextResponse.json({ allowed: false, nextAvailable: nextDate.toLocaleDateString() });
        }
      }
      return NextResponse.json({ allowed: true });
    } else if (action === "update") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          [type === "atenciones" ? "lastDownloadAtenciones" : "lastDownloadIdentificaciones"]: now
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

  } catch (err: any) {
    console.error("DOWNLOAD LIMIT ERROR", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
