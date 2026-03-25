import { PARENTESCO } from "@/lib/constants";

export function generateFamiliogramaMermaid(integrantes: any[]): string {
  if (!integrantes || integrantes.length === 0) return '';
  let m = 'graph TD;\n';
  
  // Custom styles para familiograma PRO
  m += 'classDef hombre fill:#bfdbfe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold,rx:4,ry:4;\n';
  m += 'classDef mujer fill:#fbcfe8,stroke:#db2777,stroke-width:2px,color:#831843,font-weight:bold,rx:30,ry:30;\n';
  m += 'classDef index fill:#fef08a,stroke:#ca8a04,stroke-width:3px,color:#854d0e,font-weight:bold;\n';
  m += 'classDef fallecido stroke-dasharray: 5 5,color:#6b7280;\n';
  // Nodo de union minúsculo que parece un punto en la línea
  m += 'classDef union fill:#1e293b,stroke:#1e293b,stroke-width:1px,color:transparent;\n';
  
  // Helper
  const getLabel = (id: any) => PARENTESCO.find((p: any) => String(p.id) === String(id))?.label || ('Rol '+id);

  // 1. Preparar Nodos y fallback de relaciones
  const jefe = integrantes.find(i => String(i.parentesco) === '1') || integrantes[0];
  const conyugesJefe = integrantes.filter(i => String(i.parentesco) === '2');

  integrantes.forEach((int, idx) => {
    int._id = `P${idx}`;
    int._age = '';
    
    // Mapeo para campos que vienen de la BD (nombres -> primerNombre, etc)
    const pNombre = int.primerNombre || int.nombres || '';
    const pApellido = int.primerApellido || int.apellidos || '';
    int._fullName = `${pNombre} ${pApellido}`.trim();

    if (int.fechaNacimiento) {
      const bDate = new Date(int.fechaNacimiento);
      int._age = new Date().getFullYear() - bDate.getFullYear();
    }
    
    // Auto-completar relaciones explícitas si no las tienen (soporte a registros antiguos o inyectados)
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

  // 2. Dibujar Nodos (Personas)
  integrantes.forEach(int => {
    let name = int._fullName;
    if (!name) name = "Desconocido";
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
    let cls = s === 'MUJER' ? 'mujer' : 'hombre';

    m += `class ${int._id} ${cls};\n`;
    
    if (int.estadoVital === 'FALLECIDO') m += `class ${int._id} fallecido;\n`;
    if (int === jefe) m += `style ${int._id} stroke:#ca8a04,stroke-width:4px;\n`; 
  });

  // 3. Dibujar Relaciones (Aristas)
  const unionesDibujadas = new Set<string>();
  let unionCounter = 0;

  integrantes.forEach((int, idx) => {
    // --- RELACIONES DE PAREJA ---
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
          
          let lineType = estado === 'MATRIMONIO' ? '---' : '-.-';
          if (estado === 'SEPARADO' || estado === 'DIVORCIADO') lineType = '==='; 
          
          m += `${int._id} ${lineType} ${nodeUnion};\n`;
          m += `${integrantes[pIdx]._id} ${lineType} ${nodeUnion};\n`;
          
          int._unionNode = nodeUnion;
          integrantes[pIdx]._unionNode = nodeUnion;
        }
      }
    }
  });

  // --- RELACIONES PARENTALES ---
  integrantes.forEach((int, idx) => {
    let pNode = int.padreId !== '' && !isNaN(parseInt(int.padreId)) ? integrantes[parseInt(int.padreId)] : null;
    let mNode = int.madreId !== '' && !isNaN(parseInt(int.madreId)) ? integrantes[parseInt(int.madreId)] : null;
    let descenderDe = null;

    if (pNode && mNode && pNode._unionNode && pNode._unionNode === mNode._unionNode) {
      descenderDe = pNode._unionNode;
    } else if (pNode && mNode) {
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
      if (int !== jefe && !int.parejaId) {
        const pRol = String(int.parentesco);
        if (pRol === '7') { 
           if (jefe.padreId || jefe.madreId) {
             const jefPadre = jefe.padreId ? integrantes[parseInt(jefe.padreId)] : null;
             if (jefPadre && jefPadre._unionNode) m += `${jefPadre._unionNode} -. "Hno/a" .-> ${int._id};\n`;
             else if (jefPadre) m += `${jefPadre._id} -. "Hno/a" .-> ${int._id};\n`;
             else {
               const jefMadre = jefe.madreId ? integrantes[parseInt(jefe.madreId)] : null;
               if (jefMadre) m += `${jefMadre._id} -. "Hno/a" .-> ${int._id};\n`;
             }
           } else {
             m += `${jefe._id} -. "Hno/a" .- ${int._id};\n`;
           }
        } else if (pRol === '8') m += `${jefe._id} -. "Familiar" .- ${int._id};\n`;
        else if (pRol === '6') m += `${jefe._id} -. "Nieto(a)" .-> ${int._id};\n`;
        else if (pRol === '4' || pRol === '5') m += `${int._id} -.-> ${jefe._id};\n`;
        else if (pRol === '10' || pRol === '9') m += `${jefe._id} ~~~ ${int._id};\n`;
      }
    }
  });

  return m;
}
