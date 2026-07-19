import type { Metadata } from 'next'
import { AppNav } from '@/components/app-nav'
import { Island } from '@/components/island'

export const metadata: Metadata = {
  title: 'Мир — Напарник',
  description: 'Остров напарника — дневник твоих стартов. Ничего не сгорает.',
}

export default function WorldPage() {
  return (
    <main className="app-page-enter flex min-h-dvh flex-col pb-20">
      <Island />
      <AppNav />
    </main>
  )
}
