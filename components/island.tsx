'use client'

import { useEffect, useState } from 'react'
import {
  addFind,
  getFinds,
  getPatterns,
  getStarts,
  todayKey,
  type IslandFindEntry,
  type Patterns,
  type StartEntry,
} from '@/lib/memory'
import {
  drawFind,
  ISLAND_ELEMENT_NAMES,
  LANDMARK_COUNT,
  poolElementByKey,
  RARITY_LABEL,
  type Rarity,
} from '@/lib/island-elements'

/**
 * Остров — дневник стартов.
 * Старты 1–10 открывают ориентиры в фиксированных местах.
 * Старты 11+ приносят находки из пула: каждая навсегда встаёт туда,
 * где выросла (позиция из сида находки). Ничего никогда не исчезает.
 */

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

type Landmark = {
  key: string
  name: (typeof ISLAND_ELEMENT_NAMES)[number]
  render: (unlocked: boolean) => React.ReactNode
}

const landmarks: Landmark[] = [
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

// ---------- Рендер находок из пула ----------

/** Маленькие рисунки в локальных координатах вокруг (0,0) — точка у земли */
const findSprites: Record<string, React.ReactNode> = {
  pine: (
    <>
      <rect x="-2" y="-6" width="4" height="8" rx="2" fill={c.groundDark} />
      <path d="M0 -34 L11 -16 L-11 -16 Z" fill={c.green} opacity="0.85" />
      <path d="M0 -24 L13 -4 L-13 -4 Z" fill={c.green} opacity="0.9" />
    </>
  ),
  bush: (
    <>
      <circle cx="-5" cy="-6" r="8" fill={c.green} opacity="0.75" />
      <circle cx="5" cy="-5" r="7" fill={c.green} opacity="0.85" />
    </>
  ),
  stone: (
    <>
      <ellipse cx="0" cy="-4" rx="9" ry="6" fill={c.soft} opacity="0.55" />
      <ellipse cx="-3" cy="-6" rx="4" ry="2.5" fill={c.soft} opacity="0.35" />
    </>
  ),
  flowers: (
    <>
      <path d="M-6 0 v-8 M0 0 v-10 M6 0 v-7" stroke={c.green} strokeWidth="2" strokeLinecap="round" />
      <circle cx="-6" cy="-10" r="2.5" fill={c.warm} />
      <circle cx="0" cy="-12" r="2.5" fill={c.warm} opacity="0.85" />
      <circle cx="6" cy="-9" r="2.5" fill={c.warm} opacity="0.7" />
    </>
  ),
  mushrooms: (
    <>
      <rect x="-6" y="-6" width="3" height="6" rx="1.5" fill="var(--color-card)" />
      <path d="M-9.5 -6 a5 4 0 0 1 10 0 z" fill={c.warm} opacity="0.9" />
      <rect x="3" y="-4" width="2.5" height="4" rx="1.25" fill="var(--color-card)" />
      <path d="M0.5 -4 a4 3 0 0 1 8 0 z" fill={c.warm} opacity="0.7" />
    </>
  ),
  reeds: (
    <>
      <path d="M-4 0 q-1 -10 1 -14 M0 0 q1 -12 0 -17 M4 0 q2 -9 1 -13" stroke={c.green} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
      <ellipse cx="0" cy="-17" rx="1.6" ry="4" fill={c.groundDark} />
    </>
  ),
  bird: (
    <>
      <path d="M-8 0 q4 -6 8 0 q4 -6 8 0" stroke={c.soft} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  cat: (
    <>
      <ellipse cx="0" cy="-5" rx="7" ry="5" fill={c.groundDark} />
      <circle cx="6" cy="-9" r="4" fill={c.groundDark} />
      <path d="M3.5 -12 l1.5 -3 l2 2.6 M8.5 -12 l1.5 -3 l-1 3" stroke={c.groundDark} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M-7 -4 q-6 2 -4 6" stroke={c.groundDark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="7.2" cy="-9" r="0.9" fill={c.green} />
    </>
  ),
  hammock: (
    <>
      <line x1="-14" y1="0" x2="-14" y2="-16" stroke={c.groundDark} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="0" x2="14" y2="-16" stroke={c.groundDark} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-14 -13 q14 10 28 0" stroke={c.warm} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  boat: (
    <>
      <path d="M-12 -2 h24 l-5 6 h-14 z" fill={c.groundDark} />
      <line x1="0" y1="-2" x2="0" y2="-16" stroke={c.soft} strokeWidth="2" strokeLinecap="round" />
      <path d="M0 -16 L10 -8 L0 -8 Z" fill={c.warm} opacity="0.9" />
    </>
  ),
  firefly: (
    <>
      <circle cx="-6" cy="-10" r="1.8" fill={c.green} />
      <circle cx="-6" cy="-10" r="4" fill={c.green} opacity="0.25" />
      <circle cx="4" cy="-16" r="1.5" fill={c.green} opacity="0.9" />
      <circle cx="4" cy="-16" r="3.5" fill={c.green} opacity="0.2" />
      <circle cx="8" cy="-6" r="1.3" fill={c.green} opacity="0.8" />
    </>
  ),
  bench: (
    <>
      <rect x="-11" y="-8" width="22" height="3" rx="1.5" fill={c.groundDark} />
      <line x1="-8" y1="-5" x2="-8" y2="0" stroke={c.groundDark} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="-5" x2="8" y2="0" stroke={c.groundDark} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  whale: (
    <>
      <path d="M-14 0 q6 -12 24 -6 q4 2 2 6 z" fill={c.soft} opacity="0.7" />
      <path d="M12 -4 q6 -2 6 -8 q-4 2 -8 3" fill={c.soft} opacity="0.7" />
      <path d="M-8 -8 q0 -6 -2 -8 M-8 -8 q2 -6 5 -7" stroke={c.green} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.9" />
    </>
  ),
  aurora: (
    <>
      <path d="M-30 0 q15 -12 30 0 q15 12 30 0" stroke={c.green} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.3" />
      <path d="M-26 8 q13 -10 26 0 q13 10 26 0" stroke={c.green} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.2" />
    </>
  ),
  'shooting-star': (
    <>
      <line x1="-18" y1="-10" x2="0" y2="0" stroke={c.warm} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M0 0 l2.2 4.6 l5 .7 l-3.6 3.6 l.9 5 l-4.5 -2.4 l-4.5 2.4 l.9 -5 l-3.6 -3.6 l5 -.7 z" fill={c.warm} transform="scale(0.7)" />
    </>
  ),
  lighthouse: (
    <>
      <path d="M-6 0 L-4 -26 h8 L6 0 z" fill="var(--color-card)" stroke={c.groundDark} strokeWidth="1.5" />
      <rect x="-5" y="-18" width="10" height="4" fill={c.warm} opacity="0.8" />
      <rect x="-4" y="-32" width="8" height="6" rx="1" fill={c.warm} />
      <path d="M4 -29 L22 -34 M4 -29 L22 -24" stroke={c.warm} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
    </>
  ),
}

/**
 * Позиция находки: детерминированная из сида и порядкового номера.
 * Золотое сечение по X расталкивает соседние находки без коллизий.
 */
function findPosition(find: IslandFindEntry, index: number): { x: number; y: number; s: number } {
  const zone = poolElementByKey(find.key)?.zone ?? 'ground'
  const t = (index * 0.61803 + (find.seed % 1000) / 1000) % 1
  const jitter = ((find.seed >> 4) % 100) / 100

  if (zone === 'sky') {
    return { x: 46 + t * 240, y: 26 + jitter * 34, s: 1.05 + jitter * 0.4 }
  }
  if (zone === 'water') {
    // только по краям, чтобы не залезать на остров
    const x = t < 0.5 ? 16 + t * 2 * 44 : 322 + (t - 0.5) * 2 * 44
    return { x, y: 170 + jitter * 10, s: 1.0 + jitter * 0.35 }
  }
  return { x: 58 + t * 264, y: 138 + jitter * 18, s: 1.0 + jitter * 0.5 }
}

// ---------- Дневник ----------

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  return `${d} ${months[(m ?? 1) - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`
}

type DiaryEntry = {
  id: string
  name: string
  rarity: Rarity | 'landmark'
  date: string
  label: string
  isNewToday: boolean
}

export function Island() {
  const [starts, setStarts] = useState<StartEntry[] | null>(null)
  const [finds, setFinds] = useState<IslandFindEntry[]>([])
  const [patterns, setPatterns] = useState<Patterns | null>(null)

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([getStarts(), getPatterns()])
      let f = await getFinds()

      // Бэкфилл: старты сверх карты, сделанные до появления пула находок,
      // получают свои находки задним числом — история не теряется.
      const owed = Math.max(0, s.length - LANDMARK_COUNT) - f.length
      if (owed > 0) {
        const extraStarts = s.slice(LANDMARK_COUNT)
        for (const start of extraStarts) {
          if (f.some((x) => x.startId === start.id)) continue
          let pity = 0
          for (let i = f.length - 1; i >= 0 && f[i].rarity === 'common'; i--) pity++
          const draw = drawFind(false, pity)
          const entry = { ...draw, date: start.date, startId: start.id }
          await addFind(entry)
          f = [...f, entry]
        }
      }

      setStarts(s)
      setFinds(f)
      setPatterns(p)
    }
    load()
  }, [])

  const count = starts?.length ?? 0
  const today = todayKey()
  const lastStart = starts && starts.length > 0 ? starts[starts.length - 1] : null
  const startedToday = lastStart?.date === today

  // Подсветка последней награды, если она заработана сегодня
  const newLandmarkIndex = startedToday && count <= LANDMARK_COUNT ? count - 1 : -1
  const newFindStartId =
    startedToday && count > LANDMARK_COUNT && lastStart
      ? finds.find((f) => f.startId === lastStart.id)?.startId ?? null
      : null

  // Дневник: ориентиры + находки одной лентой, свежее сверху
  const diary: DiaryEntry[] = []
  if (starts) {
    starts.forEach((start, i) => {
      if (i < LANDMARK_COUNT) {
        diary.push({
          id: start.id,
          name: landmarks[i].name,
          rarity: 'landmark',
          date: start.date,
          label: start.label,
          isNewToday: i === newLandmarkIndex,
        })
      } else {
        // Находка привязана к старту навсегда — сопоставляем по id, не по позиции
        const find = finds.find((f) => f.startId === start.id)
        if (find) {
          diary.push({
            id: start.id,
            name: find.name,
            rarity: find.rarity,
            date: start.date,
            label: start.label,
            isNewToday: find.startId === newFindStartId,
          })
        }
      }
    })
  }
  const recentDiary = diary.slice(-8).reverse()
  const rareCount = finds.filter((f) => f.rarity === 'rare').length

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-28 pt-6">
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
          aria-label={`Остров напарника: ${count} стартов, ${finds.length} находок`}
          className="block w-full"
        >
          {/* вода */}
          <rect x="0" y="0" width="380" height="200" fill="var(--color-background)" />
          <ellipse cx="190" cy="184" rx="180" ry="18" fill="var(--color-accent)" opacity="0.5" />
          {/* остров */}
          <ellipse cx="190" cy="152" rx="140" ry="26" fill={c.ground} />
          <ellipse cx="190" cy="147" rx="128" ry="20" fill={c.groundDark} opacity="0.55" />
          {landmarks.map((landmark, i) => (
            <g
              key={landmark.key}
              className={
                i < count
                  ? `island-grow${i === newLandmarkIndex ? ' island-new-element' : ''}`
                  : undefined
              }
              style={i < count ? { animationDelay: `${Math.min(i, 11) * 0.06}s` } : undefined}
            >
              {landmark.render(i < count)}
            </g>
          ))}
          {finds.map((find, i) => {
            const pos = findPosition(find, i)
            const sprite = findSprites[find.key]
            if (!sprite) return null
            return (
              <g
                key={find.startId}
                className={`island-grow${find.startId === newFindStartId ? ' island-new-element' : ''}`}
                style={{ animationDelay: `${Math.min(i + LANDMARK_COUNT, 14) * 0.05}s` }}
                transform={`translate(${pos.x} ${pos.y}) scale(${pos.s})`}
              >
                {/* Редкая находка светится на карте постоянно — она должна быть видна гостю */}
                {find.rarity === 'rare' && (
                  <circle cx="0" cy="-10" r="20" fill={c.green} opacity="0.12">
                    <animate
                      attributeName="opacity"
                      values="0.08;0.2;0.08"
                      dur="3.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {sprite}
              </g>
            )
          })}
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
          {recentDiary.map((entry) => (
            <li
              key={entry.id}
              className={`flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3 ${
                entry.isNewToday ? 'border-primary/50' : 'border-border'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {entry.name}
                  {entry.rarity === 'rare' && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                      {RARITY_LABEL.rare}
                    </span>
                  )}
                  {entry.isNewToday && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                      новое
                    </span>
                  )}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {formatDate(entry.date)} — ты начал «{entry.label}»
                </span>
              </div>
            </li>
          ))}
          {diary.length > recentDiary.length && (
            <li className="rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              И ещё {diary.length - recentDiary.length} записей раньше — всё это по-прежнему на
              острове.
            </li>
          )}
        </ul>
      )}

      {patterns && patterns.totalStarts > 0 && (
        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          всего стартов: {patterns.totalStarts}
          {rareCount > 0 ? ` · редких находок: ${rareCount}` : ''} · дней подряд:{' '}
          {patterns.runningDays}
          {patterns.runningDays === 0 ? ' (пауза, не обнуление)' : ''}
        </p>
      )}
    </div>
  )
}
