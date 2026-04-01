import { useCallback, useState, useEffect } from 'react';
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
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Integrante } from '@/lib/familiograma/types';

const IntegranteNode = ({ data }: { data: any }) => {
  const isHombre = data.sexo === 'HOMBRE';
  const isMujer = data.sexo === 'MUJER';
  const bg = isHombre ? '#bfdbfe' : isMujer ? '#fbcfe8' : '#e6e6fa';
  const border = isHombre ? '#2563eb' : isMujer ? '#db2777' : '#8a2be2';
  const radius = isMujer ? '50%' : isHombre ? '4px' : '12px';
  
  return (
    <div
      style={{
        background: bg,
        borderColor: border,
        borderWidth: data.isJefe ? '4px' : '2px',
        borderStyle: data.fallecido ? 'dashed' : 'solid',
        borderRadius: radius,
        padding: '10px',
        width: 130,
        height: isMujer ? 130 : 'auto',
        minHeight: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        fontSize: '11px',
        textAlign: 'center',
        position: 'relative',
        color: '#111827'
      }}
    >
      {/* Target for parents (Top) */}
      <Handle type="target" position={Position.Top} id="parent-in" style={{ background: '#555', width: 8, height: 8 }} />
      
      {/* Handles for partners (Left/Right) */}
      <Handle type="target" position={Position.Left} id="partner-in" style={{ background: '#ec4899', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} id="partner-out" style={{ background: '#ec4899', width: 8, height: 8 }} />

      <strong className="block truncate w-full" style={{ fontSize: '13px' }}>#{data.index + 1} {data.nombre}</strong>
      {data.edad !== '' && <span className="text-gray-600 block">({data.edad} años)</span>}
      <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-widest">{data.rolLabel}</span>
      {data.isJefe && <span className="absolute -top-3 -right-3 text-xl">⭐</span>}
      {data.fallecido && <span className="absolute -bottom-3 text-gray-700 font-bold block bg-white px-1 border rounded text-[9px]">FALLECIDO</span>}

      {/* Source for children (Bottom) */}
      <Handle type="source" position={Position.Bottom} id="parent-out" style={{ background: '#555', width: 8, height: 8 }} />
    </div>
  );
};

const nodeTypes = {
  integrante: IntegranteNode,
};

export default function FamiliogramaCanvas({
  integrantes,
  onUpdateIntegrantes
}: {
  integrantes: Integrante[];
  onUpdateIntegrantes: (fn: (prev: Integrante[]) => Integrante[]) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [initialized, setInitialized] = useState(false);

  // Mapear el array de integrantes inicial a Nodos de React Flow
  useEffect(() => {
    if (initialized) return;
    
    const initialNodes: Node[] = integrantes.map((int, i) => {
      const isHombre = int.sexo === 'HOMBRE';
      // Layout basico heurístico: Jefe y pareja en el centro (y=100), hijos abajo (y=250), abuelos arriba (y=0)
      let defaultY = 150;
      let defaultX = (i % 4) * 160 + 50;
      
      if (String(int.parentesco) === '1' || String(int.parentesco) === '2') defaultY = 150; // Ego/Pareja
      if (String(int.parentesco) === '3') defaultY = 320; // Hijos
      if (['4','5'].includes(String(int.parentesco))) defaultY = 50; // Padres/Suegros

      return {
        id: String(i),
        type: 'integrante',
        data: {
          index: i,
          nombre: int.primerNombre || int.nombres || `P${i+1}`,
          edad: int.fechaNacimiento ? new Date().getFullYear() - new Date(int.fechaNacimiento).getFullYear() : '',
          sexo: int.sexo,
          fallecido: int.estadoVital === 'FALLECIDO',
          isJefe: String(int.parentesco) === '1',
          rolLabel: int.parentesco
        },
        position: { x: defaultX, y: defaultY },
      };
    });

    const initialEdges: Edge[] = [];
    integrantes.forEach((int, i) => {
      // Parejas
      if (int.parejaId && int.parejaId !== '') {
        const pairId = int.parejaId;
        // Solo para no duplicar el dibujo bidireccional
        if (parseInt(pairId) > i) {
           initialEdges.push({
             id: `e-pareja-${i}-${pairId}`,
             source: String(i),
             target: String(pairId),
             sourceHandle: 'partner-out',
             targetHandle: 'partner-in',
             type: 'step',
             style: { stroke: '#ec4899', strokeWidth: 3 },
             animated: true,
             label: 'Unión/Pareja'
           });
        }
      }
      
      // Hijos
      if (int.padreId && int.padreId !== '') {
        initialEdges.push({
          id: `e-hijo-p-${int.padreId}-${i}`,
          source: String(int.padreId),
          target: String(i),
          sourceHandle: 'parent-out',
          targetHandle: 'parent-in',
          type: 'smoothstep',
          style: { stroke: '#4b5563', strokeWidth: 2 }
        });
      }
      if (int.madreId && int.madreId !== '') {
        initialEdges.push({
          id: `e-hijo-m-${int.madreId}-${i}`,
          source: String(int.madreId),
          target: String(i),
          sourceHandle: 'parent-out',
          targetHandle: 'parent-in',
          type: 'smoothstep',
          style: { stroke: '#4b5563', strokeWidth: 2 }
        });
      }
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
    setInitialized(true);
  }, [integrantes, initialized, setNodes, setEdges]);

  // Al crear una nueva conexión (Edge)
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceId = parseInt(params.source || '');
      const targetId = parseInt(params.target || '');

      if (isNaN(sourceId) || isNaN(targetId)) return;

      onUpdateIntegrantes((prev) => {
        const copy = JSON.parse(JSON.stringify(prev)) as Integrante[];
        const isPartner = params.sourceHandle === 'partner-out' || params.targetHandle === 'partner-in';

        if (isPartner) {
          copy[sourceId].parejaId = String(targetId);
          copy[targetId].parejaId = String(sourceId);
        } else {
          // Parent connection
          const parentSex = copy[sourceId].sexo;
          if (parentSex === 'HOMBRE') {
            copy[targetId].padreId = String(sourceId);
          } else if (parentSex === 'MUJER') {
            copy[targetId].madreId = String(sourceId);
          } else {
            copy[targetId].padreId = String(sourceId); // Fallback
          }
        }
        return copy;
      });

      const isPartner = params.sourceHandle === 'partner-out';
      
      setEdges((eds) => addEdge({
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        type: isPartner ? 'step' : 'smoothstep',
        style: isPartner ? { stroke: '#ec4899', strokeWidth: 3 } : { stroke: '#4b5563', strokeWidth: 2 },
        animated: isPartner,
        label: isPartner ? 'Unión/Pareja' : ''
      } as Edge, eds));
    },
    [setEdges, onUpdateIntegrantes],
  );

  // Al eliminar una conexión (Edge)
  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    onUpdateIntegrantes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev)) as Integrante[];
      deleted.forEach((edge) => {
        const sourceId = parseInt(edge.source);
        const targetId = parseInt(edge.target);
        
        if (edge.sourceHandle === 'partner-out') {
           // Borrar union
           if (copy[sourceId].parejaId === String(targetId)) copy[sourceId].parejaId = '';
           if (copy[targetId].parejaId === String(sourceId)) copy[targetId].parejaId = '';
        } else {
           // Borrar padre/madre
           if (copy[targetId].padreId === String(sourceId)) copy[targetId].padreId = '';
           if (copy[targetId].madreId === String(sourceId)) copy[targetId].madreId = '';
        }
      });
      return copy;
    });
  }, [onUpdateIntegrantes]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-right"
        >
          <Background color="#ccc" gap={20} />
          <Controls />
          <MiniMap zoomable pannable 
            nodeColor={(n: any) => n.data.sexo === 'MUJER' ? '#fbcfe8' : n.data.sexo === 'HOMBRE' ? '#bfdbfe' : '#e6e6fa'} 
          />
        </ReactFlow>
        <div className="absolute top-4 left-4 right-4 bg-white/95 p-3 rounded-lg shadow border text-xs text-gray-700 pointer-events-none z-10">
           <b>Modo Interactivo (BETA):</b> Arrastra los nodos libremente. Une conectores rosas (<span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>) para declarar <b>Parejas</b> y grises (<span className="w-2 h-2 rounded-full bg-gray-500 inline-block"></span>) de arriba hacia abajo para <b>Hijos</b>. Para eliminar, toca la línea y pulsa "Borrar" (Supr).
        </div>
    </div>
  );
}
