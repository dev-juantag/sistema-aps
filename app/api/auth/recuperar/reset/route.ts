import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code, newPassword } = body

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { error: "Email, código y nueva contraseña son requeridos." },
        { status: 400 }
      )
    }

    const unUsuario = await prisma.user.findUnique({
      where: { email }
    })

    if (!unUsuario || !unUsuario.recoveryCode || !unUsuario.recoveryExpires) {
      return NextResponse.json(
        { error: "No hay una solicitud de recuperación válida para este email." },
        { status: 404 }
      )
    }

    // Doble verificación del código y la expiración (+10 min)
    const now = new Date()
    const isCodeWrong = unUsuario.recoveryCode !== String(code)
    const isExpired = unUsuario.recoveryExpires < now

    if (isCodeWrong || isExpired) {
      return NextResponse.json(
        { error: "El código no es válido o ha expirado." },
        { status: 400 }
      )
    }

    // Todo bien: Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar usuario en una sola transacción: cambiar clave y limpiar recuperación
    await prisma.user.update({
      where: { id: unUsuario.id },
      data: {
        password: hashedPassword,
        recoveryCode: null,
        recoveryExpires: null
      }
    })

    return NextResponse.json(
      { message: "Su contraseña ha sido actualizada correctamente.", success: true },
      { status: 200 }
    )

  } catch (error: any) {
    console.error("RESET PASSWORD ERROR:", error)
    return NextResponse.json(
      { error: "Error en el servidor al restablecer contraseña." },
      { status: 500 }
    )
  }
}
