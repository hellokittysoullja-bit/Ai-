/**
 * Остров: ориентиры + бесконечный вероятностный пул находок.
 *
 * Устройство наград:
 * - Старты 1–10 открывают ОРИЕНТИРЫ в фиксированном порядке (детерминированно):
 *   новичку нужна читаемая история «мой первый росток», а не лотерея.
 * - Старты 11+ приносят НАХОДКИ из бесконечного пула с тирами редкости
 *   (variable-ratio reinforcement: непредсказуемость поддерживает петлю,
 *   когда новизна первых элементов выгорает).
 * - Полная сессия НЕ обязательна, но повышает шанс редкой находки.
 *   Асимметрия «бонус без штрафа»: ранний выход ничего не отнимает.
 */

export type Rarity = 'common' | 'uncommon' | 'rare'

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'находка',
  uncommon: 'необычная находка',
  rare: 'редкая находка',
}

// ---------- Ориентиры (старты 1–10, порядок никогда не меняется) ----------

export const ISLAND_ELEMENT_NAMES = [
  'Первый росток',
  'Дерево',
  'Костёр',
  'Домик',
  'Грядки',
  'Фонарь',
  'Второе дерево',
  'Флаг',
  'Причал',
  'Луна над островом',
] as const

export const LANDMARK_COUNT = ISLAND_ELEMENT_NAMES.length

/** Что выросло после старта номер n (1-based), для стартов в пределах карты ориентиров. */
export function elementNameForStartNumber(n: number): string | null {
  if (n < 1 || n > LANDMARK_COUNT) return null
  return ISLAND_ELEMENT_NAMES[n - 1]
}

// ---------- Пул находок (старты 11+) ----------

export type PoolElement = {
  key: string
  name: string
  rarity: Rarity
  /** Где живёт находка на сцене: земля, небо или вода */
  zone: 'ground' | 'sky' | 'water'
}

export const ISLAND_POOL: PoolElement[] = [
  // Обычные — остров густеет
  { key: 'pine', name: 'Сосна', rarity: 'common', zone: 'ground' },
  { key: 'bush', name: 'Куст', rarity: 'common', zone: 'ground' },
  { key: 'stone', name: 'Валун', rarity: 'common', zone: 'ground' },
  { key: 'flowers', name: 'Цветы', rarity: 'common', zone: 'ground' },
  { key: 'mushrooms', name: 'Грибы', rarity: 'common', zone: 'ground' },
  { key: 'reeds', name: 'Камыши', rarity: 'common', zone: 'water' },
  // Необычные — на острове появляется жизнь
  { key: 'bird', name: 'Птица', rarity: 'uncommon', zone: 'sky' },
  { key: 'cat', name: 'Кот', rarity: 'uncommon', zone: 'ground' },
  { key: 'hammock', name: 'Гамак', rarity: 'uncommon', zone: 'ground' },
  { key: 'boat', name: 'Лодка', rarity: 'uncommon', zone: 'water' },
  { key: 'firefly', name: 'Светлячки', rarity: 'uncommon', zone: 'ground' },
  { key: 'bench', name: 'Скамейка', rarity: 'uncommon', zone: 'ground' },
  // Редкие — события, о которых хочется рассказать
  { key: 'whale', name: 'Кит', rarity: 'rare', zone: 'water' },
  { key: 'aurora', name: 'Северное сияние', rarity: 'rare', zone: 'sky' },
  { key: 'shooting-star', name: 'Падающая звезда', rarity: 'rare', zone: 'sky' },
  { key: 'lighthouse', name: 'Маяк', rarity: 'rare', zone: 'ground' },
]

const POOL_BY_RARITY: Record<Rarity, PoolElement[]> = {
  common: ISLAND_POOL.filter((e) => e.rarity === 'common'),
  uncommon: ISLAND_POOL.filter((e) => e.rarity === 'uncommon'),
  rare: ISLAND_POOL.filter((e) => e.rarity === 'rare'),
}

export function poolElementByKey(key: string): PoolElement | null {
  return ISLAND_POOL.find((e) => e.key === key) ?? null
}

/**
 * Вероятности тиров. Полная сессия повышает шанс редкого —
 * бонус за глубину без наказания за ранний выход.
 */
const ODDS: Record<'normal' | 'full', Record<Rarity, number>> = {
  normal: { common: 0.7, uncommon: 0.25, rare: 0.05 },
  full: { common: 0.52, uncommon: 0.34, rare: 0.14 },
}

export type IslandFind = {
  key: string
  name: string
  rarity: Rarity
  /** Сид для позиции на карте — фиксируется в момент находки */
  seed: number
}

/**
 * Розыгрыш находки за старт 11+.
 * pityCounter — сколько находок подряд были common: после 5 подряд
 * гарантируем минимум uncommon (защита от несчастливой серии,
 * стандарт AAA-гача-систем).
 */
export function drawFind(fullSession: boolean, pityCounter: number, rand = Math.random): IslandFind {
  const odds = ODDS[fullSession ? 'full' : 'normal']
  let rarity: Rarity
  const roll = rand()
  if (roll < odds.rare) rarity = 'rare'
  else if (roll < odds.rare + odds.uncommon) rarity = 'uncommon'
  else rarity = 'common'

  if (rarity === 'common' && pityCounter >= 5) rarity = 'uncommon'

  const pool = POOL_BY_RARITY[rarity]
  const el = pool[Math.floor(rand() * pool.length)]
  return { key: el.key, name: el.name, rarity: el.rarity, seed: Math.floor(rand() * 1_000_000) }
}
