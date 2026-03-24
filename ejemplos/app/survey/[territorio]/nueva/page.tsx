'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGeolocation } from '@/hooks/useGeolocation'
import { MapPin, Home, Users, UserPlus, HeartPulse, Save, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { wizardSchema, type WizardData } from '@/lib/schemas'

import Step1InfoGeneral from '@/components/wizard/Step1InfoGeneral'
import Step2Vivienda from '@/components/wizard/Step2Vivienda'
import Step3Familia from '@/components/wizard/Step3Familia'
import Step4Integrantes from '@/components/wizard/Step4Integrantes'
import Step5Salud from '@/components/wizard/Step5Salud'
import ConfirmModal from '@/components/ui/ConfirmModal'

const STEPS = [
  { id: 1, title: 'Info General', icon: MapPin },
  { id: 2, title: 'Vivienda', icon: Home },
  { id: 3, title: 'Familia', icon: Users },
  { id: 4, title: 'Integrantes', icon: UserPlus },
  { id: 5, title: 'Salud', icon: HeartPulse },
]

export default function NuevaSurveyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const territorio = (params.territorio as string) || ''
  const microterritorio = searchParams.get('micro') || ''

  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const { coords } = useGeolocation()

  const methods = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      estadoVisita: '1',
      fechaDiligenciamiento: new Date().toISOString().split('T')[0],
      uzpe: 'UZPE011',
      departamento: 'RISARALDA',
      municipio: 'PEREIRA',
      numEBS: territorio,
      prestadorPrimario: 'ESE SALUD PEREIRA',
      perfilEncuestador: 'auxiliar',
      fuenteAgua: [],
      dispExcretas: [],
      aguasResiduales: [],
      dispResiduos: [],
      riesgoAccidente: [],
      vulnerabilidades: [],
      integrantes: [{
        primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
        tipoDoc: 'CC', numDoc: '', fechaNacimiento: '', parentesco: '1', sexo: 'HOMBRE', gestante: 'NA',
        telefono: '', nivelEducativo: '', ocupacion: '', regimen: '', eapb: '',
        etnia: '', puebloIndigena: '', grupoPoblacional: [], discapacidades: [],
        antecedentes: {}, antecTransmisibles: {}, peso: undefined, talla: undefined, perimetroBraquial: undefined, diagNutricional: '',
        practicaDeportiva: false, lactanciaMaterna: false, lactanciaMeses: undefined,
        esquemaAtenciones: false, intervencionesPendientes: [],
        enfermedadAguda: false, recibeAtencionMedica: false, remisiones: [],
      }]
    }
  })

  useEffect(() => {
    if (territorio) {
      methods.setValue('numEBS', territorio)
    }
  }, [territorio, methods])

  const estadoVisita = methods.watch('estadoVisita')

  const next = async () => {
    const getFieldsForStep = (step: number): string[] => {
      if (step === 1) return ['estadoVisita', 'departamento', 'municipio', 'centroPoblado', 'direccion', 'numEBS', 'prestadorPrimario', 'tipoDocEncuestador', 'numDocEncuestador', 'perfilEncuestador']
      if (step === 2) return ['numHogar', 'numFamilia', 'codFicha', 'tipoVivienda', 'tipoViviendaDesc', 'matParedes', 'matPisos', 'matTechos', 'numHogares', 'numDormitorios', 'estratoSocial', 'hacinamiento', 'fuenteAgua', 'dispExcretas', 'aguasResiduales', 'dispResiduos', 'riesgoAccidente', 'fuenteEnergia', 'presenciaVectores', 'animales', 'cantAnimales', 'vacunacionMascotas']
      if (step === 3) return ['tipoFamilia', 'numIntegrantes', 'apgar', 'ecomapa', 'cuidadorPrincipal', 'zarit', 'vulnerabilidades']
      
      const numIntegrantes = methods.getValues('integrantes')?.length || 0
      const fields: string[] = []
      for (let i = 0; i < numIntegrantes; i++) {
        if (step === 4) {
          fields.push(
            `integrantes.${i}.id`,
            `integrantes.${i}.primerNombre`,
            `integrantes.${i}.segundoNombre`,
            `integrantes.${i}.primerApellido`,
            `integrantes.${i}.segundoApellido`,
            `integrantes.${i}.tipoDoc`,
            `integrantes.${i}.numDoc`,
            `integrantes.${i}.fechaNacimiento`,
            `integrantes.${i}.sexo`,
            `integrantes.${i}.gestante`,
            `integrantes.${i}.telefono`,
            `integrantes.${i}.estadoCivil`,
            `integrantes.${i}.parentesco`,
            `integrantes.${i}.nivelEducativo`,
            `integrantes.${i}.ocupacion`,
            `integrantes.${i}.regimen`,
            `integrantes.${i}.eapb`,
            `integrantes.${i}.etnia`,
            `integrantes.${i}.puebloIndigena`,
            `integrantes.${i}.grupoPoblacional`,
            `integrantes.${i}.discapacidades`
          )
        } else if (step === 5) {
          fields.push(
            `integrantes.${i}.antecedentes`,
            `integrantes.${i}.antecTransmisibles`,
            `integrantes.${i}.peso`,
            `integrantes.${i}.talla`,
            `integrantes.${i}.perimetroBraquial`,
            `integrantes.${i}.diagNutricional`,
            `integrantes.${i}.practicaDeportiva`,
            `integrantes.${i}.lactanciaMaterna`,
            `integrantes.${i}.lactanciaMeses`,
            `integrantes.${i}.esquemaAtenciones`,
            `integrantes.${i}.intervencionesPendientes`,
            `integrantes.${i}.enfermedadAguda`,
            `integrantes.${i}.recibeAtencionMedica`,
            `integrantes.${i}.remisiones`
          )
        }
      }
      return fields
    }

    const stepFields = getFieldsForStep(currentStep)
    let isStepValid = await methods.trigger(stepFields as any)

    if (isStepValid && currentStep === 2) {
      setStepError('Verificando disponibilidad de códigos de identificación...');
      const numHogar = methods.getValues('numHogar');
      const numFamilia = methods.getValues('numFamilia');
      const codFicha = methods.getValues('codFicha');

      try {
        const res = await fetch(`/api/survey/check_codigo?numHogar=${numHogar}&numFamilia=${numFamilia}&codFicha=${codFicha}`);
        const data = await res.json();
        if (data.exists) {
          methods.setError(data.field, { type: 'manual', message: data.message });
          setStepError(`Conflicto de unicidad: ${data.message} Por favor, ingresa un código único irrepetible.`);
          isStepValid = false;
        }
      } catch (e) {
        console.error('Error de verificación de códigos únicos', e);
      }
    }

    if (isStepValid) {
      setStepError('')
      setCurrentStep((s) => Math.min(s + 1, 5))
      window.scrollTo(0, 0)
    } else {
      const errs = methods.formState.errors
      
      const flattenErrors = (obj: any, parentKey = ''): string[] => {
        let result: string[] = []
        if (!obj) return result
        
        for (const key in obj) {
          const currentKey = parentKey ? `${parentKey}.${key}` : key
          if (obj[key]?.message) {
            result.push(`${currentKey}: ${obj[key].message}`)
          } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            result = result.concat(flattenErrors(obj[key], currentKey))
          } else if (Array.isArray(obj[key])) {
            obj[key].forEach((item: any, idx: number) => {
               result = result.concat(flattenErrors(item, `${currentKey}[${idx}]`))
            })
          }
        }
        return result
      }
      
      // Filtramos solo los errores del paso actual explorando en el árbol general de RHF
      // porque para el paso 4 o 5 errs no los tiene en su primera capa, los tiene en errs.integrantes
      let explicitLogs: string[] = []
      if (currentStep === 4 || currentStep === 5) {
         if (errs.integrantes) {
           explicitLogs = flattenErrors({ integrantes: errs.integrantes })
         }
      } else {
         const stepErrorFilter: any = {}
         stepFields.forEach(field => {
           if (errs[field as keyof WizardData]) stepErrorFilter[field] = errs[field as keyof WizardData]
         })
         explicitLogs = flattenErrors(stepErrorFilter)
      }

      setStepError(`Faltan campos obligatorios. Detalles:\n${explicitLogs.join(' | ')}`)
    }
  }

  const prev = () => {
    setStepError('')
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const onSubmit = async (data: WizardData) => {
    setStepError('')
    setSaving(true)
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, coords, territorio, microterritorio }),
      })
      const result = await response.json()
      if (result.success) {
        setSavedId(result.id)
        setSaved(true)
      } else {
        throw new Error(result.error || 'Error al guardar la información')
      }
    } catch (err: any) {
      setStepError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onFormError = () => {
    setStepError('El formulario contiene errores. Revisa que todos los campos requeridos estén llenos.')
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in-95 duration-500 bg-white">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">¡Identificación guardada!</h2>
          <p className="text-slate-500">Los datos han sido registrados exitosamente en el sistema.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/survey/${territorio}?micro=${microterritorio}`)}
            className="px-6 py-3 rounded-xl hover:opacity-90 text-white font-bold transition-all"
            style={{ background: '#0a8c32' }}
          >
            Volver al Territorio
          </button>
          <button
            onClick={() => { setSaved(false); methods.reset(); setCurrentStep(1) }}
            className="px-6 py-3 rounded-xl border border-slate-200 font-semibold transition-all hover:bg-slate-50 text-[#081e69]"
          >
            Nueva Identificación
          </button>
          {savedId && (
            <button
              onClick={() => router.push(`/survey/${territorio}/${savedId}?print=true`)}
              className="px-6 py-3 rounded-xl hover:opacity-90 text-white font-bold transition-all flex items-center justify-center gap-2"
              style={{ background: '#3b82f6' }}
            >
              Imprimir Identificación
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-300">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit as any, onFormError)} className="w-full flex flex-col relative">

          {/* ── Header ── */}
          <div className="flex flex-col shadow-sm">
            <header
              className="px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: '#081e69', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
            >
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setShowExitConfirm(true)} 
                className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                title="Volver"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="font-bold text-sm text-white tracking-tight leading-tight">Nueva Identificación</h1>
                <p className="text-[10px]" style={{ color: 'rgba(186,210,255,0.65)' }}>{territorio} · {microterritorio}</p>
              </div>
            </div>
            <div
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#0a8c3266', border: '1px solid #0a8c32aa' }}
            >
              Paso {currentStep} de {STEPS.length}
            </div>
          </header>

            {/* ── Stepper ── */}
            <div
              className="flex justify-around px-4 py-2 border-b"
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
          </div>

          {/* ── Form Content ── */}
          <div
            className="w-full min-h-[50vh]"
            style={{ background: '#f7f8fc' }}
          >
            <div className="w-full px-6 py-5 md:px-8 space-y-4">
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
            className="flex items-center gap-3 px-5 py-4 mt-auto"
            style={{ borderTop: '1px solid #e8ecf0', background: '#fff', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}
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
                type="button"
                onClick={async () => {
                  if (estadoVisita !== '1') {
                    const valid = await methods.trigger(['departamento', 'municipio', 'direccion', 'numEBS', 'prestadorPrimario', 'tipoDocEncuestador', 'numDocEncuestador', 'perfilEncuestador', 'observacionesRechazo'])
                    if (valid) onSubmit(methods.getValues() as any)
                    else onFormError()
                  } else {
                    methods.handleSubmit(onSubmit as any, onFormError)()
                  }
                }}
                disabled={saving}
                className="flex items-center gap-1.5 h-9 px-6 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0a8c32, #065c21)', boxShadow: '0 3px 12px #0a8c3230' }}
              >
                {saving ? (
                  <>Guardando...</>
                ) : (
                  <><Save size={14} /> Finalizar</>
                )}
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

      {/* Exit confirmation modal */}
      <ConfirmModal
        open={showExitConfirm}
        title="¿Salir de la identificación?"
        message="Si sales ahora perderás todos los datos ingresados. ¿Deseas continuar?"
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir llenando"
        onConfirm={() => router.push(`/survey/${territorio}?micro=${microterritorio}`)}
        onCancel={() => setShowExitConfirm(false)}
        danger
      />
    </div>
  )
}
