/**
 * Survey Layout:
 * - Anula el padding del root layout con márgenes negativos
 * - Usa h-[calc(100vh-0px)] para que el wizard llene toda la pantalla disponible
 * - overflow-hidden para que el scroll quede dentro del wizard, no en el layout
 */
export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col pb-12">
      <div 
        className="w-full bg-white shadow-2xl relative"
        style={{ borderRadius: '24px', border: '1px solid #e2e8f0', minHeight: '80vh' }}
      >
        <div className="w-full h-full" style={{ borderRadius: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
