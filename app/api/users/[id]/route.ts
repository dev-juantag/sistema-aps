export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { capitalizeWords } from "@/lib/utils"

// ──────────── PUT (Editar usuario) ────────────

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const { id } = await params

    const {
      nombre,
      apellidos,
      documento,
      email,
      password,
      rol,
      programaId,
      activo,
    } = body

    const dataToUpdate: any = {}
    
    if (nombre !== undefined) dataToUpdate.nombre = capitalizeWords(nombre)
    if (apellidos !== undefined) dataToUpdate.apellidos = capitalizeWords(apellidos)
    if (documento !== undefined) dataToUpdate.documento = documento
    if (email !== undefined) dataToUpdate.email = email
    if (rol !== undefined) {
      const upperRol = typeof rol === 'string' ? rol.toUpperCase() : "AUXILIAR"
      const validRolesWithPrograma = ["PROFESIONAL"]
      const validRolesWithTerritorio = ["AUXILIAR", "PROFESIONAL"]
      
      dataToUpdate.rol = upperRol as any
      dataToUpdate.programaId = validRolesWithPrograma.includes(upperRol) ? programaId || null : null
      dataToUpdate.territorioId = validRolesWithTerritorio.includes(upperRol) ? body.territorioId || null : null
    } else {
      if (programaId !== undefined) {
        dataToUpdate.programaId = programaId || null
      }
      if (body.territorioId !== undefined) {
        dataToUpdate.territorioId = body.territorioId || null
      }
    }
    
    if (activo !== undefined) dataToUpdate.activo = activo

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    })

    return NextResponse.json({
      ...updatedUser,
      rol: updatedUser.rol.toLowerCase(),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

// ──────────── DELETE (Eliminar usuario) ────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log("ID recibido:", id)

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            atenciones: true,
            fichasCreadas: true
          }
        }
      }
    })

    console.log("Usuario encontrado:", user)

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const rol = (user.rol as string).toUpperCase()

    if (rol === "SUPERADMIN") {
      return NextResponse.json(
        { error: "No se puede eliminar a un Super Administrador" },
        { status: 403 }
      )
    }

    if (rol === "PROFESIONAL" && user._count.atenciones > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el usuario profesional porque tiene atenciones asociadas." },
        { status: 400 }
      )
    }

    if (rol === "AUXILIAR" && user._count.fichasCreadas > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el usuario auxiliar porque tiene identificaciones (fichas) creadas." },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Usuario eliminado" })
  } catch (error: any) {
    console.error("DELETE ERROR:", error)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "No se puede eliminar el usuario porque tiene registros dependientes asociados." },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    )
  }
}