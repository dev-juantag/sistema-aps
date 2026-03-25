'use client'

import React, { useEffect, useState } from 'react'
import mermaid from 'mermaid'

let mermaidInitialized = false

export default function FamiliogramaViewer({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    if (!mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: {
          curve: 'basis'
        }
      })
      mermaidInitialized = true
    }

    if (!code) return

    const renderMermaid = async () => {
      try {
        const id = `mermaid-familiograma-${Math.random().toString(36).substring(7)}`
        const result = await mermaid.render(id, code)
        setSvg(result.svg)
      } catch (err: any) {
        console.error('Mermaid rendering error:', err)
        setSvg(`<div class="text-red-500 font-bold p-4 text-center">Error al renderizar el familiograma<br/><span class="text-xs font-normal">${err.message}</span></div>`)
      }
    }

    renderMermaid()
  }, [code])

  if (!code) return <p className="text-gray-400 italic">No hay datos de familiograma disponibles</p>

  return (
    <div 
      className="flex justify-center items-center overflow-auto p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-inner min-h-[300px]"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  )
}
