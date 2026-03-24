export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { capitalizeWords } from "@/lib/utils"

// PUT /api/programas/[id]
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params
    const { id } = params
    const body = await req.json()
    let { nombre, meta } = body

    if (!nombre) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      )
    }

    nombre = capitalizeWords(nombre)

    const parsedMeta = meta ? parseInt(meta, 10) : null;

    const updatedPrograma = await prisma.programa.update({
      where: { id },
      data: {
        nombre,
        meta: parsedMeta,
      },
    })

    return NextResponse.json(updatedPrograma)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Ya existe un programa con este nombre" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Error al actualizar programa", details: error?.message },
      { status: 500 }
    )
  }
}

// DELETE /api/programas/[id]
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params
    const { id } = params
    
    // Al intentar eliminar comprobamos si tiene atenciones o profesionales, aunque el modo de relación de Prisma podría evitarlo.
    await prisma.programa.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al eliminar programa. Es posible que tenga atenciones o profesionales asociados.", details: error?.message },
      { status: 500 }
    )
  }
}
