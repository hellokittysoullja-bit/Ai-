'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import type { ActiveSession } from '@/lib/memory'

/**
 * SESSION-DOCK (#6) — «Фокус идёт», человек на «Доме».
 *
 * Это состояние экрана раньше не существовало вовсе: сессия могла идти, а
 * «Дом» показывал обычное «Начать сессию» — то есть предлагал начать то,
 * что уже идёт. Человек, заглянувший в чат посреди фокуса, не имел никакого
 * способа понять, жив ли ещё его таймер, и единственным надёжным действием
 * было начать заново, потеряв набранное время.
 *
 * Что док делает и, что важнее, чего НЕ делает:
 *   — показывает, что идёт и сколько осталось (Visibility of System Status);
 *   — даёт один путь обратно;
 *   — НЕ присылает новых сообщений, НЕ подсвечивается, НЕ пульсирует.
 * Фокус идёт не здесь. Всё, что док может сделать полезного, — не мешать.
 */

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function SessionDock({
  session,
  onReturn,
}: {
  session: ActiveSession
  onReturn: () => void
}) {
  /*
   * Остаток считается от абсолютного времени старта, а не тиками счётчика:
   * фоновая вкладка троттлится браузером, и счётчик тиков отстал бы ровно
   * настолько, насколько человек отвлёкся, — то есть врал бы тем сильнее,
   * чем важнее правда.
   */
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.ceil(session.minutes * 60 - (Date.now() - session.startedAt) / 1000)),
  )

  useEffect(() => {
    const tick = () =>
      setLeft(
        Math.max(0, Math.ceil(session.minutes * 60 - (Date.now() - session.startedAt) / 1000)),
      )
    tick()
    const id = window.setInterval(tick, 1000)
    const onVisible = () => tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session.startedAt, session.minutes])

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      // Складывается вниз при возврате в фокус: движение совпадает с
      // направлением перехода, поэтому читается как «уступил место», а не
      // как «исчез».
      exit={{ y: 16, opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="surface-float mx-auto mb-2 flex max-w-md items-center gap-3 rounded-[18px] px-3.5 py-2.5"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="t-eyebrow">Фокус идёт</span>
        <span className="truncate t-secondary font-medium text-foreground">{session.task}</span>
      </div>
      {/*
        tabular-nums — не педантизм: без него ширина цифр «1» и «8» разная,
        строка дёргается на каждой секунде, и периферийное зрение ловит это
        движение как событие. Разделитель не мигает по той же причине.
      */}
      <span
        className="shrink-0 tabular-nums t-body font-semibold text-foreground"
        aria-label={`Осталось ${Math.floor(left / 60)} минут`}
      >
        {pad(Math.floor(left / 60))}:{pad(left % 60)}
      </span>
      <button
        type="button"
        onClick={onReturn}
        className="press-state surface-active flex h-11 shrink-0 items-center gap-1.5 rounded-[16px] px-3.5 t-secondary font-semibold text-foreground"
      >
        В фокус
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

/**
 * STICKY-КОНТЕКСТ (#5) — «что я вообще собирался делать», когда главная
 * карточка уехала вверх за переписку.
 *
 * Появляется ТОЛЬКО когда карточка реально ушла из вида, и исчезает, как
 * только она вернулась. Постоянная полоска здесь была бы хуже отсутствия
 * полоски: она съедала бы 48px вьюпорта в состоянии, когда та же самая
 * информация видна на экране целиком и крупнее.
 */
export function StickyContext({
  visible,
  task,
  minutes,
  compact,
  onChange,
}: {
  visible: boolean
  task: string
  minutes: number
  /** Клавиатура открыта — полоска ужимается, чтобы не съесть остаток экрана */
  compact: boolean
  onChange: () => void
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="surface-float pointer-events-auto absolute inset-x-0 top-0 z-20"
        >
          <div
            className={`mx-auto flex max-w-md items-center gap-2 px-4 ${
              compact ? 'h-9' : 'h-[46px]'
            }`}
          >
            <span className="min-w-0 flex-1 truncate t-secondary text-foreground">
              {task}
              <span style={{ color: 'var(--ivory-500)' }}> · {minutes} мин</span>
            </span>
            {/* Тач-цель 44×44 при визуальной высоте строки текста:
                отрицательные márgin'ы расширяют зону нажатия, не раздувая
                саму полоску (WCAG 2.5.8). */}
            <button
              type="button"
              onClick={onChange}
              className="press-state -my-2 -mr-2 flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[16px] px-2 t-secondary font-medium text-primary"
            >
              Изменить
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
