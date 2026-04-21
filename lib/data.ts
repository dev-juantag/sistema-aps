export type Role = "admin" | "profesional" | "superadmin" | "auxiliar" | "facturador" | "ADMIN" | "PROFESIONAL" | "SUPERADMIN" | "AUXILIAR" | "FACTURADOR"

export interface User {
  id: string
  nombre: string
  apellidos: string
  documento: string
  email: string
  password: string
  rol: Role
  programaId: string
  activo: boolean
}

export interface Programa {
  id: string
  nombre: string
  meta: number
}

export interface Paciente {
  id: string
  nombreCompleto: string
  tipoDocumento: string
  documento: string
  genero: string
  telefono: string
  direccion: string
  fechaNacimiento: string
  regimen?: string
  eapb?: string
}

export interface Atencion {
  id: string
  programaId: string
  pacienteId: string
  pacienteNombre: string
  pacienteDocumento: string
  pacienteTipoDoc: string
  pacienteGenero: string
  pacienteTelefono: string
  pacienteDireccion: string
  pacienteFechaNac: string
  pacienteRegimen?: string
  pacienteEapb?: string
  notaValoracion: string
  profesionalId: string
  profesionalNombre: string
  fecha: string
  createdAtISO?: string
  estadoFacturacion?: string
  observacionFacturacion?: string
}

export const PROGRAMAS: Programa[] = [
  { id: "psicologia", nombre: "Psicologia", meta: 120 },
  { id: "medicina-general", nombre: "Medicina general", meta: 200 },
  { id: "trabajo-social", nombre: "Trabajo social", meta: 100 },
  { id: "odontologia", nombre: "Odontologia", meta: 150 },
  { id: "enfermeria", nombre: "Enfermeria", meta: 180 },
  { id: "fisioterapia", nombre: "Fisioterapia", meta: 90 },
  { id: "nutricion", nombre: "Nutricion", meta: 80 },
  { id: "terapia-respiratoria", nombre: "Terapia respiratoria", meta: 70 },
  { id: "desarrollo-familiar", nombre: "Desarrollo familiar", meta: 60 },
]

export const TIPOS_DOCUMENTO = [
  "Cedula",
  "Cedula extranjeria",
  "Tarjeta de identidad",
  "Registro civil",
  "PPT",
  "Otro",
]

export const GENEROS = ["Masculino", "Femenino", "Otro"]

// NOTA: Se ha eliminado el "Database en memoria" que se usaba de prueba.
// Ahora todo fluye mediante Prisma hacia PostgreSQL.
