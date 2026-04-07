import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const atenciones = await prisma.atencion.findMany({
      where: { territorioId: null },
      include: { profesional: true }
    })
    
    console.log(`Setting territory for ${atenciones.length} existing atenciones...`)
    
    for (const a of atenciones) {
      if (a.profesional?.territorioId) {
        await prisma.atencion.update({
          where: { id: a.id },
          data: { territorioId: a.profesional.territorioId }
        })
        console.log(`Updated atencion ${a.id} with territory ${a.profesional.territorioId}`)
      } else {
        console.log(`Atencion ${a.id} has no professional territory to inherit. Skipping.`)
      }
    }
    
    console.log('Migration complete.')

  } catch (err: any) {
    console.error('MIGRATION ERROR:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
