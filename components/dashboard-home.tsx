"use client"

import { useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { TERRITORIOS } from "@/lib/constants"
import {
  ClipboardList,
  Users,
  Activity,
  Calendar,
  TrendingUp,
  Trophy,
  Database,
  CheckCircle2,
  MapPin,
  Stethoscope
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export function DashboardHome() {
  const { user, isAdmin } = useAuth()
  const today = new Date().toISOString().slice(0, 10)

  // Helper para tiempo relativo
  const getRelativeTime = (isoString?: string, defaultDateStr?: string) => {
    if (!isoString && !defaultDateStr) return "hace poco";
    
    // Si no hay timestamp ISO, usamos la fecha default pero es menos preciso
    const date = isoString ? new Date(isoString) : new Date(defaultDateStr + "T00:00:00");
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "hace unos segundos";
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "hace 1 día";
    if (diffDays < 30) return `hace ${diffDays} días`;
    
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "hace 1 mes";
    return `hace ${diffMonths} meses`;
  };

  const TOP_N_PROFESIONALES = 10;

  const swrOptions = {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 120000 // 2 minutos sin volver a saturar el backend
  };

  const { data: atencionesData, error: errAt } = useSWR(user ? "/api/atenciones" : null, fetcher, swrOptions)
  const { data: usuariosData, error: errUs } = useSWR(user ? "/api/users" : null, fetcher, swrOptions)
  const { data: programasData, error: errPr } = useSWR(user ? "/api/programas" : null, fetcher, swrOptions)
  const { data: stageData, error: errSt } = useSWR(user ? "/api/settings/stage" : null, fetcher, swrOptions)
  const { data: identificacionesData, error: errId } = useSWR(
    user?.rol === "auxiliar" || isAdmin ? `/api/identificaciones?role=${user?.rol}&territorioId=${user?.rol === "auxiliar" ? user?.territorioId : ""}` : null,
    fetcher,
    swrOptions
  )
  const { data: terrsData, error: errTerr } = useSWR("/api/territorios", fetcher, swrOptions)

  const loading = !atencionesData || !usuariosData || !programasData || !stageData || !terrsData || ((user?.rol === "auxiliar" || isAdmin) && !identificacionesData)
  
  const atenciones = useMemo(() => Array.isArray(atencionesData) ? atencionesData : [], [atencionesData])
  const indentificaciones = useMemo(() => Array.isArray(identificacionesData) ? identificacionesData : [], [identificacionesData])
  const usuarios = useMemo(() => Array.isArray(usuariosData) ? usuariosData : [], [usuariosData])
  const programas = useMemo(() => Array.isArray(programasData) ? programasData : [], [programasData])
  const terrs = useMemo(() => Array.isArray(terrsData) ? terrsData : [], [terrsData])
  const currentStageStart = useMemo(() => stageData?.currentStageStart || null, [stageData])

  // Territorio del usuario actual (Profesional o Auxiliar)
  const userTerritory = useMemo(() => {
    if (!user?.territorioId) return null;
    const fromApi = terrs.find((t: any) => t.id === user.territorioId);
    if (fromApi) return { label: fromApi.nombre, id: fromApi.codigo };
    
    // Si no está en BD (uso de código temporal en localstorage), busca en constantes
    return TERRITORIOS.find(t => t.id === user.territorioId);
  }, [user, terrs]);

  // Filtrado Etapa (Atenciones)
  const filteredAtenciones = useMemo(() => {
    if (!currentStageStart) return atenciones;
    return atenciones.filter((a: any) => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) >= new Date(currentStageStart));
  }, [atenciones, currentStageStart]);

  const todayAtenciones = useMemo(() => filteredAtenciones.filter((a: any) => a.fecha.startsWith(today)), [filteredAtenciones, today])
  const misAtenciones = useMemo(() => filteredAtenciones.filter((a: any) => a.profesionalId === user?.id), [filteredAtenciones, user])
  
  const profesionalesActivos = useMemo(() => usuarios.filter((u: any) => u.rol === "profesional" && u.activo !== false).length, [usuarios])
  const auxiliaresActivos = useMemo(() => usuarios.filter((u: any) => u.rol === "auxiliar" && u.activo !== false).length, [usuarios])

  const getProgramaById = (id: string) => programas.find((p: any) => p.id === id)

  // Datos para chart: Atenciones por programa globales
  const chartDataAtenciones = useMemo(() => {
    return programas.map((p: any) => ({
      nombre: p.nombre.length > 12 ? p.nombre.slice(0, 12) + "..." : p.nombre,
      atenciones: filteredAtenciones.filter((a: any) => a.programaId === p.id).length,
    })).filter((d: any) => d.atenciones > 0)
  }, [programas, filteredAtenciones])

  // Datos para chart: Identificaciones por territorio globales (Admin)
  const chartDataIdentificacionesRoles = useMemo(() => {
    const map: Record<string, number> = {};
    indentificaciones.forEach((idf: any) => {
      const terrId = idf.territorioCodigo || "Sin asignar";
      map[terrId] = (map[terrId] || 0) + 1;
    });
    return Object.keys(map).map(terr => ({
      nombre: terr,
      identificaciones: map[terr]
    })).sort((a,b) => b.identificaciones - a.identificaciones);
  }, [indentificaciones]);

  // Lógica Auxiliar: Identificaciones del territorio vs personales
  const countsId = useMemo(() => {
    const list = indentificaciones
    return {
      totalTerritorio: list.length,
      misId: list.filter((f: any) => f.encuestador?.documento === user?.documento).length,
      hoyTerritorio: list.filter((f: any) => f.fechaDiligenciamiento.startsWith(today)).length,
      misHoy: list.filter((f: any) => f.encuestador?.documento === user?.documento && f.fechaDiligenciamiento.startsWith(today)).length,
    }
  }, [indentificaciones, user, today])

  const chartDataIdAuxiliar = useMemo(() => {
    const counts: Record<string, number> = {}
    indentificaciones.forEach((f: any) => {
      const estado = f.estadoVisita || "Desconocido"
      counts[estado] = (counts[estado] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      nombre: name === "1" ? "Efectiva" : (name === "2" ? "No Efectiva" : "Negada"),
      cantidad: value
    }))
  }, [indentificaciones])

  const recentIdentificaciones = useMemo(() => {
    return [...indentificaciones].slice(0, 5)
  }, [indentificaciones])

  const recentAtenciones = useMemo(() => {
    if (isAdmin) {
      return [...filteredAtenciones].slice(0, 5)
    } else {
      return filteredAtenciones.filter((a: any) => a.programaId === user?.programaId).slice(0, 5)
    }
  }, [filteredAtenciones, isAdmin, user])

  // Top Profesionales (Solo Admin o Profesional)
  const top10Profesionales = useMemo(() => {
    if (!usuarios.length) return [];
    const profs = usuarios.filter((u: any) => u.rol === "profesional" && u.activo !== false);
    
    const counts = profs.map((p: any) => {
      const atencionesProf = filteredAtenciones.filter((a: any) => a.profesionalId === p.id);
      const atencCount = atencionesProf.length;
      const ultimaAtencion = atencionesProf.length > 0 
        ? new Date(atencionesProf[0].createdAtISO || `${atencionesProf[0].fecha}T00:00:00.000Z`).getTime() 
        : 0;

      const prog = getProgramaById(p.programaId);
      return { ...p, atencCount, ultimaAtencion, programaNombre: prog?.nombre || "Sin programa" };
    });
    
    counts.sort((a: any, b: any) => {
      if (b.atencCount !== a.atencCount) return b.atencCount - a.atencCount;
      if (a.ultimaAtencion !== b.ultimaAtencion) return a.ultimaAtencion - b.ultimaAtencion;
      if (a.atencCount === 0 && b.atencCount === 0) {
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;
      }
      return 0; 
    });

    return counts.slice(0, TOP_N_PROFESIONALES);
  }, [usuarios, filteredAtenciones, user, programas]);


  const getKpis = () => {
    if (user?.rol === "auxiliar") {
      return [
        {
          label: "Identificaciones (Territorio)",
          value: countsId.totalTerritorio,
          icon: <MapPin className="h-5 w-5" />,
          color: "bg-primary/10 text-primary",
        },
        {
          label: "Mis identificaciones",
          value: countsId.misId,
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: "bg-chart-2/10 text-chart-2",
        },
        {
          label: "Hoy en Territorio",
          value: countsId.hoyTerritorio,
          icon: <Calendar className="h-5 w-5" />,
          color: "bg-chart-3/10 text-chart-3",
        },
        {
          label: "Mis Registros Hoy",
          value: countsId.misHoy,
          icon: <Activity className="h-5 w-5" />,
          color: "bg-chart-4/10 text-chart-4",
        }
      ]
    }

    if (isAdmin) {
      return [
        {
          label: "Total Atenciones",
          value: filteredAtenciones.length,
          icon: <ClipboardList className="h-5 w-5" />,
          color: "bg-primary/10 text-primary",
        },
        {
          label: "Total Identificaciones",
          value: indentificaciones.length,
          icon: <Database className="h-5 w-5" />,
          color: "bg-chart-2/10 text-chart-2",
        },
        {
          label: "Profesionales Activos",
          value: profesionalesActivos,
          icon: <Stethoscope className="h-5 w-5" />,
          color: "bg-chart-3/10 text-chart-3",
        },
        {
          label: "Auxiliares Activos",
          value: auxiliaresActivos,
          icon: <Users className="h-5 w-5" />,
          color: "bg-chart-4/10 text-chart-4",
        },
        {
          label: "# Programas",
          value: programas.length,
          icon: <Activity className="h-5 w-5" />,
          color: "bg-indigo-100 text-indigo-600",
        },
        {
          label: "# Territorios (Con ids)",
          value: chartDataIdentificacionesRoles.length,
          icon: <MapPin className="h-5 w-5" />,
          color: "bg-fuchsia-100 text-fuchsia-600",
        },
        {
          label: "Atenciones Pendientes Facturar",
          value: filteredAtenciones.filter((a: any) => a.estadoFacturacion === "PENDIENTE").length,
          icon: <Database className="h-5 w-5" />,
          color: "bg-rose-100 text-rose-600",
        },
      ]
    }

    return [
      {
        label: "Mi programa",
        value: getProgramaById(user?.programaId || "")?.nombre || "—",
        icon: <Activity className="h-5 w-5" />,
        color: "bg-chart-2/10 text-chart-2",
      },
      {
        label: "Mis atenciones",
        value: misAtenciones.length,
        icon: <ClipboardList className="h-5 w-5" />,
        color: "bg-primary/10 text-primary",
      },
      {
        label: "Todas las atenciones de hoy",
        value: todayAtenciones.length,
        icon: <Calendar className="h-5 w-5" />,
        color: "bg-chart-3/10 text-chart-3",
      },
      {
        label: "Mis atenciones (Hoy)",
        value: misAtenciones.filter((a: any) => a.fecha.startsWith(today)).length,
        icon: <TrendingUp className="h-5 w-5" />,
        color: "bg-chart-4/10 text-chart-4",
      }
    ]
  }

  const kpis = getKpis()

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center p-8 text-muted-foreground text-sm">
        Cargando panel de resumen...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full min-w-0 overflow-hidden">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bienvenid@, {user?.nombre}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.rol === "auxiliar"
              ? "Métricas y datos estadísticos focalizados en tu territorio asignado"
              : isAdmin
              ? "Resumen consolidado global del sistema APS"
              : "Resumen institucional y personal de gestión de atenciones"}
          </p>
        </div>
        {(user?.rol === "profesional" || user?.rol === "auxiliar") && userTerritory && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#097b2c]/10 text-[#097b2c] border border-[#097b2c]/30 rounded-full shadow-sm text-sm font-bold shrink-0 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-500">
            <MapPin className="w-4 h-4" />
            Perteneces al territorio: {userTerritory.label} ({userTerritory.id})
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-4 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.color}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-tight mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground leading-none">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Auxiliar o Admin/Profs */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {user?.rol === "auxiliar" ? "Estado de Identificaciones del Territorio" : "Todas las Atenciones por Programa"}
            </h2>
          </div>
          {(user?.rol === "auxiliar" ? chartDataIdAuxiliar : chartDataAtenciones).length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No hay datos para mostrar.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={user?.rol === "auxiliar" ? chartDataIdAuxiliar : chartDataAtenciones} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.02 285)" />
                  <XAxis
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(1 0 0)",
                      border: "1px solid oklch(0.90 0.02 285)",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey={user?.rol === "auxiliar" ? "cantidad" : "atenciones"} name={user?.rol === "auxiliar" ? "Cantidad" : "Atenciones"} fill="oklch(0.50 0.18 285)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2 o Recientes dependiendo del rol */}
        {isAdmin ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-chart-2" />
              <h2 className="text-lg font-semibold text-foreground">Identificaciones por Territorio</h2>
            </div>
            {chartDataIdentificacionesRoles.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay identificaciones.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataIdentificacionesRoles} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.02 285)" />
                    <XAxis
                      dataKey="nombre"
                      tick={{ fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      height={60}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(1 0 0)",
                        border: "1px solid oklch(0.90 0.02 285)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="identificaciones" name="Identificaciones" fill="oklch(0.65 0.18 100)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              {user?.rol === "auxiliar" ? <Database className="h-5 w-5 text-primary" /> : <ClipboardList className="h-5 w-5 text-primary" />}
              <h2 className="text-lg font-semibold text-foreground">
                {user?.rol === "auxiliar" 
                  ? "Últimas Identificaciones del Territorio"
                  : `Atenciones recientes del programa`}
              </h2>
            </div>
            {(user?.rol === "auxiliar" ? recentIdentificaciones : recentAtenciones).length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay {user?.rol === "auxiliar" ? "identidficaciones" : "atenciones"} registradas.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {(user?.rol === "auxiliar" ? recentIdentificaciones : recentAtenciones).map((a: any) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(user?.rol === "auxiliar" ? (a.direccion || "A") : a.pacienteNombre)
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.rol === "auxiliar" ? a.direccion : a.pacienteNombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.rol === "auxiliar"
                          ? `En: ${a.territorio} — ${getRelativeTime(a.createdAtISO, a.fechaDiligenciamiento)}`
                          : `Por: ${a.profesionalNombre} - ${getRelativeTime(a.createdAtISO, a.fecha)}`
                        }
                      </p>
                      {(user?.rol === "auxiliar" && a.encuestador) && (
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Por: <span className="font-medium text-foreground/80">{a.encuestador?.nombre} {a.encuestador?.apellidos}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recientes Atenciones */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
             <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Atenciones Recientes Globales</h2>
            </div>
             {recentAtenciones.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay atenciones registradas.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentAtenciones.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {a.pacienteNombre.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.pacienteNombre}</p>
                      <p className="text-xs text-muted-foreground">
                         {getProgramaById(a.programaId)?.nombre} — {getRelativeTime(a.createdAtISO, a.fecha)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                        Por: <span className="font-medium text-foreground/80">{a.profesionalNombre}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Recientes Identificaciones */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
             <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-chart-2" />
              <h2 className="text-lg font-semibold text-foreground">Identificaciones Recientes Globales</h2>
            </div>
             {recentIdentificaciones.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay identificaciones registradas.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentIdentificaciones.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                     <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chart-2/10 text-xs font-bold text-chart-2">
                      {(a.direccion || "A").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.direccion}</p>
                      <p className="text-xs text-muted-foreground">
                        En: {a.territorio} — {getRelativeTime(a.createdAtISO, a.fechaDiligenciamiento)}
                      </p>
                      {a.encuestador && (
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Por: <span className="font-medium text-foreground/80">{a.encuestador?.nombre} {a.encuestador?.apellidos}</span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Top 10 Profesionales (Solo Profs o Admin) */}
      {user?.rol !== "auxiliar" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm mx-auto w-full lg:w-3/4 xl:w-2/3">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning fill-chart-4 text-chart-4" />
              <h2 className="text-lg font-semibold text-foreground">
                Top {TOP_N_PROFESIONALES} Profesionales con más atenciones
              </h2>
            </div>
            <div className="text-xs bg-muted/40 text-muted-foreground px-3 py-1.5 rounded-full border border-border">
              Ránking Institucional
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground w-12 sm:w-16">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Profesional</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">Programa</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Atenciones</th>
                </tr>
              </thead>
              <tbody>
                {top10Profesionales.map((prof: any, index: number) => (
                  <tr 
                    key={prof.id} 
                    className={`border-b border-border last:border-0 transition-colors ${
                      prof.id === user?.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-muted-foreground">
                      {index === 0 ? <Trophy className="h-4 w-4 text-warning" /> : `#${index + 1}`}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-2 line-clamp-1">
                        {prof.id === user?.id && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Tú</span>}
                        <span className="sm:hidden">{prof.nombre?.split(' ')[0]} {prof.apellidos?.split(' ')[0]}</span>
                        <span className="hidden sm:inline">{prof.nombre} {prof.apellidos}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground sm:hidden">
                        {prof.programaNombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {prof.programaNombre}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-bold rounded-md px-2.5 py-1 min-w-[3rem]">
                        {prof.atencCount}
                      </span>
                    </td>
                  </tr>
                ))}
                {top10Profesionales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay profesionales registrados en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
