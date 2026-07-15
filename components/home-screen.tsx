'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { CompanionChat } from '@/components/companion-chat'
import { MascotSvg, type MascotExpression } from '@/components/mascot-svg'
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

/**
 * Дневник отсутствия: напарник жил на острове, пока человека не было.
 * Возврат через любопытство и привязанность, никогда — через вину.
 * Выбор события детерминированный, чтобы не менялся при каждом рендере.
 */
const awayDiary = [
  'Пока тебя не было, я рыбачил у причала. Море было тихое. Остров стоит, ничего не сгорело.',
  'Я тут пересчитал всё, что выросло на острове, — всё на месте. Пауза — это пауза, не откат.',
  'Без тебя я смотрел на волны и гадал, что вырастет от твоего следующего старта.',
  'Я развёл костёр и просто ждал. Это не упрёк — я рад, что ты зашёл.',
]

function buildFirstWord(plan: Plan | null, patterns: Patterns, now: Date): FirstWord {
  const hour = now.getHours()
  const isEvening = hour >= 18 || hour < 4
  const today = todayKey(now)

  // Человек долго не заходил — сначала жизнь острова, потом всё остальное
  const awayLine =
    patterns.daysAway !== null && patterns.daysAway >= 3
      ? awayDiary[(patterns.totalStarts + patterns.daysAway) % awayDiary.length] + ' '
      : ''

  // Совпадение с личным часом стартов: мягкий, честный толчок из данных
  const hourLine =
    patterns.favoriteHour !== null && patterns.totalStarts >= 3 && hour === patterns.favoriteHour
      ? ` Сейчас ${hour}:00 — обычно именно в это время ты реально начинаешь.`
      : ''

  // План, положенный на сегодня (вчера вечером) или прямо сегодня на сегодня
  if (plan && plan.forDate === today) {
    const time = plan.startTime ? ` в ${plan.startTime}` : ''
    return {
      greeting: `${awayLine}Ты решил: «${plan.task}»${time}. Не думай про всё дело — просто ${plan.firstStep.toLowerCase()}.${hourLine} Я рядом, жми кнопку.`,
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
    greeting: `${awayLine}Плана на сегодня нет — и это не минус, это ноль. Выбери одно крошечное действие прямо сейчас, или напиши мне, что висит — раздробим.${hourLine}`,
    actionStep: null,
  }
}

export function HomeScreen() {
  const router = useRouter()
  const [firstWord, setFirstWord] = useState<FirstWord | null>(null)
  const [stats, setStats] = useState<Patterns | null>(null)

  // Выражение маскота по контексту: есть шаг — собран, поздний вечер — сонный, иначе спокоен
  const hour = new Date().getHours()
  const mascotExpression: MascotExpression = firstWord?.actionStep
    ? 'focused'
    : hour >= 22 || hour < 5
      ? 'sleepy'
      : 'calm'

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
            <MascotSvg expression={mascotExpression} label="Напарник" size={52} className="shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                он написал первым
              </p>
              <p className="font-hand text-xl leading-snug">
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
