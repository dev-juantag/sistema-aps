import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

import { COMPANY_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  // CAMBIAR TÍTULO, DESCRIPCIÓN Y SEO AQUÍ:
  title: `${COMPANY_NAME} - Sistema de Gestión`,
  description: `Plataforma web corporativa para el control de metas y seguimiento de atenciones y actividades institucionales de ${COMPANY_NAME}.`,
  keywords: [COMPANY_NAME, 'salud', 'gestión', 'atenciones', 'pacientes', 'Pereira', 'sistema'],
  authors: [{ name: 'Juan Taguado' }],
  
  // CAMBIAR ICONO DE LA PESTAÑA DEL NAVEGADOR AQUÍ (Favicon):
  // Asegúrate de tener la imagen dentro de la carpeta "public" y enlazarla aquí.
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg', // Para dispositivos móviles de Apple
  },
  
  openGraph: {
    title: `${COMPANY_NAME} - Sistema de Gestión`,
    description: 'Plataforma web corporativa para el control de metas y seguimiento de atenciones.',
    type: 'website',
    locale: 'es_CO',
    siteName: COMPANY_NAME,
  }
}

import { Toaster } from 'sonner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${_poppins.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors duration={8000} />
        <Analytics />
      </body>
    </html>
  )
}
