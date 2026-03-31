"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/lib/auth-context";
import { Map, Users, Link2, ExternalLink, Activity, Hash, AlertTriangle, ShieldCheck } from "lucide-react";

export function MiTerritorioModule() {
  const { user } = useAuth();
  
  const { data: territorio, error, isLoading } = useSWR("/api/mi-territorio", fetcher);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        <p className="font-medium">Cargando la información de su territorio...</p>
      </div>
    );
  }

  if (error || !territorio) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Mi Territorio</h1>
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 opacity-80" />
          <h2 className="text-lg font-bold mb-1">Información no disponible</h2>
          <p className="text-sm">
            {error?.message || "No parece estar asignado a ningún territorio activo actualmente. Por favor, comuníquese con su administrador si esto es un error."}
          </p>
        </div>
      </div>
    );
  }

  // Filtrar usuarios inactivos o mostrar un estado
  const rawUsuarios = territorio.usuarios || [];
  
  // Ordenar usuarios: Jefe de enfermería siempre primero, luego el resto
  const usuarios = [...rawUsuarios].sort((a: any, b: any) => {
    const isLeadA = a.rol === 'PROFESIONAL' && a.programa?.nombre?.toLowerCase().includes('enfermer');
    const isLeadB = b.rol === 'PROFESIONAL' && b.programa?.nombre?.toLowerCase().includes('enfermer');
    if (isLeadA && !isLeadB) return -1;
    if (!isLeadA && isLeadB) return 1;
    return 0;
  });

  const profesionales = usuarios.filter((u: any) => u.rol === 'PROFESIONAL' && u.activo);
  const auxiliares = usuarios.filter((u: any) => u.rol === 'AUXILIAR' && u.activo);
  const gestores = usuarios.filter((u: any) => !['PROFESIONAL', 'AUXILIAR'].includes(u.rol) && u.activo);
  
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mi Territorio</h1>
          <p className="text-muted-foreground">
            Consulta los detalles de asignación y miembros del territorio en el que te encuentras trabajando.
          </p>
        </div>
        {user?.territorioId === territorio.id && (
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/10 pl-3 pr-4 py-1.5 text-sm font-semibold text-primary">
            <Activity className="h-4 w-4" />
            Viculado Activamente
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card: Detalles del Territorio */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl border bg-card p-6 shadow-sm overflow-hidden relative">
          <Map className="absolute -right-6 -bottom-6 h-32 w-32 text-primary/5 opacity-30 select-none pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Map className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-none">{territorio.nombre}</h2>
              <span className="text-sm font-medium text-muted-foreground mt-1 block">Código: {territorio.codigo}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-widest mb-1">Descripción de la zona</h3>
            <p className="text-muted-foreground leading-relaxed">
              {territorio.descripcion || "Este territorio aún no tiene una descripción detallada registrada en el sistema."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t pt-4">
             <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase font-bold">Total Integrantes</span>
                <span className="text-2xl font-black">{usuarios.length}</span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase font-bold">Profesionales</span>
                <span className="text-2xl font-black text-blue-600">{profesionales.length}</span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase font-bold">Auxiliares</span>
                <span className="text-2xl font-black text-rose-600">{auxiliares.length}</span>
             </div>
          </div>
        </div>

        {/* Card: WhatsApp Link */}
        <div className="col-span-1 rounded-2xl border bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 shadow-sm flex flex-col items-start relative overflow-hidden">
             {/* Decorativo */}
             <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
             
             <div className="rounded-xl bg-green-500/20 p-3 text-green-700 mb-4 ring-1 ring-green-500/30">
               <Link2 className="h-6 w-6" />
             </div>
             <h2 className="text-lg font-bold mb-2">Comunidad y Coordinación</h2>
             <p className="text-sm text-muted-foreground mb-6 flex-1">
               Únase al grupo de comunicación oficial de WhatsApp para este territorio para mantenerse al tanto de las novedades y coordinar operativos.
             </p>

             {territorio.whatsappLink ? (
               <a 
                 href={territorio.whatsappLink} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-105 hover:bg-green-700 shadow-md shadow-green-600/20"
               >
                 Abrir Chat Grupo <ExternalLink className="h-4 w-4" />
               </a>
             ) : (
               <div className="w-full rounded-xl border border-dashed border-green-500/40 bg-green-500/5 p-4 text-center">
                 <p className="text-sm font-medium text-green-700">Enlace no configurado</p>
                 <span className="text-xs text-green-700/70">Solicite al administrador que lo añada</span>
               </div>
             )}
        </div>
      </div>

      {/* Tabla Integrantes */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="border-b p-5 flex items-center gap-3 bg-muted/20">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Listado de Integrantes Asignados</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-medium">
                  <th className="px-5 py-3 rounded-tl-lg">Nombre del Colaborador</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3">Documento</th>
                  <th className="px-5 py-3 text-right">Contacto</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u: any) => {
                  const esTuUser = user?.id === u.id;
                  const esEnfermeraJefe = u.rol === 'PROFESIONAL' && u.programa?.nombre?.toLowerCase().includes('enfermer');
                  
                  return (
                  <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 transition-all ${!u.activo ? 'opacity-50 blur-[0.5px]' : ''} ${esEnfermeraJefe ? 'bg-blue-50/80 dark:bg-blue-900/30 border-l-4 border-l-blue-600 shadow-[inset_0_1px_0_0_rgba(37,99,235,0.1)]' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                         <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs ring-1 ${esEnfermeraJefe ? 'bg-blue-600 text-white ring-blue-400' : 'bg-primary/10 text-primary ring-primary/20'}`}>
                           {esEnfermeraJefe ? <ShieldCheck className="h-5 w-5" /> : `${u.nombre.charAt(0)}${u.apellidos.charAt(0)}`}
                         </div>
                         <div className="flex flex-col">
                           <span className="font-bold text-foreground flex items-center gap-2">
                             {u.nombre} {u.apellidos} 
                             {esTuUser && <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider">Tú</span>}
                             {esEnfermeraJefe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-wider shadow-sm flex items-center gap-1">Jefe</span>}
                             {!u.activo && <span className="text-xs text-destructive font-medium">(Inactivo)</span>}
                           </span>
                           <span className="text-xs text-muted-foreground">{u.programa?.nombre || 'Miembro del Equipo'}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${
                        esEnfermeraJefe ? 'bg-blue-600 text-white border-transparent' :
                        u.rol === 'PROFESIONAL' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        u.rol === 'AUXILIAR' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-sans text-xs text-muted-foreground">
                      {u.documento}
                    </td>
                    <td className="px-5 py-4 text-right">
                       <span className={`text-sm font-bold ${esEnfermeraJefe ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
                         {u.telefono || "Sin teléfono"}
                       </span>
                    </td>
                  </tr>
                )})}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground italic">
                      No hay integrantes asignados a este territorio.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
