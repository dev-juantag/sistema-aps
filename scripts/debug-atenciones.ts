import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const atencionesCount = await prisma.atencion.count()
    console.log('Total Atenciones in DB:', atencionesCount)
    
    const atenciones = await prisma.atencion.findMany({
      include: {
        profesional: true,
        territorio: true
      },
      take: 20
    })
    console.log('--- ATENCIONES (First 20) ---')
    atenciones.forEach(a => {
      console.log(`ID: ${a.id}, Doc: ${a.pacienteId}, Terr: ${a.territorioId || 'NULL'}, ProfTerr: ${a.profesional?.territorioId || 'NULL'}`)
    })
    
    const facturadores = await prisma.user.findMany({
      where: { rol: 'FACTURADOR' },
      include: { territoriosAsignados: true }
    })
    console.log('--- FACTURADORES ---')
    facturadores.forEach(f => {
      console.log(`ID: ${f.id}, Nombre: ${f.nombre}, Territorios: ${f.territoriosAsignados.map(t => t.codigo).join(', ')}`)
    })

  } catch (err: any) {
    console.error('DEBUG ERROR:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
