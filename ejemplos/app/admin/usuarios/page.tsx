'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserCog, ShieldAlert, Plus, X, Loader2, CheckCircle2, ShieldCheck, User, Trash2, Edit2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const userSchema = z.object({
  nombre: z.string().min(2, 'Requiere 2+ caracteres').regex(/^[a-zA-Z\s]+$/, 'Solo letras'),
  apellidos: z.string().min(2, 'Requiere 2+ caracteres').regex(/^[a-zA-Z\s]+$/, 'Solo letras'),
  documento: z.string().min(6, 'Mínimo 6 dígitos').regex(/^\d+$/, 'Solo números'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'OPERADOR', 'SUPER_ADMIN'], { required_error: 'Seleccione un rol' }),
})

type UserForm = z.infer<typeof userSchema>

type DBUser = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  documento: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERADOR';
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function GestionUsuarios() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [users, setUsers] = useState<DBUser[]>([])
  const [loading, setLoading] = useState(true)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<DBUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'OPERADOR' }
  })

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          document.cookie = 'session=; path=/; max-age=0'
          router.replace('/login')
        } else if (data.role === 'OPERADOR') {
          router.replace('/')
        } else {
          setMyRole(data.role)
          setMounted(true)
          fetchUsers()
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: UserForm) => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      if (editingUser) {
        // Edit flow
        const resp = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: data.nombre,
            apellidos: data.apellidos,
            documento: data.documento,
            role: data.role
          })
        })
        const result = await resp.json()
        if (!resp.ok) throw new Error(result.error || 'Error al editar usuario')
      } else {
        // Create flow
        if (!data.email || !data.password) throw new Error('Email y password requeridos')
        const resp = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        const result = await resp.json()
        if (!resp.ok) throw new Error(result.error || 'Error al crear usuario')
      }

      setModalOpen(false)
      reset()
      setEditingUser(null)
      fetchUsers()
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (u: DBUser) => {
    setEditingUser(u)
    reset({
      nombre: u.nombre || '',
      apellidos: u.apellidos || '',
      documento: u.documento || '',
      email: u.email || '',
      role: u.role,
      password: '' // can't edit password here easily
    })
    setSubmitError(null)
    setModalOpen(true)
  }

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`¿Estás totalmente seguro de revocar el acceso y eliminar permanentemente a ${name}?`)) return
    
    try {
      const resp = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!resp.ok) {
        const d = await resp.json()
        alert(d.error || 'Error eliminando usuario')
        return
      }
      fetchUsers()
    } catch (e: any) {
      alert(e.message)
    }
  }

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gestión del Staff</h1>
            <p className="text-sm text-slate-500 font-medium">Control de acceso de Supervisores y Operadores</p>
          </div>
        </div>
        
        <button
          onClick={() => { setSubmitError(null); setEditingUser(null); reset({ role: 'OPERADOR', nombre: '', apellidos: '', documento: '', email: '', password: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="h-64 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="h-48 flex flex-col justify-center items-center text-slate-400 text-sm">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
            No hay usuarios registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Cédula</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Nombre</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Email</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Rol</th>
                  <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800">Estado</th>
                  {myRole === 'SUPER_ADMIN' && <th className="font-bold py-4 px-6 border-b border-slate-100 dark:border-slate-800 text-right">Opciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                      {u.documento}
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60">
                      <p className="font-bold text-slate-900 dark:text-white">{u.nombre} {u.apellidos}</p>
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60 text-sm font-medium text-slate-500">
                      {u.email}
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {u.role === 'SUPER_ADMIN' ? <ShieldAlert className="w-3 h-3" /> : u.role === 'ADMIN' ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60">
                      {u.active ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    {myRole === 'SUPER_ADMIN' && (
                      <td className="py-4 px-6 border-b border-slate-50 dark:border-slate-800/60 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(u)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id, `${u.nombre} ${u.apellidos}`)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Deshabilitar/Borrar Permanente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Usuario */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && setModalOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalOpen(false)} disabled={submitting} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Nombres *</label>
                  <input {...register('nombre')} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Juan" />
                  {errors.nombre && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Apellidos *</label>
                  <input {...register('apellidos')} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Pérez" />
                  {errors.apellidos && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.apellidos.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Cédula de Identidad *</label>
                <input {...register('documento')} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Sin puntos ni espacios" />
                {errors.documento && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.documento.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Correo Electrónico (Login) {editingUser ? '(Solo Lectura)' : '*'}</label>
                <input {...register('email')} type="email" disabled={!!editingUser} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 disabled:opacity-50 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="correo@institucional.co" />
                {errors.email && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Rol a Asignar *</label>
                  <select {...register('role')} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-semibold">
                    <option value="OPERADOR">Operador (Solo Fichas)</option>
                    <option value="ADMIN">Administrador (Kpis y CSV)</option>
                    {myRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Administrador</option>}
                  </select>
                  {errors.role && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.role.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-widest uppercase text-slate-500">Contraseña {!editingUser && '*'}</label>
                  <input {...register('password')} type="password" disabled={!!editingUser} className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 disabled:opacity-50 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder={editingUser ? "Protegido por privacidad" : "Mínimo 6 caracteres"} />
                  {errors.password && <p className="text-[10px] text-red-500 font-bold uppercase">{errors.password.message}</p>}
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium">{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center text-white text-[15px] font-black tracking-wide shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingUser ? 'Guardar Cambios' : 'Registrar en el Sistema'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
