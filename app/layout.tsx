import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope, JetBrains_Mono, Caveat } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jetbrains-mono',
})

const caveat = Caveat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-caveat',
})

export const metadata: Metadata = {
  title: 'Напарник — существо, которое не даст тебе слиться',
  description:
    'Не ещё один планировщик. Напарник пишет тебе первым, помогает начать и растит свой мир из твоих фокус-сессий. Без стриков. Без стыда.',
  generator: 'v0.app',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Напарник',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1a1d17',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      className={`bg-background ${manrope.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
    >
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
