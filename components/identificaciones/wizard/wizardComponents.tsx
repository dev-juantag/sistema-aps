'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { inp, lbl, lblStyle, required as reqStyle, chk, chkLabel } from './wizardStyles'

export function F({ label, children, required, className }: { label: string; children: React.ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className={lbl} style={lblStyle}>
        {label} {required && <span style={reqStyle}>*</span>}
      </label>
      {children}
    </div>
  )
}

export function Multi({ label, options, name, register, required }: { label: string; options: {id: number | string; label: string}[]; name: string; register: any, required?: boolean }) {
  const { watch, setValue } = useFormContext()
  const values = watch(name) || []
  const otherName = `${name}Otro`
  
  // Identificar IDs especiales (Ninguno / Otro)
  const NONE_IDS = [99, '99', 7, '7', 9, '9', 6, '6', 'ninguno', 'ninguna']
  const OTHER_IDS = [9, '9', 7, '7', 5, '5', 8, '8', 12, '12']

  const isNone = (id: any) => NONE_IDS.includes(id)
  const isOther = (id: any) => {
    const option = options.find(o => String(o.id) === String(id))
    return OTHER_IDS.includes(id) && option?.label.toLowerCase().includes('otro')
  }

  const handleChange = (id: any, checked: boolean) => {
    let newValues = Array.isArray(values) ? [...values] : []
    
    if (checked) {
      if (isNone(id)) {
        // Si marca ninguno, limpia todo lo demás
        newValues = [id]
      } else {
        // Si marca cualquier otro, quita el 'ninguno'
        newValues = newValues.filter(v => !isNone(v))
        newValues.push(id)
      }
    } else {
      newValues = newValues.filter(v => String(v) !== String(id))
    }
    
    setValue(name, newValues)
  }

  const showOtherInput = Array.isArray(values) && values.some((v: any) => isOther(v))

  return (
    <F label={label} required={required}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
        {options.map(o => (
          <label key={o.id} className={chkLabel}>
            <input 
              type="checkbox" 
              checked={values.includes(String(o.id)) || values.includes(Number(o.id))}
              onChange={(e) => handleChange(o.id, e.target.checked)}
              className={chk} 
            />
            <span className="text-xs leading-tight">{o.label}</span>
          </label>
        ))}
      </div>
      {showOtherInput && (
        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <input 
            {...register(otherName)} 
            placeholder={`Especifique ${label.toLowerCase()}...`} 
            className={`${inp} text-xs py-1.5 h-8 border-emerald-200 bg-emerald-50/30`} 
          />
        </div>
      )}
    </F>
  )
}
