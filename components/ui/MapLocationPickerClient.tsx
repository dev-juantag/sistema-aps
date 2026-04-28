'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { OpenStreetMapProvider } from 'leaflet-geosearch'

// Arreglo para que los iconos por defecto de Leaflet funcionen en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Evento para clics en el mapa
function LocationMarker({ position, setPosition, setFieldValue }: any) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      setFieldValue('latitud', e.latlng.lat.toString())
      setFieldValue('longitud', e.latlng.lng.toString())
    },
  })

  return position === null ? null : (
    <Marker position={position} />
  )
}

// Evento para mover la cámara suavemente si cambia la posición por código
function MapUpdater({ position }: { position: L.LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { animate: true, duration: 1.5 })
    }
  }, [position, map])
  return null
}

export default function MapLocationPickerClient({ 
  lat, lng, setFieldValue, searchQuery
}: {
  lat: string | undefined, lng: string | undefined, setFieldValue: any, searchQuery: string
}) {
  const [position, setPosition] = useState<L.LatLng | null>(null)
  const previousQuery = useRef(searchQuery)
  const mapRef = useRef<any>(null)
  
  // Sincronizar estado local con valores del formulario
  useEffect(() => {
    if (lat && lng && !Number.isNaN(parseFloat(lat)) && !Number.isNaN(parseFloat(lng))) {
      setPosition(L.latLng(parseFloat(lat), parseFloat(lng)))
    }
  }, [lat, lng])

  // Geocodificación Automática (Debounced)
  useEffect(() => {
    if (searchQuery && searchQuery.length > 5 && searchQuery !== previousQuery.current) {
      previousQuery.current = searchQuery
      
      const timeoutId = setTimeout(async () => {
        try {
          const provider = new OpenStreetMapProvider({
             params: {
                countrycodes: 'co', // Limita la búsqueda a Colombia
                'accept-language': 'es'
             }
          })
          // Agregamos "Pereira" para darle contexto forzado
          const results = await provider.search({ query: searchQuery + ', Pereira, Risaralda' })
          
          if (results && results.length > 0) {
            const best = results[0]
            const newPos = L.latLng(best.y, best.x)
            setPosition(newPos)
            setFieldValue('latitud', best.y.toString(), { shouldValidate: true })
            setFieldValue('longitud', best.x.toString(), { shouldValidate: true })
          }
        } catch (e) {
          console.error("Falló la búsqueda de geocodificación", e)
        }
      }, 1500) // Esperar 1.5 segundos a que termine de escribir
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchQuery, setFieldValue])

  return (
    <div className="w-full h-[350px] rounded-xl overflow-hidden border-2 border-slate-200 z-10 relative shadow-sm">
      <MapContainer 
        center={position || [4.8133, -75.6961]} // Centro de Pereira por defecto
        zoom={position ? 16 : 13} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} setFieldValue={setFieldValue} />
        {position && <MapUpdater position={position} />}
      </MapContainer>
    </div>
  )
}
