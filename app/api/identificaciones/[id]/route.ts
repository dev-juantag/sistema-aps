import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la identificación" }, { status: 400 });
    }

    const ficha = await prisma.fichaHogar.findUnique({
      where: { id },
      include: {
        encuestador: {
          select: {
            nombre: true,
            apellidos: true,
            documento: true,
          }
        },
        pacientes: {
          include: {
            atenciones: {
              include: {
                programa: true,
                profesional: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
      }
    });

    if (!ficha) {
      return NextResponse.json({ error: "Identificación no encontrada" }, { status: 404 });
    }

    return NextResponse.json(ficha);
  } catch (error: any) {
    console.error("GET FICHA ERROR:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    // 1. Eliminar derivaciones relacionadas a esta ficha
    await prisma.derivacion.deleteMany({
      where: { fichaId: id }
    });

    // 2. Eliminar pacientes asociados a esta ficha
    // En el schema el modelo es 'paciente' y el campo es 'fichaId'
    await prisma.paciente.deleteMany({
      where: { fichaId: id }
    });

    // 3. Finalmente eliminamos la ficha
    await prisma.fichaHogar.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: "Registro eliminado con éxito.",
      success: true 
    });

  } catch (error: any) {
    console.error("DELETE IDENTIFICACION ERROR:", error);
    
    // Si falla por dependencias (ej: atenciones) informamos al usuario
    const msg = error.code === 'P2003' 
      ? "No se puede eliminar porque esta ficha tiene registros vinculados (Atenciones)."
      : "Error al intentar eliminar el registro.";

    return NextResponse.json(
      { error: msg }, 
      { status: 500 }
    );
  }
}
