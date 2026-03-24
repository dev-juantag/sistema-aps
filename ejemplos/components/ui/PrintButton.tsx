'use client'

import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function PrintButton() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('print') === 'true') {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [searchParams])

  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 hover:bg-indigo-200 transition-colors font-bold rounded-xl text-sm no-print"
    >
      <Printer className="w-4 h-4" />
      Imprimir Identificación
    </button>
  )
}
