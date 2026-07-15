'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { CompanionChat } from '@/components/companion-chat'
import { getPatterns, getPlan, todayKey, type Patterns, type Plan } from '@/lib/memory'

type FirstWord = {
  greeting: string
  /** Есть план на сегодня — показываем кнопку «Начинаю» */
  actionStep: string | null
  /** Новичок без стартов — показываем чипы мгновенного первого старта */
  showStarterChips?: boolean
}

/** Готовые крошечные шаги: ноль решений до первого старта */
const starterChips = [
  'Открыть нужный файл',
  'Убрать одну вещь со стола',
  'Написать одно предложение',
]

function buildFirstWord(plan: Plan | null, patterns: Patterns, now: Date): FirstWord {
  const hour = now.getHours()
  const isEvening = hour >= 18 || hour < 4
  const today = todayKey(now)

  // План, положенный на сегодня (вчера вечером) или прямо сегодня на сегодня
  if (plan && plan.forDate === today) {
    const time = plan.startTime ? ` в ${plan.startTime}` : ''
    return {
      greeting: `Ты решил: «${plan.task}»${time}. Не думай про всё дело — просто ${plan.firstStep.toLowerCase()}. Я рядом, жми кнопку.`,
      actionStep: plan.firstStep,
    }
  }

  // План на завтра уже положен, сейчас день — подтверждение
  if (plan && !isEvening) {
    return {
      greeting: `На завтра у нас уже лежит план: «${plan.task}». А сегодня можно ничего не доказывать. Хочешь — поболтаем, хочешь — начнём что-то маленькое.`,
      actionStep: null,
    }
  }

  if (plan && isEvening) {
    return {
      greeting: `План на завтра уже готов: «${plan.task}», первый шаг — ${plan.firstStep.toLowerCase()}. Утром напишу первым. Можешь спать спокойно.`,
      actionStep: null,
    }
  }

  if (isEvening) {
    return {
      greeting:
        'Вечер — лучшее время договориться с завтрашним собой. Давай за три минуты решим: одно дело, один первый шаг, одно время. Напиши, что завтра важно.',
      actionStep: null,
    }
  }

  if (patterns.totalStarts === 0) {
    return {
      greeting:
        'Привет. Я Напарник. Я не буду учить тебя жить — я помогаю начинать. Выбери крошечный шаг ниже — и начнём прямо сейчас. Или напиши, что висит.',
      actionStep: null,
      showStarterChips: true,
    }
  }

  return {
    greeting:
      'Плана на сегодня нет — и это не минус, это ноль. Выбери одно крошечное действие прямо сейчас, или напиши мне, что висит — раздробим.',
    actionStep: null,
  }
}

export function HomeScreen() {
  const router = useRouter()
  const [firstWord, setFirstWord] = useState<FirstWord | null>(null)
  const [stats, setStats] = useState<Patterns | null>(null)

  async function refresh() {
    const [plan, patterns] = await Promise.all([getPlan(), getPatterns()])
    setFirstWord(buildFirstWord(plan, patterns, new Date()))
    setStats(patterns)
  }

  useEffect(() => {
    refresh()
  }, [])

  function startNow(step: string) {
    router.push(`/app/session?step=${encodeURIComponent(step)}&plan=1`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
          <div className="flex items-start gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl">
              <Image
                src="/images/naparnik-hero.png"
                alt="Напарник"
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                он написал первым
              </p>
              <p className="text-sm leading-relaxed">
                {firstWord ? firstWord.greeting : '…'}
              </p>
            </div>
          </div>

          {firstWord?.actionStep && (
            <Button
              size="lg"
              className="w-full gap-2 font-semibold"
              onClick={() => startNow(firstWord.actionStep as string)}
            >
              <Play className="size-4" aria-hidden="true" />
              Начинаю
            </Button>
          )}

          {firstWord?.showStarterChips && (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                первый старт за 15 минут — тап и всё
              </p>
              <div className="flex flex-wrap gap-2">
                {starterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      router.push(`/app/session?step=${encodeURIComponent(chip)}&d=15`)
                    }
                    className="rounded-full border border-primary/40 bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stats && stats.totalStarts > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              стартов: {stats.totalStarts} · дней подряд: {stats.runningDays}
            </p>
          )}
        </div>
      </section>

      <div className="min-h-0 flex-1">
        <CompanionChat
          mode="companion"
          greeting="Это наш чат. Вечером кладём план, днём дробим шаги, всегда — без стыда."
          onPlanSaved={refresh}
        />
      </div>
    </div>
  )
}
