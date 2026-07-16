'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg } from '@/components/mascot-svg'
import { ChevronRight, Sprout } from 'lucide-react'
import {
  addFind,
  clearActiveSession,
  clearPlan,
  getActiveSession,
  getFinds,
  getPlan,
  getStarts,
  recordStart,
  saveActiveSession,
  savePlan,
  todayKey,
  updateStartMinutes,
} from '@/lib/memory'
import {
  drawFind,
  elementNameForStartNumber,
  LANDMARK_COUNT,
  RARITY_LABEL,
  type Rarity,
} from '@/lib/island-elements'
import { playRewardChime, playStartSigh } from '@/lib/reward-sound'
import { hapticDone, hapticReward, hapticStart } from '@/lib/haptics'

const durations = [15, 25, 45]

// Готовые шаги: пустое поле для СДВГ — стена. Нажал чип — поехали.
const stepChips = ['Открыть документ', 'Убрать одну вещь', 'Ответить на одно сообщение']

const HIDE_DIGITS_KEY = 'naparnik:hideDigits'

type Moment = 'start' | 'middle' | 'late' | 'done' | 'early-exit'

const fallbackVoice: Record<Moment, string> = {
  start: 'Я рядом. Одно действие за раз.',
  middle: 'Половина есть. Ты реально в игре.',
  late: 'Осталось чуть-чуть. Финишная прямая.',
  done: 'Начато и отработано. Мой остров стал чуть больше. Без пафоса: ты красавчик.',
  'early-exit': 'Ты начал — это главное. Остров всё равно вырос. Ноль стыда.',
}

async function fetchVoice(moment: Moment, task: string, minutes: number): Promise<string> {
  try {
    const res = await fetch('/api/session-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moment, task, minutes }),
    })
    if (!res.ok) return fallbackVoice[moment]
    const data = (await res.json()) as { text: string | null }
    return data.text || fallbackVoice[moment]
  } catch {
    return fallbackVoice[moment]
  }
}

type Phase = 'setup' | 'starting' | 'running' | 'done'

export function FocusSession() {
  const reducedMotion = useReducedMotion()
  const searchParams = useSearchParams()
  const prefilledStep = searchParams.get('step') ?? ''
  const fromPlan = searchParams.get('plan') === '1'
  const prefilledDuration = Number(searchParams.get('d'))
  const initialMinutes = durations.includes(prefilledDuration) ? prefilledDuration : 25

  const [phase, setPhase] = useState<Phase>('setup')
  const [task, setTask] = useState(prefilledStep)
  const [minutes, setMinutes] = useState(initialMinutes)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [voice, setVoice] = useState(fallbackVoice.start)
  const [doneVoice, setDoneVoice] = useState<string | null>(null)
  const [endedEarly, setEndedEarly] = useState(false)

  // Награда: что выросло на острове после этого старта.
  // Ориентир (старты 1-10) или находка из пула с редкостью (старты 11+).
  const [grownElement, setGrownElement] = useState<{
    name: string
    rarity: Rarity | 'landmark'
  } | null>(null)

  // Ритуал завершения: план на завтра на пике дофамина.
  // Форма свёрнута: пик отдан находке, план — по желанию (не обязанность).
  const [tomorrowTask, setTomorrowTask] = useState('')
  const [tomorrowStep, setTomorrowStep] = useState('')
  const [planSaved, setPlanSaved] = useState(false)
  const [planFormOpen, setPlanFormOpen] = useState(false)

  // Последовательное раскрытие: сначала находка одна на экране
  // (пик без конкурентов), потом появляются план и кнопки
  const [restRevealed, setRestRevealed] = useState(false)

  // Обратный отсчёт для СДВГ — давление дедлайна. Цифры можно спрятать:
  // остаются существо и полоска. Выбор запоминается.
  const [hideDigits, setHideDigits] = useState(false)
  useEffect(() => {
    try {
      setHideDigits(localStorage.getItem(HIDE_DIGITS_KEY) === '1')
    } catch {
      /* приватный режим */
    }
  }, [])
  function toggleDigits() {
    setHideDigits((v) => {
      try {
        localStorage.setItem(HIDE_DIGITS_KEY, v ? '0' : '1')
      } catch {
        /* приватный режим */
      }
      return !v
    })
  }

  useEffect(() => {
    if (phase !== 'done') return
    if (!grownElement) {
      setRestRevealed(true)
      return
    }
    // Звук и вибрация в момент появления карточки находки
    const chime = window.setTimeout(() => {
      playRewardChime(grownElement.rarity)
      hapticReward()
    }, 500)
    const reveal = window.setTimeout(() => setRestRevealed(true), 1700)
    return () => {
      window.clearTimeout(chime)
      window.clearTimeout(reveal)
    }
  }, [phase, grownElement])

  const totalRef = useRef(0)
  const startIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const firedMomentsRef = useRef<Set<Moment>>(new Set())

  const speak = useCallback((moment: Moment, taskLabel: string, mins: number) => {
    if (firedMomentsRef.current.has(moment)) return
    firedMomentsRef.current.add(moment)
    fetchVoice(moment, taskLabel, mins).then(setVoice)
  }, [])

  // Мягкий возврат из отвлечения: СДВГ-мозг уходит в другую вкладку —
  // это норма, а не провал. Вернулся — встречаем без упрёка.
  const hiddenAtRef = useRef<number | null>(null)
  const [backFromDrift, setBackFromDrift] = useState(false)

  // Честный таймер: остаток вычисляется от абсолютного времени старта,
  // а не тиками — фоновая вкладка и троттлинг браузера не искажают часы.
  useEffect(() => {
    if (phase !== 'running') return
    const update = () => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000
      setSecondsLeft(Math.max(0, Math.ceil(totalRef.current - elapsed)))
    }
    update()
    const id = setInterval(update, 1000)
    // Возврат во вкладку — мгновенная синхронизация, без ожидания тика
    const onVisible = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
        return
      }
      update()
      // Отходил дольше 2 минут — встречаем тепло, а не молчанием
      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > 120_000) {
        setBackFromDrift(true)
        window.setTimeout(() => setBackFromDrift(false), 6000)
      }
      hiddenAtRef.current = null
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [phase])

  // Сессия переживает закрытие вкладки: если при открытии страницы есть
  // незавершённая сессия — продолжаем с правильного места (или сразу финиш)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    getActiveSession().then((s) => {
      if (!s) return
      totalRef.current = s.minutes * 60
      startedAtRef.current = s.startedAt
      startIdRef.current = s.startId
      firedMomentsRef.current = new Set()
      setTask(s.task)
      setMinutes(s.minutes)
      const elapsed = (Date.now() - s.startedAt) / 1000
      setSecondsLeft(Math.max(0, Math.ceil(s.minutes * 60 - elapsed)))
      setVoice(fallbackVoice.start)
      setPhase('running')
    })
  }, [])

  // Завершение по нулю — отдельным эффектом, а не изнутри setState-апдейтера
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0 && totalRef.current > 0) {
      finish(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase])

  // Хореография старта: 2.2 секунды — существо садится рядом, потом сессия
  useEffect(() => {
    if (phase !== 'starting') return
    const t = window.setTimeout(() => setPhase('running'), 2200)
    return () => window.clearTimeout(t)
  }, [phase])

  // Живое присутствие: на каждой четверти пути котик коротко радуется
  const lastQuarterRef = useRef(0)
  const [cheering, setCheering] = useState(false)
  useEffect(() => {
    if (phase !== 'running' || totalRef.current === 0) return
    const q = Math.floor((1 - secondsLeft / totalRef.current) * 4)
    if (q > lastQuarterRef.current && q < 4) {
      lastQuarterRef.current = q
      setCheering(true)
      const t = window.setTimeout(() => setCheering(false), 2600)
      return () => window.clearTimeout(t)
    }
  }, [secondsLeft, phase])

  // Реплики по ходу сессии
  useEffect(() => {
    if (phase !== 'running' || totalRef.current === 0) return
    const progress = 1 - secondsLeft / totalRef.current
    if (progress >= 0.85) speak('late', task, minutes)
    else if (progress >= 0.5) speak('middle', task, minutes)
  }, [secondsLeft, phase, speak, task, minutes])

  async function start() {
    if (!task.trim()) return
    hapticStart()
    playStartSigh()
    totalRef.current = minutes * 60
    setSecondsLeft(minutes * 60)
    firedMomentsRef.current = new Set()
    lastQuarterRef.current = 0
    setVoice(fallbackVoice.start)
    // Хореография: интерфейс растворяется, существо садится рядом,
    // таймер проявляется. При reduced-motion — сразу к делу.
    setPhase(reducedMotion ? 'running' : 'starting')
    startedAtRef.current = Date.now()

    // Старт записывается в момент старта: инициация — и есть валюта
    const entry = await recordStart({ label: task, fromPlan })
    startIdRef.current = entry.id

    // Сессия переживает закрытие вкладки
    await saveActiveSession({
      startedAt: startedAtRef.current,
      minutes,
      task,
      startId: entry.id,
    })

    // Если это был первый шаг из плана — план исполнен
    if (fromPlan) {
      const plan = await getPlan()
      if (plan && plan.forDate === todayKey()) await clearPlan()
    }

    speak('start', task, minutes)
  }

  async function finish(early: boolean) {
    await clearActiveSession()
    // Не больше длительности сессии: вкладка могла быть закрыта надолго
    const workedMin = Math.min(
      (Date.now() - startedAtRef.current) / 60000,
      totalRef.current / 60,
    )
    if (startIdRef.current) {
      await updateStartMinutes(startIdRef.current, workedMin)
    }
    // Награда должна быть видна в момент, когда она заработана
    const starts = await getStarts()
    const n = starts.length
    if (n <= LANDMARK_COUNT) {
      // Первые 10 стартов — предсказуемые ориентиры: новичку нужна ясная история
      const name = elementNameForStartNumber(n)
      setGrownElement(name ? { name, rarity: 'landmark' } : null)
    } else {
      // Дальше — вероятностный пул. Полная сессия повышает шанс редкого.
      const finds = await getFinds()
      let pity = 0
      for (let i = finds.length - 1; i >= 0 && finds[i].rarity === 'common'; i--) pity++
      const find = drawFind(!early, pity)
      if (startIdRef.current) {
        await addFind({ ...find, date: todayKey(), startId: startIdRef.current })
      }
      setGrownElement({ name: find.name, rarity: find.rarity })
    }
    hapticDone()
    setEndedEarly(early)
    setDoneVoice(null)
    setPlanSaved(false)
    setPlanFormOpen(false)
    setRestRevealed(false)
    setTomorrowTask('')
    setTomorrowStep('')
    setPhase('done')
    fetchVoice(early ? 'early-exit' : 'done', task, minutes).then(setDoneVoice)
  }

  async function saveTomorrowPlan() {
    if (!tomorrowTask.trim() || !tomorrowStep.trim()) return
    await savePlan({ task: tomorrowTask.trim(), firstStep: tomorrowStep.trim() })
    setPlanSaved(true)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalRef.current > 0 ? 1 - secondsLeft / totalRef.current : 0

  if (phase === 'setup') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        {/* Сцена: существо в центре внимания, а не в углу формы */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <MascotSvg expression="calm" label="Напарник" size={150} />
          <p className="max-w-72 text-balance rounded-2xl bg-secondary px-4 py-2 text-center font-hand text-xl leading-snug">
            {prefilledStep
              ? 'Шаг уже выбран. Просто жми — я рядом.'
              : 'Что делаем? Назови первый шаг — не всю задачу.'}
          </p>
        </div>
        {/* Управление внизу — в зоне большого пальца */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Первый шаг
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Готовые шаги">
              {stepChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setTask(chip)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    task === chip
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Открыть файл презентации"
              className="h-12 rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Длительность
            </span>
            <div className="flex gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMinutes(d)}
                  aria-pressed={minutes === d}
                  className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                    minutes === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d} мин
                </button>
              ))}
            </div>
          </div>
          <motion.div whileTap={reducedMotion ? undefined : { scale: 0.96 }}>
            <Button
              size="lg"
              onClick={start}
              disabled={!task.trim()}
              className="w-full font-semibold"
            >
              Начали. Я рядом
            </Button>
          </motion.div>
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            старт засчитывается сразу — даже если выйдешь раньше
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'starting') {
    // Хореография: мир затихает, существо садится рядом, сессия проявляется
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-8">
        <motion.div
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
        >
          <MascotSvg expression="happy" label="Напарник садится рядом" size={170} />
        </motion.div>
        <motion.p
          className="font-hand text-2xl text-muted-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          Сажусь рядом. Начали.
        </motion.p>
        <motion.p
          className="font-mono text-xs uppercase tracking-widest text-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          старт засчитан
        </motion.p>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <motion.div
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-8"
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Существо — центр сцены: дышит, радуется четвертям, встречает из отвлечения */}
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : { y: [0, -4, 0], rotate: [0, 0, -1.5, 0, 1.5, 0, 0] }
          }
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MascotSvg
            expression={cheering || backFromDrift ? 'happy' : 'focused'}
            label="Напарник работает рядом"
            size={130}
          />
        </motion.div>
        <p className="max-w-72 text-balance rounded-2xl bg-secondary px-4 py-2 text-center font-hand text-xl leading-snug">
          {backFromDrift
            ? 'Ты отходил — это нормально. Мы всё ещё в деле.'
            : cheering
              ? 'Четверть пути позади. Идём.'
              : voice}
        </p>
        <div className="flex flex-col items-center gap-3">
          <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {task}
          </p>
          {hideDigits ? (
            <p className="font-hand text-3xl text-muted-foreground">время идёт — я слежу</p>
          ) : (
            <div
              role="timer"
              aria-live="polite"
              className="text-7xl font-bold tabular-nums tracking-tight"
            >
              {mm}:{ss}
            </div>
          )}
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={toggleDigits}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-2 hover:underline"
          >
            {hideDigits ? 'показать цифры' : 'спрятать цифры'}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => finish(true)}
            className="text-muted-foreground"
          >
            Закончить раньше
          </Button>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            старт уже засчитан · полная сессия повышает шанс редкой находки
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
      <MascotSvg expression="excited" label="Напарник радуется" size={110} />
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold">{endedEarly ? 'Ты начал.' : 'Сделано.'}</h2>
        <p className="font-hand text-xl leading-snug text-muted-foreground">
          {doneVoice ?? fallbackVoice[endedEarly ? 'early-exit' : 'done']}
        </p>
      </div>

      {/* Пик дофамина — находка. Появляется с паузой и пружиной: предвкушение → награда */}
      {grownElement && (
        <motion.div
          className="w-full"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.92 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={
            reducedMotion
              ? { delay: 0.5, duration: 0.3 }
              : { delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }
          }
        >
          <Link
            href="/app/world"
            className={`flex w-full flex-col items-center gap-2 rounded-2xl border bg-card px-5 py-5 text-center transition-colors hover:border-primary ${
              grownElement.rarity === 'rare'
                ? 'border-primary shadow-[0_0_32px_-4px_var(--color-primary)]'
                : grownElement.rarity === 'uncommon'
                  ? 'border-primary/70'
                  : 'border-primary/40'
            }`}
          >
            <Sprout className="size-8 text-primary" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              {grownElement.rarity === 'landmark'
                ? 'на острове появилось'
                : `${RARITY_LABEL[grownElement.rarity]} находка`}
            </span>
            <span className="text-balance text-xl font-bold">{grownElement.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              смотреть на острове
            </span>
          </Link>
        </motion.div>
      )}

      {/* План и кнопки появляются после того, как находка отыграла свой момент */}
      <motion.div
        className="flex w-full flex-col items-center gap-6"
        initial={false}
        animate={{ opacity: restRevealed ? 1 : 0, y: restRevealed ? 0 : 12 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ pointerEvents: restRevealed ? 'auto' : 'none' }}
        aria-hidden={!restRevealed}
      >
      {!planSaved ? (
        !planFormOpen ? (
          <button
            type="button"
            onClick={() => setPlanFormOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
          >
            <span className="text-sm font-semibold">Договориться с завтрашним собой</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : (
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Договоримся с завтрашним собой?</p>
            <input
              value={tomorrowTask}
              onChange={(e) => setTomorrowTask(e.target.value)}
              placeholder="Что завтра важно"
              aria-label="Дело на завтра"
              className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              value={tomorrowStep}
              onChange={(e) => setTomorrowStep(e.target.value)}
              placeholder="Первый крошечный шаг"
              aria-label="Первый шаг завтрашнего дела"
              className="h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              onClick={saveTomorrowPlan}
              disabled={!tomorrowTask.trim() || !tomorrowStep.trim()}
              className="font-semibold"
            >
              Положить план
            </Button>
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              можно пропустить — это не обязанность
            </p>
          </div>
        )
      ) : (
        <div className="flex w-full flex-col gap-1 rounded-2xl border border-primary/40 bg-card p-4 text-center">
          <p className="text-sm font-semibold">План лежит. Утром напишу первым.</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Просто открой эту страницу утром — первое слово будет за мной.
          </p>
        </div>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button
          size="lg"
          className="font-semibold"
          onClick={() => {
            setTask('')
            setDoneVoice(null)
            setEndedEarly(false)
            setGrownElement(null)
            setPhase('setup')
          }}
        >
          Ещё одна сессия
        </Button>
        <Button
          render={<Link href="/app/world" />}
          nativeButton={false}
          variant="ghost"
          className="text-muted-foreground"
        >
          Посмотреть, как вырос мир
        </Button>
      </div>
      </motion.div>
    </div>
  )
}
