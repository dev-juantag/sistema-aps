import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SI-APS | Identificación Poblacional',
  description: 'Sistema de Atención Primaria en Salud — Caracterización Poblacional — ESE Salud Pereira',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className}`} style={{ background: '#f2f2f2' }}>
        <Sidebar />
        {/* Main content: offset by sidebar on desktop, full height, scrollable */}
        <main className="lg:ml-64 flex flex-col min-h-screen relative">
          <div className="flex-1 p-3 sm:p-6 lg:p-8 w-full relative">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
