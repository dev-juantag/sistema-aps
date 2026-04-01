import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { autoLinkRelatives, inferFamilyType } from './logic';
import { generateMermaidCode } from './mermaid';
import { Integrante } from './types';

export function useFamiliogramaManager() {
  const { watch, setValue } = useFormContext();
  const integrantes = (watch('integrantes') || []) as Integrante[];
  const currentCode = watch('familiogramaCodigo') || '';
  const declaredType = watch('tipoFamilia');

  const [mode, setMode] = useState<'visualizar' | 'codigo' | 'interactivo'>('visualizar');
  const [internalCode, setInternalCode] = useState(currentCode);

  // Inicialización (Auto-link) solo si no hay código y hay integrantes
  useEffect(() => {
    if (!currentCode && integrantes.length > 0) {
      const { newList, changed } = autoLinkRelatives(integrantes);
      if (changed) {
        setValue('integrantes', newList, { shouldDirty: true });
        const code = generateMermaidCode(newList);
        setValue('familiogramaCodigo', code);
        setInternalCode(code);
        return; // Salir para no ejecutar el segundo bloque en el mismo ciclo
      }
    }
  }, []); // Run basically on mount/init. It's safer if it only runs when currentCode is empty.

  // Sincronización continua de Selectores hacia código Mermaid (cuando no está en editor manual)
  useEffect(() => {
    if (mode === 'visualizar' || mode === 'interactivo') {
      const genCode = generateMermaidCode(integrantes);
      if (genCode !== currentCode) {
         setValue('familiogramaCodigo', genCode);
         setInternalCode(genCode);
      }
    }
  }, [integrantes, mode, currentCode, setValue]);

  const handleUpdateCode = useCallback((val: string) => {
    setInternalCode(val);
    setValue('familiogramaCodigo', val);
  }, [setValue]);

  // Inteligencia de inferencia (memoizada para rendimiento)
  const validation = useMemo(() => {
    const { code: inferredType, reason } = inferFamilyType(integrantes);
    const mismatch = declaredType && inferredType !== declaredType && declaredType !== '7' && inferredType !== '7';

    return { inferredType, reason, mismatch };
  }, [integrantes, declaredType]);

  return {
    integrantes,
    internalCode,
    declaredType,
    mode,
    setMode,
    handleUpdateCode,
    validation,
    setValue // Para pasarlo a nodos interactivos
  };
}
