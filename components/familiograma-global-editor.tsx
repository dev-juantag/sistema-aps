"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { calcularEdad, PARENTESCO } from '@/lib/constants';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BaseEdge,
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Save, Edit, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

// --- CUSTOM NODE ---
const GenogramNode = ({ data }: { data: any }) => {
  const type = data.tipo || 'NORMAL';
  const sexo = data.sexo?.toUpperCase() || 'INDEFINIDO';
  const isHombre = sexo === 'HOMBRE' || sexo === 'MASCULINO';
  const isMujer = sexo === 'MUJER' || sexo === 'FEMENINO';

  const isAbortoEsp = type === 'ABORTO_ESPONTANEO';
  const isAbortoInd = type === 'ABORTO_INDUCIDO';
  const isEmbarazo = type === 'EMBARAZO';
  const isAdopcion = data.adopcion;

  let baseShape: any = {
    width: 60, height: 60,
    background: '#ffffff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    border: data.isJefe ? '4px double #000' : '2px solid #000',
    color: '#000',
    boxSizing: 'border-box'
  };

  if (isHombre) {
    baseShape.borderRadius = '0px';
  } else if (isMujer) {
    baseShape.borderRadius = '50%';
  } else {
    // Indefinido - Diamante
    baseShape.transform = 'rotate(45deg)';
  }

  if (isEmbarazo) {
    baseShape = {
      width: 0, height: 0,
      borderLeft: '30px solid transparent',
      borderRight: '30px solid transparent',
      borderBottom: '50px solid #000',
      borderTop: 'none',
      background: 'transparent',
      position: 'relative',
    };
  }

  if (isAbortoEsp || isAbortoInd) {
    baseShape.width = 25; baseShape.height = 25;
    baseShape.borderRadius = '50%';
    baseShape.background = '#000';
    baseShape.border = 'none';
  }

  const ageText = data.edad !== '' ? data.edad : '?';

  return (
    <div className="relative flex flex-col items-center justify-start pb-16">
      {isAdopcion && <span className="absolute -left-6 text-4xl text-gray-700 font-light">(</span>}
      
      <div style={baseShape}>
        <Handle type="target" position={Position.Top} id="parent-in" style={{ background: '#555', zIndex: 10, width: 10, height: 10 }} />
        <Handle type="target" position={Position.Left} id="partner-in" style={{ background: '#ec4899', zIndex: 10, width: 10, height: 10 }} />
        <Handle type="source" position={Position.Right} id="partner-out" style={{ background: '#ec4899', zIndex: 10, width: 10, height: 10 }} />
        <Handle type="source" position={Position.Bottom} id="parent-out" style={{ background: '#555', zIndex: 10, width: 10, height: 10 }} />
        {data.fallecido && (
           <>
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%) rotate(45deg)', width: '140%', height: '2px', background: '#000' }} />
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%) rotate(-45deg)', width: '140%', height: '2px', background: '#000' }} />
           </>
        )}
        
        {isAbortoInd && (
           <>
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%) rotate(45deg)', width: '120%', height: '2px', background: '#000' }} />
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%) rotate(-45deg)', width: '120%', height: '2px', background: '#000' }} />
           </>
        )}

        {!isEmbarazo && !isAbortoEsp && !isAbortoInd && (
          <div style={{ transform: (!isHombre && !isMujer) ? 'rotate(-45deg)' : 'none', textAlign: 'center', opacity: data.fallecido ? 0.3 : 1 }}>
            <span className="font-bold text-lg">{ageText}</span>
          </div>
        )}
      </div>

      {isAdopcion && <span className="absolute right-[-20px] top-[10px] text-4xl text-gray-700 font-light">)</span>}

      <div className="absolute top-[65px] w-40 text-center text-[10px] font-bold text-slate-800" style={{ pointerEvents: 'none' }}>
         <span className="block uppercase">{data.nombre?.split(' ')[0]}</span>
         {data.parentescoLabel && <span className="block text-blue-600 text-[10px] mt-0.5">{data.parentescoLabel}</span>}
         {(isEmbarazo || isAbortoEsp || isAbortoInd) && <span className="block text-gray-500 mt-1 uppercase">{data.nombre}</span>}
      </div>
    </div>
  );
};

// --- CUSTOM EDGE ---
const GenogramEdge = ({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd,
}: any) => {
  const [straightPath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const [stepPath] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  const type = data?.relType || 'normal';
  const isHorizontalLine = ['matrimonio', 'union_libre', 'divorcio', 'separacion', 'conflicto', 'consanguineo'].includes(type);
  
  const pathToUse = isHorizontalLine ? straightPath : stepPath;

  let strokeDasharray = '0';
  if (type === 'union_libre' || type === 'distante') strokeDasharray = '5 5';
  
  let strokeWidth = 2;
  if (type === 'cerrada') strokeWidth = 4;

  const color = '#444';

  return (
    <>
      {type === 'conflicto' ? (
        <path
          id={id}
          className="react-flow__edge-path"
          d={`M ${sourceX} ${sourceY} Q ${(sourceX + targetX)/2} ${sourceY - 30} ${targetX} ${targetY}`}
          strokeWidth={2}
          fill="none"
          stroke="#eab308"
          strokeDasharray="4 4"
        />
      ) : (
        <BaseEdge id={id} path={pathToUse} style={{ strokeWidth, strokeDasharray, stroke: color }} markerEnd={markerEnd} />
      )}
      
      {type === 'consanguineo' && (
         <BaseEdge id={`${id}-2`} path={pathToUse} style={{ strokeWidth, stroke: color, transform: 'translateY(5px)' }}/>
      )}

      {(type === 'divorcio' || type === 'separacion') && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 16,
              fontWeight: 900,
              pointerEvents: 'none',
              color: '#d97706',
              background: 'rgba(255,255,255,0.7)',
              padding: '2px'
            }}
          >
            {type === 'divorcio' ? '//' : '/'}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};


export function FamiliogramaGlobalEditor({ fichaId, onClose }: { fichaId: string, onClose: () => void }) {
  const memoNodeTypes = useMemo(() => ({ integrante: GenogramNode }), []);
  const memoEdgeTypes = useMemo(() => ({ genogramEdge: GenogramEdge }), []);

  const { data: ficha, error } = useSWR(`/api/identificaciones/${fichaId}`, fetcher);
  const { mutate } = useSWRConfig();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRelType, setSelectedRelType] = useState('matrimonio');
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!ficha || initialized) return;

    let loadedNodes: Node[] = [];
    let loadedEdges: Edge[] = [];
    let hasLoadedPositions = false;

    if (ficha.familiogramaCodigo) {
      if (ficha.familiogramaCodigo.startsWith('{')) {
        try {
          const parsed = JSON.parse(ficha.familiogramaCodigo);
          if (parsed.nodes && parsed.edges) {
            loadedNodes = parsed.nodes;
            loadedEdges = parsed.edges;
            hasLoadedPositions = true;
          }
        } catch (e) {
          console.error("No es JSON válido, regenerando...");
        }
      }
    }

    const pacientes = ficha.pacientes || [];
    const getLabel = (arr: any[], id: any) => arr.find((x:any) => String(x.id) === String(id))?.label || id || 'N/A';

    if (hasLoadedPositions) {
       loadedNodes = loadedNodes.map((node: Node) => {
         const pac = pacientes.find((p: any) => p.id === node.id);
         if (pac) {
           return {
             ...node,
             deletable: false,
             data: {
               ...node.data,
               nombre: pac.nombres,
               edad: pac.fechaNacimiento ? calcularEdad(pac.fechaNacimiento) : '',
               fechaNacimiento: pac.fechaNacimiento,
               sexo: pac.sexo,
               fallecido: pac.estadoVital === 'FALLECIDO',
               parentescoLabel: getLabel(PARENTESCO, pac.parentesco)
             }
           }
         }
         return node;
       });
    } else {
       loadedNodes = (ficha.pacientes || []).map((pac: any, i: number) => {
          let defaultY = 150;
          let defaultX = (i % 4) * 160 + 50;
          if (String(pac.parentesco) === '1' || String(pac.parentesco) === '2') defaultY = 150; 
          if (String(pac.parentesco) === '3') defaultY = 320; 
          if (['4','5'].includes(String(pac.parentesco))) defaultY = 50; 
    
          return {
            id: pac.id || `temp-${Date.now()}-${i}`,
            type: 'integrante',
            deletable: false,
            data: {
              nombre: pac.nombres,
              edad: pac.fechaNacimiento ? calcularEdad(pac.fechaNacimiento) : '',
              fechaNacimiento: pac.fechaNacimiento,
              sexo: pac.sexo,
              fallecido: pac.estadoVital === 'FALLECIDO',
              isJefe: String(pac.parentesco) === '1',
              parentescoLabel: getLabel(PARENTESCO, pac.parentesco),
              tipo: 'NORMAL'
            },
            position: { x: defaultX, y: defaultY },
          };
       });

       const pacientes = ficha.pacientes || [];
       pacientes.forEach((pac: any) => {
         if (pac.padreId && pacientes.find((p:any) => p.id === pac.padreId)) {
           loadedEdges.push({
              id: `e-hijo-p-${pac.padreId}-${pac.id}`,
              source: pac.padreId,
              target: pac.id,
              sourceHandle: 'parent-out',
              targetHandle: 'parent-in',
              type: 'genogramEdge',
              data: { relType: 'descendente' }
           });
         }
         if (pac.madreId && pacientes.find((p:any) => p.id === pac.madreId)) {
           loadedEdges.push({
              id: `e-hijo-m-${pac.madreId}-${pac.id}`,
              source: pac.madreId,
              target: pac.id,
              sourceHandle: 'parent-out',
              targetHandle: 'parent-in',
              type: 'genogramEdge',
              data: { relType: 'descendente' }
           });
         }
       });
    }

    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setInitialized(true);
  }, [ficha, initialized, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const isPartner = params.sourceHandle === 'partner-out';
      const rType = isPartner ? selectedRelType : 'descendente';
      
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        type: 'genogramEdge',
        data: { relType: rType },
        markerEnd: rType === 'dominante' ? { type: MarkerType.ArrowClosed, color: '#444' } : undefined
      };
      
      setEdges((eds) => addEdgesToState(newEdge, eds));
    },
    [setEdges, selectedRelType],
  );

  const addEdgesToState = (newEdge: any, eds: any) => {
     return addEdge(newEdge, eds);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const jsonState = JSON.stringify({ nodes, edges });
      const token = localStorage.getItem("salud-pereira-token") || "";
      
      const res = await fetch(`/api/identificaciones/${fichaId}/familiograma`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ familiogramaData: jsonState })
      });
      
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Familiograma clínico guardado correctamente.');
      
      // Actualizamos toda la caché de las tablas y consultas que involucren identificaciones
      mutate(
        (key) => typeof key === 'string' && key.includes('/api/identificaciones'),
        undefined,
        { revalidate: true }
      );
      
      onClose();
    } catch(err) {
      toast.error('Ocurrió un error al guardar el familiograma. Verifica tu sesión.');
    } finally {
      setSaving(false);
    }
  };

  const relayout = () => { setInitialized(false); }

  const addElement = (tipo: string, sexo: string, defaultName: string) => {
    let positionX = 150;
    let positionY = 150;
    
    // Generar siempre cerca del jefe de la familia para no perder de vista el elemento
    if (nodes.length > 0) {
       const referenceNode = nodes.find(n => n.data?.isJefe) || nodes[0];
       positionX = referenceNode.position.x + (Math.random() * 80 - 40); 
       positionY = referenceNode.position.y - 120; // Arriba del todo para verse facil
    }

    const newNode = {
      id: `manual-${Date.now()}`,
      type: 'integrante',
      data: {
        nombre: defaultName,
        tipo,
        sexo,
        edad: '',
      },
      position: { x: positionX, y: positionY }
    }
    setNodes(nds => [...nds, newNode])
    // Auto edit node
    setTimeout(() => setEditingNode(newNode), 100);
  }

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('manual-') || node.id.startsWith('temp-')) {
       setEditingNode(node);
    } else {
       toast.info("Los datos médicos o demográficos (como la edad) de las personas encuestadas se deben actualizar en el expediente para preservar integridad.", { duration: 4000 });
    }
  }, []);

  if (error) return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center text-white">Error al cargar ficha.</div>;
  if (!ficha) return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center text-white">Cargando lienzo avanzado...</div>;

  return (
    <div className="fixed inset-0 z-[60] bg-card flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="h-16 border-b flex flex-col md:flex-row md:items-center justify-between px-6 bg-[#f8fafc] shadow-sm">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Edit className="w-5 h-5 text-blue-600"/> Genograma Estandarizado (Ficha: {ficha.id.slice(0,6)}...)
           </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedRelType} 
            onChange={e => setSelectedRelType(e.target.value)}
            className="text-xs border rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 bg-white"
            title="Tipo de vínculo al conectar lateralmente"
          >
            <option value="matrimonio">Matrimonio ───</option>
            <option value="consanguineo">Mat. Consanguíneo ══</option>
            <option value="union_libre">Unión Libre - - -</option>
            <option value="separacion">Separación ─/─</option>
            <option value="divorcio">Divorcio ─//─</option>
            <option value="conflicto">Conflicto ^^^</option>
            <option value="cerrada">Rel. Cerrada ━━━━</option>
            <option value="distante">Rel. Distante ···</option>
            <option value="dominante">Rel. Dominante →</option>
          </select>

          <button onClick={relayout} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 transition">
            <RefreshCw className="w-3.5 h-3.5"/> Re-Inciar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 transition disabled:opacity-50 shadow-sm">
            <Save className="w-4 h-4"/> {saving ? 'Guardando...' : 'Guardar Lienzo'}
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full transition ml-2">
            <X className="w-6 h-6"/>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full relative bg-[#fafafa]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={memoNodeTypes}
          edgeTypes={memoEdgeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-right"
        >
          <Background color="#ddd" gap={20} />
          <Controls />
          <MiniMap zoomable pannable nodeColor={(n: any) => n.data.sexo === 'MUJER' ? '#fbcfe8' : n.data.sexo === 'HOMBRE' ? '#bfdbfe' : '#e2e8f0'} />
        </ReactFlow>

        {/* Toolbar Lateral Flotante */}
        <div className="absolute top-4 left-4 w-56 bg-white/95 p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs z-10">
            <h4 className="font-black border-b border-slate-100 pb-2 mb-3 text-slate-700 uppercase tracking-widest text-[10px]">Añadir Figuras Manuales</h4>
            <div className="flex flex-col gap-2">
              <button onClick={() => addElement('NORMAL', 'HOMBRE', 'Nuevo H')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600">
                 <div className="w-3 h-3 bg-[#bfdbfe] rounded-[2px]" /> Masculino / Hombre
              </button>
              <button onClick={() => addElement('NORMAL', 'MUJER', 'Nueva M')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600">
                 <div className="w-3 h-3 bg-[#fbcfe8] rounded-full" /> Femenino / Mujer
              </button>
              <button onClick={() => addElement('NORMAL', 'INDEFINIDO', 'Nuevo')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600">
                 <div className="w-3 h-3 bg-[#e2e8f0] rotate-45" /> Indefinido
              </button>
              
              <button onClick={() => addElement('EMBARAZO', '', 'Embarazo')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600 mt-2 border-t pt-2">
                 <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[#fda4af]" /> Embarazo
              </button>
              <button onClick={() => addElement('ABORTO_ESPONTANEO', '', 'A. Espontáneo')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600">
                 <div className="w-3 h-3 bg-[#0f766e] rounded-full" /> Aborto Espontáneo
              </button>
              <button onClick={() => addElement('ABORTO_INDUCIDO', '', 'A. Inducido')} className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded text-left font-bold text-slate-600">
                 <div className="w-3 h-3 border-2 border-[#22d3ee] flex items-center justify-center text-[10px] font-black rounded-full" >X</div> Aborto Inducido
              </button>
            </div>
            
            <p className="mt-4 pt-3 border-t text-[9px] text-slate-400 font-medium">Instrucciones:<br/>- Selecciona arriba el "Tipo de Vínculo" antes de hacer conexiones laterales.<br/>- Haz doble clic sobre una figura para editar sus atributos.<br/>- Conexiones verticales son ascendencia/descendencia.</p>
        </div>
      </div>

      {/* MODAL DE EDICIÓN FLOTANTE */}
      {editingNode && (
        <div className="absolute inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Editar Figura / Integrante</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">Nombre o Etiqueta</label>
              <input type="text" id="edit-nombre" defaultValue={editingNode.data.nombre as string} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Escriba aquí..." />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">Edad (Opcional)</label>
              <input type="text" id="edit-edad" defaultValue={(editingNode.data.edad === undefined || editingNode.data.edad === null ? '' : editingNode.data.edad) as string} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-medium" placeholder="Ej: 45 o 3 meses" />
            </div>

            <div className="mb-6 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <input type="checkbox" id="edit-fallecido" defaultChecked={editingNode.data.fallecido as boolean} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="edit-fallecido" className="text-sm font-bold text-slate-700 cursor-pointer">¿Se encuentra fallecido(a)?</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditingNode(null)} className="px-4 py-2 hover:bg-slate-100 rounded-md text-sm font-bold text-slate-600 transition">Cancelar</button>
              <button 
                onClick={() => {
                  const newName = (document.getElementById('edit-nombre') as HTMLInputElement).value;
                  const newEdad = (document.getElementById('edit-edad') as HTMLInputElement).value;
                  const isFallecido = (document.getElementById('edit-fallecido') as HTMLInputElement).checked;

                  setNodes(nds => nds.map(n => n.id === editingNode.id ? { 
                    ...n, 
                    data: { ...n.data, nombre: newName, edad: newEdad, fallecido: isFallecido } 
                  } : n));
                  setEditingNode(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-bold shadow-sm transition"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
