'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Rarity } from '@/lib/island-elements'
import {
  ISLAND_COLORS as c,
  findPosition,
  findSprites,
  landmarkAnchors,
  landmarkNodes,
} from '@/lib/island-sprites'
import { playRewardChime } from '@/lib/reward-sound'
import { hapticReward } from '@/lib/haptics'
import type { IslandFindEntry } from '@/lib/memory'

/**
 * Момент награды — не карточка поверх острова, а прорастание НА острове.
 *
 * Раньше (components/focus-session.tsx) финал сессии показывал абстрактную
 * карточку с названием находки: пик дофамина (RPE) выдавался мгновенно и в
 * отрыве от места, к которому человек привязан. Здесь пик и выплата — один
 * кадр, на настоящем острове:
 *
 *   такт предвкушения (дыхание света на месте роста)
 *     → прорастание элемента пружиной (island-grow, уже в globals.css)
 *     → для редких находок — остров отвечает целиком, золотым цветением.
 *
 * Осознанно НЕ прячем сам факт исхода (какая находка) — это уже решено на
 * сервере/клиенте до монтирования компонента. Мы усиливаем только ожидание
 * самого события «что-то происходит», не крутим азартную рулетку: редкость
 * не эксплуатируется как саспенс, она просто честно отыгрывается ярче.
 */

export type RevealNewItem =
  | { kind: 'landmark'; index: number }
  | { kind: 'find'; find: IslandFindEntry; findIndex: number }

type RevealIslandProps = {
  /** Сколько ориентиров уже открыто ДО этой находки (не считая новый, если это ориентир) */
  landmarksUnlocked: number
  /** Все находки пула ДО этой (не включая новую, если это находка) */
  finds: IslandFindEntry[]
  newItem: RevealNewItem
  rarity: Rarity | 'landmark'
  /** Вызывается один раз, когда хореография отыграла — можно показывать остальное */
  onRevealed?: () => void
}

type Phase = 'anticipation' | 'growth' | 'settled'

const ANTICIPATION_MS = 850
const RARE_TAIL_MS = 2500
const NORMAL_TAIL_MS = 1750

export function RevealIsland({
  landmarksUnlocked,
  finds,
  newItem,
  rarity,
  onRevealed,
}: RevealIslandProps) {
  const reduceMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduceMotion ? 'settled' : 'anticipation')
  const firedRef = useRef(false)

  useEffect(() => {
    if (reduceMotion) {
      if (!firedRef.current) {
        firedRef.current = true
        onRevealed?.()
      }
      return
    }
    const toGrowth = window.setTimeout(() => {
      setPhase('growth')
      playRewardChime(rarity)
      hapticReward()
    }, ANTICIPATION_MS)
    const toSettled = window.setTimeout(
      () => {
        setPhase('settled')
        if (!firedRef.current) {
          firedRef.current = true
          onRevealed?.()
        }
      },
      ANTICIPATION_MS + (rarity === 'rare' ? RARE_TAIL_MS : NORMAL_TAIL_MS),
    )
    return () => {
      window.clearTimeout(toGrowth)
      window.clearTimeout(toSettled)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion])

  const isRare = rarity === 'rare'
  const grown = phase !== 'anticipation'

  const newFindPos =
    newItem.kind === 'find' ? findPosition(newItem.find, newItem.findIndex) : null
  const anchor =
    newItem.kind === 'landmark'
      ? landmarkAnchors[newItem.index]
      : { x: newFindPos!.x, y: newFindPos!.y }

  return (
    <svg
      viewBox="0 0 380 216"
      role="img"
      aria-label="Остров: новое прорастание"
      className="block w-full"
    >
      <defs>
        <linearGradient id="reveal-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-background)" />
          <stop offset="72%" stopColor="var(--color-background)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
        <linearGradient id="reveal-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-secondary)" />
          <stop offset="100%" stopColor="var(--color-background)" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="380" height="162" fill="url(#reveal-sky)" />
      <rect x="0" y="158" width="380" height="58" fill="url(#reveal-sea)" />
      <ellipse cx="190" cy="182" rx="130" ry="12" fill="var(--color-accent)" opacity="0.28" />

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

      {/* Уже выросшие ориентиры — статично, как есть */}
      {landmarkNodes.map((node, i) => {
        if (newItem.kind === 'landmark' && i === newItem.index) return null
        const unlocked = i < landmarksUnlocked
        if (!unlocked) return null
        return <g key={i}>{node}</g>
      })}

      {/* Уже найденные находки — статично, как есть */}
      {finds.map((find, i) => {
        const sprite = findSprites[find.key]
        if (!sprite) return null
        const pos = findPosition(find, i)
        return (
          <g key={find.startId} transform={`translate(${pos.x} ${pos.y}) scale(${pos.s})`}>
            {sprite}
          </g>
        )
      })}

      {/* Такт предвкушения: тёплое дыхание на месте будущего роста */}
      {phase === 'anticipation' && (
        <motion.circle
          cx={anchor.x}
          cy={anchor.y - 6}
          r={13}
          fill="var(--color-primary)"
          initial={{ opacity: 0.14, scale: 0.9 }}
          animate={{ opacity: [0.14, 0.34, 0.14], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${anchor.x}px ${anchor.y}px` }}
        />
      )}

      {/* Новый элемент: прорастает на месте пружиной (island-grow из globals.css) */}
      {grown && (
        <g
          className={`island-grow${isRare ? '' : ' island-new-element'}`}
          transform={newFindPos ? `translate(${newFindPos.x} ${newFindPos.y}) scale(${newFindPos.s})` : undefined}
        >
          {newItem.kind === 'landmark' ? landmarkNodes[newItem.index] : findSprites[newItem.find.key]}
        </g>
      )}

      {/* Редкая находка: остров отвечает целиком — золотое цветение, не бейдж на карточке */}
      {grown && isRare && (
        <motion.ellipse
          cx="190"
          cy="150"
          fill="var(--color-reward)"
          style={{ mixBlendMode: 'screen' }}
          initial={{ opacity: 0, rx: 8, ry: 5 }}
          animate={{ opacity: [0, 0.24, 0.09], rx: [8, 220, 195], ry: [5, 96, 82] }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      )}
    </svg>
  )
}
