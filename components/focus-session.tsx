'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg } from '@/components/mascot-svg'
import { ChevronRight, Sprout } from 'lucide-react'
import {
  addFind,
  clearPlan,
  getFinds,
  getPlan,
  getStarts,
  recordStart,
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

const durations = [15, 25, 45]

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

type Phase = 'setup' | 'running' | 'done'

export function FocusSession() {
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

  const totalRef = useRef(0)
  const startIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const firedMomentsRef = useRef<Set<Moment>>(new Set())

  const speak = useCallback((moment: Moment, taskLabel: string, mins: number) => {
    if (firedMomentsRef.current.has(moment)) return
    firedMomentsRef.current.add(moment)
    fetchVoice(moment, taskLabel, mins).then(setVoice)
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // Завершение по нулю — отдельным эффектом, а не изнутри setState-апдейтера
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0 && totalRef.current > 0) {
      finish(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    totalRef.current = minutes * 60
    setSecondsLeft(minutes * 60)
    firedMomentsRef.current = new Set()
    setVoice(fallbackVoice.start)
    setPhase('running')
    startedAtRef.current = Date.now()

    // Старт записывается в момент старта: инициация — и есть валюта
    const entry = await recordStart({ label: task, fromPlan })
    startIdRef.current = entry.id

    // Если это был первый шаг из плана — план исполнен
    if (fromPlan) {
      const plan = await getPlan()
      if (plan && plan.forDate === todayKey()) await clearPlan()
    }

    speak('start', task, minutes)
  }

  async function finish(early: boolean) {
    const workedMin = (Date.now() - startedAtRef.current) / 60000
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
    setEndedEarly(early)
    setDoneVoice(null)
    setPlanSaved(false)
    setPlanFormOpen(false)
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
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <MascotSvg expression="calm" label="Напарник" size={56} className="shrink-0" />
          <p className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-1.5 font-hand text-lg leading-snug">
            {prefilledStep
              ? 'Шаг уже выбран. Просто жми — я рядом.'
              : 'Что делаем? Назови первый шаг — не всю задачу.'}
          </p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Первый шаг
          </span>
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
        <Button size="lg" onClick={start} disabled={!task.trim()} className="font-semibold">
          Начали. Я рядом
        </Button>
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          старт засчитывается сразу — даже если выйдешь раньше
        </p>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-8">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {task}
        </p>
        <div
          role="timer"
          aria-live="polite"
          className="text-7xl font-bold tabular-nums tracking-tight"
        >
          {mm}:{ss}
        </div>
        <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3">
          <MascotSvg expression="focused" label="Напарник работает рядом" size={64} className="shrink-0" />
          <p className="max-w-56 rounded-2xl rounded-tl-sm bg-secondary px-3 py-1.5 font-hand text-lg leading-snug">
            {voice}
          </p>
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
      </div>
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
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
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
    </div>
  )
}
