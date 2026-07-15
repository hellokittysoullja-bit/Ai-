'use client'

import { motion, useReducedMotion } from 'motion/react'

/**
 * Слом ритма: после плотной живой сцены hero — огромная тихая секция.
 * Один фокус, никаких карточек и сеток. Похороненные инструменты — просто
 * зачёркнутые строки, как в блокноте.
 */

const failedTools = [
  'Notion с идеальной системой — заброшен через 9 дней',
  'Todoist с 47 просроченными задачами',
  'Pomodoro-таймер, который ты забываешь включить',
  'планировщик, который стыдит красными цифрами',
]

export function Problem() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="mx-auto max-w-2xl px-6 py-32 md:py-48">
      <motion.div
        className="flex flex-col gap-10"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          Тебе не нужен ещё один инструмент.
        </h2>

        <ul className="flex flex-col gap-4">
          {failedTools.map((tool, i) => (
            <motion.li
              key={tool}
              className="text-lg leading-relaxed text-muted-foreground line-through decoration-destructive/60 decoration-2 md:text-xl"
              initial={reduceMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: reduceMotion ? 0 : i * 0.15, duration: 0.5 }}
            >
              {tool}
            </motion.li>
          ))}
        </ul>

        <motion.p
          className="text-pretty text-lg leading-relaxed md:text-xl"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{
            type: 'spring',
            stiffness: 140,
            damping: 20,
            delay: reduceMotion ? 0 : 0.65,
          }}
        >
          Все они требуют одного: чтобы ты сам их открыл. То есть той самой силы воли, которой
          нет в момент прокрастинации. Тебе нужен{' '}
          <span className="font-hand text-2xl text-primary md:text-3xl">
            кто-то, кто скажет «начинай»
          </span>{' '}
          — и придёт к тебе сам.
        </motion.p>
      </motion.div>
    </section>
  )
}
