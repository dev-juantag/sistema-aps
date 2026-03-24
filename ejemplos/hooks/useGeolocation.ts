'use client'

import { useState, useCallback } from 'react'

export const useGeolocation = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada por el navegador')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setError(null)
        setLoading(false)
      },
      (err) => {
        if (err.code === err.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
              setError(null)
              setLoading(false)
            },
            (err2) => {
              setError(`Reintento fallido: ${err2.message}`)
              setLoading(false)
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
          )
        } else {
          setError(`Error ubicación (${err.code}): ${err.message}`)
          setLoading(false)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  return { coords, error, loading, capture }
}
