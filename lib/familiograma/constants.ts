import { ROLES, TipoPareja, TipoHijo, EstadoVital } from './types';

export const FAMILY_TYPES = {
  NUCLEAR: '1',
  MONOPARENTAL: '2',
  EXTENSA: '3',
  COMPUESTA: '4',
  UNIPERSONAL: '5',
  HOMOPARENTAL: '6',
  OTRA: '7'
} as const;

export const FAMILY_TYPE_NAMES: Record<string, string> = {
  [FAMILY_TYPES.NUCLEAR]: 'Nuclear',
  [FAMILY_TYPES.MONOPARENTAL]: 'Monoparental',
  [FAMILY_TYPES.EXTENSA]: 'Extensa',
  [FAMILY_TYPES.COMPUESTA]: 'Compuesta',
  [FAMILY_TYPES.UNIPERSONAL]: 'Unipersonal',
  [FAMILY_TYPES.HOMOPARENTAL]: 'Homoparental',
  [FAMILY_TYPES.OTRA]: 'Otra'
};

export const COLOR_HOMBRE = { bg: '#bfdbfe', border: '#2563eb', text: '#1e3a8a' };
export const COLOR_MUJER = { bg: '#fbcfe8', border: '#db2777', text: '#831843' };
export const COLOR_OTRO = { bg: '#e6e6fa', border: '#8a2be2', text: '#4b0082' };
