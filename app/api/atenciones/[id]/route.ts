export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: "ID de atención no proporcionado" },
        { status: 400 }
      )
    }

    const atencion = await prisma.atencion.findUnique({
      where: { id },
    })

    if (!atencion) {
      return NextResponse.json(
        { error: "Atención no encontrada" },
        { status: 404 }
      )
    }

    await prisma.atencion.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Atención eliminada correctamente" })
  } catch (error) {
    console.error("DELETE ATENCION ERROR:", error)
    return NextResponse.json(
      { error: "Error al eliminar la atención" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const { estadoFacturacion, observacionFacturacion } = body;

    const dataToUpdate: any = {};
    if (estadoFacturacion !== undefined) dataToUpdate.estadoFacturacion = estadoFacturacion;
    if (observacionFacturacion !== undefined) dataToUpdate.observacionFacturacion = observacionFacturacion;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }

    const updated = await prisma.atencion.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);

  } catch (error) {
    console.error("PATCH ATENCION ERROR:", error);
    return NextResponse.json(
      { error: "Error al actualizar atención" },
      { status: 500 }
    );
  }
}
