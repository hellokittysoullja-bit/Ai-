'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from 'motion/react'
import { Button } from '@/components/ui/button'

const c = {
  ground: 'var(--color-secondary)',
  groundDark: 'var(--color-accent)',
  green: 'var(--color-primary)',
  soft: 'var(--color-muted-foreground)',
  warm: 'oklch(0.75 0.15 65)',
}

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
  { emoji: '🚫', title: 'Ноль стриков', text: 'Стрики наказывают за срыв. Мы — нет.' },
  { emoji: '🏝️', title: 'Мир не откатывается', text: 'Что построено — построено навсегда.' },
  { emoji: '☁️', title: 'Провал = ничего', text: 'Не минус, не красная цифра. Просто завтра.' },
  {
    emoji: '✨',
    title: 'Никогда не знаешь, что вырастет',
    text: 'Дальше — находки: кот у костра, кит в бухте, северное сияние. Редкие — правда редкие.',
  },
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
    setVisible((prev) => Math.max(prev, n))
  })

  const shown = reduceMotion ? sprouts.length : visible

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Lime glow в центре секции */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/3 h-[500px] bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,oklch(0.86_0.22_130/0.08)_0%,transparent_100%)] blur-2xl"
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-24 md:py-36">
        <div className="flex flex-col gap-14">
          <motion.div
            className="flex flex-col gap-5"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Ты растишь{' '}
              <span className="text-primary">его мир</span>.
              <br />
              Он не даёт твоему рухнуть.
            </h2>
            <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
              Каждый старт выращивает кусочек острова. Листай — и он растёт, прямо как в
              приложении. А теперь главное: он никогда не откатывается.
            </p>
          </motion.div>

          {/* Остров: крупнее, с рамкой и свечением */}
          <motion.div
            className="overflow-hidden rounded-3xl border-2 border-primary/20 bg-card shadow-[0_0_60px_oklch(0.86_0.22_130/0.10)]"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          >
            <svg
              viewBox="0 0 380 216"
              role="img"
              aria-label="Остров напарника, который растёт от твоих стартов"
              className="block w-full"
            >
              <defs>
                <linearGradient id="lsky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-background)" />
                  <stop offset="72%" stopColor="var(--color-background)" />
                  <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
                <linearGradient id="lsea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-secondary)" />
                  <stop offset="100%" stopColor="var(--color-background)" />
                </linearGradient>
                <radialGradient id="island-glow" cx="0.5" cy="0.72" r="0.4">
                  <stop offset="0%" stopColor="oklch(0.86 0.22 130)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="oklch(0.86 0.22 130)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect x="0" y="0" width="380" height="162" fill="url(#lsky)" />
              {[
                [24, 18, 1.1], [58, 40, 0.8], [96, 14, 1.3], [132, 52, 0.7],
                [168, 24, 1.0], [242, 12, 1.2], [292, 30, 1.0], [348, 20, 1.1],
              ].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="var(--color-muted-foreground)" opacity="0.5">
                  {!reduceMotion && (
                    <animate
                      attributeName="opacity"
                      values="0.25;0.75;0.25"
                      dur={`${2.6 + (i % 5) * 0.9}s`}
                      begin={`${(i % 7) * 0.5}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              ))}
              <rect x="0" y="158" width="380" height="58" fill="url(#lsea)" />
              <ellipse cx="190" cy="182" rx="130" ry="12" fill="var(--color-accent)" opacity="0.28" />
              {[
                [52, 190, 26], [136, 198, 34], [230, 192, 22], [312, 200, 30],
              ].map(([x, y, w], i) => (
                <line
                  key={i}
                  x1={x} y1={y} x2={x + w} y2={y}
                  stroke="var(--color-muted-foreground)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  opacity="0.25"
                />
              ))}
              {/* Lime glow под островом */}
              <ellipse cx="190" cy="157" rx="152" ry="32" fill="url(#island-glow)" />
              <ellipse cx="190" cy="156" rx="146" ry="26" fill={c.ground} />
              <path
                d="M50 156
                   Q66 132 108 136 Q128 124 160 130 Q190 118 222 130
                   Q254 122 276 134 Q312 130 330 156
                   Q300 172 190 174 Q80 172 50 156 Z"
                fill={c.groundDark}
                opacity="0.7"
              />
              <ellipse cx="190" cy="160" rx="140" ry="17" fill={c.groundDark} opacity="0.35" />
              {sprouts.map((s, i) => (
                <g key={s.key} className={i < shown ? 'island-grow' : undefined} opacity={i < shown ? 1 : 0}>
                  {s.node}
                </g>
              ))}
            </svg>
            {/* Подпись под островом */}
            <div className="flex items-center justify-between px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Листай — и остров растёт
              </p>
              <Button
                render={<Link href="/app" />}
                nativeButton={false}
                size="sm"
                variant="outline"
              >
                Открыть свой
              </Button>
            </div>
          </motion.div>

          {/* Принципы — с emoji и крупнее */}
          <ul className="grid gap-6 sm:grid-cols-2">
            {principles.map((p, i) => (
              <motion.li
                key={p.title}
                className="flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 22,
                  delay: reduceMotion ? 0 : i * 0.1,
                }}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-lg font-bold">{p.title}</span>
                <span className="leading-relaxed text-muted-foreground">{p.text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
