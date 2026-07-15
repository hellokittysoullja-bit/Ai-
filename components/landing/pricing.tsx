import Link from 'next/link'
import { Button } from '@/components/ui/button'

const included = [
  'Напарник пишет первым каждый день',
  'Вечерний разбор дня с ИИ',
  'Фокус-сессии с body doubling',
  'Растущий мир без стриков',
  'Анализ твоих паттернов фокуса',
]

export function Pricing() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-primary/40 bg-card p-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            [ один тариф ]
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">$12</span>
            <span className="text-muted-foreground">/ месяц</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Первые 7 дней — полный доступ, бесплатно, без карты. Дешевле одного
            потерянного рабочего дня.
          </p>
        </div>
        <ul className="flex flex-col gap-2">
          {included.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
              <span aria-hidden="true" className="mt-0.5 font-mono text-primary">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="w-full font-semibold">
          <Link href="/plan">Начать 7 бесплатных дней</Link>
        </Button>
      </div>
    </section>
  )
}
