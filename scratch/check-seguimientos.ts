import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const totalSeguimientos = await prisma.seguimientoFamiliar.count()
  console.log('Total seguimientos in DB:', totalSeguimientos)
  
  const sample = await prisma.seguimientoFamiliar.findMany({
    take: 5,
    include: {
      ficha: true
    }
  })
  console.log('Sample seguimientos:', JSON.stringify(sample, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
