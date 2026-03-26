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
