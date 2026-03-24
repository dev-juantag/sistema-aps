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
      className="no-print flex w-full sm:w-auto justify-center items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm"
    >
      <Printer className="w-5 h-5" />
      Descargar / Imprimir Ficha
    </button>
  )
}
