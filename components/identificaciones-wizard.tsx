"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useGeolocation } from "@/hooks/useGeolocation"
import { MapPin, Home, Users, UserPlus, HeartPulse, Save, ArrowLeft, ArrowRight, CheckCircle, Download } from "lucide-react"
import { wizardSchema, type WizardData } from "@/lib/schemas"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { mapFichaToWizardData } from "@/lib/mapFichaToWizard"

import Step1InfoGeneral from "@/components/identificaciones/wizard/Step1InfoGeneral"
import Step2Vivienda from "@/components/identificaciones/wizard/Step2Vivienda"
import Step3Familia from "@/components/identificaciones/wizard/Step3Familia"
import Step4Integrantes from "@/components/identificaciones/wizard/Step4Integrantes"
import Step5Salud from "@/components/identificaciones/wizard/Step5Salud"
import Step6Familiograma from "@/components/identificaciones/wizard/Step6Familiograma"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { useAuth } from "@/lib/auth-context"

const STEPS = [
  { id: 1, title: "Info General", icon: MapPin },
  { id: 2, title: "Vivienda", icon: Home },
  { id: 3, title: "Familia", icon: Users },
  { id: 4, title: "Integrantes", icon: UserPlus },
  { id: 5, title: "Salud", icon: HeartPulse },
  { id: 6, title: "Familiograma", icon: Users },
]

const defaultIntegrante = {
  primerNombre: '', segundoNombre: '', primerApellido: '', segundoApellido: '',
  tipoDoc: 'CC', numDoc: '', fechaNacimiento: '', parentesco: '', sexo: '', gestante: 'NA', mesesGestacion: '',
  telefono: '', nivelEducativo: '', ocupacion: '', regimen: '', eapb: '',
  etnia: '', puebloIndigena: '', grupoPoblacional: [], discapacidades: [],
  // Relaciones Avanzadas
  padreId: '', madreId: '', parejaId: '', tipoPareja: 'UNION_LIBRE', tipoHijo: 'BIOLOGICO', estadoVital: 'VIVO',
  // Evaluación Salud
  antecedentes: {},
  antecTransmisibles: {},
  peso: '', talla: '', perimetroBraquial: '', diagNutricional: '',
  practicaDeportiva: false, lactanciaMaterna: false, lactanciaMeses: '',
  esquemaAtenciones: false, intervencionesPendientes: [],
  enfermedadAguda: false, recibeAtencionMedica: false,
  remisiones: [],
}

export function IdentificacionesWizard({ 
  territorioId, 
  microterritorio, 
  onClose, 
  onViewSaved,
  existingFicha
}: { 
  territorioId: string | undefined, 
  microterritorio: string, 
  onClose: () => void, 
  onViewSaved?: (id: string) => void,
  existingFicha?: any
}) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [stepError, setStepError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const { coords } = useGeolocation()
  
  const { data: rawTerritorios } = useSWR("/api/territorios", fetcher)
  const territorios = Array.isArray(rawTerritorios) ? rawTerritorios : []

  const miTerritorio = territorios.find((t: any) => t.id === territorioId)
  const numTerritorioStr = miTerritorio?.codigo ? miTerritorio.codigo.replace(/\D/g, '') : "..."

  const methods = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: existingFicha 
      ? mapFichaToWizardData(
          existingFicha,
          user?.documento || '',
          user?.rol === 'auxiliar' ? 'auxiliar' : 'otro'
        ) 
      : {
          estadoVisita: "1",
          fechaDiligenciamiento: (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })(),
          uzpe: "UZPE011",
          departamento: "RISARALDA",
          municipio: "PEREIRA",
          numEBS: "",
          prestadorPrimario: "ESE SALUD PEREIRA",
          perfilEncuestador: user?.rol === "auxiliar" ? "auxiliar" : "otro",
          tipoDocEncuestador: "CC",
          numDocEncuestador: user?.documento || "",
          fuenteAgua: [],
          dispExcretas: [],
          aguasResiduales: [],
          dispResiduos: [],
          riesgoAccidente: [],
          vulnerabilidades: [],
          numIntegrantes: "1",
          integrantes: [defaultIntegrante as any]
        }
  })

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "integrantes"
  })

  // Sincronización automática de integrantes según el número ingresado en Step 3
  const numIntWatch = methods.watch("numIntegrantes")
  
  useEffect(() => {
    const target = parseInt(numIntWatch) || 0
    // Solo sincronizamos si la visita es efectiva y hay un cambio en el número
    if (methods.getValues("estadoVisita") === '1' && target > 0) {
      if (target > fields.length) {
        const diff = target - fields.length
        for (let i = 0; i < diff; i++) append(defaultIntegrante as any)
      } else if (target < fields.length) {
        const diff = fields.length - target
        for (let i = 0; i < diff; i++) remove(fields.length - 1 - i)
      }
    }
  }, [numIntWatch, fields.length, append, remove, methods])

  // Obtener Info del territorio
  useEffect(() => {
    if (numTerritorioStr && numTerritorioStr !== "...") {
      methods.setValue("numEBS", `EBS${numTerritorioStr}`)
    }
  }, [numTerritorioStr, methods])

  const estadoVisita = methods.watch("estadoVisita")

  const next = async () => {
    // Validación adicional para asegurarnos de que el conteo coincide
    if (currentStep === 4 && estadoVisita === '1') {
      const expected = parseInt(methods.getValues("numIntegrantes")) || 0
      const actual = methods.getValues("integrantes")?.length || 0
      if (actual !== expected) {
        setStepError(`Debes registrar exactamente ${expected} integrantes según indicaste anteriormente. Tienes ${actual}.`)
        return
      }
    }

    const getFieldsForStep = (step: number): string[] => {

      if (step === 1) return ["estadoVisita", "departamento", "municipio", "centroPoblado", "direccion", "numEBS", "prestadorPrimario", "tipoDocEncuestador", "numDocEncuestador", "perfilEncuestador"]
      if (step === 2) return ["numHogar", "numFamilia", "codFicha", "tipoVivienda", "tipoViviendaDesc", "matParedes", "matPisos", "matTechos", "numHogares", "numDormitorios", "estratoSocial", "hacinamiento", "fuenteAgua", "dispExcretas", "aguasResiduales", "dispResiduos", "riesgoAccidente", "fuenteEnergia", "presenciaVectores", "animales", "cantAnimales", "vacunacionMascotas"]
      if (step === 3) return ["tipoFamilia", "numIntegrantes", "apgar", "ecomapa", "cuidadorPrincipal", "zarit", "vulnerabilidades"]
      
      const numIntegrantes = methods.getValues("integrantes")?.length || 0
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
            `integrantes.${i}.parentesco`,
            `integrantes.${i}.nivelEducativo`,
            `integrantes.${i}.ocupacion`,
            `integrantes.${i}.regimen`,
            `integrantes.${i}.eapb`,
            `integrantes.${i}.etnia`,
            `integrantes.${i}.puebloIndigena`,
            `integrantes.${i}.grupoPoblacional`,
            `integrantes.${i}.discapacidades`,
            `integrantes.${i}.padreId`,
            `integrantes.${i}.madreId`,
            `integrantes.${i}.parejaId`,
            `integrantes.${i}.tipoPareja`,
            `integrantes.${i}.tipoHijo`,
            `integrantes.${i}.estadoVital`
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
      if (step === 6) return ["familiogramaCodigo"]
      return fields
    }

    const stepFields = getFieldsForStep(currentStep)
    let isStepValid = await methods.trigger(stepFields as any)

    if (isStepValid) {
      setStepError("")
      setCurrentStep((s) => Math.min(s + 1, 6))
      window.scrollTo(0, 0)
    } else {
      const errs = methods.formState.errors
      
      const flattenErrors = (obj: any, parentKey = ""): string[] => {
        let result: string[] = []
        if (!obj) return result
        
        for (const key in obj) {
          const currentKey = parentKey ? `${parentKey}.${key}` : key
          if (obj[key]?.message) {
            result.push(`${currentKey}: ${obj[key].message}`)
          } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            result = result.concat(flattenErrors(obj[key], currentKey))
          } else if (Array.isArray(obj[key])) {
            obj[key].forEach((item: any, idx: number) => {
               result = result.concat(flattenErrors(item, `${currentKey}[${idx}]`))
            })
          }
        }
        return result
      }
      
      // Mapa de nombre técnico → etiqueta en español
      const fieldLabels: Record<string, string> = {
        estadoVisita: 'Estado de visita', observacionesRechazo: 'Motivo de rechazo',
        departamento: 'Departamento', municipio: 'Municipio', direccion: 'Dirección',
        centroPoblado: 'Centro poblado', descripcionUbicacion: 'Descripción ubicación',
        uzpe: 'UZPE', latitud: 'Latitud', longitud: 'Longitud',
        numEBS: 'N° EBS', prestadorPrimario: 'Prestador primario',
        fechaDiligenciamiento: 'Fecha de diligenciamiento',
        tipoDocEncuestador: 'Tipo doc. encuestador', numDocEncuestador: 'N° doc. encuestador',
        perfilEncuestador: 'Perfil encuestador',
        tipoVivienda: 'Tipo de vivienda', matParedes: 'Material paredes',
        matPisos: 'Material pisos', matTechos: 'Material techos',
        numHogares: 'N° hogares', numDormitorios: 'N° dormitorios',
        estratoSocial: 'Estrato social', hacinamiento: 'Hacinamiento',
        fuenteAgua: 'Fuente de agua', dispExcretas: 'Disposición excretas',
        aguasResiduales: 'Aguas residuales', dispResiduos: 'Disposición residuos',
        riesgoAccidente: 'Riesgo de accidente', fuenteEnergia: 'Fuente de energía',
        presenciaVectores: 'Presencia vectores', animales: 'Animales domésticos',
        cantAnimales: 'Cantidad animales', vacunacionMascotas: 'Vacunación mascotas',
        tipoFamilia: 'Tipo de familia', numIntegrantes: 'N° integrantes',
        apgar: 'APGAR familiar', ecomapa: 'Ecomapa', cuidadorPrincipal: 'Cuidador principal',
        zarit: 'Escala Zarit', vulnerabilidades: 'Vulnerabilidades',
        // Integrante
        primerNombre: 'Primer nombre', segundoNombre: 'Segundo nombre',
        primerApellido: 'Primer apellido', segundoApellido: 'Segundo apellido',
        tipoDoc: 'Tipo documento', numDoc: 'Número documento',
        fechaNacimiento: 'Fecha de nacimiento', sexo: 'Sexo', parentesco: 'Parentesco',
        gestante: 'Gestante', nivelEducativo: 'Nivel educativo', ocupacion: 'Ocupación',
        regimen: 'Régimen', eapb: 'EAPB', etnia: 'Etnia',
      }

      const prettyLabel = (key: string) => {
        // ej: "integrantes[0].primerNombre" → "Integrante 1 · Primer nombre"
        const m = key.match(/integrantes\[(\d+)\]\.(.+)/)
        if (m) return `Integrante ${parseInt(m[1]) + 1} → ${fieldLabels[m[2]] || m[2]}`
        return fieldLabels[key] || key
      }

      let explicitLogs: string[] = []
      if (currentStep === 4 || currentStep === 5) {
         if (errs.integrantes) explicitLogs = flattenErrors({ integrantes: errs.integrantes })
      } else {
         const stepErrorFilter: any = {}
         stepFields.forEach(field => {
           if (errs[field as keyof WizardData]) stepErrorFilter[field] = errs[field as keyof WizardData]
         })
         explicitLogs = flattenErrors(stepErrorFilter)
      }

      setStepError(explicitLogs.map(e => {
        const [fieldKey, ...rest] = e.split(': ')
        return `${prettyLabel(fieldKey)}: ${rest.join(': ')}` 
      }).join('||'))
    }
  }

  const prev = () => {
    setStepError("")
    setCurrentStep((s) => Math.max(s - 1, 1))
  }

  const onSubmit = async (data: WizardData) => {
    setStepError("")
    setSaving(true)
    try {
      // Limpieza de seguridad: si no es efectiva, no enviamos integrantes ni datos familiares
      const payload = { ...data }
      if (payload.estadoVisita !== '1') {
        payload.integrantes = []
        payload.numIntegrantes = "0"
        payload.tipoFamilia = "7" // 'Otro' o similar, el API lo ignorará de todas formas
      }
      const method = existingFicha ? "PUT" : "POST"
      const url = existingFicha ? `/api/identificaciones/${existingFicha.id}` : "/api/identificaciones"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...payload, 
          coords, 
          territorio: territorioId, 
          microterritorio,
          encuestadorId: user?.id,
          userId: user?.id,
          encuestadorNombreRaw: user ? `${user.nombre} ${user.apellidos}`.trim() : null
        }),
      })
      const result = await response.json()
      if (result.success) {
        setSavedId(result.id)
        setSaved(true)
      } else {
        throw new Error(result.error || "Error al guardar la información")
      }
    } catch (err: any) {
      setStepError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const onFormError = (errors: any) => {
    console.error("Errores del formulario:", errors);
    
    // Extraer logs explícitos del formulario
    const flattenErrors = (obj: any, parentKey = ""): string[] => {
      let result: string[] = []
      if (!obj) return result
      for (const key in obj) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key
        if (obj[key]?.message) {
          result.push(`${currentKey}: ${obj[key].message}`)
        } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          result = result.concat(flattenErrors(obj[key], currentKey))
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, idx: number) => {
             result = result.concat(flattenErrors(item, `${currentKey}[${idx}]`))
          })
        }
      }
      return result
    }

    const logs = flattenErrors(errors)
    setStepError(`El formulario contiene errores ocultos. Revisa:\n${logs.join("\n")}`)
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in py-10">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">¡Ficha Hogar Registrada!</h2>
          <p className="text-muted-foreground">Los datos han sido guardados y empaquetados exitosamente bajo tu territorio.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          {onViewSaved && savedId && (
            <button
              onClick={() => {
                onViewSaved(savedId)
              }}
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5"/> Imprimir Ficha
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl hover:opacity-90 text-primary-foreground font-bold transition-all bg-primary shadow-sm"
          >
            Volver a mi listado
          </button>
          <button
            onClick={() => { setSaved(false); methods.reset(); setCurrentStep(1) }}
            className="px-6 py-3 rounded-xl border border-input shadow-sm font-semibold transition-all hover:bg-muted text-foreground"
          >
            Crear otra Ficha
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col mb-10 overflow-hidden rounded-3xl border border-border shadow-md bg-card">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit as any, onFormError)} className="w-full flex flex-col relative">

          {/* -- Header -- */}
          <div className="flex flex-col shadow-sm border-b border-border bg-muted/20">
            <header className="px-5 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowExitConfirm(true)} 
                  className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Volver"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="font-bold text-base text-foreground tracking-tight leading-tight">Nueva Identificación</h1>
                  <p className="text-xs text-muted-foreground font-semibold">Territorio: {numTerritorioStr} · Micro: {microterritorio.replace('M', '')}</p>
                </div>
              </div>
              <div
                className="text-xs font-bold px-3 py-1 rounded-full text-primary bg-primary/10 border border-primary/20"
              >
                Paso {currentStep} de {STEPS.length}
              </div>
            </header>

            {/* -- Stepper -- */}
            <div className="flex justify-around px-4 py-4 bg-white border-t border-border">
            {STEPS.map((step) => {
              const Icon = step.icon
              const active = currentStep === step.id
              const completed = currentStep > step.id
              
              const primaryColor = '#081e69'
              const mutedColor = '#9badca' // Light bluish gray for text/inactive icon
              const mutedBg = '#f1f5f9'
              
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-2 transition-all duration-300"
                  style={{ transform: active ? 'scale(1.05)' : 'scale(1)' }}
                >
                  <div
                    className="p-3.5 rounded-[1.2rem] transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: active ? primaryColor : mutedBg,
                      color: active ? '#fff' : mutedColor,
                      boxShadow: active ? `0 6px 16px ${primaryColor}30` : 'none'
                    }}
                  >
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span 
                    className="text-[11px] uppercase tracking-tighter hidden sm:block font-black"
                    style={{ color: active || completed ? primaryColor : mutedColor }}
                  >
                    {step.title}
                  </span>
                </div>
              )
            })}
            </div>
          </div>

          {/* -- Form Content -- */}
          <div className="w-full min-h-[50vh] bg-muted/10 rounded-b-3xl">
            <div className="w-full px-6 py-6 md:px-10 space-y-4">
              {currentStep === 1 && <Step1InfoGeneral />}
              {currentStep === 2 && <Step2Vivienda />}
              {currentStep === 3 && <Step3Familia />}
              {currentStep === 4 && <Step4Integrantes />}
              {currentStep === 5 && <Step5Salud />}
              {currentStep === 6 && <Step6Familiograma />}
            </div>
          </div>

          {/* -- Error Message -- */}
          {stepError && (
            <div className="mx-5 my-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
              <p className="text-destructive text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-base">⚠️</span> Campos requeridos en este paso:
              </p>
              <ul className="flex flex-col gap-1">
                {stepError.split('||').filter(Boolean).map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-destructive/90 font-semibold">
                    <span className="mt-0.5 shrink-0">→</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* -- Footer Nav -- */}
          <footer className="flex items-center gap-3 px-5 py-4 mt-auto border-t border-border bg-card rounded-b-3xl">
            <button
              type="button"
              onClick={prev}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 h-10 px-5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 border border-border hover:bg-muted"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
            <div className="flex-1" />
            
            {currentStep === 6 || (currentStep === 1 && estadoVisita !== '1') ? (
              <button
                type="button"
                onClick={async () => {
                  if (estadoVisita !== '1') {
                    const valid = await methods.trigger(['departamento', 'municipio', 'direccion', 'numEBS', 'prestadorPrimario', 'tipoDocEncuestador', 'numDocEncuestador', 'perfilEncuestador', 'observacionesRechazo'])
                    if (valid) onSubmit(methods.getValues() as any)
                    else onFormError(methods.formState.errors)
                  } else {
                    methods.handleSubmit(onSubmit as any, onFormError)()
                  }
                }}
                disabled={saving}
                className="flex items-center gap-1.5 h-10 px-6 rounded-xl font-bold text-sm text-primary-foreground transition-all active:scale-95 disabled:opacity-60 bg-primary hover:bg-primary/90 shadow-sm"
              >
                {saving ? (
                  <>Guardando en Nube...</>
                ) : (
                  <><Save size={16} /> Consolidar e Inscribir</>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 h-10 px-6 rounded-xl font-bold text-sm text-primary-foreground transition-all active:scale-95 bg-foreground hover:bg-foreground/90 shadow-sm"
              >
                Siguiente Paso <ArrowRight size={16} />
              </button>
            )}
          </footer>

        </form>
      </FormProvider>

      {/* Exit confirmation modal */}
      <ConfirmModal
        open={showExitConfirm}
        title="¿Salir de la ficha incompleta?"
        message="¿Estás seguro de que deseas salir? Todos los integrantes y datos no guardados se perderán sin retorno."
        confirmLabel="Salir sin guardar"
        cancelLabel="Proseguir llenando"
        onConfirm={onClose}
        onCancel={() => setShowExitConfirm(false)}
        danger
      />
    </div>
  )
}
