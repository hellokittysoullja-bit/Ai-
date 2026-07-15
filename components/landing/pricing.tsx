import Link from 'next/link'
import { Button } from '@/components/ui/button'

const included = [
  'Напарник, который помнит твой план и пишет первым',
  'Вечерний разбор дня: одна задача, один первый шаг',
  'Фокус-сессии с живым напарником рядом',
  'Остров, который растёт от каждого старта — и не откатывается',
]

export function Pricing() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-3xl border border-primary/40 bg-card p-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            [ ранний доступ ]
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold tracking-tight">Бесплатно</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Пока напарник растёт — всё открыто. Без карты, без регистрации,
            без скрытых условий. Подписка появится позже, и мы скажем об этом
            прямо, а не мелким шрифтом.
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
        <Button
          render={<Link href="/app" />}
          nativeButton={false}
          size="lg"
          className="w-full font-semibold"
        >
          Познакомиться с напарником
        </Button>
      </div>
    </section>
  )
}
