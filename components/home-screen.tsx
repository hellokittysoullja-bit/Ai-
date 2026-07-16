'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { CompanionChat } from '@/components/companion-chat'
import { MascotSvg, type MascotExpression } from '@/components/mascot-svg'
import {
  getCompanionName,
  getPatterns,
  getPlan,
  saveCompanionName,
  todayKey,
  type Patterns,
  type Plan,
} from '@/lib/memory'
import {
  enableCheckins,
  getCheckinState,
  mirrorCompanionName,
  registerServiceWorker,
  type CheckinState,
} from '@/lib/checkin'
import { Bell } from 'lucide-react'
import { InstallPrompt } from '@/components/install-prompt'

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

  // Прощение как дефолт (механика Duolingo без её кнута): пауза — это
  // просто пауза. Длинная — дневник острова, короткая — тихая радость.
  const awayLine =
    patterns.daysAway !== null && patterns.daysAway >= 3
      ? awayDiary[(patterns.totalStarts + patterns.daysAway) % awayDiary.length] + ' '
      : patterns.daysAway !== null && patterns.daysAway === 2
        ? 'Ты пришёл. Два дня — это просто два дня, остров всё помнит. '
        : ''

  // Совпадение с личным часом стартов: мягкий, честный толчок из данных
  const hourLine =
    patterns.favoriteHour !== null && patterns.totalStarts >= 3 && hour === patterns.favoriteHour
      ? ` Сейчас ${hour}:00 — обычно именно в это время ты реально начинаешь.`
      : ''

  // План, положенный на сегодня (вчера вечером) или прямо сегодня на сегодня
  if (plan && plan.forDate === today) {
    // Якорь может быть событием («после первого кофе») или временем («09:00»)
    const t = plan.startTime
    const anchor = t ? (/^\d/.test(t) ? ` в ${t}` : `, старт — ${t}`) : ''
    return {
      greeting: `${awayLine}Ты решил: «${plan.task}»${anchor}. Не думай про всё дело — просто ${plan.firstStep.toLowerCase()}.${hourLine} Я рядом, жми кнопку.`,
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

  // Endowment: названное существо становится «моим». Имя спрашиваем
  // после первого старта — когда ценность уже прожита, а не обещана.
  const [companionName, setCompanionName] = useState<string | null>(null)
  const [nameLoaded, setNameLoaded] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  async function giveName(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await saveCompanionName(trimmed)
    setCompanionName(trimmed)
    // Дублируем имя в IndexedDB, чтобы весточки от напарника были персональными
    void mirrorCompanionName(trimmed)
  }

  // Проактивные весточки: «он пишет первым», когда приложение закрыто.
  // Работает только там, где браузер это умеет (установленная PWA на Chrome).
  const [checkinState, setCheckinState] = useState<CheckinState>('unsupported')
  const [checkinBusy, setCheckinBusy] = useState(false)

  async function turnOnCheckins() {
    setCheckinBusy(true)
    const next = await enableCheckins()
    setCheckinState(next)
    setCheckinBusy(false)
  }

  // Выражение маскота по контексту: вернулся после паузы — искренняя радость,
  // есть шаг — собран, поздний вечер — сонный, иначе спокоен
  const hour = new Date().getHours()
  const mascotExpression: MascotExpression =
    stats?.daysAway !== null && stats !== null && stats.daysAway >= 2
      ? 'happy'
      : firstWord?.actionStep
        ? 'focused'
        : hour >= 22 || hour < 5
          ? 'sleepy'
          : 'calm'

  async function refresh() {
    const [plan, patterns, name] = await Promise.all([
      getPlan(),
      getPatterns(),
      getCompanionName(),
    ])
    setFirstWord(buildFirstWord(plan, patterns, new Date()))
    setStats(patterns)
    setCompanionName(name)
    setNameLoaded(true)
  }

  useEffect(() => {
    refresh()
    // Тихо ставим service worker и узнаём, доступны ли весточки
    void registerServiceWorker()
    void getCheckinState().then(setCheckinState)
  }, [])

  function startNow(step: string) {
    router.push(`/app/session?step=${encodeURIComponent(step)}&plan=1`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
          <div className="flex items-start gap-3">
            <MascotSvg
              expression={mascotExpression}
              label={companionName ?? 'Напарник'}
              size={52}
              className="shrink-0"
            />
            {/* Skeleton вместо «…»: место зарезервировано, layout не прыгает */}
            {firstWord ? (
              <p className="pt-1 font-hand text-xl leading-snug">{firstWord.greeting}</p>
            ) : (
              <div className="flex w-full flex-col gap-2 pt-2" aria-hidden="true">
                <div className="h-4 w-full animate-pulse rounded-full bg-secondary" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-secondary" />
                <div className="h-4 w-3/5 animate-pulse rounded-full bg-secondary" />
              </div>
            )}
          </div>

          {/* Момент дарения имени: один раз, после первого старта.
              Названное существо — уже не приложение, а «мой». */}
          {nameLoaded && !companionName && stats !== null && stats.totalStarts >= 1 && (
            <form
              className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-secondary/50 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                giveName(nameDraft)
              }}
            >
              <p className="font-hand text-lg leading-snug">
                Слушай… у меня ведь до сих пор нет имени. Дашь мне его? Я буду откликаться.
              </p>
              <div className="flex gap-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Как меня зовут?"
                  maxLength={24}
                  aria-label="Имя для напарника"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="sm" className="h-10" disabled={!nameDraft.trim()}>
                  Так и зовут
                </Button>
              </div>
            </form>
          )}

          {/* Иконка на домашнем экране — протез object permanence.
              Один вопрос за раз (§ когнитивная нагрузка): пока существо
              не названо, других карточек-предложений на экране нет. */}
          {stats !== null && stats.totalStarts >= 1 && !!companionName && (
            <InstallPrompt companionName={companionName} />
          )}

          {/* Весточки от напарника: предлагаем один раз, после того как
              человек уже назвал существо. Только там, где браузер их умеет.
              Ни спама, ни давления — «один тихий раз в день». */}
          {checkinState === 'available' && !!companionName && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/40 p-3">
              <div className="flex items-start gap-2">
                <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="font-hand text-lg leading-snug">
                  Хочешь, я буду махать тебе с острова раз в день? Один тихий раз, без спама — и
                  никаких «ты пропал».
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-10 self-start"
                onClick={turnOnCheckins}
                disabled={checkinBusy}
              >
                {checkinBusy ? 'Секунду…' : 'Да, махай мне'}
              </Button>
            </div>
          )}

          {checkinState === 'enabled' && !!companionName && (
            <p className="flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Bell className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {companionName} будет тихо махать тебе с острова раз в день.
            </p>
          )}

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
              <p className="text-xs leading-relaxed text-muted-foreground">
                Первый старт за 15 минут — тап и всё:
              </p>
              <div className="flex flex-wrap gap-2">
                {starterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      router.push(`/app/session?step=${encodeURIComponent(chip)}&d=15`)
                    }
                    className="min-h-11 rounded-full border border-primary/40 bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Одна служебная строка на экран: предвкушение находки — или тихий итог.
              Обещание без таймера сгорания: не сделал — ничего не потерял. */}
          {stats && stats.totalStarts > 0 && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {stats.lastStartDate !== todayKey(new Date()) ? (
                <span className="text-primary">
                  Первый старт дня ещё впереди — за ним находка для острова.
                </span>
              ) : (
                'Сегодня уже был старт — остров вырос.'
              )}{' '}
              {/* «Активные дни за месяц» вместо стрика: копилка, которая
                  не сгорает от пропуска — прошлый труд не обесценивается */}
              {stats.activeDaysThisMonth >= 2
                ? `${stats.activeDaysThisMonth} активных дней в этом месяце, ${stats.totalStarts} стартов всего.`
                : `Всего стартов: ${stats.totalStarts}.`}
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
