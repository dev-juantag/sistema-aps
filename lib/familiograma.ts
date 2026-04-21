import { PARENTESCO, calcularEdad } from "@/lib/constants";

export function generateFamiliogramaAutoLayout(integrantes: any[]): string {
  if (!integrantes || integrantes.length === 0) return '';
  
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Custom helpers
  const getLabel = (id: any) => PARENTESCO.find((p: any) => String(p.id) === String(id))?.label || ('Rol ' + id);

  // Auto-completar relaciones explícitas faltantes (para no perder vinculaciones en importaciones viejas)
  const jefe = integrantes.find(i => String(i.parentesco) === '1') || integrantes[0];
  const conyugesJefe = integrantes.filter(i => String(i.parentesco) === '2');

  integrantes.forEach((int, idx) => {
    if (!int.padreId && !int.madreId && !int.parejaId) {
      const p = String(int.parentesco);
      if (p === '2') int.parejaId = String(integrantes.indexOf(jefe)); // Conyuge -> Jefe
      if (p === '3') { // Hijo -> Padres
        if (jefe.sexo === 'HOMBRE') int.padreId = String(integrantes.indexOf(jefe));
        else int.madreId = String(integrantes.indexOf(jefe));
        
        if (conyugesJefe.length > 0) {
           if (conyugesJefe[0].sexo === 'HOMBRE') int.padreId = String(integrantes.indexOf(conyugesJefe[0]));
           else int.madreId = String(integrantes.indexOf(conyugesJefe[0]));
        }
      }
      if (p === '4') { // Padre -> Jefe
        if (int.sexo === 'HOMBRE') jefe.padreId = String(idx);
        else jefe.madreId = String(idx);
      }
    }
  });

  // Calculate coordinates by grouping generations
  const generations: Record<string, any[]> = {
    parents: [],
    ego: [],
    children: [],
    others: []
  };

  integrantes.forEach(int => {
    const p = String(int.parentesco);
    if (p === '4' || p === '5') generations.parents.push(int);
    else if (p === '1' || p === '2' || p === '7') generations.ego.push(int);
    else if (p === '3' || p === '6') generations.children.push(int);
    else generations.others.push(int);
  });

  let xPos = 0;
  
  const placeGeneration = (group: any[], startY: number) => {
     let currentX = 0;
     group.forEach((int) => {
        int._x = currentX;
        int._y = startY;
        int._nodeId = `node-${int.id || Math.random().toString(36).substring(7)}`;
        currentX += 160; // Horizontal spacing between nodes
     });
     // Center the generation roughly
     const offsetStr = currentX / 2;
     group.forEach(int => int._x -= offsetStr);
  };

  placeGeneration(generations.parents, 100);
  placeGeneration(generations.ego, 300);
  placeGeneration(generations.children, 500);
  placeGeneration(generations.others, 700);

  // Generar Nodos React Flow
  integrantes.forEach(int => {
    const bDate = int.fechaNacimiento ? new Date(int.fechaNacimiento) : null;
    const age = bDate ? (new Date().getFullYear() - bDate.getFullYear()).toString() : '?';

    let estadoV = 'VIVO';
    if (int.estadoVital === 'FALLECIDO' || int.estadoVital === 'ABORTO') {
       estadoV = int.estadoVital === 'ABORTO' ? 'ABORTO_ESP' : 'FALLECIDO'; // Aproximación
    }

    nodes.push({
      id: int._nodeId,
      type: 'integrante',
      position: { x: int._x + 400, y: int._y }, // Offset total
      data: {
        nombre: (int.primerNombre || int.nombres || '') + ' ' + (int.primerApellido || int.apellidos || ''),
        edad: int.fechaNacimiento ? calcularEdad(int.fechaNacimiento).toString() : '?',
        fechaNacimiento: int.fechaNacimiento,
        sexo: int.sexo || 'INDEFINIDO',
        fallecido: int.estadoVital === 'FALLECIDO',
        gestante: int.gestante || 'NA',
        enfermedadAguda: int.enfermedadAguda === true || int.enfermedadAguda === 'true',
        estadoVital: estadoV,
        parentescoLabel: int === jefe ? '⭐ Jefe de hogar' : getLabel(int.parentesco)
      }
    });
  });

  // Generar Aristas React Flow
  let edgeCounter = 0;
  integrantes.forEach((int, idx) => {
    // Relación de pareja
    if (int.parejaId && int.parejaId !== '') {
      const pIdx = parseInt(int.parejaId);
      if (!isNaN(pIdx) && integrantes[pIdx]) {
        // Para no dibujar doble (A->B y B->A), garantizamos un orden
        if (idx < pIdx) {
          edges.push({
            id: `edge-rel-${edgeCounter++}`,
            source: int._nodeId,
            target: integrantes[pIdx]._nodeId,
            type: 'genogramEdge',
            sourceHandle: 'partner-out',
            targetHandle: 'partner-in',
            data: { relType: int.tipoPareja === 'MATRIMONIO' ? 'matrimonio' : 'union_libre' }
          });
        }
      }
    }

    // Relaciones Padre/Madre a Hijo
    const pNode = int.padreId !== '' && !isNaN(parseInt(int.padreId)) ? integrantes[parseInt(int.padreId)] : null;
    const mNode = int.madreId !== '' && !isNaN(parseInt(int.madreId)) ? integrantes[parseInt(int.madreId)] : null;

    if (pNode) {
       edges.push({
         id: `edge-child-${edgeCounter++}-p`,
         source: pNode._nodeId,
         target: int._nodeId,
         type: 'genogramEdge',
         sourceHandle: 'parent-out',
         targetHandle: 'parent-in',
         data: { relType: 'normal' }
       });
    }
    if (mNode) {
       edges.push({
         id: `edge-child-${edgeCounter++}-m`,
         source: mNode._nodeId,
         target: int._nodeId,
         type: 'genogramEdge',
         sourceHandle: 'parent-out',
         targetHandle: 'parent-in',
         data: { relType: 'normal' }
       });
    }
  });

  return JSON.stringify({ nodes, edges });
}
