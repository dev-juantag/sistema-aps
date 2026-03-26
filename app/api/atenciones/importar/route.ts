import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { csv } = await req.json()
    if (!csv) return NextResponse.json({ error: "No CSV provided" }, { status: 400 })

    const lines = csv.split(/\r?\n/).filter((l: string) => l.trim() !== '')
    // Skip headers
    const dataLines = lines.slice(1)
    
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i]
        const columns = line.split(';')
        
        if (columns.length < 4) continue

        const [pacienteDoc, programaId, profesionalDoc, nota, fechaStr, territorioId] = columns.map((c: string) => c.trim())

        try {
            // Find Paciente
            const paciente = await prisma.paciente.findUnique({ where: { documento: pacienteDoc } })
            if (!paciente) {
                errors.push(`Línea ${i + 2}: Paciente con documento ${pacienteDoc} no existe`)
                continue
            }

            // Find Profesional (User by doc)
            const profesional = await prisma.user.findUnique({ where: { documento: profesionalDoc } })
            if (!profesional) {
                errors.push(`Línea ${i + 2}: Profesional con documento ${profesionalDoc} no existe`)
                continue
            }
            
            // Check Programa
            const programa = await prisma.programa.findUnique({ where: { id: programaId } })
            if (!programa) {
                errors.push(`Línea ${i + 2}: Programa ${programaId} no existe`)
                continue
            }

            const fechaAtencion = fechaStr ? new Date(fechaStr) : new Date()

            await prisma.atencion.create({
                data: {
                    pacienteId: paciente.id,
                    programaId: programa.id,
                    profesionalId: profesional.id,
                    nota: nota || "Importado automáticamente",
                    createdAt: fechaAtencion,
                    territorioId: territorioId || profesional.territorioId || null
                }
            })
            imported++
        } catch (e: any) {
            errors.push(`Línea ${i + 2}: ${e.message}`)
        }
    }

    return NextResponse.json({ imported, errors: errors.length > 0 ? errors.slice(0, 5) : null })
  } catch (error: any) {
    console.error("IMPORT ATENCIONES ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
