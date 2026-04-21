export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getDocumentoDinamico } from "@/lib/constants"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const documento = searchParams.get('documento')

        if (!documento) {
            const pacientesRaw = await prisma.paciente.findMany({
                orderBy: { nombres: 'asc' }
            })
            const pacientes = pacientesRaw.map(p => ({
                ...p,
                nombreCompleto: `${p.nombres} ${p.apellidos}`.trim(),
                tipoDocumento: p.tipoDoc,
                tipoDocumentoDinamico: getDocumentoDinamico(p.fechaNacimiento || '', p.tipoDoc),
                genero: p.sexo
            }))
            return NextResponse.json(pacientes)
        }

        const pacienteRaw = await prisma.paciente.findUnique({
            where: { documento }
        })

        if (!pacienteRaw) {
            return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
        }

        return NextResponse.json({
            ...pacienteRaw,
            nombreCompleto: `${pacienteRaw.nombres} ${pacienteRaw.apellidos}`.trim(),
            tipoDocumento: pacienteRaw.tipoDoc,
            tipoDocumentoDinamico: getDocumentoDinamico(pacienteRaw.fechaNacimiento || '', pacienteRaw.tipoDoc),
            genero: pacienteRaw.sexo
        })

    } catch (error) {
        console.error("GET PACIENTE ERROR:", error)
        return NextResponse.json(
            { error: "Error al buscar paciente" },
            { status: 500 }
        )
    }
}
