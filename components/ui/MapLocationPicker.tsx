'use client'

import dynamic from 'next/dynamic'

interface MapLocationPickerProps {
  lat: string | undefined;
  lng: string | undefined;
  setFieldValue: any;
  searchQuery: string;
}

const MapLocationPickerClient = dynamic<MapLocationPickerProps>(() => import('@/components/ui/MapLocationPickerClient'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-72 bg-slate-100 animate-pulse rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold border-2 border-slate-200">
      <div className="w-8 h-8 border-4 border-slate-300 border-t-orange-500 rounded-full animate-spin mb-3"></div>
      Cargando Mapa Interactivo...
    </div>
  ) 
})

export default MapLocationPickerClient
