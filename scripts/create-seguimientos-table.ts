import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating SeguimientoFamiliar table...')
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SeguimientoFamiliar" (
          "id" TEXT NOT NULL,
          "fichaId" TEXT NOT NULL,
          "observacion" TEXT NOT NULL,
          "acuerdosCumplidos" BOOLEAN NOT NULL DEFAULT false,
          "consecutivo" INTEGER NOT NULL,
          "responsableId" TEXT NOT NULL,
          "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "SeguimientoFamiliar_pkey" PRIMARY KEY ("id")
      );
    `)
    console.log('Table SeguimientoFamiliar created or already exists.')

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SeguimientoFamiliar_fichaId_fkey') THEN
          ALTER TABLE "SeguimientoFamiliar" ADD CONSTRAINT "SeguimientoFamiliar_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "FichaHogar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    console.log('Foreign key fichaId added.')

    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SeguimientoFamiliar_responsableId_fkey') THEN
          ALTER TABLE "SeguimientoFamiliar" ADD CONSTRAINT "SeguimientoFamiliar_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    console.log('Foreign key responsableId added.')

  } catch (e: any) {
    console.log('Error creating table:', e.message)
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
