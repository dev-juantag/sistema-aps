export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const programas = await prisma.programa.findMany({
      orderBy: { nombre: "asc" }
    })
    return NextResponse.json(programas)
  } catch (error) {
    return NextResponse.json(
      { error: "Error al obtener programas" },
      { status: 500 }
    )
  }
}

import { capitalizeWords } from "@/lib/utils"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    let { nombre, meta } = body

    if (!nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    nombre = capitalizeWords(nombre)

    const parsedMeta = meta ? parseInt(meta, 10) : null;
    
    const newPrograma = await prisma.programa.create({
      data: {
        nombre,
        meta: parsedMeta,
      }
    })

    return NextResponse.json(newPrograma)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Ya existe un programa con este nombre" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Error al crear programa", details: error?.message },
      { status: 500 }
    )
  }
}