'use client'

import { motion, useReducedMotion } from 'motion/react'

const steps = [
  {
    num: '01',
    title: 'Вечером — 3 минуты',
    text: 'Напарник разбирает с тобой завтрашний день и сам превращает «поработать над проектом» в «открыть файл X». Одно физическое действие.',
    tilt: '-rotate-[0.6deg]',
  },
  {
    num: '02',
    title: 'Утром он пишет первым',
    text: 'Не пуш «пора работать», а сообщение от живого существа: «Я тут. Просто открой файл, больше ничего». Начать — легче, чем отказать.',
    tilt: 'rotate-[0.5deg]',
  },
  {
    num: '03',
    title: 'Сессия вдвоём',
    text: 'Ты работаешь — он рядом. Body doubling без второго человека. Отвлёкся? Он мягко вернёт, без нотаций.',
    tilt: 'rotate-[0.7deg]',
  },
  {
    num: '04',
    title: 'Его мир растёт',
    text: 'Каждая сессия — новый кусочек его острова. Провалил день? Ничего не сгорает и не откатывается. Ноль, не минус.',
    tilt: '-rotate-[0.5deg]',
  },
]

export function HowItWorks() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 md:py-24">
      <motion.div
        className="mb-10 flex flex-col gap-3"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          [ как это работает ]
        </p>
        <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
          Продукт, который приходит сам
        </h2>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            className={`flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 ${step.tilt} transition-transform duration-300 hover:rotate-0`}
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 20,
              delay: reduceMotion ? 0 : i * 0.1,
            }}
          >
            <span className="font-hand text-2xl text-primary">{step.num}</span>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
