import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (typeof body.puedeActualizarse !== 'boolean') {
      return NextResponse.json({ error: 'Valor puedeActualizarse inválido' }, { status: 400 })
    }

    const fichaActual = await (prisma.fichaHogar as any).findUnique({
      where: { id },
      select: { updatedAt: true }
    })

    if (!fichaActual) {
      return NextResponse.json({ error: 'Ficha no encontrada' }, { status: 404 })
    }

    // Regla de 30 días: solo validar al habilitar (puedeActualizarse = true)
    if (body.puedeActualizarse === true) {
      const hoy = new Date()
      const ultimaActualizacion = new Date(fichaActual.updatedAt)
      const diffTime = Math.abs(hoy.getTime() - ultimaActualizacion.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays < 30) {
        return NextResponse.json({ 
          error: `Esta ficha se ha actualizado recientemente. No puedes actualizarla en este momento. Deben transcurrir 30 días (han pasado ${diffDays} días).` 
        }, { status: 403 })
      }
    }

    const updated = await (prisma.fichaHogar as any).update({
      where: { id },
      data: { puedeActualizarse: body.puedeActualizarse }
    })

    return NextResponse.json({ success: true, puedeActualizarse: updated.puedeActualizarse })
  } catch (error: any) {
    console.error('PATCH FICHA ERROR:', error)
    return NextResponse.json({ error: 'Error actualizando autorización' }, { status: 500 })
  }
}
