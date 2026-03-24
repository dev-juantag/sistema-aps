'use client'

import { Download } from 'lucide-react'

export default function ExportPdfButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print mt-4 sm:mt-0 flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
    >
      <Download className="w-5 h-5" />
      Descargar / Imprimir Ficha
    </button>
  )
}
