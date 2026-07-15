import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const chatMessages = [
  { from: 'bot', text: 'Я уже тут. Первый шаг — просто открой файл. Больше ничего.' },
  { from: 'user', text: 'ладно, открыл' },
  { from: 'bot', text: 'Всё, ты в игре. 25 минут — я рядом.' },
]

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-14 pb-20 md:pt-24">
      <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
        <div className="flex flex-1 flex-col items-start gap-6">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            [ не планировщик ]
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Существо, которое не даст тебе слиться
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground md:text-lg">
            Ты знаешь, что делать. Проблема — начать. Напарник пишет тебе первым,
            дробит задачу до одного движения и сидит рядом, пока ты работаешь.
            Без стриков. Без красных цифр. Без стыда.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              render={<Link href="/app" />}
              nativeButton={false}
              size="lg"
              className="font-semibold"
            >
              Познакомиться с напарником
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              бесплатно, без карты и регистрации
            </span>
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-1 flex-col gap-4">
          <div className="relative mx-auto aspect-square w-56 md:w-72">
            <Image
              src="/images/naparnik-hero.png"
              alt="Напарник — маленькое пушистое существо с зелёными глазами"
              fill
              sizes="(max-width: 768px) 224px, 288px"
              className="rounded-3xl object-cover"
              priority
            />
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              сегодня, 09:00 — он написал первым
            </p>
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.from === 'bot'
                    ? 'self-start bg-secondary text-secondary-foreground'
                    : 'self-end bg-primary text-primary-foreground'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
