'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGeolocation } from '@/hooks/useGeolocation'
import { MapPin, Home, Users, UserPlus, HeartPulse, Save, ArrowLeft, ArrowRight } from 'lucide-react'
import { wizardSchema, type WizardData } from '@/lib/schemas'

// Steps
import Step1InfoGeneral from '@/components/wizard/Step1InfoGeneral'
import Step2Vivienda from '@/components/wizard/Step2Vivienda'
import Step3Familia from '@/components/wizard/Step3Familia'
import Step4Integrantes from '@/components/wizard/Step4Integrantes'
import Step5Salud from '@/components/wizard/Step5Salud'

const STEPS = [
  { id: 1, title: 'Info General', icon: MapPin },
  { id: 2, title: 'Vivienda', icon: Home },
  { id: 3, title: 'Familia', icon: Users },
  { id: 4, title: 'Integrantes', icon: UserPlus },
  { id: 5, title: 'Salud', icon: HeartPulse },
]

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState('')
  const router = useRouter()
  const { coords, error: geoError, loading: geoLoading, capture } = useGeolocation()

  const methods = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      estadoVisita: '1',
      fechaDiligenciamiento: new Date().toISOString().split('T')[0],
      departamento: 'RISARALDA',
      municipio: 'PEREIRA',
      prestadorPrimario: 'ESE SALUD PEREIRA',
      perfilEncuestador: 'auxiliar',
      fuenteAgua: [],
      dispExcretas: [],
      aguasResiduales: [],
      dispResiduos: [],
      riesgoAccidente: [],
      vulnerabilidades: [],
      integrantes: [
        {
          primerNombre: '',
          primerApellido: '',
          tipoDoc: 'CC',
          numDoc: '',
          fechaNacimiento: '',
          sexo: 'HOMBRE',
          parentesco: '1',
          grupoPoblacional: [],
          discapacidades: [],
          intervencionesPendientes: [],
          remisiones: []
        }
      ]
    }
  })

  // Set default numEBS from URL params if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('territorio')
      if (t) methods.setValue('numEBS', t)
    }
  }, [methods])

  const estadoVisita = methods.watch('estadoVisita')

  const next = async () => {
    const fieldsByStep: Record<number, (keyof WizardData)[]> = {
      1: ['departamento', 'municipio', 'centroPoblado', 'direccion'],
      2: ['tipoVivienda', 'matParedes', 'matPisos', 'matTechos', 'numHogares', 'numDormitorios', 'estratoSocial'],
      3: ['tipoFamilia', 'numIntegrantes', 'apgar', 'ecomapa'],
      4: ['integrantes'],
      5: ['integrantes']
    }
    const fields = fieldsByStep[currentStep] || []
    const isValid = await methods.trigger(fields)
    if (isValid) {
      setStepError('')
      setCurrentStep((s) => Math.min(s + 1, 5))
    } else {
      setStepError('Faltan campos obligatorios. Revisa la información resaltada.')
    }
  }

  const prev = () => setCurrentStep((s) => Math.max(s - 1, 1))

  const onSubmit = async (data: WizardData) => {
    setStepError('')
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, coords }),
      })
      const result = await response.json()
      if (result.success) {
        // Redirige al resumen visual en vez del alert feo
        router.push(`/survey/${result.territorio || 'T00'}/${result.id}?success=true`)
      } else {
        throw new Error(result.error)
      }
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    }
  }

  const onFormError = () => {
    setStepError('El formulario contiene errores. Revisa que todos los campos requeridos estén llenos.')
  }

  return (
    // Ocupa todo el espacio que le da el survey layout (flex-col h-full)
    <div className="flex flex-col h-full w-full" style={{ background: '#fff', overflow: 'hidden' }}>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit, onFormError)} className="flex flex-col h-full">

          {/* ── Header ── */}
          <header
            className="flex-shrink-0 px-5 py-3 flex items-center justify-between"
            style={{ backgroundColor: '#081e69' }}
          >
            <div>
              <h1 className="font-bold text-sm text-white tracking-tight leading-tight">Identificación Poblacional</h1>
              <p className="text-[10px]" style={{ color: 'rgba(186,210,255,0.65)' }}>ESE Salud Pereira</p>
            </div>
            <div
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#0a8c3266', border: '1px solid #0a8c32aa' }}
            >
              {currentStep}/{STEPS.length}
            </div>
          </header>

          {/* ── Stepper ── */}
          <div
            className="flex-shrink-0 flex justify-around px-4 py-2 border-b"
            style={{ background: '#fff', borderColor: '#e8ecf0' }}
          >
            {STEPS.map((step) => {
              const Icon = step.icon
              const active = currentStep === step.id
              const completed = currentStep > step.id
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-0.5 transition-all duration-300"
                  style={{
                    color: active ? '#081e69' : completed ? '#0a8c32' : '#c0cce0',
                    transform: active ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  <div
                    className="p-1.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: active ? '#081e69' : completed ? '#0a8c3218' : '#f0f4f8',
                      color: active ? '#fff' : completed ? '#0a8c32' : '#a8b8cc',
                      boxShadow: active ? '0 2px 8px #081e6935' : 'none',
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <span className="text-[8px] uppercase tracking-tighter hidden sm:block font-bold">
                    {step.title}
                  </span>
                </div>
              )
            })}
          </div>

          {/* ── Form Content — flex-1 para llenar espacio, overflow-y-auto para scroll ── */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ background: '#f7f8fc' }}
          >
            <div className="w-full px-6 py-5 space-y-4">
              {currentStep === 1 && <Step1InfoGeneral />}
              {currentStep === 2 && <Step2Vivienda />}
              {currentStep === 3 && <Step3Familia />}
              {currentStep === 4 && <Step4Integrantes />}
              {currentStep === 5 && <Step5Salud />}
            </div>
          </div>

          {/* ── Error Message ── */}
          {stepError && (
            <div className="flex-shrink-0 px-5 py-2.5 bg-red-50 text-red-600 text-[11px] font-bold text-center border-t border-red-100">
              {stepError}
            </div>
          )}

          {/* ── Footer Nav ── */}
          <footer
            className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5"
            style={{ borderTop: '1px solid #e8ecf0', background: '#fff', boxShadow: '0 -2px 10px rgba(8,30,105,0.05)' }}
          >
            <button
              type="button"
              onClick={prev}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 h-9 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-30"
              style={{ border: '1.5px solid #081e6930', color: '#081e69', background: '#fff' }}
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <div className="flex-1" />
            {currentStep === 5 || (currentStep === 1 && estadoVisita !== '1') ? (
              <button
                type="submit"
                className="flex items-center gap-1.5 h-9 px-6 rounded-lg font-bold text-sm text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0a8c32, #065c21)', boxShadow: '0 3px 12px #0a8c3230' }}
              >
                <Save size={14} /> Finalizar
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 h-9 px-6 rounded-lg font-bold text-sm text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #081e69, #0f2d99)', boxShadow: '0 3px 12px #081e6930' }}
              >
                Siguiente <ArrowRight size={14} />
              </button>
            )}
          </footer>

        </form>
      </FormProvider>
    </div>
  )
}
