'use client'

import { useEffect, useState } from 'react'
import { getPatterns, getStarts, type Patterns, type StartEntry } from '@/lib/memory'

/**
 * Остров — дневник стартов.
 * Каждый старт открывает следующий элемент. Ничего никогда не исчезает.
 */

type IslandElement = {
  key: string
  name: string
  render: (unlocked: boolean) => React.ReactNode
}

const c = {
  ground: 'var(--color-secondary)',
  groundDark: 'var(--color-accent)',
  green: 'var(--color-primary)',
  soft: 'var(--color-muted-foreground)',
  warm: 'oklch(0.75 0.15 65)',
}

function el(unlocked: boolean, children: React.ReactNode) {
  return (
    <g
      opacity={unlocked ? 1 : 0}
      style={{ transition: 'opacity 700ms ease' }}
      aria-hidden={!unlocked}
    >
      {children}
    </g>
  )
}

const elements: IslandElement[] = [
  {
    key: 'sprout',
    name: 'Первый росток',
    render: (u) =>
      el(
        u,
        <>
          <path d="M196 150 q0 -14 0 -20" stroke={c.green} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M196 136 q-8 -4 -10 -12 q10 0 10 12" fill={c.green} />
          <path d="M196 140 q8 -4 10 -12 q-10 0 -10 12" fill={c.green} />
        </>,
      ),
  },
  {
    key: 'tree',
    name: 'Дерево',
    render: (u) =>
      el(
        u,
        <>
          <rect x="118" y="118" width="6" height="28" rx="3" fill={c.groundDark} />
          <circle cx="121" cy="108" r="20" fill={c.green} opacity="0.9" />
          <circle cx="108" cy="118" r="12" fill={c.green} opacity="0.75" />
          <circle cx="134" cy="116" r="13" fill={c.green} opacity="0.8" />
        </>,
      ),
  },
  {
    key: 'campfire',
    name: 'Костёр',
    render: (u) =>
      el(
        u,
        <>
          <line x1="238" y1="148" x2="252" y2="140" stroke={c.groundDark} strokeWidth="4" strokeLinecap="round" />
          <line x1="252" y1="148" x2="238" y2="140" stroke={c.groundDark} strokeWidth="4" strokeLinecap="round" />
          <path d="M245 138 q-6 -8 0 -16 q2 6 5 8 q3 -4 2 -8 q7 8 -1 16 q-3 2 -6 0z" fill={c.warm} />
        </>,
      ),
  },
  {
    key: 'house',
    name: 'Домик',
    render: (u) =>
      el(
        u,
        <>
          <rect x="152" y="96" width="34" height="26" rx="3" fill={c.groundDark} />
          <path d="M148 98 L169 80 L190 98 Z" fill={c.green} opacity="0.85" />
          <rect x="164" y="106" width="10" height="16" rx="2" fill={c.warm} opacity="0.9" />
        </>,
      ),
  },
  {
    key: 'garden',
    name: 'Грядки',
    render: (u) =>
      el(
        u,
        <>
          <ellipse cx="92" cy="152" rx="16" ry="5" fill={c.groundDark} />
          <path d="M84 150 v-7 M92 150 v-9 M100 150 v-7" stroke={c.green} strokeWidth="2.5" strokeLinecap="round" />
        </>,
      ),
  },
  {
    key: 'lantern',
    name: 'Фонарь',
    render: (u) =>
      el(
        u,
        <>
          <line x1="212" y1="152" x2="212" y2="118" stroke={c.soft} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="212" cy="112" r="6" fill={c.warm} />
          <circle cx="212" cy="112" r="11" fill={c.warm} opacity="0.25" />
        </>,
      ),
  },
  {
    key: 'tree2',
    name: 'Второе дерево',
    render: (u) =>
      el(
        u,
        <>
          <rect x="272" y="112" width="5" height="24" rx="2.5" fill={c.groundDark} />
          <circle cx="274" cy="102" r="15" fill={c.green} opacity="0.8" />
          <circle cx="284" cy="110" r="9" fill={c.green} opacity="0.65" />
        </>,
      ),
  },
  {
    key: 'flag',
    name: 'Флаг',
    render: (u) =>
      el(
        u,
        <>
          <line x1="68" y1="132" x2="68" y2="100" stroke={c.soft} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M68 100 L88 106 L68 112 Z" fill={c.green} />
        </>,
      ),
  },
  {
    key: 'dock',
    name: 'Причал',
    render: (u) =>
      el(
        u,
        <>
          <rect x="296" y="146" width="44" height="6" rx="3" fill={c.groundDark} />
          <line x1="304" y1="152" x2="304" y2="162" stroke={c.groundDark} strokeWidth="3" strokeLinecap="round" />
          <line x1="330" y1="152" x2="330" y2="162" stroke={c.groundDark} strokeWidth="3" strokeLinecap="round" />
        </>,
      ),
  },
  {
    key: 'moon',
    name: 'Луна над островом',
    render: (u) =>
      el(
        u,
        <>
          <circle cx="320" cy="44" r="14" fill={c.warm} opacity="0.85" />
          <circle cx="326" cy="40" r="12" fill="var(--color-card)" />
        </>,
      ),
  },
]

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${d} ${months[(m ?? 1) - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`
}

export function Island() {
  const [starts, setStarts] = useState<StartEntry[] | null>(null)
  const [patterns, setPatterns] = useState<Patterns | null>(null)

  useEffect(() => {
    Promise.all([getStarts(), getPatterns()]).then(([s, p]) => {
      setStarts(s)
      setPatterns(p)
    })
  }, [])

  const count = starts?.length ?? 0
  const unlockedCount = Math.min(count, elements.length)
  const extraStarts = Math.max(0, count - elements.length)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">[ мир напарника ]</p>
        <h1 className="text-2xl font-bold tracking-tight">Остров</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Каждый старт — новый кусочек. Ничего не сгорает и не откатывается.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <svg
          viewBox="0 0 380 200"
          role="img"
          aria-label={`Остров напарника: открыто ${unlockedCount} из ${elements.length} элементов`}
          className="block w-full"
        >
          {/* вода */}
          <rect x="0" y="0" width="380" height="200" fill="var(--color-background)" />
          <ellipse cx="190" cy="184" rx="180" ry="18" fill="var(--color-accent)" opacity="0.5" />
          {/* остров */}
          <ellipse cx="190" cy="152" rx="140" ry="26" fill={c.ground} />
          <ellipse cx="190" cy="147" rx="128" ry="20" fill={c.groundDark} opacity="0.55" />
          {elements.map((element, i) => (
            <g key={element.key}>{element.render(i < count)}</g>
          ))}
        </svg>
      </div>

      {starts !== null && count === 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold">Пока здесь пусто — и это нормально.</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Первый же старт — любой, даже минутный — вырастит здесь первый росток.
          </p>
        </div>
      )}

      {starts !== null && count > 0 && (
        <ul className="flex flex-col gap-2">
          {starts
            .slice(0, elements.length)
            .map((start, i) => (
              <li
                key={start.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{elements[i].name}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {formatDate(start.date)} — ты начал «{start.label}»
                  </span>
                </div>
              </li>
            ))
            .reverse()}
          {extraStarts > 0 && (
            <li className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              И ещё {extraStarts} стартов сверх карты — остров становится гуще.
            </li>
          )}
        </ul>
      )}

      {patterns && patterns.totalStarts > 0 && (
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          всего стартов: {patterns.totalStarts} · дней подряд: {patterns.runningDays}
          {patterns.runningDays === 0 ? ' (пауза, не обнуление)' : ''}
        </p>
      )}
    </div>
  )
}
