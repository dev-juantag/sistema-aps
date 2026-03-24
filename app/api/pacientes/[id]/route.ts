export const runtime = "nodejs"

import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { capitalizeWords } from "@/lib/utils"

export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const { id } = params
    
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        ficha: true,
        atenciones: {
          include: {
            profesional: { select: { nombre: true, apellidos: true } },
            programa: { select: { nombre: true } },
            territorio: { select: { nombre: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        derivaciones: {
           include: { profesional: { select: { nombre: true, apellidos: true } }, programa: { select: { nombre: true } }, territorio: { select: { nombre: true } } },
           orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!paciente) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    return NextResponse.json({
      ...paciente,
      nombreCompleto: `${paciente.nombres} ${paciente.apellidos}`.trim(),
      tipoDocumento: paciente.tipoDoc,
      genero: paciente.sexo
    })
  } catch (error) {
    console.error("GET PACIENTE ERROR:", error)
    return NextResponse.json({ error: "Error al obtener paciente" }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const { id } = params
    const body = await req.json()
    let { nombreCompleto, tipoDocumento, documento, genero, telefono, direccion, fechaNacimiento } = body

    let nombres: string | undefined;
    let apellidos: string | undefined;

    if (nombreCompleto) {
      nombreCompleto = capitalizeWords(nombreCompleto)
      const wordCount = nombreCompleto.split(/\s+/).length
      if (wordCount < 2 || wordCount > 4) {
        return NextResponse.json({ error: "El nombre del paciente debe tener entre 2 y 4 palabras" }, { status: 400 })
      }
      const words = nombreCompleto.split(/\s+/)
      const splitIndex = Math.ceil(words.length / 2)
      nombres = words.slice(0, splitIndex).join(" ").toUpperCase()
      apellidos = words.slice(splitIndex).join(" ").toUpperCase()
    }

    const pacienteRaw = await prisma.paciente.update({
      where: { id },
      data: {
        ...(nombres && { nombres }),
        ...(apellidos && { apellidos }),
        ...(tipoDocumento && { tipoDoc: tipoDocumento }),
        ...(documento && { documento }),
        ...(genero && { sexo: genero }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion }),
        ...(fechaNacimiento && { fechaNacimiento: String(fechaNacimiento) }),
      },
    })
    
    // Devolvemos el paciente formateado para que el frontend lo reconozca
    return NextResponse.json({
        ...pacienteRaw,
        nombreCompleto: `${pacienteRaw.nombres} ${pacienteRaw.apellidos}`.trim(),
        tipoDocumento: pacienteRaw.tipoDoc,
        genero: pacienteRaw.sexo
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
        return NextResponse.json(
            { error: "Ya existe otro paciente registrado con ese número de documento" },
            { status: 400 }
        )
    }
    console.error("PUT PACIENTE ERROR:", error)
    return NextResponse.json(
      { error: "Error al actualizar paciente", details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await context.params
    const { id } = params
    await prisma.paciente.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Comprobar restricciones de clave foránea si el paciente tiene 'atenciones' relacionadas
    if (error.code === 'P2003') {
        return NextResponse.json(
            { error: "No se puede eliminar el paciente porque tiene atenciones registradas en el sistema. Debe borrar sus atenciones primero." },
            { status: 400 }
        )
    }
    console.error("DELETE PACIENTE ERROR:", error)
    return NextResponse.json(
      { error: "Error al eliminar paciente", details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
