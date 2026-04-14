export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/verify-token";

export async function GET(req: Request) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const settings = await prisma.systemSettings.findFirst();
    const whereClause: any = {};
    if (settings?.currentStageStart) {
      whereClause.createdAt = { gte: settings.currentStageStart };
    }

    // Usar group by para sacar los id de profesional y cuantas atenciones
    const topCounts = await prisma.atencion.groupBy({
      by: ['profesionalId'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const profIdsWithAtenciones = topCounts.map(t => t.profesionalId);

    // Obtener a todos los profesionales activos
    const allProfs = await prisma.user.findMany({
      where: {
        rol: "PROFESIONAL",
        activo: true
      },
      include: {
        programa: true
      }
    });

    const countsMap = new Map();
    for (const tc of topCounts) {
      countsMap.set(tc.profesionalId, tc._count.id);
    }

    const allProfCounts = allProfs.map(user => {
      return {
        id: user.id,
        nombre: user.nombre || "Profesional Desconocido",
        apellidos: user.apellidos || "",
        documento: user.documento || "",
        programaNombre: user.programa?.nombre || "Sin programa",
        atencCount: countsMap.get(user.id) || 0,
        ultimaAtencion: 0,
      }
    });

    allProfCounts.sort((a, b) => b.atencCount - a.atencCount);

    const top10 = allProfCounts.slice(0, 10);

    return NextResponse.json(top10);
  } catch (error: any) {
    console.error("GET TOP PROFESIONALES ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor", detail: error?.message }, { status: 500 });
  }
}
