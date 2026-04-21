"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { toSvg } from 'html-to-image';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  getStraightPath,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { calcularEdad } from '@/lib/constants';


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
      {/* Handlers now inside baseShape */}
      
      {isAdopcion && <span className="absolute -left-6 text-4xl text-gray-700 font-light">(</span>}
      
      <div style={baseShape}>
        <Handle type="target" position={Position.Top} id="parent-in" style={{ opacity: 0 }} />
        <Handle type="target" position={Position.Left} id="partner-in" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Right} id="partner-out" style={{ opacity: 0 }} />
        <Handle type="source" position={Position.Bottom} id="parent-out" style={{ opacity: 0 }} />
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



function PrintHandler({ setPrintImage }: { setPrintImage: (url: string) => void }) {

  const { fitView } = useReactFlow();
  
  useEffect(() => {
    // Retraso para darle tiempo de calcular los nodos ocultos al inicio
    const timeout = setTimeout(() => {
      fitView({ padding: 0.35, duration: 0 });
      
      const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;
      if (reactFlowElement) {
        toSvg(reactFlowElement, { 
          backgroundColor: '#ffffff',
          style: { width: '100%', height: '100%', transform: 'translate(0, 0)' }
        })
        .then((dataUrl) => {
          setPrintImage(dataUrl);
        })
        .catch(err => {
          console.error("No se pudo generar la imagen para impresión", err);
        });
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [fitView, setPrintImage]);

  return null;
}

export default function FamiliogramaStaticViewer({ jsonString, isPrintView = false }: { jsonString: string, isPrintView?: boolean }) {
  const [printImage, setPrintImage] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonString);
      return { 
        nodes: (parsed.nodes || []).map((node: any) => {
          if (node.data && node.data.fechaNacimiento) {
             node.data.edad = calcularEdad(node.data.fechaNacimiento);
          }
          return node;
        }), 
        edges: parsed.edges || [] 
      };
    } catch (e) {
      return { nodes: [], edges: [] };
    }
  }, [jsonString]);

  const memoNodeTypes = useMemo(() => ({ integrante: GenogramNode }), []);
  const memoEdgeTypes = useMemo(() => ({ genogramEdge: GenogramEdge }), []);

  if (!nodes || nodes.length === 0) {
      return <div className="p-4 border border-dashed text-gray-500 text-center rounded-xl my-4">No hay datos válidos en el lienzo.</div>;
  }

  return (
    <div className="familiograma-print-container relative w-full h-[600px] bg-white rounded-xl border border-gray-200 overflow-hidden print:border-0 print:h-auto print:bg-white print:overflow-visible flex flex-col justify-center items-center" 
      style={{ 
        pageBreakInside: 'avoid',
        breakInside: 'avoid'
      }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .familiograma-print-container {
            height: auto !important;
            min-height: 200px !important;
            width: 100% !important;
            background: white !important;
            border: none !important;
            margin: 10px 0 !important;
          }
          .react-flow-wrapper {
             display: ${isPrintView ? 'none !important' : 'block !important'};
          }
          .print-image-wrapper {
             display: ${isPrintView ? 'block !important' : 'none !important'};
             width: 100%;
             text-align: center;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .print-image-wrapper { display: none !important; }
        }
      `}} />

      <div className="react-flow-wrapper w-full h-full pointer-events-none">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={memoNodeTypes}
            edgeTypes={memoEdgeTypes}
            fitView
            fitViewOptions={{ padding: 0.35, includeHiddenNodes: true }}
            proOptions={{ hideAttribution: true }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            multiSelectionKeyCode={null}
            selectionKeyCode={null}
            deleteKeyCode={null}
            minZoom={0.05}
            maxZoom={1.5}
          >
            {isPrintView && <PrintHandler setPrintImage={setPrintImage} />}
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {printImage && (
        <div className="print-image-wrapper">
           <img src={printImage} alt="Familiograma Impresión" style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
