import { NextResponse } from 'next/server'
import { PrismaClient } from '@repo/database'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const territorio = searchParams.get('territorio')
    const cedula = searchParams.get('cedula')
    const estado = searchParams.get('estado')

    if (!territorio) {
      return NextResponse.json({ error: 'Territorio requerido' }, { status: 400 })
    }

    const whereObj: any = { territorio }
    if (estado) whereObj.estadoVisita = estado
    if (cedula) {
      whereObj.OR = [
        { numDocEncuestador: { contains: cedula } },
        { encuestador: { documento: { contains: cedula } } },
        { direccion: { contains: cedula, mode: 'insensitive' } },
        { integrantes: { some: { numDoc: { contains: cedula } } } },
        { codFicha: { contains: cedula, mode: 'insensitive' } } // Bonus: Allow searching by code
      ]
    }

    const fichas = await prisma.fichaHogar.findMany({
      where: whereObj,
      include: {
        integrantes: true,
        encuestador: {
          select: { nombre: true, apellidos: true, documento: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ fichas })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
