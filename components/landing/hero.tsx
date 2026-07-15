'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { MascotSvg, type MascotExpression } from '@/components/mascot-svg'
import { Button } from '@/components/ui/button'

/**
 * Живой первый экран: не рассказ о продукте, а сам продукт.
 * Напарник печатает первую реплику ≤2 сек после загрузки (Rule of 40s).
 * Ответ посетителя — ровно 2 кнопки (Hick's Law), без свободного ввода.
 * Скрипт первых реплик — ноль API-затрат; после ответа — честный переход в /app.
 */

type SceneStep = { kind: 'companion'; text: string } | { kind: 'visitor'; text: string }

const OPENING_LINE = 'Привет. Я Напарник. Я не планировщик — я тот, кто сидит рядом, когда трудно начать.'

const REPLIES = {
  procrastinate: {
    visitor: 'Вечно откладываю дела',
    companion:
      'Знакомо. Это не лень — мозгу просто нужен кто-то рядом в момент старта. Пойдём, покажу, как это работает.',
  },
  curious: {
    visitor: 'Просто посмотреть',
    companion:
      'Заходи. У меня тут остров, который растёт от каждого твоего старта. Попробуй одно крошечное дело — увидишь.',
  },
} as const

type ReplyKey = keyof typeof REPLIES

/** Печатающаяся реплика напарника */
function TypedLine({ text, onDone }: { text: string; onDone?: () => void }) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(reduceMotion ? text.length : 0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.()
      return
    }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setShown(i)
      if (i >= text.length) {
        clearInterval(id)
        onDoneRef.current?.()
      }
    }, 26)
    return () => clearInterval(id)
  }, [text, reduceMotion])

  return (
    <p className="font-hand text-xl leading-snug text-secondary-foreground md:text-2xl">
      {text.slice(0, shown)}
      {shown < text.length && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded bg-primary align-middle" />
      )}
    </p>
  )
}

export function Hero() {
  const [steps, setSteps] = useState<SceneStep[]>([])
  const [showChoices, setShowChoices] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [expression, setExpression] = useState<MascotExpression>('calm')

  // Rule of 40s: первая реплика стартует почти сразу после загрузки
  useEffect(() => {
    console.log('[v0] Hero mounted, scheduling opening line')
    const id = setTimeout(() => {
      console.log('[v0] Opening line fired')
      setSteps([{ kind: 'companion', text: OPENING_LINE }])
    }, 400)
    return () => clearTimeout(id)
  }, [])

  function choose(key: ReplyKey) {
    setShowChoices(false)
    setAnswered(true)
    setExpression('happy')
    setSteps((prev) => [...prev, { kind: 'visitor', text: REPLIES[key].visitor }])
    // реплика напарника — после короткой паузы, как в живом разговоре
    setTimeout(() => {
      setSteps((prev) => [...prev, { kind: 'companion', text: REPLIES[key].companion }])
    }, 550)
  }

  return (
    <section className="grain relative flex min-h-[92svh] flex-col items-center justify-center px-4 py-16">
      {/* Сцена: маскот + диалог. Один фокус, много воздуха */}
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <MascotSvg
            expression={expression}
            size={176}
            label="Напарник — пушистое существо с зелёными глазами"
          />
        </motion.div>

        <div className="flex w-full flex-col gap-3" aria-live="polite">
          <AnimatePresence initial={false}>
            {steps.map((step, i) =>
              step.kind === 'companion' ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-secondary px-5 py-3.5"
                >
                  <TypedLine
                    text={step.text}
                    onDone={i === 0 ? () => setShowChoices(true) : undefined}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-5 py-2.5"
                >
                  <p className="text-sm font-semibold leading-relaxed text-primary-foreground">
                    {step.text}
                  </p>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {/* Hick's Law: ровно 2 варианта ответа, свободный ввод — только в /app */}
          <AnimatePresence>
            {showChoices && !answered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap justify-end gap-2 pt-1"
              >
                {(Object.keys(REPLIES) as ReplyKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => choose(key)}
                    className="rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary/10"
                  >
                    {REPLIES[key].visitor}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* После ответа — честный переход в настоящий продукт */}
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, type: 'spring', stiffness: 200, damping: 20 }}
              className="flex justify-center pt-3"
            >
              <Button
                render={<Link href="/app" />}
                nativeButton={false}
                size="lg"
                className="font-semibold"
              >
                Пойдём попробуем
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Заголовок ПОД сценой: сцена важнее слов (калибровка Family) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-16 flex max-w-sm flex-col items-center gap-3 text-center"
      >
        <h1 className="text-balance text-2xl font-bold leading-tight md:text-3xl">
          Существо, которое не даст тебе слиться
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          Помогает начать, сидит рядом во время работы и растит остров из твоих стартов. Без
          стриков. Без стыда.
        </p>
        <span className="pt-1 font-mono text-xs text-muted-foreground">
          бесплатно, без карты и регистрации
        </span>
      </motion.div>
    </section>
  )
}
