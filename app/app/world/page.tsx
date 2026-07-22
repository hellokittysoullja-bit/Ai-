import type { Metadata } from 'next'
import { Island } from '@/components/island'

export const metadata: Metadata = {
  title: 'Мир — Напарник',
  description: 'Остров напарника — дневник твоих стартов. Ничего не сгорает.',
}

export default function WorldPage() {
  return (
    <main className="app-page-enter flex min-h-dvh flex-col pb-20">
      <Island />
    </main>
  )
}
