'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TERRITORIOS, MICROTERRITORIOS } from '@/lib/constants'
import { MapPin, ChevronRight, Activity, ShieldCheck, Lock, HeartPulse } from 'lucide-react'

export default function HomePage() {
  // ... (previous state and logic)

  const [territorio, setTerritorio] = useState('')
  const [microterritorio, setMicroterritorio] = useState('')
  const [error, setError] = useState('')
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, sum: 0 })
  const [userAnswer, setUserAnswer] = useState('')
  const router = useRouter()

  useEffect(() => {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    setCaptcha({ a, b, sum: a + b })
  }, [])

  const handleIngresar = () => {
    if (!territorio || !microterritorio) {
      setError('Debes seleccionar un territorio y microterritorio para continuar.')
      return
    }
    if (parseInt(userAnswer) !== captcha.sum) {
      setError('Respuesta de seguridad incorrecta (Anti-Robots).')
      return
    }
    setError('')
    router.push(`/survey/${territorio}?micro=${microterritorio}`)
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center py-12">
      {/* Hero */}
      <div className="text-center mb-8 space-y-3">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #096246, #097d2d)' }}
        >
          <HeartPulse className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#081e69' }}>
          SI‑APS
        </h1>
        <p className="text-slate-500 max-w-sm mx-auto text-sm">
          Sistema para control interno de las identificaciones
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest" style={{ color: '#081e69' }}>
          <MapPin className="w-4 h-4" style={{ color: '#076b26' }} />
          Selección de Zona
        </div>

        {/* Territorio */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Territorio <span className="text-[#076b26]">*</span>
          </label>
          <select
            value={territorio}
            onChange={(e) => setTerritorio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-gray-50 focus:outline-none focus:ring-2 transition-all appearance-none shadow-sm"
            style={{ border: '1.5px solid #081e6922' }}
          >
            <option value="">— Selecciona un territorio —</option>
            {TERRITORIOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.id})
              </option>
            ))}
          </select>
        </div>

        {/* Microterritorio */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Microterritorio <span className="text-[#076b26]">*</span>
          </label>
          <select
            value={microterritorio}
            onChange={(e) => setMicroterritorio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-gray-50 focus:outline-none focus:ring-2 transition-all appearance-none shadow-sm"
            style={{ border: '1.5px solid #081e6922' }}
          >
            <option value="">— Selecciona un microterritorio —</option>
            {MICROTERRITORIOS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Anti-Robot Challenge */}
        <div className="pt-4 space-y-3" style={{ borderTop: '1.5px solid #081e6915' }}>
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter" style={{ color: '#081e6980' }}>
             <ShieldCheck className="w-3.5 h-3.5" />
             Validación Anti-Robots
           </div>
           <div className="flex flex-col gap-3">
              <div
                className="w-full text-center px-4 py-3 rounded-lg font-mono text-xl font-black select-none"
                style={{ background: '#081e6912', color: '#081e69', border: '1.5px solid #081e6925' }}
              >
                {captcha.a} + {captcha.b} = ?
              </div>
              <input
                type="number"
                placeholder="Ingresa el resultado"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full text-center px-4 py-3 rounded-lg text-lg font-bold outline-none transition-all"
                style={{ border: '1.5px solid #081e6922', background: '#f9fafb', color: '#1a1a2e' }}
              />
           </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2 font-medium">
            {error}
          </p>
        )}

        {/* Button */}
        <div className="space-y-3 pt-1">
          <button
            onClick={handleIngresar}
            className="w-full flex items-center justify-center gap-2 font-extrabold py-4 rounded-xl transition-all active:scale-95 text-base text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #076b26, #054a1a)', boxShadow: '0 6px 20px #076b2635' }}
          >
            Iniciar Identificación
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-slate-400 text-center font-medium">
        © 2026 | Desarrollado por Juan Taguado para APS Pereira
      </p>
    </div>
  )
}
