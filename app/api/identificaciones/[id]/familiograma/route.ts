import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/verify-token";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la ficha" }, { status: 400 });
    }

    const body = await req.json();
    const { familiogramaData } = body; 

    const updated = await prisma.fichaHogar.update({
      where: { id },
      data: {
        familiogramaCodigo: familiogramaData
      }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error("PATCH FAMILIOGRAMA ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
