import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fichaId } = await params;
    if (!fichaId) {
      return NextResponse.json({ error: "Falta el ID de la ficha" }, { status: 400 });
    }

    const body = await req.json();
    const { observacion, acuerdosCumplidos, responsableId } = body;

    if (!observacion || !responsableId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Calcular el consecutivo para esta ficha
    const count = await prisma.seguimientoFamiliar.count({
      where: { fichaId }
    });
    const consecutivo = count + 1;

    const seguimiento = await prisma.seguimientoFamiliar.create({
      data: {
        fichaId,
        observacion,
        acuerdosCumplidos: !!acuerdosCumplidos,
        responsableId,
        consecutivo
      }
    });

    return NextResponse.json({ success: true, seguimiento });
  } catch (error: any) {
    console.error("POST SEGUIMIENTO ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor", detail: error?.message }, { status: 500 });
  }
}
