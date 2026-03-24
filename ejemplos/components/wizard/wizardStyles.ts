/**
 * Estilos compartidos del wizard — Paleta ESE Salud Pereira
 * Navy #081e69 | Verde #0a8c32 | Fondo #f7f8fc | Cards #ffffff
 */

// ── Inputs & Selects ─────────────────────────────────────────────────────────
export const inp =
  'w-full px-2.5 py-2 rounded-lg text-sm font-normal bg-white text-gray-800 ' +
  'border border-gray-200 focus:outline-none focus:border-[#081e69] focus:ring-1 ' +
  'focus:ring-[#081e6940] transition-all placeholder:text-gray-400'

export const sel = inp + ' appearance-none cursor-pointer'

// ── Card section wrapper ─────────────────────────────────────────────────────
export const card = 'bg-white rounded-xl p-4 shadow-sm space-y-4'
export const cardBorder = { border: '1px solid #e4e8f0' }

// ── Section heading ──────────────────────────────────────────────────────────
export const sectionTitle = 'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5'
export const sectionTitleStyle = { color: '#081e69' }

// ── Field label ──────────────────────────────────────────────────────────────
export const lbl = 'block text-[11px] font-bold uppercase tracking-wide mb-1'
export const lblStyle = { color: '#081e6988' }
export const required = { color: '#ef4444', marginLeft: '2px' }

// ── Checkbox / Radio ────────────────────────────────────────────────────────
export const chkLabel = 'flex items-center gap-2 text-xs cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-[#081e6908]'
export const chk = 'w-3.5 h-3.5 rounded accent-[#081e69] flex-shrink-0'

// ── Pill buttons (APGAR etc) ─────────────────────────────────────────────────
export const pillActive = { background: '#081e69', color: '#fff', borderColor: '#081e69' }
export const pillInactive = { borderColor: '#e2e8f0', color: '#64748b' }

// ── Info/score box ───────────────────────────────────────────────────────────
export const scoreBox = 'p-2.5 rounded-lg text-xs font-bold'
export const scoreBoxStyle = { background: '#f0f4ff', border: '1px solid #c7d4f0', color: '#081e69' }

// ── Accordion header ─────────────────────────────────────────────────────────
export const accordionHeader = 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors'
export const accordionHeaderStyle = { background: '#f7f8fc', borderBottom: '1px solid #e8ecf5' }
export const accordionHeaderHover = { background: '#edf0f8' }

// ── Number badge ─────────────────────────────────────────────────────────────
export const badge = 'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0'
export const badgeStyle = { background: '#081e69' }

// ── CTA buttons ─────────────────────────────────────────────────────────────
export const btnGreen = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all active:scale-95'
export const btnGreenStyle = { background: 'linear-gradient(135deg, #0a8c32, #065c21)', boxShadow: '0 3px 10px #0a8c3225' }

export const btnNavy = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all active:scale-95'
export const btnNavyStyle = { background: 'linear-gradient(135deg, #081e69, #0f2d99)', boxShadow: '0 3px 10px #081e6925' }

// ── Sub-section divider ──────────────────────────────────────────────────────
export const subSection = 'text-[10px] font-black uppercase tracking-widest pt-2'
export const subSectionStyle = { color: '#081e6966', borderTop: '1px solid #e8ecf5', paddingTop: '12px' }
