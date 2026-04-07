"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
type Role = "superadmin" | "admin" | "profesional" | "auxiliar" | "facturador" | "ADMIN" | "PROFESIONAL" | "SUPERADMIN" | "AUXILIAR" | "FACTURADOR"

interface AuthUser {
  id: string
  nombre: string
  apellidos: string
  rol: Role
  programaId?: string | null
  territorioId?: string | null
  territorioIds?: string[] | null
  documento?: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  isAdmin: boolean
  isSuperAdmin: boolean
  isProfesional: boolean
  isFacturador: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    // Check if we have a persisted user
    const storedUser = localStorage.getItem("salud-pereira-user")
    const storedToken = localStorage.getItem("salud-pereira-token")

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Failed to parse stored user", e)
      }
    }
    setIsInitializing(false)
  }, [])

  const login = useCallback((user: AuthUser, token: string) => {
    setUser(user)
    localStorage.setItem("salud-pereira-user", JSON.stringify(user))
    localStorage.setItem("salud-pereira-token", token)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("salud-pereira-user")
    localStorage.removeItem("salud-pereira-token")
  }, [])

  // Timeout de inactividad: 10 minutos (600000 ms)
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        // Opcional: recargar para limpiar estado si es necesario
        window.location.reload(); 
      }, 600000);
    };

    const handleActivity = () => {
      resetTimeout();
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    resetTimeout(); // iniciar al entrar

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user, logout]);

  const isSuperAdmin = user?.rol?.toLowerCase() === "superadmin"
  const isAdmin = user?.rol?.toLowerCase() === "admin" || isSuperAdmin
  const isProfesional = user?.rol?.toLowerCase() === "profesional"
  const isFacturador = user?.rol?.toLowerCase() === "facturador"

  if (isInitializing) {
    return null // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin, isProfesional, isFacturador }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
