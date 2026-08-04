'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { ISLAND_ELEMENT_NAMES, ISLAND_POOL, LANDMARK_COUNT } from '@/lib/island-elements'
import { landmarkAnchors, landmarkNodes } from '@/lib/island-sprites'
import { todayKey, type Patterns } from '@/lib/memory'

/**
 * КОЛЛЕКЦИЯ УХОДИТ ПОД РАСКРЫТИЕ (#2).
 *
 * Что было: первым, что человек видел на «Доме», была карточка награды —
 * следующий ориентир, тропа прогресса, счётчик «0 из 4 редких находок»,
 * ссылка на весь остров. То есть на вопрос «что мне сделать сейчас» продукт
 * первым делом отвечал статистикой коллекции.
 *
 * Проблема не в том, что коллекция плохая — она хорошая и работает. Проблема
 * в бюджете внимания: у первого экрана есть один слот на главное, и если
 * его занимает прогресс, то само дело оказывается вторым. Хуже: «0 из 4»
 * на входе — это визуализация нуля, и она демотивирует ровно того, кому
 * тяжелее всего начать.
 *
 * Теперь коллекция живёт здесь, за одной спокойной строкой. Она никуда не
 * делась и открывается в один тап — но открывает её тот, кто пришёл на неё
 * посмотреть, а не тот, кто пришёл начать работать. Progressive Disclosure
 * ровно в своём каноническом смысле: не «спрятать», а «не показывать
 * раньше, чем понадобится».
 */
export function IslandDisclosure({
  stats,
  rareFound,
  pityRipe,
}: {
  stats: Patterns
  rareFound: number
  pityRipe: boolean
}) {
  const [open, setOpen] = useState(false)
  const rareTotal = ISLAND_POOL.filter((e) => e.rarity === 'rare').length
  const onMap = stats.totalStarts < LANDMARK_COUNT

  return (
    <div className="surface-quiet overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press-state flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="t-secondary font-medium text-foreground">Как растёт остров?</span>
        <span className="flex shrink-0 items-center gap-2">
          {/* Одна цифра снаружи — не прогресс-бар, а «здесь есть что смотреть».
              Постоянного бара на «Доме» нет намеренно: он уместен только в
              активном фокусе, где сам является содержанием экрана. */}
          <span className="tabular-nums t-meta" style={{ color: 'var(--ivory-500)' }}>
            {onMap ? `${stats.totalStarts} / ${LANDMARK_COUNT}` : `${rareFound} / ${rareTotal}`}
          </span>
          <ChevronDown
            className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            style={{ color: 'var(--ivory-500)' }}
            aria-hidden="true"
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 px-4 pb-4">
              {onMap ? (
                <>
                  <span className="flex items-center gap-3.5">
                    {/* Мини-сцена, а не иконка предмета: обещание карточки в
                        том, что на острове появится МЕСТО, — значит у
                        ориентира должна быть земля под ним и небо над ним. */}
                    <svg viewBox="0 0 48 48" className="size-14 shrink-0" aria-hidden="true">
                      <defs>
                        <clipPath id="disclosure-scene-clip">
                          <rect x="0" y="0" width="48" height="48" rx="12" />
                        </clipPath>
                        <radialGradient id="disclosure-moonlight" cx="22%" cy="16%" r="72%">
                          <stop offset="0%" stopColor="oklch(0.9 0.05 240 / 0.3)" />
                          <stop offset="100%" stopColor="oklch(0.9 0.05 240 / 0)" />
                        </radialGradient>
                      </defs>
                      <g clipPath="url(#disclosure-scene-clip)">
                        <rect x="0" y="0" width="48" height="48" fill="oklch(0.2 0.02 140)" />
                        <rect x="0" y="0" width="48" height="48" fill="url(#disclosure-moonlight)" />
                        <circle cx="37" cy="9" r="0.9" fill="oklch(0.92 0.01 210 / 0.5)" />
                        <path
                          d="M0 34 Q 12 29 24 32 T 48 30 L 48 48 L 0 48 Z"
                          fill="oklch(0.17 0.018 138)"
                        />
                        <g
                          transform={`translate(${24 - landmarkAnchors[stats.totalStarts].x * 0.58}, ${30 - landmarkAnchors[stats.totalStarts].y * 0.58}) scale(0.58)`}
                          className="brightness-150 saturate-[0.75]"
                          style={{ filter: 'drop-shadow(0 0 5px oklch(0.9 0.06 240 / 0.45))' }}
                        >
                          {landmarkNodes[stats.totalStarts]}
                        </g>
                      </g>
                    </svg>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="t-eyebrow">Следующий старт вырастит</span>
                      <span className="t-card text-balance font-semibold text-foreground">
                        «{ISLAND_ELEMENT_NAMES[stats.totalStarts]}»
                      </span>
                    </span>
                  </span>

                  {stats.totalStarts > 0 && (
                    <span
                      className="flex flex-col gap-1.5"
                      role="progressbar"
                      aria-valuenow={stats.totalStarts}
                      aria-valuemin={0}
                      aria-valuemax={LANDMARK_COUNT}
                      aria-label={`Пройдено ${stats.totalStarts} из ${LANDMARK_COUNT} ориентиров острова`}
                    >
                      {/*
                        ТРЕТИЙ ПРОХОД — тонкая линия вместо десяти точек.
                        Десять отдельных кружков (заполненных + пунктирных +
                        одного мигающего) на 358px карточки — это реальный
                        визуальный шум: глазу приходится посчитать точки,
                        чтобы понять число, которое уже написано текстом
                        строкой ниже. Одна линия того же смысла (заполнена на
                        90%) читается мгновенно, без подсчёта, и не
                        конкурирует с текстом за внимание.
                      */}
                      <span className="relative block h-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                          style={{
                            width: `${(stats.totalStarts / LANDMARK_COUNT) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="tabular-nums t-meta" style={{ color: 'var(--ivory-500)' }}>
                          {stats.totalStarts} из {LANDMARK_COUNT} до «
                          {ISLAND_ELEMENT_NAMES[stats.totalStarts]}»
                          {LANDMARK_COUNT - stats.totalStarts === 1
                            ? ' · последний шаг'
                            : stats.lastStartDate === todayKey(new Date())
                              ? ' · вырос сегодня'
                              : ''}
                        </span>
                        <Link
                          href="/app/world"
                          className="-my-3.5 inline-flex shrink-0 items-center py-3.5 t-meta text-primary underline-offset-4 hover:underline"
                        >
                          весь остров →
                        </Link>
                      </span>
                    </span>
                  )}

                  {stats.totalStarts === 0 && (
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className="min-w-0 tabular-nums t-meta"
                        style={{ color: 'var(--ivory-500)' }}
                      >
                        {LANDMARK_COUNT} ориентиров ждут
                      </span>
                      <Link
                        href="/app/world"
                        className="-my-3.5 inline-flex shrink-0 items-center py-3.5 t-meta text-primary underline-offset-4 hover:underline"
                      >
                        весь остров →
                      </Link>
                    </span>
                  )}

                  {/* Дополнительная находка названа ВТОРОЙ, после честной
                      основной награды: variable reward работает как бонус
                      сверху, а не как способ заинтересовать вместо неё. */}
                  <span
                    className="flex items-center gap-1.5 t-meta"
                    style={{ color: pityRipe ? 'var(--lime-400)' : 'var(--ivory-500)' }}
                  >
                    <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                    {pityRipe
                      ? 'Следующая находка будет необычной — или лучше'
                      : 'И одна находка на остров — какая, не знаю сам'}
                  </span>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
                    {pityRipe ? (
                      <>
                        Следующая находка будет{' '}
                        <span className="font-semibold text-reward">необычной — или лучше</span>.
                      </>
                    ) : (
                      <>
                        Редких находок:{' '}
                        <span className="font-semibold text-reward">
                          {rareFound} из {rareTotal}
                        </span>{' '}
                        — полная сессия повышает шанс.
                      </>
                    )}
                  </span>
                  <Link
                    href="/app/world"
                    className="-my-3.5 inline-flex w-fit items-center py-3.5 t-meta text-primary underline-offset-4 hover:underline"
                  >
                    весь остров →
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
