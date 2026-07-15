'use client'

import { useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from 'motion/react'

/**
 * Живое доказательство вместо картинки: остров прорастает по мере скролла.
 * Тот же визуальный язык, что и настоящий остров в /app/world.
 */

const c = {
  ground: 'var(--color-secondary)',
  groundDark: 'var(--color-accent)',
  green: 'var(--color-primary)',
  soft: 'var(--color-muted-foreground)',
  warm: 'oklch(0.75 0.15 65)',
}

/** Элементы острова в порядке прорастания */
const sprouts: Array<{ key: string; node: React.ReactNode }> = [
  {
    key: 'sprout',
    node: (
      <>
        <path d="M196 150 q0 -14 0 -20" stroke={c.green} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M196 136 q-8 -4 -10 -12 q10 0 10 12" fill={c.green} />
        <path d="M196 140 q8 -4 10 -12 q-10 0 -10 12" fill={c.green} />
      </>
    ),
  },
  {
    key: 'tree',
    node: (
      <>
        <rect x="118" y="118" width="6" height="28" rx="3" fill={c.groundDark} />
        <circle cx="121" cy="108" r="20" fill={c.green} opacity="0.9" />
        <circle cx="108" cy="118" r="12" fill={c.green} opacity="0.75" />
        <circle cx="134" cy="116" r="13" fill={c.green} opacity="0.8" />
      </>
    ),
  },
  {
    key: 'campfire',
    node: (
      <>
        <line x1="238" y1="148" x2="252" y2="140" stroke={c.groundDark} strokeWidth="4" strokeLinecap="round" />
        <line x1="252" y1="148" x2="238" y2="140" stroke={c.groundDark} strokeWidth="4" strokeLinecap="round" />
        <path d="M245 138 q-6 -8 0 -16 q2 6 5 8 q3 -4 2 -8 q7 8 -1 16 q-3 2 -6 0z" fill={c.warm} />
      </>
    ),
  },
  {
    key: 'house',
    node: (
      <>
        <rect x="152" y="96" width="34" height="26" rx="3" fill={c.groundDark} />
        <path d="M148 98 L169 80 L190 98 Z" fill={c.green} opacity="0.85" />
        <rect x="164" y="106" width="10" height="16" rx="2" fill={c.warm} opacity="0.9" />
      </>
    ),
  },
  {
    key: 'lantern',
    node: (
      <>
        <line x1="212" y1="152" x2="212" y2="118" stroke={c.soft} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="212" cy="112" r="6" fill={c.warm} />
        <circle cx="212" cy="112" r="11" fill={c.warm} opacity="0.25" />
      </>
    ),
  },
  {
    key: 'tree2',
    node: (
      <>
        <rect x="272" y="112" width="5" height="24" rx="2.5" fill={c.groundDark} />
        <circle cx="274" cy="102" r="15" fill={c.green} opacity="0.8" />
        <circle cx="284" cy="110" r="9" fill={c.green} opacity="0.65" />
      </>
    ),
  },
  {
    key: 'moon',
    node: (
      <>
        <circle cx="320" cy="44" r="14" fill={c.warm} opacity="0.85" />
        <circle cx="326" cy="40" r="12" fill="var(--color-card)" />
      </>
    ),
  },
]

const principles = [
  { title: 'Ноль стриков', text: 'Стрики наказывают за срыв. Мы — нет.' },
  { title: 'Мир не откатывается', text: 'Что построено — построено навсегда.' },
  { title: 'Провал = ничего', text: 'Не минус, не красная цифра. Просто завтра.' },
]

export function WorldSection() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(0)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 85%', 'center 45%'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const n = Math.round(v * sprouts.length)
    // остров только растёт — как в продукте, ничего не исчезает
    setVisible((prev) => Math.max(prev, n))
  })

  const shown = reduceMotion ? sprouts.length : visible

  return (
    <section ref={ref} className="mx-auto max-w-2xl px-6 py-32 md:py-48">
      <div className="flex flex-col gap-12">
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
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Ты растишь его мир. Он не даёт твоему рухнуть.
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Каждый старт выращивает кусочек острова. Листай — и он растёт, прямо как в
            приложении. А теперь главное: он никогда не откатывается.
          </p>
        </motion.div>

        {/* Остров, прорастающий при скролле */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <svg
            viewBox="0 0 380 200"
            role="img"
            aria-label="Остров напарника, который растёт от твоих стартов"
            className="block w-full"
          >
            <rect x="0" y="0" width="380" height="200" fill="var(--color-background)" />
            <ellipse cx="190" cy="184" rx="180" ry="18" fill="var(--color-accent)" opacity="0.5" />
            <ellipse cx="190" cy="152" rx="140" ry="26" fill={c.ground} />
            <ellipse cx="190" cy="147" rx="128" ry="20" fill={c.groundDark} opacity="0.55" />
            {sprouts.map((s, i) => (
              <g key={s.key} className={i < shown ? 'island-grow' : undefined} opacity={i < shown ? 1 : 0}>
                {s.node}
              </g>
            ))}
          </svg>
        </div>

        <ul className="flex flex-col gap-5">
          {principles.map((p, i) => (
            <motion.li
              key={p.title}
              className="flex flex-col gap-0.5"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 22,
                delay: reduceMotion ? 0 : i * 0.1,
              }}
            >
              <span className="font-bold">{p.title}</span>
              <span className="leading-relaxed text-muted-foreground">{p.text}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
