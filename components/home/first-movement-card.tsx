'use client'

import { forwardRef } from 'react'
import { Play, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { durationContract } from '@/lib/duration'
import { landmarkAnchors, landmarkNodes } from '@/lib/island-sprites'

/**
 * ГЛАВНАЯ КАРТОЧКА «ДОМА» (#3).
 *
 * Что было: действие жило внутри карточки награды, вперемешку с прогрессом
 * острова, счётчиком редких находок и ссылкой на весь остров. Человек,
 * открывший приложение с вопросом «что мне сделать сейчас», сначала читал,
 * сколько у него ориентиров и какой шанс редкой находки, и только потом
 * добирался до самого дела.
 *
 * ВТОРОЙ ПРОХОД (после прямого сравнения с main на одинаковых данных).
 * Первая версия этой карточки ушла СЛИШКОМ далеко в другую сторону: убрала
 * не только статистику, но и единственный видимый намёк на награду, и
 * заменила «Начинаю: «Открыть файл презентации»» на обезличенное «Начать
 * 25 минут». На реальном рендере рядом со старой версией разница видна
 * сразу — старая карточка была живой (конкретная задача в самой кнопке,
 * окно в остров со свечением прямо здесь), новая читалась как форма из
 * тудушника. Здесь это исправлено, но статистика («9 из 10», счётчик
 * редких находок) по-прежнему НЕ возвращена в карточку — она и правда
 * не отвечает на вопрос «начинать ли», и её место осталось за
 * IslandDisclosure. Возвращена только сама искра предвкушения: что
 * конкретно вырастет, с тем же мини-окном в остров, что было в main.
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

/**
 * ТРЕТИЙ ПРОХОД — CTA перестал повторять задачу.
 *
 * Второй проход добавил задачу В КНОПКУ («Начинаю: «Открыть файл
 * презентации»»), потому что тогда это было ЕДИНСТВЕННОЕ место, где задача
 * вообще была видна крупно — заголовок карточки на тот момент такого не
 * делал. С тех пор заголовок (t-task ниже) сам стал самым крупным текстом
 * карточки, и кнопка, повторяющая ту же фразу, превратилась в чистое
 * дублирование: одна и та же строка на экране дважды, один раз как факт,
 * другой раз как призыв. Кнопка называет действие и цену (глагол +
 * минуты), задача остаётся ровно в одном месте — заголовке.
 */
const CTA_VERB: Record<MovementSource, string> = {
  plan: 'Начать',
  queue: 'Дальше',
  repeat: 'Ещё раз',
}

type NextGrowth = {
  name: string
  /** Индекс в landmarkAnchors/landmarkNodes (0-based) — для мини-сцены */
  landmarkIndex: number
}

type Props = {
  task: string
  source: MovementSource
  minutes: number
  /** Что вырастет за этот старт — искра предвкушения внутри карточки, не
      статистика. null для находок вне карты ориентиров (пул неопределён
      заранее) — тогда строка ниже не рендерится вовсе, а не врёт нулём. */
  nextGrowth?: NextGrowth | null
  /** Идёт запрос/переход — CTA блокируется и объясняет, что происходит (#38) */
  busy?: boolean
  onStart: () => void
  onOther: () => void
}

export const FirstMovementCard = forwardRef<HTMLDivElement, Props>(
  function FirstMovementCard(
    { task, source, minutes, nextGrowth, busy = false, onStart, onOther },
    ref,
  ) {
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

        {/*
          ИСКРА ПРЕДВКУШЕНИЯ (восстановлено после сравнения с main).
          Компактная мини-сцена — окно в остров с тем же ориентиром, что
          вырастет за этот старт. Не полная карточка награды (тропа,
          счётчики) — только сам факт «здесь есть что предвкушать»,
          одной строкой, не крадущей вес у CTA ниже. Reward anticipation
          (Schultz) работает только когда обещание видно ДО действия, а не
          спрятано за отдельным тапом.
        */}
        {nextGrowth && (
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 48 48" className="size-11 shrink-0 rounded-[12px]" aria-hidden="true">
              <defs>
                <clipPath id="fm-scene-clip">
                  <rect x="0" y="0" width="48" height="48" rx="12" />
                </clipPath>
                <radialGradient id="fm-moonlight" cx="22%" cy="16%" r="72%">
                  <stop offset="0%" stopColor="oklch(0.9 0.05 240 / 0.3)" />
                  <stop offset="100%" stopColor="oklch(0.9 0.05 240 / 0)" />
                </radialGradient>
              </defs>
              <g clipPath="url(#fm-scene-clip)">
                <rect x="0" y="0" width="48" height="48" fill="oklch(0.2 0.02 140)" />
                <rect x="0" y="0" width="48" height="48" fill="url(#fm-moonlight)" />
                <circle cx="37" cy="9" r="0.9" fill="oklch(0.92 0.01 210 / 0.5)" />
                <path
                  d="M0 34 Q 12 29 24 32 T 48 30 L 48 48 L 0 48 Z"
                  fill="oklch(0.17 0.018 138)"
                />
                <g
                  transform={`translate(${24 - landmarkAnchors[nextGrowth.landmarkIndex].x * 0.58}, ${30 - landmarkAnchors[nextGrowth.landmarkIndex].y * 0.58}) scale(0.58)`}
                  className="brightness-150 saturate-[0.75]"
                  style={{ filter: 'drop-shadow(0 0 4px oklch(0.9 0.06 240 / 0.4))' }}
                >
                  {landmarkNodes[nextGrowth.landmarkIndex]}
                </g>
              </g>
            </svg>
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5 t-meta" style={{ color: 'var(--ivory-500)' }}>
              <Sparkles className="size-3 shrink-0 text-primary" aria-hidden="true" />
              дальше вырастет «{nextGrowth.name}»
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* ЕДИНСТВЕННОЕ лаймовое пятно этого состояния экрана.
              54px — не «побольше для важности»: это высота, при которой
              кнопка попадается большим пальцем без прицеливания, а
              соседний второй путь ниже остаётся явно легче по весу.
              Текст — глагол + минуты, БЕЗ задачи: она уже названа
              заголовком выше, повторять её здесь — читать одну и ту же
              фразу дважды подряд на одном маленьком экране. */}
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="press-state flex h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-primary t-body font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            {busy ? 'Готовлю место…' : `${CTA_VERB[source]} ${minutes} минут`}
          </button>

          {/*
            ВТОРОЙ ПУТЬ — большая тач-цель, лёгкий визуальный вес (#4).
            Fitts's Law просит полноразмерную, легкодоступную цель — а не
            обязательно закрашенную пилюлю: высота и ширина остаются теми
            же 46px на всю ширину, что и раньше, но без своей поверхности.
            Прошлая версия с фоном surface-quiet визуально читалась как
            ВТОРАЯ большая кнопка рядом с первой — на прямом сравнении
            рендером это два почти равных маршрута на экране, который
            должен вести ровно к одному действию. Текст без пилюли —
            вариант выбран, а не подсказан тем же весом, что и старт.
          */}
          <button
            type="button"
            onClick={onOther}
            className="press-state flex h-[46px] w-full items-center justify-center t-secondary font-medium underline-offset-4 hover:underline"
            style={{ color: 'var(--ivory-500)' }}
          >
            Выбрать другое дело
          </button>
        </div>

        {/*
          ЧЕСТНЫЙ КОНТРАКТ (#40) — ОДНО обещание, не четыре.
          Раньше здесь стояли две строки («след» + «росток») ПОВЕРХ уже
          названного выше конкретного роста («дальше вырастет «Луна»»).
          Три разных обещания награды в одной карточке (луна / росток /
          след) — это уже не честный контракт, а неразбериха метафор.
          Когда рост уже назван конкретно — здесь остаётся только факт про
          старт, который нигде больше не сказан. Когда конкретики нет
          (пул случаен) — обе строки нужны, потому что это единственное
          место, где обещание вообще звучит.
        */}
        <p className="t-meta" style={{ color: 'var(--ivory-500)' }}>
          {nextGrowth ? (
            'Старт оставит след.'
          ) : (
            <>
              Старт оставит след.
              <br />
              Первое движение вырастит росток.
            </>
          )}
        </p>
      </div>
    )
  },
)
