import { NextResponse } from 'next/server'
import { PrismaClient } from '@repo/database'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const numHogar = searchParams.get('numHogar')
    const numFamilia = searchParams.get('numFamilia')
    const codFicha = searchParams.get('codFicha')

    const existingHogar = numHogar ? await prisma.fichaHogar.findFirst({ where: { numHogar } }) : null
    const existingFamilia = numFamilia ? await prisma.fichaHogar.findFirst({ where: { numFamilia } }) : null
    const existingFicha = codFicha ? await prisma.fichaHogar.findFirst({ where: { codFicha } }) : null

    if (existingHogar) return NextResponse.json({ exists: true, field: 'numHogar', message: `El código de hogar ${numHogar} ya está registrado en otra ficha.` })
    if (existingFamilia) return NextResponse.json({ exists: true, field: 'numFamilia', message: `El código de familia ${numFamilia} ya está registrado en otra ficha.` })
    if (existingFicha) return NextResponse.json({ exists: true, field: 'codFicha', message: `El código de ficha ${codFicha} ya está registrado.` })

    return NextResponse.json({ exists: false })
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
