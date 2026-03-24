import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
export const runtime = "nodejs";

export async function POST(req: Request) {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET no está definido");
  }

  try {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 401 }
      )
    }

    // --- LOGICA DE INACTIVIDAD (3 MESES) ---
    // El usuario se considera activo si la bandera es explícitamente true o si no existe (null/undefined en BDs antiguas; Prisma por defecto usa true).
    let isActivo = (user as any).activo !== false;

    if (user.rol === "PROFESIONAL" && isActivo) {
      // Tomamos la fecha a comparar: lastLogin, si no existe usamos createdAt.
      const fechaBase = (user as any).lastLogin ? new Date((user as any).lastLogin) : new Date(user.createdAt);
      
      const limiteInactividad = new Date();
      limiteInactividad.setMonth(limiteInactividad.getMonth() - 3);

      if (fechaBase < limiteInactividad) {
        isActivo = false;
        // Lo desactivamos definitivamente en base de datos.
        await prisma.user.update({
          where: { id: user.id },
          data: { activo: false } as any // Asignación de tipo forzada temporalmente
        });
      }
    }

    if (!isActivo) {
      return NextResponse.json(
        { error: "Usuario desactivado por inactividad. Contacte al administrador para volver a activarlo." },
        { status: 403 }
      )
    }
    // ---------------------------------------

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Contraseña incorrecta" },
        { status: 401 }
      )
    }

    const token = jwt.sign(
      { userId: user.id, rol: user.rol },
      JWT_SECRET,
      { expiresIn: "8h" }
    )

    // Acabar login exitoso: Actualizar 'lastLogin'
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() } as any
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        rol: user.rol.toLowerCase(),
        programaId: user.programaId,
        territorioId: user.territorioId,
        documento: user.documento
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Error en el login" },
      { status: 500 }
    )
  }
}