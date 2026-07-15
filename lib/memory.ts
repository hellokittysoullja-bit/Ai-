/**
 * Память напарника.
 *
 * Сейчас — localStorage на устройстве (анонимно, без регистрации).
 * Интерфейс намеренно асинхронный: замена на базу данных позже —
 * это замена реализации, а не рефакторинг всех вызовов.
 */

export type Plan = {
  /** Дата, на которую положен план, YYYY-MM-DD */
  forDate: string
  /** Задача целиком, как её назвал человек */
  task: string
  /** Первый крошечный физический шаг */
  firstStep: string
  /** Примерное время старта, например «09:00» или «утром» */
  startTime?: string
  createdAt: string
}

export type StartEntry = {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** ISO-время старта */
  startedAt: string
  /** Что человек начал */
  label: string
  /** Старт был по вчерашнему плану */
  fromPlan: boolean
  /** Сколько минут отработано (0 — начал и вышел, это тоже старт) */
  minutes: number
}

export type CompanionNote = {
  text: string
  createdAt: string
}

export type Patterns = {
  totalStarts: number
  /** Дней подряд с хотя бы одним стартом (пропуск = пауза, не обнуление) */
  runningDays: number
  /** Час суток, в который человек чаще всего реально начинает (0-23), или null */
  favoriteHour: number | null
  lastStartDate: string | null
}

const KEYS = {
  plan: 'naparnik:plan',
  starts: 'naparnik:starts',
  notes: 'naparnik:notes',
} as const

function isBrowser() {
  return typeof window !== 'undefined'
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // квота/приватный режим — молча пропускаем, память просто не сохранится
  }
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function tomorrowKey(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return todayKey(d)
}

// ---------- План ----------

export async function getPlan(): Promise<Plan | null> {
  return read<Plan | null>(KEYS.plan, null)
}

export async function savePlan(input: {
  task: string
  firstStep: string
  startTime?: string
  forDate?: string
}): Promise<Plan> {
  const plan: Plan = {
    forDate: input.forDate ?? tomorrowKey(),
    task: input.task,
    firstStep: input.firstStep,
    startTime: input.startTime,
    createdAt: new Date().toISOString(),
  }
  write(KEYS.plan, plan)
  return plan
}

export async function clearPlan(): Promise<void> {
  write(KEYS.plan, null)
}

// ---------- Старты ----------

export async function getStarts(): Promise<StartEntry[]> {
  return read<StartEntry[]>(KEYS.starts, [])
}

export async function recordStart(input: {
  label: string
  fromPlan?: boolean
  minutes?: number
}): Promise<StartEntry> {
  const entry: StartEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: todayKey(),
    startedAt: new Date().toISOString(),
    label: input.label,
    fromPlan: input.fromPlan ?? false,
    minutes: input.minutes ?? 0,
  }
  const starts = await getStarts()
  starts.push(entry)
  write(KEYS.starts, starts)
  return entry
}

export async function updateStartMinutes(id: string, minutes: number): Promise<void> {
  const starts = await getStarts()
  const entry = starts.find((s) => s.id === id)
  if (!entry) return
  entry.minutes = Math.max(entry.minutes, Math.round(minutes))
  write(KEYS.starts, starts)
}

// ---------- Заметки напарника ----------

const MAX_NOTES = 6

export async function getNotes(): Promise<CompanionNote[]> {
  return read<CompanionNote[]>(KEYS.notes, [])
}

export async function addNote(text: string): Promise<void> {
  const notes = await getNotes()
  const trimmed = text.trim()
  if (!trimmed) return
  if (notes.some((n) => n.text === trimmed)) return
  notes.push({ text: trimmed, createdAt: new Date().toISOString() })
  write(KEYS.notes, notes.slice(-MAX_NOTES))
}

// ---------- Паттерны (производные) ----------

export async function getPatterns(): Promise<Patterns> {
  const starts = await getStarts()
  if (starts.length === 0) {
    return { totalStarts: 0, runningDays: 0, favoriteHour: null, lastStartDate: null }
  }

  const dates = Array.from(new Set(starts.map((s) => s.date))).sort()
  const lastStartDate = dates[dates.length - 1]

  // «Дней подряд»: серия, заканчивающаяся сегодня или вчера.
  // Пропуск дня приостанавливает счёт, но история не сгорает.
  let runningDays = 0
  const cursor = new Date()
  const today = todayKey(cursor)
  cursor.setDate(cursor.getDate() - 1)
  const yesterday = todayKey(cursor)

  if (lastStartDate === today || lastStartDate === yesterday) {
    const dateSet = new Set(dates)
    const walk = new Date(lastStartDate + 'T12:00:00')
    while (dateSet.has(todayKey(walk))) {
      runningDays += 1
      walk.setDate(walk.getDate() - 1)
    }
  }

  const hourCounts = new Map<number, number>()
  for (const s of starts) {
    const h = new Date(s.startedAt).getHours()
    hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1)
  }
  let favoriteHour: number | null = null
  let best = 0
  for (const [h, count] of hourCounts) {
    if (count > best) {
      best = count
      favoriteHour = h
    }
  }

  return { totalStarts: starts.length, runningDays, favoriteHour, lastStartDate }
}

// ---------- Компактный контекст для LLM ----------

export type MemoryContext = {
  plan: Plan | null
  recentStarts: Array<Pick<StartEntry, 'date' | 'label' | 'minutes' | 'fromPlan'>>
  patterns: Patterns
  notes: string[]
}

export async function buildMemoryContext(): Promise<MemoryContext> {
  const [plan, starts, patterns, notes] = await Promise.all([
    getPlan(),
    getStarts(),
    getPatterns(),
    getNotes(),
  ])
  return {
    plan,
    recentStarts: starts.slice(-5).map(({ date, label, minutes, fromPlan }) => ({
      date,
      label,
      minutes,
      fromPlan,
    })),
    patterns,
    notes: notes.map((n) => n.text),
  }
}
