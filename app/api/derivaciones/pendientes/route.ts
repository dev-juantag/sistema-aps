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

    const userId = auth.decoded?.userId;

    const count = await prisma.derivacion.count({
      where: {
        profesionalId: userId,
        estado: 'PENDIENTE'
      }
    });

    return NextResponse.json({ count });

  } catch (error: any) {
    console.error("GET DERIVACIONES PENDIENTES ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor", detail: error?.message }, { status: 500 });
  }
}
