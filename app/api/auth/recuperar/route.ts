export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { sendRecoveryEmail } from "@/lib/mailer"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, isAdminRequest } = body

    if (!email) {
      return NextResponse.json(
        { error: "El correo electrónico es requerido." },
        { status: 400 }
      )
    }

    const unUsuario = await prisma.user.findUnique({
      where: { email }
    })

    if (!unUsuario) {
      // Por seguridad, para evitar enumeración, devolvemos éxito pero no enviamos nada
      // O podemos avisar si el sistema es de uso interno controlado.
      return NextResponse.json(
        { message: "Si el correo está registrado, recibirás un código en breve." },
        { status: 200 }
      )
    }

    // Generar código aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Fecha de expiración: 10 minutos desde ahora
    const expires = new Date(Date.now() + 10 * 60 * 1000)

    // Guardar código y expiración en DB, SIN cambiar la contraseña
    await prisma.user.update({
      where: { id: unUsuario.id },
      data: { 
        recoveryCode: code,
        recoveryExpires: expires
      }
    })

    const primerNombre = unUsuario.nombre.split(' ')[0]

    // Enviar el email con el CÓDIGO de 6 dígitos
    const sent = await sendRecoveryEmail(email, code, primerNombre, isAdminRequest)

    if (!sent) {
      // Simulación local si no hay SMTP configurado
      if (!process.env.SMTP_USER) {
        return NextResponse.json(
          { message: "Simulación local: El código es " + code },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { error: "Error al enviar el correo electrónico. Intente más tarde." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Se ha enviado un código de verificación a tu correo." },
      { status: 200 }
    )

  } catch (error: any) {
    console.error("RECUPERAR CLAVE ERROR:", error)
    return NextResponse.json(
      { error: "Error en el servidor al procesar la solicitud." },
      { status: 500 }
    )
  }
}
