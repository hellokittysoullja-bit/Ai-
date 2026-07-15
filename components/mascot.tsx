'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Живой маскот: дышит, входит с пружиной, реагирует на наведение.
 * Одна точка правды для всех поз персонажа.
 */

const poses = {
  hero: '/images/naparnik-hero.png',
  waves: '/images/naparnik-waves.png',
  working: '/images/naparnik-working.png',
  sleeping: '/images/naparnik-sleeping.png',
  celebrates: '/images/naparnik-celebrates.png',
} as const

export type MascotPose = keyof typeof poses

type MascotProps = {
  pose: MascotPose
  alt: string
  /** Размер в px (квадрат) */
  size?: number
  className?: string
  /** Приоритетная загрузка (для hero) */
  priority?: boolean
}

export function Mascot({ pose, alt, size = 96, className, priority }: MascotProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={`relative shrink-0 overflow-hidden ${className ?? 'rounded-3xl'}`}
      style={{ width: size, height: size }}
      initial={reduceMotion ? false : { scale: 0.6, opacity: 0, rotate: -6 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : {
              scale: [1, 1.03, 1],
              opacity: 1,
              rotate: [0, -1.2, 0, 1.2, 0],
            }
      }
      transition={
        reduceMotion
          ? { duration: 0.2 }
          : {
              scale: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              opacity: { type: 'spring', stiffness: 260, damping: 18 },
              default: { type: 'spring', stiffness: 260, damping: 18 },
            }
      }
      whileHover={reduceMotion ? undefined : { scale: 1.06, rotate: -3 }}
    >
      <Image
        src={poses[pose] || '/placeholder.svg'}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority={priority}
      />
    </motion.div>
  )
}
