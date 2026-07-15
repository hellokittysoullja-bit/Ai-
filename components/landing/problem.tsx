'use client'

import { motion, useReducedMotion } from 'motion/react'

const failedTools = [
  { text: 'Notion с идеальной системой, заброшен через 9 дней', tilt: '-rotate-1' },
  { text: 'Todoist с 47 просроченными задачами', tilt: 'rotate-[0.5deg]' },
  { text: 'Pomodoro-таймер, который ты забываешь включить', tilt: 'rotate-1' },
  { text: 'Планировщик, который стыдит красными цифрами', tilt: '-rotate-[0.5deg]' },
]

export function Problem() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative grain border-y border-border bg-card">
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <motion.div
            className="flex flex-1 flex-col gap-4"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              [ честно ]
            </p>
            <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
              Тебе не нужен ещё один инструмент. Тебе нужен кто-то, кто скажет{' '}
              <span className="font-hand text-3xl text-primary md:text-5xl">«начинай»</span>{' '}
              в нужный момент.
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Все приложения для фокуса требуют одного: чтобы ты сам их открыл.
              То есть требуют той самой силы воли, которой нет в момент
              прокрастинации. Это очки, которые нужно разглядеть, чтобы надеть.
            </p>
          </motion.div>
          <ul className="flex flex-1 flex-col gap-3">
            {failedTools.map((item, i) => (
              <motion.li
                key={item.text}
                className={`flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-muted-foreground ${item.tilt} transition-transform duration-300 hover:rotate-0`}
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
                <span aria-hidden="true" className="mt-0.5 font-mono text-destructive">
                  ✕
                </span>
                {item.text}
              </motion.li>
            ))}
            <motion.li
              className="flex items-start gap-3 rounded-xl border border-primary/40 bg-background p-4 text-sm font-medium leading-relaxed"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 18,
                delay: reduceMotion ? 0 : failedTools.length * 0.09 + 0.1,
              }}
            >
              <span aria-hidden="true" className="mt-0.5 font-mono text-primary">
                ✓
              </span>
              Напарник, который приходит к тебе сам
            </motion.li>
          </ul>
        </div>
      </div>
    </section>
  )
}
