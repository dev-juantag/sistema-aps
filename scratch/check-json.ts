import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const fichas = await prisma.fichaHogar.findMany({ take: 50 })
  const fichasWithJson = fichas.filter(f => f.otrosJson !== null)
  console.log('Ficha samples:', JSON.stringify(fichasWithJson.slice(0, 1).map(f => f.otrosJson), null, 2))

  const pacientes = await prisma.paciente.findMany({ take: 50 })
  const pacientesWithJson = pacientes.filter(p => p.otrosJson !== null)
  console.log('Paciente samples:', JSON.stringify(pacientesWithJson.slice(0, 1).map(p => p.otrosJson), null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
