import type { Metadata } from 'next'
import { Suspense } from 'react'
import { FocusSession } from '@/components/focus-session'

export const metadata: Metadata = {
  title: 'Фокус — Напарник',
  description: 'Фокус-сессия вдвоём с напарником. Старт засчитывается сразу.',
}

export default function SessionPage() {
  return (
    <main className="app-page-enter flex min-h-dvh flex-col pb-16">
      <Suspense fallback={null}>
        <FocusSession />
      </Suspense>
    </main>
  )
}
