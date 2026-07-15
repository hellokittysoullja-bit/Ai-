'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'

const principles = [
  { title: 'Ноль стриков', text: 'Стрики наказывают за срыв. Мы — нет.' },
  { title: 'Мир не откатывается', text: 'Что построено — построено навсегда.' },
  { title: 'Провал = ничего', text: 'Не минус, не красная цифра. Просто завтра.' },
]

export function WorldSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative grain border-y border-border bg-card">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-14">
          <motion.div
            className="relative aspect-[4/3] w-full flex-1 overflow-hidden rounded-3xl"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: -1 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          >
            <Image
              src="/images/naparnik-world.png"
              alt="Остров напарника, который растёт от твоих фокус-сессий"
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </motion.div>
          <div className="flex flex-1 flex-col gap-6">
            <motion.div
              className="flex flex-col gap-3"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              <p className="font-mono text-xs uppercase tracking-widest text-primary">
                [ безопасно для стыда ]
              </p>
              <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
                Ты растишь его мир. Он не даёт твоему рухнуть.
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                Стыд — главный убийца любой системы. Один сорванный день, сгоревший
                стрик — и приложение удалено. Поэтому здесь всё устроено иначе.
              </p>
            </motion.div>
            <ul className="flex flex-col gap-3">
              {principles.map((p, i) => (
                <motion.li
                  key={p.title}
                  className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4"
                  initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 22,
                    delay: reduceMotion ? 0 : i * 0.09,
                  }}
                >
                  <span className="text-sm font-bold">{p.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">{p.text}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
