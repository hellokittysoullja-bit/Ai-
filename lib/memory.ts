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
  /**
   * Дней с хотя бы одним стартом в текущем календарном месяце.
   * Нетоксичная замена стрику: «9 активных дней в июле» не сгорает
   * от пропуска — прошлый труд не обесценивается никогда.
   */
  activeDaysThisMonth: number
  /** Час суток, в который человек чаще всего реально начинает (0-23), или null */
  favoriteHour: number | null
  lastStartDate: string | null
  /** Полных дней с последнего старта (0 = стартовал сегодня), null если стартов не было */
  daysAway: number | null
}

const KEYS = {
  plan: 'naparnik:plan',
  starts: 'naparnik:starts',
  notes: 'naparnik:notes',
  finds: 'naparnik:finds',
  worldSeen: 'naparnik:worldSeen',
  activeSession: 'naparnik:activeSession',
  chat: 'naparnik:chat',
  companionName: 'naparnik:companionName',
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

// ---------- Находки острова (старты сверх карты ориентиров) ----------

export type IslandFindEntry = {
  /** Ключ элемента из пула (lib/island-elements) */
  key: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare'
  /** Сид позиции на карте — находка навсегда стоит там, где выросла */
  seed: number
  /** YYYY-MM-DD */
  date: string
  /** id старта, за который получена */
  startId: string
}

export async function getFinds(): Promise<IslandFindEntry[]> {
  return read<IslandFindEntry[]>(KEYS.finds, [])
}

export async function addFind(find: IslandFindEntry): Promise<void> {
  const finds = await getFinds()
  if (finds.some((f) => f.startId === find.startId)) return
  finds.push(find)
  write(KEYS.finds, finds)
}

// ---------- Активная сессия (переживает закрытие вкладки) ----------

export type ActiveSession = {
  /** Unix ms момента старта — единственный источник правды для таймера */
  startedAt: number
  minutes: number
  task: string
  startId: string
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  return read<ActiveSession | null>(KEYS.activeSession, null)
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  write(KEYS.activeSession, session)
}

export async function clearActiveSession(): Promise<void> {
  write(KEYS.activeSession, null)
}

// ---------- Имя существа (endowment: названное — становится своим) ----------

export async function getCompanionName(): Promise<string | null> {
  return read<string | null>(KEYS.companionName, null)
}

export async function saveCompanionName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 24)
  if (!trimmed) return
  write(KEYS.companionName, trimmed)
}

// ---------- Память разговора (котик помнит, о чём говорили) ----------

const MAX_CHAT_MESSAGES = 30

/**
 * Сохранённые сообщения чата в формате UIMessage (структурная копия).
 * Тип намеренно свободный: сообщения приходят из useChat и сериализуемы.
 */
export async function getChatMessages<T>(): Promise<T[]> {
  return read<T[]>(KEYS.chat, [])
}

export async function saveChatMessages<T>(messages: T[]): Promise<void> {
  write(KEYS.chat, messages.slice(-MAX_CHAT_MESSAGES))
}

// ---------- Непросмотренное на острове (триггер возврата к награде) ----------

/**
 * Сколько стартов человек ещё не видел на острове.
 * Бейдж на табе «Мир» гаснет при заходе на страницу острова.
 */
export async function getUnseenWorldCount(): Promise<number> {
  const starts = await getStarts()
  const seen = read<number>(KEYS.worldSeen, 0)
  return Math.max(0, starts.length - seen)
}

export async function markWorldSeen(): Promise<void> {
  const starts = await getStarts()
  write(KEYS.worldSeen, starts.length)
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
    return {
      totalStarts: 0,
      runningDays: 0,
      activeDaysThisMonth: 0,
      favoriteHour: null,
      lastStartDate: null,
      daysAway: null,
    }
  }

  const dates = Array.from(new Set(starts.map((s) => s.date))).sort()
  const lastStartDate = dates[dates.length - 1]

  // Активные дни месяца: YYYY-MM текущего месяца — префикс ключа даты
  const monthPrefix = todayKey().slice(0, 7)
  const activeDaysThisMonth = dates.filter((d) => d.startsWith(monthPrefix)).length

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

  const msPerDay = 24 * 60 * 60 * 1000
  const daysAway = Math.max(
    0,
    Math.floor(
      (new Date(today + 'T12:00:00').getTime() - new Date(lastStartDate + 'T12:00:00').getTime()) /
        msPerDay,
    ),
  )

  return {
    totalStarts: starts.length,
    runningDays,
    activeDaysThisMonth,
    favoriteHour,
    lastStartDate,
    daysAway,
  }
}

// ---------- Компактный контекст для LLM ----------

export type MemoryContext = {
  plan: Plan | null
  recentStarts: Array<Pick<StartEntry, 'date' | 'label' | 'minutes' | 'fromPlan'>>
  patterns: Patterns
  notes: string[]
  /** Последние находки острова — напарник может вспоминать их в разговоре */
  recentFinds: Array<Pick<IslandFindEntry, 'name' | 'rarity' | 'date'>>
  /** Имя, которое человек дал существу (null — ещё не назвал) */
  companionName: string | null
}

export async function buildMemoryContext(): Promise<MemoryContext> {
  const [plan, starts, patterns, notes, finds, companionName] = await Promise.all([
    getPlan(),
    getStarts(),
    getPatterns(),
    getNotes(),
    getFinds(),
    getCompanionName(),
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
    recentFinds: finds.slice(-3).map(({ name, rarity, date }) => ({ name, rarity, date })),
    companionName,
  }
}
