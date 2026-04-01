import { Integrante, ROLES } from './types';
import { FAMILY_TYPES } from './constants';
import { PARENTESCO } from '@/lib/constants'; // Reusamos el de la app general

/**
 * Función inmutable que "auto-enlaza" integrantes vacíos basándose en sus roles
 * por ej: relaciona Jefe y Conyuge, asigna padres a los Hijos (ROLES.HIJO).
 * Devuelve un nuevo Array y un flag booleano si hubo cambios.
 */
export function autoLinkRelatives(integrantes: Integrante[]): { newList: Integrante[], changed: boolean } {
  const newList = JSON.parse(JSON.stringify(integrantes)) as Integrante[];
  let changed = false;

  const jefeIdx = newList.findIndex(i => String(i.parentesco) === ROLES.JEFE);
  const conyugeIdx = newList.findIndex(i => String(i.parentesco) === ROLES.CONYUGE);

  // Enlazar Parejas: Jefe y Conyuge
  if (jefeIdx >= 0 && conyugeIdx >= 0) {
    if (!newList[jefeIdx].parejaId && !newList[conyugeIdx].parejaId) {
      newList[jefeIdx].parejaId = String(conyugeIdx);
      newList[conyugeIdx].parejaId = String(jefeIdx);
      changed = true;
    }
  }

  // Enlazar hijos (ROLES.HIJO = '3') al Jefe y Conyuge
  newList.forEach((int, idx) => {
    if (String(int.parentesco) === ROLES.HIJO) {
      if (jefeIdx >= 0 && !int.padreId && !int.madreId) {
        const isJefeHombre = newList[jefeIdx].sexo === 'HOMBRE';
        if (isJefeHombre) {
          int.padreId = String(jefeIdx);
          if (conyugeIdx >= 0) int.madreId = String(conyugeIdx);
        } else {
          int.madreId = String(jefeIdx);
          if (conyugeIdx >= 0) int.padreId = String(conyugeIdx);
        }
        changed = true;
      }
    }
  });

  return { newList, changed };
}

/**
 * Infiere el tipo tipológico de familia basándose en las relaciones registradas.
 */
export function inferFamilyType(integrantes: Integrante[]): { code: string; reason: string } {
  const numInt = integrantes.length;
  // ParejaId real, no vacía (ignorar "N/A"):
  const numParejas = integrantes.filter(i => i.parejaId && i.parejaId.trim() !== '').length; 
  const numHijos = integrantes.filter(i => String(i.parentesco) === ROLES.HIJO || i.padreId || i.madreId).length;
  const numPadresSuegrosNietos = integrantes.filter(i => 
    ([ROLES.PADRE_MADRE, ROLES.SUEGRO, ROLES.NIETO, ROLES.HERMANO, ROLES.OTRO_FAMILIAR] as string[]).includes(String(i.parentesco))
  ).length;

  let code: string = FAMILY_TYPES.OTRA;
  let reason = '';

  if (numInt === 1) {
    code = FAMILY_TYPES.UNIPERSONAL;
    reason = 'Hay un solo integrante registrado en el hogar.';
  } else if (numPadresSuegrosNietos > 0) {
    code = FAMILY_TYPES.EXTENSA;
    reason = 'Hay miembros de generaciones adicionales (abuelos, suegros, tíos, etc).';
  } else if (numParejas >= 2 && numHijos > 0) {
    // Si hay pareja homoparental registrada formalmente, es HOMOPARENTAL
    const parejaIds = integrantes.filter(i => i.parejaId).map(i => i.sexo);
    // Verificación basica si la pareja central es del mismo sexo
    if (parejaIds.length >= 2 && parejaIds[0] === parejaIds[1]) {
       code = FAMILY_TYPES.HOMOPARENTAL;
       reason = 'Pareja del mismo sexo con hijos.';
    } else {
       code = FAMILY_TYPES.NUCLEAR; 
       reason = 'Existen vínculos formales de pareja y registro paterno/materno de hijos.';
    }
  } else if (numParejas >= 2 && numHijos === 0) {
    code = FAMILY_TYPES.NUCLEAR;
    reason = 'Pareja sin hijos convivientes directos.';
  } else if (numParejas === 0 && numHijos > 0) {
    code = FAMILY_TYPES.MONOPARENTAL;
    reason = 'Hay hijos pero no se registran parejas dentro del hogar actual.';
  } else {
    code = FAMILY_TYPES.OTRA;
    reason = 'La estructura no coincide con los parámetros básicos (quizás hermanos solos u otros).';
  }

  return { code, reason };
}

/**
 * Normaliza y prepara datos de integrantes para visualización.
 */
export function prepareIntegrantesForMap(rawIntegrantes: any[]): Integrante[] {
  return rawIntegrantes.map((int: any, idx: number) => {
    // Evitar alterar la data original que va a RHF
    const cleanInt = { ...int } as Integrante;
    
    cleanInt._id = `P${idx}`;
    const pNombre = cleanInt.primerNombre || cleanInt.nombres || '';
    const pApellido = cleanInt.primerApellido || cleanInt.apellidos || '';
    cleanInt._fullName = `${pNombre} ${pApellido}`.trim() || `P${idx}`;

    if (cleanInt.fechaNacimiento) {
      const bDate = new Date(cleanInt.fechaNacimiento);
      cleanInt._age = new Date().getFullYear() - bDate.getFullYear();
    } else {
       cleanInt._age = '';
    }
    
    return cleanInt;
  });
}
