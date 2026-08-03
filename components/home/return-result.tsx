'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { Sprout } from 'lucide-react'
import { landmarkAnchors, landmarkNodes } from '@/lib/island-sprites'
import { LANDMARK_COUNT } from '@/lib/island-elements'
import type { SessionResult } from '@/lib/memory'

/**
 * «ЧЕЛОВЕК ВЕРНУЛСЯ» — четвёртое состояние «Дома» (#25, #50).
 *
 * Возврат с Фокуса раньше ничем не отличался от любого другого открытия
 * приложения: сессия заканчивалась на своём экране, а «Дом» встречал тем же
 * «Начать сессию», как будто ничего не произошло. Конец сессии — момент, в
 * который память записывает весь опыт (Peak-End), и обрывать его на переходе
 * между экранами значит выбрасывать половину эффекта.
 *
 * ЧЕГО ЗДЕСЬ НЕТ: салюта, конфетти, «Поздравляем!». Человек посидел с
 * презентацией пятнадцать минут — это хорошо, но это не победа на чемпионате
 * мира, и интерфейс, который делает вид, что это она, обесценивает следующую
 * настоящую награду. Вместо праздника — тёплая волна света, ровно один раз.
 */

function resultCopy(r: SessionResult): { title: string; line: string } {
  /*
   * Три РАЗНЫХ итога для трёх разных действий. Один общий «Молодец!» на все
   * случаи — это ложь в двух направлениях сразу: он врёт тому, кто только
   * открыл экран и вышел, и обесценивает того, кто отработал сорок пять
   * минут. Правда здесь дешевле похвалы: человек и сам знает, что он
   * сделал, и несовпадение с текстом на экране он считывает мгновенно.
   */
  const full = r.minutes >= r.plannedMinutes * 0.9

  if (full) {
    return {
      title: `${r.plannedMinutes} минут завершены.`,
      line: 'Шанс необычной находки стал выше.',
    }
  }
  if (r.movementConfirmed) {
    return {
      title: 'Первое движение сделано.',
      line: r.grownName
        ? `На острове появился «${r.grownName}».`
        : 'На острове появился росток.',
    }
  }
  return {
    title: 'Ты вернулся к делу.',
    line: 'След сохранён.',
  }
}

export function ReturnResult({
  result,
  landmarksBefore,
  onCollapsed,
}: {
  result: SessionResult
  /** Сколько ориентиров стояло на острове ДО этого старта */
  landmarksBefore: number
  /** Карточка отыграла своё и стала компактной записью истории */
  onCollapsed: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [collapsed, setCollapsed] = useState(false)
  const { title, line } = resultCopy(result)

  /*
   * Через несколько секунд карточка превращается в компактную запись
   * истории. Не исчезает: исчезнувшая награда читается как отобранная.
   * Не остаётся навсегда: экран «Дома» отвечает на вопрос «что сделать
   * сейчас», и вчерашний результат, занимающий пол-экрана, отвечает на
   * другой вопрос. 5.2с — время прочитать две строки и посмотреть на
   * росток, не больше.
   */
  useEffect(() => {
    const t = window.setTimeout(
      () => {
        setCollapsed(true)
        onCollapsed()
      },
      reduceMotion ? 2600 : 5200,
    )
    return () => window.clearTimeout(t)
  }, [reduceMotion, onCollapsed])

  const sproutIndex = Math.min(landmarksBefore, LANDMARK_COUNT - 1)

  if (collapsed) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="surface-quiet flex items-center gap-2.5 px-3.5 py-2.5"
      >
        <Sprout className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate t-meta" style={{ color: 'var(--ivory-500)' }}>
          {title} «{result.task}»
        </span>
        <Link
          href="/app/world"
          className="-my-3 shrink-0 py-3 t-meta text-primary underline-offset-4 hover:underline"
        >
          остров →
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="surface-card relative overflow-hidden p-5"
    >
      {/*
        ТЁПЛАЯ ВОЛНА СВЕТА — один проход поперёк карточки. Свет очага, не
        лайм: награда принадлежит миру существа, а лайм в этом продукте
        значит «нажми сюда», и подсвечивать им уже случившееся событие
        значит стереть разницу между действием и его результатом.
      */}
      {!reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-2/3"
          style={{
            background:
              'linear-gradient(100deg, transparent 0%, color-mix(in oklab, var(--ember-400) 20%, transparent) 50%, transparent 100%)',
          }}
          initial={{ x: '-40%', opacity: 0 }}
          animate={{ x: '260%', opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, delay: 0.65, ease: 'easeOut' }}
        />
      )}

      <div className="relative flex items-center gap-4">
        {/*
          МИНИ-ПРЕВЬЮ ОСТРОВА. Камера приближается на 3% — ровно столько,
          чтобы движение читалось как «взгляд подался вперёд», а не как
          зум. Больше — и это уже спецэффект, который заметен сам по себе.
        */}
        <motion.svg
          viewBox="0 0 48 48"
          className="size-[72px] shrink-0 rounded-[16px]"
          aria-hidden="true"
          initial={reduceMotion ? false : { scale: 1 }}
          animate={reduceMotion ? {} : { scale: 1.03 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
        >
          <defs>
            <clipPath id="return-scene-clip">
              <rect x="0" y="0" width="48" height="48" rx="14" />
            </clipPath>
            <radialGradient id="return-moonlight" cx="24%" cy="14%" r="74%">
              <stop offset="0%" stopColor="oklch(0.9 0.05 240 / 0.32)" />
              <stop offset="100%" stopColor="oklch(0.9 0.05 240 / 0)" />
            </radialGradient>
          </defs>
          <g clipPath="url(#return-scene-clip)">
            <rect x="0" y="0" width="48" height="48" fill="oklch(0.2 0.02 140)" />
            <rect x="0" y="0" width="48" height="48" fill="url(#return-moonlight)" />
            <circle cx="37" cy="9" r="0.9" fill="oklch(0.92 0.01 210 / 0.5)" />
            <circle cx="30" cy="15" r="0.6" fill="oklch(0.92 0.01 210 / 0.32)" />
            <path d="M0 34 Q 12 29 24 32 T 48 30 L 48 48 L 0 48 Z" fill="oklch(0.17 0.018 138)" />
            {/*
              РОСТОК ПРОРАСТАЕТ. Позиционирующий transform живёт на ВНЕШНЕЙ
              группе, анимационный класс — на внутренней, без своего
              transform-атрибута. Это не стилистика: CSS-анимация transform
              и SVG-атрибут transform на одном узле конфликтуют, побеждает
              анимация, и позиционирующий translate молча теряется — элемент
              прорастает не там, где должен, причём на глаз это заметно не
              всегда.
            */}
            <g
              transform={`translate(${24 - landmarkAnchors[sproutIndex].x * 0.6}, ${30 - landmarkAnchors[sproutIndex].y * 0.6}) scale(0.6)`}
            >
              <g
                className={reduceMotion ? '' : 'island-grow'}
                style={reduceMotion ? undefined : { animationDelay: '0.45s' }}
              >
                <g
                  className="brightness-150 saturate-[0.75]"
                  style={{ filter: 'drop-shadow(0 0 6px oklch(0.86 0.22 130 / 0.4))' }}
                >
                  {landmarkNodes[sproutIndex]}
                </g>
              </g>
            </g>
          </g>
        </motion.svg>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="t-eyebrow">Ты вернулся</span>
          <p className="t-card font-semibold text-foreground text-balance">{title}</p>
          <p className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
            {line}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
