export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { codigo, nombre, descripcion, activo, whatsappLink } = body;

    const dataToUpdate: any = {};
    if (codigo !== undefined) dataToUpdate.codigo = codigo.toUpperCase();
    if (nombre !== undefined) dataToUpdate.nombre = nombre;
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;
    if (activo !== undefined) dataToUpdate.activo = activo;
    if (whatsappLink !== undefined) dataToUpdate.whatsappLink = whatsappLink;

    const updated = await prisma.territorio.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe otro territorio con este código" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar territorio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.territorio.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Territorio eliminado" });
  } catch (error: any) {
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "No se puede eliminar el territorio porque tiene usuarios, atenciones o fichas asignadas. En su lugar, desactívelo." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al eliminar territorio" },
      { status: 500 }
    );
  }
}
