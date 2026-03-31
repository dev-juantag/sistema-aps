"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Heart, Loader2, Eye, EyeOff } from "lucide-react"
import { COMPANY_NAME } from "@/lib/constants"

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"login" | "recovery">("login")
  const [recoveryStep, setRecoveryStep] = useState<"request" | "verify" | "reset">("request")
  const [recoveryCode, setRecoveryCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [recoveryError, setRecoveryError] = useState("")
  const [recoverySuccess, setRecoverySuccess] = useState("")

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")
  setLoading(true)

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    let data;
    try {
      data = await res.json()
    } catch (e) {
      data = { error: "Error desconocido del servidor." }
    }

    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión")
      setLoading(false)
      return
    }

    login(data.user, data.token) // 🔥 ahora usa el backend real
  } catch (err) {
    setError("Error de conexión")
  }

  setLoading(false)
}

const handleRecoverySubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setRecoveryError("")
  setRecoverySuccess("")
  setLoading(true)

  try {
    const res = await fetch("/api/auth/recuperar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    
    let data = await res.json()

    if (!res.ok) {
      setRecoveryError(data.error || "Error al intentar recuperar contraseña")
    } else {
      setRecoverySuccess(data.message || "Código enviado correctamente.")
      setRecoveryStep("verify") // Pasar al siguiente paso
    }
  } catch (err) {
    setRecoveryError("Error de conexión con el servidor.")
  }

  setLoading(false)
}

const handleVerifySubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setRecoveryError("")
  setRecoverySuccess("")
  setLoading(true)

  try {
    const res = await fetch("/api/auth/recuperar/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: recoveryCode }),
    })
    
    let data = await res.json()

    if (!res.ok) {
      setRecoveryError(data.error || "Código incorrecto o expirado")
    } else {
      setRecoverySuccess("Código verificado. Ahora puedes cambiar tu contraseña.")
      setRecoveryStep("reset")
    }
  } catch (err) {
    setRecoveryError("Error de conexión con el servidor.")
  }

  setLoading(false)
}

const handleResetSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setRecoveryError("")
  setRecoverySuccess("")
  setLoading(true)

  try {
    const res = await fetch("/api/auth/recuperar/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: recoveryCode, newPassword }),
    })
    
    let data = await res.json()

    if (!res.ok) {
      setRecoveryError(data.error || "Error al restablecer la contraseña")
    } else {
      setRecoverySuccess("¡Contraseña actualizada! Ya puedes iniciar sesión.")
      setTimeout(() => {
        setView("login")
        setRecoveryStep("request")
      }, 3000)
    }
  } catch (err) {
    setRecoveryError("Error de conexión con el servidor.")
  }

  setLoading(false)
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary/5 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
            {/* 
              CAMBIAR LOGO AQUI: 
              Ejemplo: <img src="/tu-logo.png" alt="Logo" className="h-16 w-16" /> 
            */}
            <img src="/icon.svg" alt={`Logo ${COMPANY_NAME}`} className="h-24 w-auto max-w-full object-contain" />

            <div className="text-center">
              {/*CAMBIAR NOMBRE DEL APLICATIVO AQUI */}
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {COMPANY_NAME}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sistema de control interno
              </p>
            </div>
          </div>

          {/* Formularios Condicionales */}
          {view === "login" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <h2 className="text-center text-lg font-semibold text-foreground">
                Iniciar sesion
              </h2>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electronico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@saludpereira.gov.co"
                  className="h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    className="h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("recovery")
                  setError("")
                  setRecoveryError("")
                  setRecoverySuccess("")
                }}
                className="text-sm text-primary hover:underline transition-colors mt-2"
              >
                ¿Olvidó su contraseña?
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <h2 className="text-center text-lg font-semibold text-foreground">
                Recuperar contraseña
              </h2>

              {recoveryError && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {recoveryError}
                </div>
              )}

              {recoverySuccess && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                  {recoverySuccess}
                </div>
              )}

              {recoveryStep === "request" && (
                <form onSubmit={handleRecoverySubmit} className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Ingresa tu correo para recibir un código de verificación de 6 dígitos.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="recovery-email" className="text-sm font-medium text-foreground">
                      Correo electrónico
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@correo.com"
                      className="h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
                  </button>
                </form>
              )}

              {recoveryStep === "verify" && (
                <form onSubmit={handleVerifySubmit} className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Ingresa el código de 6 dígitos enviado a <strong>{email}</strong>
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="code" className="text-sm font-medium text-foreground">
                      Código de verificación
                    </label>
                    <input
                      id="code"
                      type="text"
                      required
                      maxLength={6}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="h-11 rounded-lg border border-input bg-background px-4 text-center text-lg font-bold tracking-widest text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar código"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRecoveryStep("request")}
                    className="text-xs text-primary hover:underline text-center"
                  >
                    ¿No recibiste el código? Reintentar
                  </button>
                </form>
              )}

              {recoveryStep === "reset" && (
                <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Crea una nueva contraseña segura para tu cuenta.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || newPassword.length < 4}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar contraseña"}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setView("login")
                  setRecoveryStep("request")
                }}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors mt-2 text-center"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-sm font-medium text-muted-foreground/60">
          © 2026 desarrollado por Juan Taguado para APS Pereira | Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
