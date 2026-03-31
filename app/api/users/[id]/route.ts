export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { capitalizeWords } from "@/lib/utils"
import { verifyToken } from "@/lib/verify-token"

// ──────────── PUT (Editar usuario) ────────────

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Solo ADMIN o SUPERADMIN pueden editar a otras personas libremente, pero un SUPERADMIN solo puede ser editado por él mismo u otro SUPERADMIN.
    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para editar usuarios." }, { status: 403 });
    }

    const body = await req.json()
    const { id } = await params

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { rol: true } })
    if (!targetUser) {
      return NextResponse.json({ error: "Usuario a modificar no existe." }, { status: 404 });
    }

    if (targetUser.rol === "SUPERADMIN" && auth.decoded?.rol !== "SUPERADMIN") {
      return NextResponse.json({ error: "Un Administrador no puede editar a un Super Administrador." }, { status: 403 });
    }

    const {
      nombre,
      apellidos,
      documento,
      email,
      password,
      rol,
      telefono,
      programaId,
      activo,
    } = body

    const dataToUpdate: any = {}
    
    if (nombre !== undefined) dataToUpdate.nombre = capitalizeWords(nombre)
    if (apellidos !== undefined) dataToUpdate.apellidos = capitalizeWords(apellidos)
    if (documento !== undefined) dataToUpdate.documento = documento
    if (email !== undefined) dataToUpdate.email = email
    if (telefono !== undefined) dataToUpdate.telefono = telefono || null
    
    // Asignación de rol condicional blindada
    if (rol !== undefined) {
      const upperRol = typeof rol === 'string' ? rol.toUpperCase() : "AUXILIAR"
      
      // Bloquear escalada a SUPERADMIN por ADMINs normales
      if (upperRol === "SUPERADMIN" && auth.decoded?.rol !== "SUPERADMIN") {
          return NextResponse.json({ error: "No tienes permiso para conceder rol de SUPERADMIN." }, { status: 403 });
      }

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
      select: { id: true, nombre: true, apellidos: true, rol: true, email: true, telefono: true, activo: true, programaId: true, territorioId: true }
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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyToken(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.decoded?.rol !== "SUPERADMIN" && auth.decoded?.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado para eliminar usuarios." }, { status: 403 });
    }

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

    if (rol === "PROFESIONAL" && typeof user._count.atenciones === 'number' && user._count.atenciones > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el usuario profesional porque tiene atenciones asociadas." },
        { status: 400 }
      )
    }

    if (rol === "AUXILIAR" && typeof user._count.fichasCreadas === 'number' && user._count.fichasCreadas > 0) {
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