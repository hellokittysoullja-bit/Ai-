'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion, useSpring } from 'motion/react'

/**
 * Рукокодный векторный маскот — живое существо, а не картинка.
 * Моргает, зрачки следят за курсором, дышит, меняет выражение.
 */

export type MascotExpression = 'calm' | 'happy' | 'focused' | 'sleepy' | 'excited'

/* Палитра существа: угольный мех + лаймовые глаза + тёплый акцент.
   Мех заметно светлее фона (0.17) и карточек (0.21) — силуэт обязан читаться. */
const FUR = 'oklch(0.34 0.02 135)'
const FUR_DARK = 'oklch(0.26 0.015 135)'
const FUR_LIGHT = 'oklch(0.46 0.03 135)'
const EYE = 'var(--color-primary)'
const EYE_DARK = 'oklch(0.62 0.19 130)'
const INK = 'oklch(0.13 0.01 130)'
const WARM = 'oklch(0.75 0.15 65)'
const WHITE = 'oklch(0.98 0 0)'

/** Пушистый контур: замкнутый путь с меховыми буграми (детерминированный) */
function furPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps: number,
  depth: number,
  seed: number,
) {
  const pts: Array<[number, number]> = []
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2
    const wobble = 1 + (rand() - 0.5) * 0.07
    pts.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble])
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < bumps; i++) {
    const p1 = pts[i]
    const p2 = pts[(i + 1) % bumps]
    const mx = (p1[0] + p2[0]) / 2
    const my = (p1[1] + p2[1]) / 2
    const dx = mx - cx
    const dy = my - cy
    const len = Math.hypot(dx, dy) || 1
    const qx = mx + (dx / len) * depth
    const qy = my + (dy / len) * depth
    d += ` Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return `${d} Z`
}

const BODY = furPath(100, 118, 62, 57, 15, 7, 42)
const BELLY = furPath(100, 134, 33, 26, 10, 4, 7)

const EYE_L = { x: 74, y: 102 }
const EYE_R = { x: 126, y: 102 }
const EYE_RX = 16
const EYE_RY = 18

type MascotSvgProps = {
  expression?: MascotExpression
  size?: number
  label?: string
  className?: string
}

export function MascotSvg({ expression = 'calm', size = 160, label, className }: MascotSvgProps) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)
  const uid = useId()
  const [blink, setBlink] = useState(false)

  const sleepy = expression === 'sleepy'
  const focused = expression === 'focused'
  const happy = expression === 'happy'
  const excited = expression === 'excited'

  /* Зрачки следят за курсором */
  const px = useSpring(0, { stiffness: 140, damping: 16 })
  const py = useSpring(0, { stiffness: 140, damping: 16 })

  useEffect(() => {
    if (reduceMotion || sleepy) {
      px.set(0)
      py.set(0)
      return
    }
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 1.2)))
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.2)))
      px.set(dx * 5)
      py.set(dy * 4)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduceMotion, sleepy, px, py])

  /* Моргание со случайным интервалом */
  useEffect(() => {
    if (reduceMotion || sleepy) return
    let alive = true
    let t: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(
        () => {
          if (!alive) return
          setBlink(true)
          t2 = setTimeout(() => {
            if (!alive) return
            setBlink(false)
            loop()
          }, 130)
        },
        2400 + Math.random() * 3600,
      )
    }
    loop()
    return () => {
      alive = false
      clearTimeout(t)
      clearTimeout(t2)
    }
  }, [reduceMotion, sleepy])

  const eye = (side: 'l' | 'r') => {
    const { x, y } = side === 'l' ? EYE_L : EYE_R
    const clipId = `${uid}-${side}`
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <ellipse cx={x} cy={y} rx={EYE_RX} ry={EYE_RY} />
          </clipPath>
        </defs>
        {/* радужка */}
        <ellipse cx={x} cy={y} rx={EYE_RX} ry={EYE_RY} fill={EYE_DARK} />
        <ellipse cx={x} cy={y - 1} rx={EYE_RX - 2.5} ry={EYE_RY - 2.5} fill={EYE} />
        <g clipPath={`url(#${clipId})`}>
          {/* кошачий зрачок + блики, следят за курсором */}
          <motion.g style={reduceMotion ? undefined : { x: px, y: py }}>
            <ellipse cx={x} cy={y} rx={excited ? 7 : 5.4} ry={excited ? 11 : 9.5} fill={INK} />
            <circle cx={x + 5} cy={y - 7} r={3} fill={WHITE} opacity={0.95} />
            <circle cx={x - 4} cy={y + 6} r={1.4} fill={WHITE} opacity={0.55} />
          </motion.g>
          {/* прикрытые веки в фокусе */}
          {focused && <rect x={x - EYE_RX} y={y - EYE_RY} width={EYE_RX * 2} height={EYE_RY * 0.72} fill={FUR} />}
          {/* моргание: веко опускается сверху */}
          <motion.rect
            x={x - EYE_RX - 1}
            y={y - EYE_RY - 1}
            width={EYE_RX * 2 + 2}
            height={EYE_RY * 2 + 2}
            fill={FUR}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}
            animate={{ scaleY: blink ? 1 : 0 }}
            transition={{ duration: 0.07 }}
          />
        </g>
      </g>
    )
  }

  const closedEye = (side: 'l' | 'r') => {
    const { x, y } = side === 'l' ? EYE_L : EYE_R
    return (
      <path
        d={`M${x - 12} ${y} q12 10 24 0`}
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
    )
  }

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      animate={
        reduceMotion
          ? undefined
          : { scale: [1, 1.02, 1] }
      }
      transition={
        reduceMotion
          ? undefined
          : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
      }
      style={{ transformOrigin: '50% 90%' }}
    >
      {/* хвост: виляет в радости */}
      <motion.path
        d="M156 146 q30 -4 27 -30 q-2 -16 -18 -18"
        fill="none"
        stroke={FUR}
        strokeWidth={15}
        strokeLinecap="round"
        style={{ transformBox: 'fill-box', transformOrigin: '0% 100%' }}
        animate={
          reduceMotion || !(happy || excited)
            ? undefined
            : { rotate: [-5, 6, -5] }
        }
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* уши */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
        animate={reduceMotion || !excited ? undefined : { rotate: [-2, 2, -2] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M56 74 L66 32 L94 56 Z" fill={FUR} />
        <path d="M64 64 L69 42 L84 55 Z" fill={WARM} opacity={0.4} />
        <path d="M144 74 L134 32 L106 56 Z" fill={FUR} />
        <path d="M136 64 L131 42 L116 55 Z" fill={WARM} opacity={0.4} />
      </motion.g>
      {/* тело */}
      <path d={BODY} fill={FUR} />
      <path d={BELLY} fill={FUR_LIGHT} opacity={0.35} />
      {/* меховые пряди на макушке */}
      <path
        d="M88 58 q4 -10 10 -12 M100 55 q2 -9 8 -11 M110 58 q6 -8 12 -8"
        fill="none"
        stroke={FUR_LIGHT}
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* усы */}
      <g stroke={FUR_LIGHT} strokeWidth={1.8} strokeLinecap="round" opacity={0.55} fill="none">
        <path d="M42 118 q-14 -1 -24 -5" />
        <path d="M43 126 q-13 3 -23 2" />
        <path d="M158 118 q14 -1 24 -5" />
        <path d="M157 126 q13 3 23 2" />
      </g>
      {/* брови в фокусе */}
      {focused && (
        <g stroke={FUR_LIGHT} strokeWidth={3} strokeLinecap="round" opacity={0.7}>
          <path d="M60 80 L84 87" />
          <path d="M140 80 L116 87" />
        </g>
      )}
      {/* глаза */}
      {sleepy ? (
        <>
          {closedEye('l')}
          {closedEye('r')}
        </>
      ) : (
        <>
          {eye('l')}
          {eye('r')}
        </>
      )}
      {/* нос */}
      <path d="M96 122 L104 122 L100 128 Z" fill={WARM} opacity={0.9} />
      {/* рот по выражению */}
      {expression === 'calm' && (
        <path d="M92 138 q8 7 16 0" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      )}
      {happy && (
        <path d="M88 136 q12 13 24 0" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      )}
      {focused && (
        <path d="M94 140 L106 140" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      )}
      {sleepy && <circle cx={100} cy={140} r={3.2} fill={INK} />}
      {excited && (
        <g>
          <path d="M85 134 Q100 158 115 134 Z" fill={INK} />
          <ellipse cx={100} cy={145} rx={6.5} ry={4} fill={WARM} opacity={0.85} />
        </g>
      )}
      {/* румянец */}
      {(happy || excited) && (
        <g fill={WARM} opacity={0.3}>
          <ellipse cx={58} cy={126} rx={9} ry={4.5} />
          <ellipse cx={142} cy={126} rx={9} ry={4.5} />
        </g>
      )}
      {/* лапки */}
      <ellipse cx={78} cy={170} rx={13} ry={7} fill={FUR_DARK} />
      <ellipse cx={122} cy={170} rx={13} ry={7} fill={FUR_DARK} />
      {/* zzz во сне */}
      {sleepy && (
        <g className="font-hand" fill={EYE}>
          {[
            { x: 142, y: 62, s: 13, d: 0 },
            { x: 156, y: 46, s: 17, d: 0.5 },
            { x: 172, y: 28, s: 22, d: 1 },
          ].map((z) => (
            <motion.text
              key={z.x}
              x={z.x}
              y={z.y}
              fontSize={z.s}
              initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
              animate={reduceMotion ? undefined : { opacity: [0, 0.9, 0], y: [4, -4, -10] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: z.d, ease: 'easeInOut' }}
            >
              z
            </motion.text>
          ))}
        </g>
      )}
      {/* искры в восторге */}
      {excited && (
        <g fill={EYE}>
          {[
            { x: 38, y: 56, d: 0 },
            { x: 164, y: 66, d: 0.35 },
            { x: 146, y: 26, d: 0.7 },
          ].map((sp) => (
            <motion.path
              key={sp.x}
              d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
              style={{ x: sp.x, y: sp.y }}
              animate={reduceMotion ? undefined : { scale: [0.5, 1.15, 0.5], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: sp.d, ease: 'easeInOut' }}
            />
          ))}
        </g>
      )}
    </motion.svg>
  )
}
