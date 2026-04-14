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
  Stethoscope,
  Baby,
  HeartPulse,
  Home,
  ShieldAlert,
  AlertTriangle,
  Heart,
  Briefcase,
  Layers,
  Accessibility,
  Clock,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export function DashboardHome() {
  const { user, isAdmin, isFacturador } = useAuth()
  // Helper para convertir fechas a fecha local consistente
  const getLocalDateString = (d: Date | string) => {
    if (!d) return "";
    const date = new Date(d);
    // Remove the timezone offset shift to just use local JS Date mapping
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString(new Date());

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
  const { data: usuariosData, error: errUs } = useSWR(user && isAdmin ? "/api/users" : null, fetcher, swrOptions)
  const { data: programasData, error: errPr } = useSWR(user ? "/api/programas" : null, fetcher, swrOptions)
  const { data: stageData, error: errSt } = useSWR(user ? "/api/settings/stage" : null, fetcher, swrOptions)
  const { data: topProfsData } = useSWR(user ? "/api/atenciones/top-profesionales" : null, fetcher, swrOptions)
  const { data: derivPendientesData } = useSWR(user ? "/api/derivaciones/pendientes" : null, fetcher, swrOptions)
  
  const programas = useMemo(() => Array.isArray(programasData) ? programasData : [], [programasData])
  
  const isEnfermeraJefe = useMemo(() => {
    if (!user || user.rol?.toLowerCase() !== 'profesional') return false;
    const prog = programas.find((p: any) => p.id === user.programaId);
    return prog ? prog.nombre.toLowerCase().includes('enfermer') : false;
  }, [user, programas]);
  
  const shouldFetchIdData = user?.rol?.toLowerCase() === "auxiliar" || isAdmin || isEnfermeraJefe || isFacturador;

  const tIds = (isFacturador && user?.territorioIds?.length) 
    ? user.territorioIds.join(',') 
    : (user?.territorioId || "")

  const { data: identificacionesData, error: errId } = useSWR(
    shouldFetchIdData ? `/api/identificaciones?role=${user?.rol}&territorioId=${tIds}` : null,
    fetcher,
    swrOptions
  )
  const { data: terrsData, error: errTerr } = useSWR("/api/territorios", fetcher, swrOptions)
  const { data: idStats } = useSWR(
    shouldFetchIdData ? `/api/identificaciones/stats?role=${user?.rol}&territorioId=${tIds}` : null,
    fetcher,
    swrOptions
  )

  const loading = !atencionesData || (isAdmin && !usuariosData) || !programasData || !stageData || !terrsData || (shouldFetchIdData && (!identificacionesData || !idStats))
  
  const atenciones = useMemo(() => Array.isArray(atencionesData) ? atencionesData : [], [atencionesData])
  const indentificaciones = useMemo(() => Array.isArray(identificacionesData) ? identificacionesData : [], [identificacionesData])
  const usuarios = useMemo(() => Array.isArray(usuariosData) ? usuariosData : [], [usuariosData])
  const terrs = useMemo(() => Array.isArray(terrsData) ? terrsData : [], [terrsData])
  const currentStageStart = useMemo(() => stageData?.currentStageStart || null, [stageData])

  // Territorio del usuario actual (Profesional o Auxiliar)
  const userTerritory = useMemo(() => {
    if (!user?.territorioId) return null;
    const fromApi = terrs.find((t: any) => t.id === user.territorioId);
    if (fromApi) return { label: fromApi.nombre, id: fromApi.codigo };
    return TERRITORIOS.find(t => t.id === user.territorioId);
  }, [user, terrs]);

  // Filtrado Etapa (Atenciones)
  const filteredAtenciones = useMemo(() => {
    if (!currentStageStart) return atenciones;
    return atenciones.filter((a: any) => new Date(a.createdAtISO || (a.fecha + "T00:00:00")) >= new Date(currentStageStart));
  }, [atenciones, currentStageStart]);

  const todayAtenciones = useMemo(() => filteredAtenciones.filter((a: any) => getLocalDateString(a.createdAtISO || a.fecha) === today), [filteredAtenciones, today])
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
      const terrName = idf.territorio || idf.territorioCodigo || "Sin asignar";
      map[terrName] = (map[terrName] || 0) + 1;
    });
    return Object.keys(map).map(terr => ({
      nombre: terr,
      identificaciones: map[terr]
    })).sort((a: any, b: any) => b.identificaciones - a.identificaciones);
  }, [indentificaciones]);

  const chartDataFacturacion = useMemo(() => {
    const map: Record<string, number> = {
      "PENDIENTE": 0,
      "FACTURADA": 0,
      "DEVUELTA": 0,
      "GLOSADA": 0,
      "EVOLUCIONADA_SAFIX": 0
    };
    filteredAtenciones.forEach((a: any) => {
      if (map[a.estadoFacturacion] !== undefined) {
        map[a.estadoFacturacion]++;
      }
    });

    const labels: Record<string, string> = {
      "PENDIENTE": "Pendientes",
      "FACTURADA": "Facturadas",
      "DEVUELTA": "Devueltas",
      "GLOSADA": "Glosadas",
      "EVOLUCIONADA_SAFIX": "SAFIX"
    }

    return Object.keys(map).map(key => ({
      name: labels[key] || key,
      value: map[key]
    })).filter(d => d.value > 0);
  }, [filteredAtenciones]);

  const recentPendingAtenciones = useMemo(() => {
    return filteredAtenciones
      .filter((a: any) => a.estadoFacturacion === "PENDIENTE")
      .sort((a: any, b: any) => {
        const dateA = new Date(a.createdAtISO || a.fecha).getTime();
        const dateB = new Date(b.createdAtISO || b.fecha).getTime();
        return dateB - dateA;
      })
      .slice(0, 6)
  }, [filteredAtenciones]);

  // Lógica Auxiliar: Identificaciones del territorio vs personales
  const countsId = useMemo(() => {
    const list = indentificaciones
    return {
      totalTerritorio: list.length,
      misId: list.filter((f: any) => f.encuestador?.documento === user?.documento).length,
      hoyTerritorio: list.filter((f: any) => getLocalDateString(f.fechaDiligenciamiento) === today).length,
      misHoy: list.filter((f: any) => f.encuestador?.documento === user?.documento && getLocalDateString(f.fechaDiligenciamiento) === today).length,
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

  // Nuevo gráfico: Productividad diaria (Últimos 14 días)
  const chartDataMisAtencionesDiarias = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = misAtenciones.filter((a: any) => (a.createdAtISO || a.fecha).startsWith(dateStr)).length;
      
      // Formatear fecha para el eje X (ej: "14 Abr")
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      data.push({
        nombre: label,
        atenciones: count,
        fechaCompleta: dateStr
      });
    }
    return data;
  }, [misAtenciones])

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

  // Top Profesionales
  const top10Profesionales = useMemo(() => {
    if (Array.isArray(topProfsData) && topProfsData.length > 0) {
      return topProfsData;
    }

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
      return 0; 
    });

    return counts.slice(0, TOP_N_PROFESIONALES);
  }, [usuarios, filteredAtenciones, user, programas, topProfsData]);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const misAtencionesMes = useMemo(() => misAtenciones.filter((a: any) => (a.createdAtISO || a.fecha).startsWith(currentMonthStr)), [misAtenciones, currentMonthStr]);

  const getKpis = () => {
    if (user?.rol === "auxiliar") {
      return [
        {
          label: "Identificaciones (Territorio)",
          value: idStats?.kpis?.totalFichas || 0,
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

    if (isEnfermeraJefe) {
      return [
        {
          label: "Identificaciones en Territorio",
          value: idStats?.kpis?.totalFichas || 0,
          icon: <Database className="h-5 w-5" />,
          color: "bg-chart-2/10 text-chart-2",
        },
        {
          label: "Personas Identificadas",
          value: idStats?.kpis?.totalPacientes || 0,
          icon: <Users className="h-5 w-5" />,
          color: "bg-indigo-100 text-indigo-600",
        },
        {
          label: "Mis Atenciones (Total)",
          value: misAtenciones.length,
          icon: <ClipboardList className="h-5 w-5" />,
          color: "bg-primary/10 text-primary",
        },
        {
          label: "Mis Atenc. (Hoy)",
          value: misAtenciones.filter((a: any) => a.fecha.startsWith(today)).length,
          icon: <TrendingUp className="h-5 w-5" />,
          color: "bg-chart-4/10 text-chart-4",
        }
      ]
    }

    if (isFacturador) {
      return [
        {
          label: "Pendientes",
          value: filteredAtenciones.filter((a: any) => a.estadoFacturacion === "PENDIENTE").length,
          icon: <Clock className="h-5 w-5" />,
          color: "bg-yellow-100 text-yellow-600",
        },
        {
          label: "Facturadas",
          value: filteredAtenciones.filter((a: any) => a.estadoFacturacion === "FACTURADA").length,
          icon: <CheckCircle2 className="h-5 w-5" />,
          color: "bg-purple-100 text-purple-600",
        },
        {
          label: "Devueltas/Glosadas",
          value: filteredAtenciones.filter((a: any) => ["DEVUELTA", "GLOSADA"].includes(a.estadoFacturacion)).length,
          icon: <AlertTriangle className="h-5 w-5" />,
          color: "bg-red-100 text-red-600",
        },
        {
          label: "Sincronizadas SAFIX",
          value: filteredAtenciones.filter((a: any) => a.estadoFacturacion === "EVOLUCIONADA_SAFIX").length,
          icon: <Activity className="h-5 w-5" />,
          color: "bg-green-100 text-green-600",
        }
      ]
    }

    if (isAdmin) {
      return [
        {
          label: "Total Hogares (Efec.)",
          value: idStats?.kpis?.totalFichas || 0,
          icon: <Home className="h-5 w-5" />,
          color: "bg-blue-100 text-blue-600",
        },
        {
          label: "Total Identificados",
          value: idStats?.kpis?.totalPacientes || 0,
          icon: <Users className="h-5 w-5" />,
          color: "bg-indigo-100 text-indigo-600",
        },
        {
          label: "Total Atenciones",
          value: filteredAtenciones.length,
          icon: <ClipboardList className="h-5 w-5" />,
          color: "bg-primary/10 text-primary",
        },
        {
          label: "Sin Aseguramiento",
          value: idStats?.kpis?.sinAseguramiento || 0,
          icon: <ShieldAlert className="h-5 w-5" />,
          color: "bg-orange-100 text-orange-600",
        },
        {
          label: "Remisiones APS",
          value: idStats?.kpis?.remitidos || 0,
          icon: <Activity className="h-5 w-5" />,
          color: "bg-rose-100 text-rose-600",
        },
      ]
    }

    return [
      {
        label: "Mi Programa",
        value: programas.find((p: any) => p.id === user?.programaId)?.nombre || "N/A",
        icon: <Briefcase className="h-5 w-5" />,
        color: "bg-indigo-100 text-indigo-600",
      },
      {
        label: "Mis atenciones",
        value: misAtenciones.length,
        icon: <ClipboardList className="h-5 w-5" />,
        color: "bg-primary/10 text-primary",
      },
      {
        label: "Mis atenciones (Mes)",
        value: misAtencionesMes.length,
        icon: <Calendar className="h-5 w-5" />,
        color: "bg-chart-3/10 text-chart-3",
      },
      {
        label: "Mis atenciones (Hoy)",
        value: misAtenciones.filter((a: any) => a.fecha.startsWith(today)).length,
        icon: <TrendingUp className="h-5 w-5" />,
        color: "bg-chart-4/10 text-chart-4",
      },
      {
        label: "Hombres Atendidos",
        value: misAtenciones.filter((a: any) => String(a.pacienteGenero).toUpperCase() === "HOMBRE").length,
        icon: <Users className="h-5 w-5" />,
        color: "bg-blue-100 text-blue-600",
      },
      {
        label: "Mujeres Atendidas",
        value: misAtenciones.filter((a: any) => String(a.pacienteGenero).toUpperCase() === "MUJER").length,
        icon: <Users className="h-5 w-5" />,
        color: "bg-rose-100 text-rose-600",
      },
      {
        label: "Derivaciones Pendien.",
        value: derivPendientesData?.count || 0,
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "bg-yellow-100 text-yellow-600",
      },
      {
        label: "Atenciones Facturadas",
        value: misAtenciones.filter((a: any) => a.estadoFacturacion === "FACTURADA" || a.estadoFacturacion === "EVOLUCIONADA_SAFIX").length,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: "bg-green-100 text-green-600",
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
              : isFacturador
              ? "Gestión y monitoreo de facturación de atenciones"
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
      <div className={`grid gap-4 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
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

      {idStats && (user?.rol === "auxiliar" || isAdmin || isEnfermeraJefe) && (
        <>
          <div className="flex items-center gap-2 mt-2 border-b border-border pb-2">
            <HeartPulse className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-bold text-foreground">
              Vigilancia Epidemiológica y Demográfica {isEnfermeraJefe && `(Territorio ${userTerritory?.label || ''})`}
            </h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <Baby className="mx-auto h-8 w-8 text-chart-2 mb-2" />
              <p className="text-3xl font-bold text-foreground">{idStats?.kpis?.menores10 || 0}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Niños &lt; 10 años</p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <Activity className="mx-auto h-8 w-8 text-destructive mb-2" />
              <p className="text-3xl font-bold text-foreground">{idStats?.kpis?.gestantes || 0}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Gestantes</p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-orange-500 mb-2" />
              <p className="text-3xl font-bold text-foreground">{idStats?.kpis?.signosDesnutricion || 0}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Desnutrición</p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm text-center">
              <Users className="mx-auto h-8 w-8 text-chart-4 mb-2" />
              <p className="text-3xl font-bold text-foreground">{idStats?.kpis?.mayores60 || 0}</p>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Vejez (60+)</p>
            </div>
          </div>

          {(isAdmin || isEnfermeraJefe) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
               <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-destructive/30">
                 <div className="flex items-center justify-between mb-2">
                   <ShieldAlert className="h-5 w-5 text-destructive" />
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">ALERTA</span>
                 </div>
                 <p className="text-2xl font-bold text-foreground">{idStats?.kpis?.victimas || 0}</p>
                 <p className="text-xs text-muted-foreground font-medium">Víctimas del Conflicto</p>
                 <div className="absolute -bottom-2 -right-2 h-12 w-12 text-destructive/5 group-hover:text-destructive/10 transition-colors">
                    <ShieldAlert className="h-full w-full" />
                 </div>
               </div>

               <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-blue-500/30">
                 <div className="flex items-center justify-between mb-2">
                   <Accessibility className="h-5 w-5 text-blue-500" />
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">INCLUSIÓN</span>
                 </div>
                 <p className="text-2xl font-bold text-foreground">{idStats?.kpis?.conDiscapacidad || 0}</p>
                 <p className="text-xs text-muted-foreground font-medium">PcD (Discapacidad)</p>
                 <div className="absolute -bottom-2 -right-2 h-12 w-12 text-blue-500/5 group-hover:text-blue-500/10 transition-colors">
                    <Accessibility className="h-full w-full" />
                 </div>
               </div>

               <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-rose-500/30">
                 <div className="flex items-center justify-between mb-2">
                   <HeartPulse className="h-5 w-5 text-rose-500" />
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full">ALTA PRIORIDAD</span>
                 </div>
                 <p className="text-2xl font-bold text-foreground">{idStats?.kpis?.hogaresHuerfanas || 0}</p>
                 <p className="text-xs text-muted-foreground font-medium">Enf. Huérfana o Terminal</p>
                 <p className="text-[9px] text-muted-foreground italic mt-1">(Familias con casos)</p>
               </div>

               <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/30">
                 <div className="flex items-center justify-between mb-2">
                   <Heart className="h-5 w-5 text-emerald-500" />
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">PROTECCIÓN</span>
                 </div>
                 <p className="text-2xl font-bold text-emerald-600">
                   {idStats?.aseguramiento?.regimen?.find((r: any) => r.name === "SUBSIDIADO")?.value || 0}
                 </p>
                 <p className="text-xs text-muted-foreground font-medium">Régimen Subsidiado</p>
               </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pirámide Poblacional */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center">
              <div className="w-full mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Cursos de Vida y Género
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                   <div className="flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-[#081e69]"></div>
                     <span className="font-bold">HOMBRES: {idStats?.kpis?.totalHombres || 0}</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-[#eb3b5a]"></div>
                     <span className="font-bold">MUJERES: {idStats?.kpis?.totalMujeres || 0}</span>
                   </div>
                </div>
              </div>
              <div className="w-full h-[300px]">
                {(idStats?.piramide?.length || 0) > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={idStats?.piramide || []} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="oklch(0.9 0.02 285)" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="label" type="category" width={120} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: "var(--card)", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: any, name: string) => [Math.abs(value), name === "mujeres" ? "Mujeres" : "Hombres"]}
                      />
                      <Bar dataKey="hombres" name="Hombres" fill="#081e69" stackId="a" radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="mujeres" name="Mujeres" fill="#eb3b5a" stackId="a" radius={[4, 0, 0, 4]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground mt-20 text-center text-sm">Sin datos para la pirámide poblacional.</p>
                )}
              </div>
            </div>

            {/* Clasificación Socioeconómica y Estilo de Vida */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
              <div className="w-full mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-foreground">
                  Entorno y Vulnerabilidad
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Estratos predominantes</p>
                  <div className="space-y-2">
                    {idStats?.estratos?.slice(0, 3).map((e: any) => (
                      <div key={e.name} className="flex items-center justify-between">
                         <span className="text-sm font-medium">Estrato {e.name}</span>
                         <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-500 uppercase font-bold mb-2">Hábitos Saludables</p>
                  <div className="flex flex-col items-center justify-center pt-2">
                    <Heart className="h-8 w-8 text-emerald-500 animate-pulse mb-1" />
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{idStats?.kpis?.habitosSaludables || 0}</p>
                    <p className="text-[10px] text-emerald-600 text-center">Realizan actividad física</p>
                  </div>
                </div>

                <div className="col-span-2 p-4 rounded-lg bg-orange-50/50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900">
                   <p className="text-[10px] text-orange-700 dark:text-orange-500 uppercase font-bold mb-2">Situaciones de Vulnerabilidad</p>
                   <div className="flex flex-wrap gap-2">
                     {idStats?.vulnerabilidades?.filter((v: any) => !v.name.toLowerCase().includes('ningun')).slice(0, 4).map((v: any) => (
                       <div key={v.name} className="flex items-center gap-2 bg-white/80 dark:bg-black/20 px-3 py-1.5 rounded-md border border-orange-200 dark:border-orange-900 shadow-sm">
                          <span className="text-[11px] font-medium leading-tight max-w-[120px]">{v.name}</span>
                          <span className="text-xs font-bold text-orange-600">{v.value}</span>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart 1: Auxiliar o Admin/Profs */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {isFacturador 
                ? "Distribución por Estado de Facturación" 
                : isAdmin
                  ? "Atenciones por Programa Global"
                  : user?.rol === "auxiliar" || isEnfermeraJefe 
                    ? "Estado de Identificaciones del Territorio" 
                    : "Mi Productividad Semanal (Atenciones)"}
            </h2>
          </div>
          {(isFacturador 
            ? chartDataFacturacion 
            : (isAdmin 
                ? chartDataAtenciones 
                : (user?.rol === "auxiliar" || isEnfermeraJefe 
                    ? chartDataIdAuxiliar 
                    : chartDataMisAtencionesDiarias))).length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              No hay datos para mostrar.
            </div>
          ) : isFacturador ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataFacturacion}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartDataFacturacion.map((entry, index) => {
                      const COLORS = ["#f59e0b", "#9333ea", "#ef4444", "#f97316", "#10b981"];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={isAdmin ? chartDataAtenciones : (user?.rol === "auxiliar" || isEnfermeraJefe ? chartDataIdAuxiliar : chartDataMisAtencionesDiarias)} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
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
                  <Bar 
                    dataKey={isAdmin ? "atenciones" : (user?.rol === "auxiliar" || isEnfermeraJefe ? "cantidad" : "atenciones")} 
                    name={isAdmin ? "Atenciones" : (user?.rol === "auxiliar" || isEnfermeraJefe ? "Cantidad" : "Atenciones")} 
                    fill={isAdmin ? "oklch(0.60 0.2 150)" : (user?.rol === "auxiliar" ? "oklch(0.50 0.18 285)" : "oklch(0.60 0.2 150)")} 
                    radius={[4, 4, 0, 0]} 
                  />
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
                No hay identificaciones registradas.
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
              {isFacturador ? <Clock className="h-5 w-5 text-primary" /> : (user?.rol === "auxiliar" || isEnfermeraJefe ? <Database className="h-5 w-5 text-primary" /> : <ClipboardList className="h-5 w-5 text-primary" />)}
              <h2 className="text-lg font-semibold text-foreground">
                {isFacturador ? "Atenciones Pendientes por Facturar" : (user?.rol === "auxiliar" || isEnfermeraJefe
                  ? "Últimas Identificaciones del Territorio"
                  : `Atenciones recientes del programa`)}
              </h2>
            </div>
            {(isFacturador ? recentPendingAtenciones : (user?.rol === "auxiliar" || isEnfermeraJefe ? recentIdentificaciones : recentAtenciones)).length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No hay {isFacturador ? "atenciones pendientes" : (user?.rol === "auxiliar" || isEnfermeraJefe ? "identificaciones" : "atenciones")} registradas.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {(isFacturador ? recentPendingAtenciones : (user?.rol === "auxiliar" || isEnfermeraJefe ? recentIdentificaciones : recentAtenciones)).map((a: any) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {((user?.rol === "auxiliar" || isEnfermeraJefe) ? (a.direccion || "A") : a.pacienteNombre)
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(user?.rol === "auxiliar" || isEnfermeraJefe) ? a.direccion : a.pacienteNombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(user?.rol === "auxiliar" || isEnfermeraJefe)
                          ? `En: ${a.microterritorio} — ${getRelativeTime(a.fechaDiligenciamiento)}`
                          : (isFacturador 
                              ? `${getProgramaById(a.programaId)?.nombre || "Sin programa"} — ${getRelativeTime(a.createdAtISO, a.fecha)}`
                              : `Por: ${a.profesionalNombre}`)
                        }
                      </p>
                      {((user?.rol === "auxiliar" || isEnfermeraJefe) && a.encuestador) && (
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Por: <span className="font-medium text-foreground/80">{a.encuestador?.nombre} {a.encuestador?.apellidos}</span> - <span>C.C. {a.encuestador?.documento || 'No disp.'}</span>
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
                         En: {a.territorio} — {getRelativeTime(a.fechaDiligenciamiento)}
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

      {/* Top 10 Profesionales */}
      {user?.rol !== "auxiliar" && !isFacturador && (
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
