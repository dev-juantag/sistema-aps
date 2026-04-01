import { Integrante } from './types';
import { PARENTESCO } from '@/lib/constants';

/**
 * Función pura que devuelve un string en formato de gráfo Mermaid.
 */
export function generateMermaidCode(integrantesList: Integrante[]): string {
  if (!integrantesList || integrantesList.length === 0) return '';
  
  // Clone to avoid mutations
  const integrantes = JSON.parse(JSON.stringify(integrantesList));

  let m = 'graph TD;\n';
  
  // Clases
  m += 'classDef hombre fill:#bfdbfe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:4,ry:4;\n';
  m += 'classDef mujer fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold,rx:30,ry:30;\n';
  m += 'classDef otro fill:#e6e6fa,stroke:#8a2be2,stroke-width:2px,color:#4b0082,font-weight:bold,rx:10,ry:10;\n';
  m += 'classDef index fill:#fef08a,stroke:#ca8a04,stroke-width:3px,color:#854d0e,font-weight:bold;\n';
  m += 'classDef fallecido stroke-dasharray: 5 5,color:#6b7280;\n';
  m += 'classDef union fill:#1e293b,stroke:#1e293b,stroke-width:1px,color:transparent;\n';
  
  const getLabel = (id: any) => PARENTESCO.find((p: any) => String(p.id) === String(id))?.label || ('Rol '+id);

  const jefe = integrantes.find((i: Integrante) => String(i.parentesco) === '1') || integrantes[0];

  integrantes.forEach((int: any, idx: number) => {
    int._id = `P${idx}`;
    const pNombre = int.primerNombre || int.nombres || '';
    const pApellido = int.primerApellido || int.apellidos || '';
    int._fullName = `${pNombre} ${pApellido}`.trim();

    if (int.fechaNacimiento) {
      const bDate = new Date(int.fechaNacimiento);
      int._age = new Date().getFullYear() - bDate.getFullYear();
    } else {
      int._age = '';
    }
  });

  // Nodos
  integrantes.forEach((int: any) => {
    let name = int._fullName || "Desconocido";
    let extra = '';
    
    if (int._age !== '') extra += `<br/>(${int._age} años)`;
    if (int.gestante === 'SI') extra += `<br/>🤰 Gestante`;
    if (int.enfermedadAguda === true || int.enfermedadAguda === 'true') extra += `<br/>🩺 Enf. Aguda`;
    
    if (int.estadoVital === 'FALLECIDO') extra = `<br/>✟ FALLECIDO` + extra;
    if (int.estadoVital === 'ABORTO') extra = `<br/>🔻 ABORTO` + extra;
    
    if (int === jefe) extra += `<br/><b>⭐ EGO</b>`;
    else extra += `<br/><i>${getLabel(int.parentesco)}</i>`;

    m += `${int._id}["${name}${extra}"];\n`;

    const s = String(int.sexo).toUpperCase();
    let cls = s === 'MUJER' ? 'mujer' : (s === 'HOMBRE' ? 'hombre' : 'otro');

    m += `class ${int._id} ${cls};\n`;
    
    if (int.estadoVital === 'FALLECIDO') m += `class ${int._id} fallecido;\n`;
    if (int === jefe) m += `style ${int._id} stroke:#ca8a04,stroke-width:4px;\n`; 
  });

  // Parejas
  const unionesDibujadas = new Set<string>();
  let unionCounter = 0;

  integrantes.forEach((int: any, idx: number) => {
    if (int.parejaId && int.parejaId !== '') {
      const pIdx = parseInt(int.parejaId);
      if (!isNaN(pIdx) && integrantes[pIdx]) {
        const uId = [idx, pIdx].sort().join('_');
        if (!unionesDibujadas.has(uId)) {
          unionesDibujadas.add(uId);
          unionCounter++;
          const nodeUnion = `U${unionCounter}`;
          
          let estado = int.tipoPareja || 'UNION_LIBRE';
          m += `${nodeUnion}(" ");\n`;
          m += `style ${nodeUnion} width:2px,height:2px,min-height:2px,padding:0px;\n`;
          m += `class ${nodeUnion} union;\n`;
          
          let lineType = estado === 'MATRIMONIO' ? '===' : '-.-';
          if (estado === 'SEPARADO' || estado === 'DIVORCIADO') lineType = '-. x .-'; 
          
          m += `${int._id} ${lineType} ${nodeUnion};\n`;
          m += `${integrantes[pIdx]._id} ${lineType} ${nodeUnion};\n`;
          
          int._unionNode = nodeUnion;
          integrantes[pIdx]._unionNode = nodeUnion;
        }
      }
    }
  });

  // Parentales (Hijos)
  integrantes.forEach((int: any) => {
    let pNode = int.padreId && int.padreId !== '' && !isNaN(parseInt(int.padreId)) ? integrantes[parseInt(int.padreId)] : null;
    let mNode = int.madreId && int.madreId !== '' && !isNaN(parseInt(int.madreId)) ? integrantes[parseInt(int.madreId)] : null;
    let descenderDe = null;

    if (pNode && mNode && pNode._unionNode && pNode._unionNode === mNode._unionNode) {
      descenderDe = pNode._unionNode;
    } else if (pNode && mNode) {
       // Union forzada si no estaban listados como pareja explícitamente pero hay un hijo en comun
      unionCounter++;
      const nodeUnion = `U${unionCounter}`;
      m += `${nodeUnion}(" ");\n`;
      m += `style ${nodeUnion} width:2px,height:2px,min-height:2px,padding:0px;\n`;
      m += `class ${nodeUnion} union;\n`;
      m += `${pNode._id} -.- ${nodeUnion};\n`;
      m += `${mNode._id} -.- ${nodeUnion};\n`;
      descenderDe = nodeUnion;
      pNode._unionNode = nodeUnion;
      mNode._unionNode = nodeUnion;
    } else if (pNode) {
      descenderDe = pNode._id;
    } else if (mNode) {
      descenderDe = mNode._id;
    }

    if (descenderDe) {
      let edgeT = int.tipoHijo === 'ADOPTADO' ? '-. "Adopt." .->' : 
                  int.tipoHijo === 'HIJASTRO' ? '-. "Crianza" .->' : '-->';
      m += `${descenderDe} ${edgeT} ${int._id};\n`;
    } else {
       // Relaciones de hermanos y otros si no hay padres pero si jefe
      if (int !== jefe && (!int.parejaId || int.parejaId === '')) {
        const pRol = String(int.parentesco);
        if (pRol === '7') { 
           m += `${jefe._id} -. "Hno/a" .- ${int._id};\n`;
        } else if (pRol === '8') {
           m += `${jefe._id} -. "Familiar" .- ${int._id};\n`;
        } else if (pRol === '6') {
           m += `${jefe._id} -. "Nieto(a)" .-> ${int._id};\n`;
        }
      }
    }
  });

  return m;
}
