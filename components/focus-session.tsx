'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { clearPlan, getPlan, recordStart, todayKey, updateStartMinutes } from '@/lib/memory'

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

  const [phase, setPhase] = useState<Phase>('setup')
  const [task, setTask] = useState(prefilledStep)
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [voice, setVoice] = useState(fallbackVoice.start)
  const [doneVoice, setDoneVoice] = useState<string | null>(null)
  const [endedEarly, setEndedEarly] = useState(false)

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
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          finish(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
    setEndedEarly(early)
    setDoneVoice(null)
    setPhase('done')
    fetchVoice(early ? 'early-exit' : 'done', task, minutes).then(setDoneVoice)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalRef.current > 0 ? 1 - secondsLeft / totalRef.current : 0

  if (phase === 'setup') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
            <Image src="/images/naparnik-hero.png" alt="Напарник" fill sizes="56px" className="object-cover" />
          </div>
          <p className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm leading-relaxed">
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
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
            <Image src="/images/naparnik-hero.png" alt="" fill sizes="40px" className="object-cover" />
          </div>
          <p className="max-w-56 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm leading-relaxed">
            {voice}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => finish(true)}
          className="text-muted-foreground"
        >
          Закончить раньше
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <div className="relative size-24 overflow-hidden rounded-3xl">
        <Image src="/images/naparnik-hero.png" alt="Напарник радуется" fill sizes="96px" className="object-cover" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">{endedEarly ? 'Ты начал.' : 'Сделано.'}</h2>
        <p className="leading-relaxed text-muted-foreground">
          {doneVoice ?? fallbackVoice[endedEarly ? 'early-exit' : 'done']}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <Button
          size="lg"
          className="font-semibold"
          onClick={() => {
            setTask('')
            setDoneVoice(null)
            setEndedEarly(false)
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
