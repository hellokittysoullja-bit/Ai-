'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

const durations = [15, 25, 45]

const nudges = [
  'Я рядом. Одно действие за раз.',
  'Отвлёкся? Норм. Вернись к файлу — я тут.',
  'Половина есть. Ты реально в игре.',
  'Осталось чуть-чуть. Не открывай другие вкладки, я всё вижу.',
]

type Phase = 'setup' | 'running' | 'done'

export function FocusSession() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [task, setTask] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const totalRef = useRef(0)

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          setPhase('done')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  function start() {
    if (!task.trim()) return
    totalRef.current = minutes * 60
    setSecondsLeft(minutes * 60)
    setPhase('running')
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalRef.current > 0 ? 1 - secondsLeft / totalRef.current : 0
  const nudge = nudges[Math.min(Math.floor(progress * nudges.length), nudges.length - 1)]

  if (phase === 'setup') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl">
            <Image src="/images/naparnik-hero.png" alt="Напарник" fill sizes="56px" className="object-cover" />
          </div>
          <p className="rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm leading-relaxed">
            Что делаем? Назови первый шаг — не всю задачу.
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
            {nudge}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase('done')} className="text-muted-foreground">
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
        <h2 className="text-2xl font-bold">Сделано.</h2>
        <p className="leading-relaxed text-muted-foreground">
          {'«'}
          {task}
          {'» — начато и отработано. Мой остров стал чуть больше. Без пафоса: ты красавчик.'}
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <Button
          size="lg"
          className="font-semibold"
          onClick={() => {
            setTask('')
            setPhase('setup')
          }}
        >
          Ещё одна сессия
        </Button>
        <Button asChild variant="ghost" className="text-muted-foreground">
          <a href="/world">Посмотреть, как вырос мир</a>
        </Button>
      </div>
    </div>
  )
}
