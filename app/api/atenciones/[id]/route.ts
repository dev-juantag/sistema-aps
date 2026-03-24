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
