import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email y código son requeridos." },
        { status: 400 }
      )
    }

    const unUsuario = await prisma.user.findUnique({
      where: { email }
    })

    if (!unUsuario || !unUsuario.recoveryCode || !unUsuario.recoveryExpires) {
      return NextResponse.json(
        { error: "No hay una solicitud de recuperación pendiente para este email." },
        { status: 404 }
      )
    }

    // Verificar si el código no ha expirado (+10 min)
    const now = new Date()
    if (unUsuario.recoveryExpires < now) {
      return NextResponse.json(
        { error: "El código de verificación ha expirado." },
        { status: 400 }
      )
    }

    // Comparar el código
    if (unUsuario.recoveryCode !== String(code)) {
      return NextResponse.json(
        { error: "El código de verificación es incorrecto." },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Código verificado correctamente.", success: true },
      { status: 200 }
    )

  } catch (error: any) {
    console.error("VERIFICAR CÓDIGO ERROR:", error)
    return NextResponse.json(
      { error: "Error en el servidor al verificar el código." },
      { status: 500 }
    )
  }
}
