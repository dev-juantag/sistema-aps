import * as z from 'zod'

const noPipes = (val: string) => !val.includes('|')

export const integranteSchema = z.object({
  id: z.string().optional(),
  // IV. DATOS BÁSICOS (Integrante)
  primerNombre: z.string()
    .min(1, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras')
    .transform(v => v.trim().toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase())),
  segundoNombre: z.string().optional().nullable()
    .transform(v => v ? v.trim().toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()) : v),
  primerApellido: z.string()
    .min(1, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras')
    .transform(v => v.trim().toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase())),
  segundoApellido: z.string()
    .min(1, 'Requerido')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras')
    .transform(v => v.trim().toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase())),
  tipoDoc: z.string().min(1, 'Requerido'),
  numDoc: z.string().min(6, 'Mínimo 6 dígitos').regex(/^\d+$/, 'Solo números'),
  fechaNacimiento: z.string().min(1, 'Requerido').refine(date => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(date + 'T00:00:00') <= today;
  }, { message: 'La fecha no puede ser futura' }).refine(date => {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 100);
    return new Date(date + 'T00:00:00') > minDate;
  }, { message: 'La edad no puede ser mayor a 99 años' }),
  sexo: z.string().min(1, 'Requerido'),
  gestante: z.string().optional().nullable(),
  mesesGestacion: z.union([z.string(), z.number()]).optional().nullable().transform(v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v)),
  telefono: z.string()
    .length(10, 'Debe tener exactamente 10 dígitos')
    .regex(/^3\d{9}$/, 'Debe empezar por 3 y ser numérico'),
  estadoCivil: z.string().optional().nullable(),
  parentesco: z.string().min(1, 'Requerido'),
  
  // Vínculos Familiares Avanzados (Familiograma)
  padreId: z.string().optional().nullable(),
  madreId: z.string().optional().nullable(),
  parejaId: z.string().optional().nullable(),
  tipoPareja: z.string().optional().nullable(), // MATRIMONIO, UNION_LIBRE, VIUDO, etc.
  tipoHijo: z.string().optional().nullable(), // BIOLOGICO, ADOPTADO, HIJASTRO
  estadoVital: z.string().optional().nullable().default('VIVO'), // VIVO, FALLECIDO, ABORTO

  // Educación y Diferencial
  nivelEducativo: z.string().optional().nullable(),

  ocupacion: z.string().optional().nullable(),
  regimen: z.string().optional().nullable(),
  eapb: z.string().optional().nullable(),
  etnia: z.string().optional().nullable(),
  puebloIndigena: z.string().optional().nullable(),
  grupoPoblacional: z.array(z.coerce.number()).default([]),
  barrerasAcceso: z.array(z.coerce.number()).default([]),
  discapacidades: z.array(z.coerce.number()).default([]),

  // V. EVALUACIÓN SALUD (Step 5)
  antecedentes: z.record(z.boolean()).optional().default({}),
  antecTransmisibles: z.record(z.boolean()).optional().default({}),
  peso: z.coerce.number().min(0.1, 'Requerido'),
  talla: z.coerce.number().min(0.1, 'Requerido'),
  perimetroBraquial: z.union([z.string(), z.number()]).optional().nullable().transform(v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v)),
  diagNutricional: z.string().optional().nullable(),
  practicaDeportiva: z.boolean().optional().default(false),
  lactanciaMaterna: z.boolean().optional().default(false),
  lactanciaMeses: z.union([z.string(), z.number()]).optional().nullable().transform(v => (v === '' || v == null || Number.isNaN(Number(v))) ? null : Number(v)),
  esquemaAtenciones: z.boolean().optional().default(false),
  esquemaVacunacion: z.boolean().optional().default(false),
  intervencionesPendientes: z.array(z.string()).optional().default([]),
  enfermedadAguda: z.boolean().optional().default(false),
  recibeAtencionMedica: z.boolean().optional().default(false),
  remisiones: z.array(z.string()).optional().default([]),
})

export const wizardSchema = z.object({
  // STEP 1: Ubicación
  estadoVisita: z.string().default('1'),
  fechaDiligenciamiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(date => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return new Date(date + 'T00:00:00') <= today;
  }, { message: 'No puede ser futura' }),
  departamento: z.string().min(1, 'Requerido').transform(v => v.toUpperCase()),
  municipio: z.string().min(1, 'Requerido').transform(v => v.toUpperCase()),
  centroPoblado: z.string().optional().nullable().transform(v => v?.toUpperCase() || ''),
  descripcionUbicacion: z.string().optional().nullable(),
  direccion: z.string().min(1, 'Requerido').transform(v => v.toUpperCase()),
  latitud: z.string().optional().nullable(),
  longitud: z.string().optional().nullable(),
  uzpe: z.string().optional().nullable(),
  numEBS: z.string().min(1, 'Requerido'),
  prestadorPrimario: z.string().min(1, 'Requerido'),
  tipoDocEncuestador: z.string().min(1, 'Requerido'),
  numDocEncuestador: z.string().min(6, 'Mínimo 6 dígitos').regex(/^\d+$/, 'Solo números'),
  perfilEncuestador: z.string().min(1, 'Requerido'),
  
  // Matrioshka Identificadores Adicionales
  numHogar: z.string().min(1, 'Requerido'),
  numFamilia: z.string().min(1, 'Requerido'),
  codFicha: z.string().min(1, 'Requerido'),
  observacionesRechazo: z.string().optional().nullable(),
  
  // STEP 2: Vivienda
  tipoVivienda: z.string().min(1, 'Requerido'),
  tipoViviendaDesc: z.string().optional().nullable(),
  matParedes: z.string().min(1, 'Requerido'),
  matPisos: z.string().min(1, 'Requerido'),
  matTechos: z.string().min(1, 'Requerido'),
  numHogares: z.string().min(1, 'Requerido'),
  numDormitorios: z.string().min(1, 'Requerido'),
  estratoSocial: z.string().min(1, 'Requerido'),
  hacinamiento: z.boolean().optional().default(false),
  fuenteAgua: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),
  dispExcretas: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),
  aguasResiduales: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),
  dispResiduos: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),
  riesgoAccidente: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),
  fuenteEnergia: z.string().min(1, 'Requerido'),
  presenciaVectores: z.string().min(1, 'Requerido'),
  animales: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()])
    .transform(v => Array.isArray(v) ? v : [])
    .refine(val => val.length > 0, 'Requerido'),
  cantAnimales: z.string().optional().nullable(),
  vacunacionMascotas: z.boolean().optional().default(false),

  // STEP 3: Familia
  tipoFamilia: z.string().min(1, 'Requerido'),
  numIntegrantes: z.string().min(1, 'Requerido'),
  apgar: z.string().optional().nullable(),
  apgarRespuestas: z.array(z.number()).optional(),
  ecomapa: z.string().optional().nullable(),
  cuidadorPrincipal: z.boolean().optional().default(false),
  zarit: z.string().optional().nullable(),
  vulnerabilidades: z.union([z.boolean(), z.array(z.string()), z.null(), z.undefined()]).transform(v => Array.isArray(v) ? v : []),

  // STEP 4 & 5: Integrantes
  integrantes: z.array(integranteSchema).default([]),
  
  // STEP 6: Familiograma
  familiogramaCodigo: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.estadoVisita === '1' && (!data.integrantes || data.integrantes.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debe haber al menos un integrante',
      path: ['integrantes'],
    })
  }
})

export type WizardData = z.infer<typeof wizardSchema>
export type IntegranteData = z.infer<typeof integranteSchema>
