import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const numEBS = searchParams.get('numEBS')

    if (!numEBS) {
      return NextResponse.json({ success: false, error: 'numEBS requerido' }, { status: 400 })
    }

    // El prefijo puede ser EBS01 o T01 (dependiendo del formato de tu sistema), pero numEBS es EBS0X
    // Extraemos el código numérico para generar el formato T0X
    const numStr = numEBS.replace(/\D/g, '') // Quita letras, deja "05" o "08"
    const prefixT = `T${numStr}`

    // Buscar el último registro de este territorio validando que existan matrioshkas
    const lastFicha = await prisma.fichaHogar.findFirst({
      where: { 
        numEBS,
        numHogar: { not: null }
      },
      orderBy: { 
        fechaDiligenciamiento: 'desc' 
      }
    })

    if (!lastFicha || !lastFicha.numHogar) {
      return NextResponse.json({
        success: true,
        data: {
          numHogar: `${prefixT}H0001`,
          numFamilia: `${prefixT}H0001F0001`,
          codFicha: `${prefixT}H0001F0001CF001`
        }
      })
    }

    // Extraemos digitos usando regex del último registro
    const numHMatch = lastFicha.numHogar.match(/H(\d+)$/)
    const numFMatch = lastFicha.numFamilia?.match(/F(\d+)$/)
    const codFMatch = lastFicha.codFicha?.match(/CF(\d+)$/)

    const hogarIdx = numHMatch ? parseInt(numHMatch[1]) + 1 : 1
    const famIdx = numFMatch ? parseInt(numFMatch[1]) + 1 : 1
    const fichaIdx = codFMatch ? parseInt(codFMatch[1]) + 1 : 1

    const nextHogar = `${prefixT}H${String(hogarIdx).padStart(4, '0')}`
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
