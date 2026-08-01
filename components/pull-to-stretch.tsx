'use client'

import { useEffect, useRef, useState } from 'react'
import { MascotSvg } from '@/components/mascot-svg'
import { hapticThreshold } from '@/lib/haptics'

/*
 * #23 · PULL-TO-REFRESH: «кот потягивается».
 *
 * Обычный pull-to-refresh — служебный спиннер. Здесь тот же жест отдаёт
 * характером: тянешь ленту вниз — существо просыпается и потягивается,
 * отпускаешь — данные обновляются. Награда за ЗАВЕРШЁННЫЙ жест, а не
 * анимация по таймеру, поэтому не приедается (та же контингентность, что у
 * сияния в сцене).
 *
 * Почему не нативный overscroll: жест перехватываем ТОЛЬКО когда лента уже
 * в самом верху (scrollTop === 0) и палец идёт вниз — иначе не мешаем ни
 * обычному скроллу, ни системному «назад». Проверяем touch-события, а не
 * pointer: на десктопе pull-to-refresh не нужен, там есть перезагрузка.
 */

const THRESHOLD = 68 // px — столько нужно протянуть, чтобы жест засчитался
const MAX_PULL = 96 // дальше не тянем: резина, а не бесконечная лента

export function PullToStretch({
  scrollRef,
  onRefresh,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  onRefresh: () => Promise<void> | void
}) {
  const [pull, setPull] = useState(0)
  const [stretching, setStretching] = useState(false)
  const startY = useRef<number | null>(null)
  const crossedRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      // Тянуть можно только с самого верха — иначе это обычный скролл.
      if (el!.scrollTop > 0) {
        startY.current = null
        return
      }
      startY.current = e.touches[0].clientY
      crossedRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || stretching) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        // Палец пошёл вверх — отдаём жест обычному скроллу.
        setPull(0)
        startY.current = null
        return
      }
      // Резиновое сопротивление: чем дальше, тем туже — жест сообщает
      // телом, что предел близко, без всякой подписи.
      const eased = Math.min(MAX_PULL, dy * 0.5)
      setPull(eased)
      if (!crossedRef.current && eased >= THRESHOLD) {
        crossedRef.current = true
        // Подтверждение порога ДО отпускания пальца: человек знает, что
        // отпускать уже можно, и не тянет вслепую дальше.
        hapticThreshold()
      }
    }

    async function onTouchEnd() {
      if (startY.current === null) return
      const reached = crossedRef.current
      startY.current = null
      if (!reached) {
        setPull(0)
        return
      }
      setStretching(true)
      setPull(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        // Держим потягивание до конца его анимации (0.85s в CSS), иначе
        // награда обрывается на полудвижении.
        window.setTimeout(() => {
          setStretching(false)
          setPull(0)
        }, 850)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [scrollRef, onRefresh, stretching])

  const visible = pull > 2 || stretching
  const ready = pull >= THRESHOLD

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-hidden"
      style={{
        height: visible ? Math.max(pull, stretching ? THRESHOLD : 0) : 0,
        transition: startY.current === null ? 'height 220ms ease-out' : 'none',
      }}
    >
      <div
        className="flex items-end pb-1"
        style={{
          opacity: visible ? Math.min(1, pull / THRESHOLD) : 0,
          transform: `scale(${0.8 + Math.min(1, pull / THRESHOLD) * 0.2})`,
        }}
      >
        <span className={stretching ? 'cat-stretch block' : 'block'}>
          <MascotSvg
            // Потягивается — значит просыпается: сонный до порога,
            // довольный после. Мимика сообщает состояние жеста без текста.
            expression={stretching ? 'happy' : ready ? 'excited' : 'sleepy'}
            size={38}
          />
        </span>
      </div>
    </div>
  )
}
