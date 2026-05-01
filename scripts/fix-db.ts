import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding barrerasAccesoOtro to Paciente...')
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Paciente" ADD COLUMN "barrerasAccesoOtro" TEXT;`)
    console.log('Added barrerasAccesoOtro successfully.')
  } catch (e: any) {
    console.log('Error or already exists:', e.message)
  }

  console.log('Adding otrosJson to Paciente...')
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Paciente" ADD COLUMN "otrosJson" JSONB;`)
    console.log('Added otrosJson to Paciente successfully.')
  } catch (e: any) {
    console.log('Error or already exists:', e.message)
  }

  console.log('Adding otrosJson to FichaHogar...')
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "FichaHogar" ADD COLUMN "otrosJson" JSONB;`)
    console.log('Added otrosJson to FichaHogar successfully.')
  } catch (e: any) {
    console.log('Error or already exists:', e.message)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
