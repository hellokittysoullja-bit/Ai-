'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/mascot'

const chatMessages = [
  { from: 'bot', text: 'Я уже тут. Первый шаг — просто открой файл. Больше ничего.' },
  { from: 'user', text: 'ладно, открыл' },
  { from: 'bot', text: 'Всё, ты в игре. 25 минут — я рядом.' },
]

/** Реплика, которая печатается посимвольно при появлении */
function TypedMessage({ text, delay, onDone }: { text: string; delay: number; onDone?: () => void }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(reduceMotion ? text.length : 0)
  // onDone в ref: колбэк пересоздаётся на каждом рендере и не должен перезапускать печать
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.()
      return
    }
    let i = 0
    let interval: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1
        setShown(i)
        if (i >= text.length) {
          clearInterval(interval)
          onDoneRef.current?.()
        }
      }, 28)
    }, delay)
    return () => {
      clearTimeout(start)
      clearInterval(interval)
    }
  }, [text, delay, reduceMotion])

  return <>{text.slice(0, shown)}</>
}

function ChatMockup() {
  const [step, setStep] = useState(0)

  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        сегодня, 09:00 — он написал первым
      </p>
      {chatMessages.map((m, i) => {
        if (i > step) return null
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={
              m.from === 'bot'
                ? 'max-w-[85%] self-start rounded-2xl bg-secondary px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground'
                : 'max-w-[85%] self-end rounded-2xl bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground'
            }
          >
            {m.from === 'bot' ? (
              <TypedMessage
                text={m.text}
                delay={i === 0 ? 600 : 350}
                onDone={() => setStep((s) => Math.max(s, i + 1))}
              />
            ) : (
              <DelayedReveal onDone={() => setStep((s) => Math.max(s, i + 1))}>
                {m.text}
              </DelayedReveal>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

/** Показывает текст сразу, а через паузу зовёт onDone (для реплики человека) */
function DelayedReveal({ children, onDone }: { children: React.ReactNode; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 700)
    return () => clearTimeout(t)
  }, [])
  return <>{children}</>
}

/** Каракуля-подчёркивание, прорисовывается слева направо */
function Scribble() {
  const reduceMotion = useReducedMotion()
  return (
    <svg viewBox="0 0 200 14" aria-hidden="true">
      <motion.path
        d="M3 10 C 40 4, 80 12, 120 7 S 180 9, 197 5"
        initial={reduceMotion ? undefined : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function Hero() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative mx-auto max-w-5xl px-4 pt-14 pb-20 md:pt-24">
      <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
        <motion.div
          className="flex flex-1 flex-col items-start gap-6"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            [ не планировщик ]
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Существо, которое не даст тебе{' '}
            <span className="scribble-underline">
              слиться
              <Scribble />
            </span>
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
        </motion.div>

        <div className="flex w-full max-w-sm flex-1 flex-col gap-4">
          <div className="mx-auto">
            <Mascot
              pose="waves"
              alt="Напарник — маленькое пушистое существо с зелёными глазами машет лапой"
              size={272}
              priority
            />
          </div>
          <ChatMockup />
        </div>
      </div>
    </section>
  )
}
