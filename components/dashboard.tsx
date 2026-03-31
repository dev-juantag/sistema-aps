"use client"
import { useState } from "react"

import { useAuth } from "@/lib/auth-context"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import {
  Heart,
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  FileText,
  BarChart3,
  Map,
  MapPinned,
  Database,
} from "lucide-react"
import { DashboardHome } from "@/components/dashboard-home"
import { AtencionesModule } from "@/components/atenciones-module"
import { AdminUsuarios } from "@/components/admin-usuarios"
import { AdminReportes } from "@/components/admin-reportes"
import { AdminProgramas } from "@/components/admin-programas"
import { AdminTerritorios } from "@/components/admin-territorios"
import { AdminPacientes } from "@/components/admin-pacientes"
import { IdentificacionesModule } from "@/components/identificaciones-module"
import { MiTerritorioModule } from "@/components/mi-territorio-module"
import { AdminConsolidadoTerritorios } from "@/components/admin-consolidado-territorios"

type View = "inicio" | "atenciones" | "usuarios" | "territorios" | "reportes" | "programas" | "pacientes" | "identificaciones" | "mi-territorio" | "consolidado-territorios"

interface NavItem {
  id: View
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

export function Dashboard() {
  const { user, logout, isAdmin } = useAuth()
  const [activeView, setActiveView] = useState<View>("inicio")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: rawProgramas } = useSWR("/api/programas", fetcher)
  const programas = Array.isArray(rawProgramas) ? rawProgramas : []

  const isEnfermeria = () => {
    if (!user || user.rol !== 'profesional' || !user.programaId) return false;
    const prog = programas.find((p: any) => String(p.id) === String(user.programaId));
    return prog ? prog.nombre.toLowerCase().includes('enfermer') : false;
  }

  const navItems: NavItem[] = [
    { id: "inicio", label: "Inicio", icon: <LayoutDashboard className="h-5 w-5" /> },
  ]
  
  if (user?.rol === "profesional" || isAdmin || user?.rol === "superadmin") {
    navItems.push({ id: "atenciones", label: "Atenciones", icon: <ClipboardList className="h-5 w-5" /> })
  }
  
  if (user?.rol === "auxiliar" || isAdmin || user?.rol === "superadmin" || isEnfermeria()) {
    navItems.push({ id: "identificaciones", label: "Identificaciones", icon: <Database className="h-5 w-5" /> })
  }

  if (user?.rol === "profesional" || user?.rol === "auxiliar") {
    navItems.push({ id: "mi-territorio", label: "Mi Territorio", icon: <MapPinned className="h-5 w-5" /> })
  }

  if (isAdmin || user?.rol === "superadmin") {
    navItems.push({ id: "consolidado-territorios", label: "Consolidado Territorios", icon: <MapPinned className="h-5 w-5" /> })
  }

  const adminNavItems: NavItem[] = [
    { id: "usuarios", label: "Usuarios", icon: <Users className="h-5 w-5" />, adminOnly: true },
    { id: "territorios", label: "Territorios", icon: <Map className="h-5 w-5" />, adminOnly: true },
    { id: "programas", label: "Programas", icon: <Settings className="h-5 w-5" />, adminOnly: true },
    { id: "reportes", label: "Reportes", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true },
    { id: "pacientes", label: "Pacientes", icon: <FileText className="h-5 w-5" />, adminOnly: true },
  ]

  const filteredNav = navItems

  const renderView = () => {
    switch (activeView) {
      case "inicio":
        return <DashboardHome />
      case "atenciones":
        return <AtencionesModule />
      case "identificaciones":
        return <IdentificacionesModule />
      case "mi-territorio":
        return <MiTerritorioModule />
      case "consolidado-territorios":
        return isAdmin ? <AdminConsolidadoTerritorios /> : <DashboardHome />
      case "usuarios":
        return isAdmin ? <AdminUsuarios /> : null
      case "territorios":
        return isAdmin ? <AdminTerritorios /> : null
      case "reportes":
        return isAdmin ? <AdminReportes /> : null
      case "programas":
        return isAdmin ? <AdminProgramas /> : null
      case "pacientes":
        return isAdmin ? <AdminPacientes /> : null
      default:
        return <DashboardHome />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 h-[100dvh] overflow-y-auto print:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          {/* 
            CAMBIAR LOGO AQUI (Sidebar): 
            Reemplazar el contenedor con el icono <Heart /> por tu logo o imagen
            Ejemplo: <img src="/tu-logo.png" className="h-9 w-9 object-contain" />
          */}
          <img src="/icon.svg" alt="Logo ESE" className="h-10 w-auto max-w-[140px]" />
          <div className="flex flex-col">
            {/* CAMBIAR NOMBRE DEL APLICATIVO AQUI */}
            <span className="text-sm font-bold leading-tight text-sidebar-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              APS Pereira
            </span>
            <span className="text-[11px] text-sidebar-foreground/60">Gestion de Atenciones</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer"
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Menu principal
          </div>
          <ul className="flex flex-col gap-1">
            {filteredNav.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveView(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeView === item.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    }`}
                >
                  {item.icon}
                  {item.label}
                  {activeView === item.id && <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <div className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Administracion
              </div>
              <ul className="flex flex-col gap-1">
                {adminNavItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveView(item.id)
                        setSidebarOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeView === item.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`}
                    >
                      {item.icon}
                      {item.label}
                      {activeView === item.id && <ChevronRight className="ml-auto h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Brand / Credits */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-center text-sidebar-foreground/30 font-medium">
            © 2026 Juan Taguado – Todos los derechos reservados
          </p>
        </div>

        {/* User info & logout */}
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {user?.nombre?.[0]}
              {user?.apellidos?.[0]}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">
                {user?.nombre} {user?.apellidos}
              </span>
              <span className="text-[11px] capitalize text-sidebar-foreground/60">
                {user?.rol}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-64 min-w-0 print:m-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6 print:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground line-clamp-1 max-w-[150px] sm:max-w-none">
                {user?.nombre} {user?.apellidos}
              </p>
              <p className="text-[11px] text-muted-foreground capitalize">{user?.rol}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0 shadow-sm">
              {user?.nombre?.[0]}
              {user?.apellidos?.[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{renderView()}</main>
      </div>
    </div>
  )
}
