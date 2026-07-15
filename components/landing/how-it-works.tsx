'use client'

import { motion, useReducedMotion } from 'motion/react'

/**
 * Не «4 фичи в сетке», а один день из жизни с напарником —
 * вертикальная лента времени с его живыми репликами.
 */

const day = [
  {
    time: '21:40',
    title: 'Вечером — 3 минуты',
    text: 'Напарник разбирает с тобой завтра и превращает «поработать над проектом» в одно физическое действие.',
    quote: 'Значит, завтра просто открываешь файл диплома. Всё, больше ничего не планируем.',
  },
  {
    time: '09:12',
    title: 'Утром он пишет первым',
    text: 'Не пуш «пора работать», а сообщение от живого существа. Начать — легче, чем отказать.',
    quote: 'Я тут. Помнишь — просто открыть файл. Я рядом.',
  },
  {
    time: '09:31',
    title: 'Сессия вдвоём',
    text: 'Ты работаешь — он рядом. Body doubling без второго человека. Отвлёкся? Мягко вернёт.',
    quote: 'Полёт нормальный. Я никуда не ухожу.',
  },
  {
    time: '10:04',
    title: 'Его мир растёт',
    text: 'Каждый старт — новый кусочек острова. Провалил день? Ничего не сгорает. Ноль, не минус.',
    quote: 'Смотри, у нас вырос первый росток. Это твой.',
  },
]

export function HowItWorks() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="how" className="grain relative scroll-mt-20 border-y border-border bg-card">
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-24 md:py-36">
        <motion.div
          className="mb-16 flex flex-col gap-3"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            [ один день вдвоём ]
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Как проходит день с напарником
          </h2>
        </motion.div>

        {/* Вертикальная лента: нить времени слева, события справа */}
        <div className="relative flex flex-col gap-14 border-l-2 border-border pl-8 md:pl-12">
          {day.map((step, i) => (
            <motion.article
              key={step.time}
              className="relative flex flex-col gap-3"
              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                type: 'spring',
                stiffness: 160,
                damping: 22,
                delay: reduceMotion ? 0 : 0.08,
              }}
            >
              {/* узел на нити */}
              <span
                aria-hidden="true"
                className="absolute -left-8 top-1.5 size-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background md:-left-12"
              />
              <span className="font-mono text-xs tracking-widest text-muted-foreground">
                {step.time}
              </span>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{step.text}</p>
              <p
                className={`font-hand text-xl leading-snug text-primary md:text-2xl ${
                  i % 2 === 0 ? '-rotate-[0.7deg]' : 'rotate-[0.6deg]'
                }`}
              >
                «{step.quote}»
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
