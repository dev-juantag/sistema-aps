export type Sexo = 'HOMBRE' | 'MUJER' | 'INTERSEXUAL' | string;

export type EstadoVital = 'VIVO' | 'FALLECIDO' | 'ABORTO';

export type TipoPareja = 'UNION_LIBRE' | 'MATRIMONIO' | 'SEPARADO' | 'DIVORCIADO' | 'VIUDO' | string;

export type TipoHijo = 'BIOLOGICO' | 'ADOPTADO' | 'HIJASTRO' | string;

export const ROLES = {
  JEFE: '1',
  CONYUGE: '2',
  HIJO: '3',
  PADRE_MADRE: '4',
  SUEGRO: '5',
  NIETO: '6',
  HERMANO: '7',
  OTRO_FAMILIAR: '8',
  OTRO_NO_FAMILIAR: '9',
  APORTANTE: '10'
} as const;

export type RolParentesco = typeof ROLES[keyof typeof ROLES] | string;

export interface Integrante {
  // DB & Form Fields
  primerNombre?: string;
  nombres?: string;
  primerApellido?: string;
  apellidos?: string;
  sexo: Sexo;
  estadoVital: EstadoVital;
  fechaNacimiento?: string;
  parentesco: RolParentesco;
  
  // Relaciones explícitas en el formulario
  padreId?: string;
  madreId?: string;
  parejaId?: string;
  tipoPareja?: TipoPareja;
  tipoHijo?: TipoHijo;

  // Campos adicionales que el sistema de gráficas usa internamente 
  // para facilitar la lectura, agregados por normalize()
  _id?: string;
  _fullName?: string;
  _age?: string | number;
  _unionNode?: string; // id del nodo puente en mermaid para las parejas
  gestante?: 'SI' | 'NO' | 'NA';
  enfermedadAguda?: boolean | string;
}
