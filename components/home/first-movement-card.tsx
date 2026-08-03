'use client'

import { forwardRef } from 'react'
import { Play, ArrowRight, RotateCcw } from 'lucide-react'
import { durationContract } from '@/lib/duration'

/**
 * ГЛАВНАЯ КАРТОЧКА «ДОМА» (#3).
 *
 * Что было: действие жило внутри карточки награды, вперемешку с прогрессом
 * острова, счётчиком редких находок и ссылкой на весь остров. Человек,
 * открывший приложение с вопросом «что мне сделать сейчас», сначала читал,
 * сколько у него ориентиров и какой шанс редкой находки, и только потом
 * добирался до самого дела.
 *
 * Здесь в одной рамке ровно пять вещей, и все пять отвечают на один вопрос:
 *   что сделать               — сама задача, самый крупный текст карточки;
 *   сколько это стоит         — минуты;
 *   что НЕ требуется          — «результат не обязателен»;
 *   что произойдёт после      — контракт внизу;
 *   куда уйти, если не то     — полноразмерный второй путь.
 *
 * Ничего про остров, находки и статистику: они не помогают решить «начинать
 * ли», а место занимают. Закон близости работает только тогда, когда рядом
 * лежит действительно связанное, — иначе он просто склеивает случайное.
 */

export type MovementSource = 'plan' | 'queue' | 'repeat'

/**
 * Эйбров различает психологический контракт, а не оформление. «Следующий
 * шаг» и «снова это же» — принципиально разные обещания: первое продолжает
 * незакрытую работу (Zeigarnik уже натянут, его достаточно назвать),
 * второе предлагает повтор, и притворяться, что это движение вперёд,
 * значит врать человеку про его собственную историю.
 */
const EYEBROW: Record<MovementSource, string> = {
  plan: 'Первое движение',
  queue: 'Следующее движение',
  repeat: 'Снова — это же',
}

const ICON: Record<MovementSource, typeof Play> = {
  plan: Play,
  queue: ArrowRight,
  repeat: RotateCcw,
}

type Props = {
  task: string
  source: MovementSource
  minutes: number
  /** Идёт запрос/переход — CTA блокируется и объясняет, что происходит (#38) */
  busy?: boolean
  onStart: () => void
  onOther: () => void
}

export const FirstMovementCard = forwardRef<HTMLDivElement, Props>(
  function FirstMovementCard({ task, source, minutes, busy = false, onStart, onOther }, ref) {
    const Icon = ICON[source]

    return (
      <div ref={ref} className="surface-card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <span className="t-eyebrow">{EYEBROW[source]}</span>
          {/* Задача — самый крупный текст карточки и единственный,
              набранный без приглушения. text-balance, а не обрезка: смысл
              первого движения в том, что оно конкретное, и «перечитать
              последний абз…» добавляет страха вместо того, чтобы его
              снимать — мозг достраивает неизвестный объём. */}
          <p className="t-task text-balance font-semibold text-foreground">{task}</p>
          <p className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
            {durationContract(minutes)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {/* ЕДИНСТВЕННОЕ лаймовое пятно этого состояния экрана.
              54px — не «побольше для важности»: это высота, при которой
              кнопка попадается большим пальцем без прицеливания, а
              соседний второй путь ниже (46px) остаётся явно легче по
              весу, не становясь при этом мелкой ссылкой. */}
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="press-state flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-primary t-body font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            {busy ? 'Готовлю место…' : `Начать ${minutes} минут`}
          </button>

          {/*
            ВТОРОЙ ПУТЬ — НЕ МЕЛКАЯ ССЫЛКА (#4).
            Раньше «Другое дело» было ghost-кнопкой по центру, шириной под
            текст: цель ~90px против полной ширины главной. По Фиттсу это
            не «менее приоритетно», это «труднодоступно», а разница между
            этими двумя вещами и есть разница между архитектурой выбора и
            подталкиванием. Человеку, которому предложенное дело не
            подходит, приложение фактически говорило «попробуй всё-таки
            это» — и он либо жал не то, либо уходил.
            Полная ширина, 46px, спокойная поверхность, ноль лайма:
            выбрать другое так же легко, как согласиться, — и по-прежнему
            очевидно, что это не главное действие.
          */}
          <button
            type="button"
            onClick={onOther}
            className="press-state surface-quiet flex h-[46px] w-full items-center justify-center t-secondary font-medium text-foreground"
          >
            Выбрать другое дело
          </button>
        </div>

        {/*
          ЧЕСТНЫЙ КОНТРАКТ (#40). Две строки, которые целиком описывают
          экономику продукта: старт засчитывается сразу (можно выйти рано и
          ничего не потерять), а росток — плата за реальное действие, не за
          открытый экран. Это одновременно Information Scent (видно, что
          будет дальше) и Trust Design (правила названы до нажатия, а не
          после). И именно поэтому росток нельзя выдавать за один лишь
          старт — обещание, нарушенное в свою пользу, стоит дороже, чем
          вторая награда.
        */}
        <p className="t-meta" style={{ color: 'var(--ivory-500)' }}>
          Старт оставит след.
          <br />
          Первое движение вырастит росток.
        </p>
      </div>
    )
  },
)
