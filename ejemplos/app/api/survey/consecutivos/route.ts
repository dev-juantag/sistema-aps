import { NextResponse } from 'next/server'
import { PrismaClient } from '@repo/database'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const numEBS = searchParams.get('numEBS')

    if (!numEBS) {
      return NextResponse.json({ success: false, error: 'numEBS requerido' }, { status: 400 })
    }

    // Buscar el último registro de este territorio (numEBS) validando que existan matrioshkas
    const lastFicha = await prisma.fichaHogar.findFirst({
      where: { 
        numEBS,
        numHogar: { not: null }
      },
      orderBy: { 
        fechaDiligenciamiento: 'desc' 
      }
    } as any) as any

    if (!lastFicha || !lastFicha.numHogar) {
      return NextResponse.json({
        success: true,
        data: {
          numHogar: `${numEBS}H0001`,
          numFamilia: `${numEBS}H0001F0001`,
          codFicha: `${numEBS}H0001F0001CF001`
        }
      })
    }

    // Patrón encontrado: H0001, F0001, CF001
    // Extraemos digitos
    const numHMatch = lastFicha.numHogar.match(/H(\d+)$/)
    const numFMatch = lastFicha.numFamilia?.match(/F(\d+)$/)
    const codFMatch = lastFicha.codFicha?.match(/CF(\d+)$/)

    const hogarIdx = numHMatch ? parseInt(numHMatch[1]) + 1 : 1
    const famIdx = numFMatch ? parseInt(numFMatch[1]) + 1 : 1
    const fichaIdx = codFMatch ? parseInt(codFMatch[1]) + 1 : 1

    const nextHogar = `${numEBS}H${String(hogarIdx).padStart(4, '0')}`
    const nextFamilia = `${nextHogar}F${String(famIdx).padStart(4, '0')}`
    const nextFicha = `${nextFamilia}CF${String(fichaIdx).padStart(3, '0')}`

    return NextResponse.json({
      success: true,
      data: {
        numHogar: nextHogar,
        numFamilia: nextFamilia,
        codFicha: nextFicha
      }
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
