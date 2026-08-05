'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, Copy, Heart, PawPrint, Reply, Sparkle } from 'lucide-react'
import { SPRING_GESTURE, SPRING_SNAPPY } from '@/lib/motion'
import { hapticDone, hapticReaction, hapticThreshold } from '@/lib/haptics'
import { EmphasisText } from '@/components/emphasis-text'

/**
 * Материал одной реплики. Вынесен из companion-chat (900 строк) отдельным
 * компонентом, потому что здесь теперь живут четыре разных жеста, и внутри
 * .map() это была бы каша.
 *
 * #10 — ХВОСТИК настоящей SVG-формой вместо rounded-tl-sm. Скругление угла
 *       не делает «хвост»: у настоящего пузыря есть оттяжка к говорящему,
 *       которая переходит в тело плавной кривой. Рисуем SVG с тем же
 *       фоном/кромкой, что у пузыря, и позиционируем в угол.
 * #11 — РЕАКЦИИ долгим нажатием: раньше long-press умел только копировать —
 *       на реплику живого существа нельзя было ответить ничем, кроме текста.
 * #12 — SWIPE-TO-REPLY: горизонтальная протяжка цитирует реплику. Порог 44px,
 *       упругое сопротивление за ним.
 * #13 — ГЛУБИНА ПО СКРОЛЛУ задаётся снаружи пропом depth (0..1).
 */

export type Reaction = 'paw' | 'spark' | 'heart'

/*
 * Реакции — иконками, а не текстовыми глифами. Первая версия рисовала
 * '🐾' / '✦' / '❤', и на снимке из браузера средняя кнопка оказалась ПУСТОЙ:
 * '✦' (U+2726) нет ни в одном шрифте этого проекта, а эмодзи-лапка и '❤'
 * приходят из системного эмодзи-шрифта — три «иконки» жили в трёх разных
 * гарнитурах, с разным весом и базовой линией. Lucide даёт один вес, один
 * размер и один цвет, наследуемый от состояния кнопки.
 */
const REACTIONS: ReadonlyArray<{
  key: Reaction
  label: string
  Icon: typeof PawPrint
}> = [
  { key: 'paw', label: 'Лапка', Icon: PawPrint },
  { key: 'spark', label: 'Искра', Icon: Sparkle },
  { key: 'heart', label: 'Тепло', Icon: Heart },
]

/** Хвостик пузыря: оттяжка к говорящему, переходящая в тело кривой Безье.
    Экспортирован — приветственный пузырь в companion-chat.tsx рендерится
    отдельно от ChatBubble (он не часть messages[]) и раньше падал обратно на
    rounded-tl-sm, ровно то приближение, которое этот компонент был написан
    заменить (см. комментарий у #10 ниже). Один и тот же персонаж должен
    говорить одним и тем же материалом с первой же реплики, не только
    начиная со второй.

    #10b — ПЕРЕСОБРАН: прежняя версия была тонкой линией-«запятой», висящей
    в воздухе НАД пузырём — потому что скругление угла пузыря (28.8px,
    --radius-2xl) намного больше высоты самого хвостика (14px): угол
    физически не долетал до места, где начинался хвостик, и между ними
    была явная дыра (замерено рендером: у самого верха зазор ~25px).
    В WhatsApp/Telegram/iMessage угол, из которого растёт хвостик, ПОЧТИ
    прямой — именно поэтому там нет этого зазора. Компонент, который ставит
    этот хвостик (ChatBubble/приветствие), теперь одновременно сжимает свой
    же угол до 6px через инлайн-стиль — форма и угол проектируются вместе,
    не двумя независимыми решениями.
    Форма — один filled-path «сгиб» (сужается от угла к скруглённому
    кончику), сдвинутый на 8px внутрь пузыря сверх видимого вылета — запас
    прячет любую мелкую неточность стыка. Три прошлых варианта (тонкая
    линия без нахлёста, circle-minus-circle по образцу маски фаз луны в
    app-backdrop.tsx, путь без запаса внутрь) проверены рендером и
    отброшены — либо висели в воздухе, либо читались отдельным кружком,
    либо не доставали до края.

    #10c — ПЕРЕНЕСЁН СНИЗУ ВВЕРХ → СВЕРХУ ВНИЗ: пользователь сверил с
    реальными скриншотами WhatsApp/Telegram/iMessage — там хвостик и
    аватар растут из НИЖНЕГО угла ПОСЛЕДНЕЙ реплики группы, не из верхнего
    угла первой. ChatBubble/companion-chat.tsx теперь считают isLastOfGroup,
    не isFirstOfGroup, и сжимают нижний, а не верхний угол.

    #10d — ПЕРЕНЕСЁН ЗА .glass-shine: .glass-shine (см. className пузыря
    ниже) несёт overflow:hidden ради диагонального блика — любой потомок
    с отрицательным отступом обрезался по границе пузыря. Пять версий формы
    до этого поэтому «выглядели» рабочими на рендере, но НИКОГДА не
    высовывались за край — то, что казалось хвостиком, было видимым
    остатком фигуры ВНУТРИ пузыря. Хвостик теперь отдельный элемент РЯДОМ
    с .glass-shine (не внутри), с своим style={{x}} для синхронного
    движения при swipe-to-reply, и --tail-fill/--tail-stroke подняты на
    общего родителя (кастомные CSS-свойства не наследуются между соседями).

    #10e — ФОРМА: не треугольник и не капля отдельной кривой — хвостик как
    ПРОДОЛЖЕНИЕ прямых рёбер пузыря, с одной вогнутой (не выпуклой) кривой
    только по внешнему краю. Технику подсказал сам пользователь: квадрат
    20×20, два ребра (верхнее — вдоль низа пузыря, правое — вдоль его
    левого края) остаются идеально прямыми и совпадают с рёбрами пузыря
    БЕЗ зазора, а третья сторона — не прямая, а кубическая кривая от
    верхне-правого угла к нижне-левому, вогнутая внутрь. Ровно поэтому угол
    пузыря у последней реплики группы (ниже) сжат до 0 — острый угол, не
    скруглённый: технике нужно, чтобы её прямые рёбра встречали ТАКИЕ ЖЕ
    прямые рёбра пузыря, а не убегающую дугу.

    #10f — МАТЕРИАЛ ДОГНАН ДО ПУЗЫРЯ: форма была верна, но на реальном
    рендере (вечер, тёплый угол ярче) виден горизонтальный шов ЦВЕТА — не
    геометрии — там, где плоская заливка хвостика встречает градиентный,
    подсвеченный очагом и застеклённый пузырь. Два отдельных огреха:
    1) backdrop-filter (blur+saturate) стоит на пузыре, но не на хвостике —
       пузырь стеклянный, хвостик плоский. Тот же фильтр теперь и на самом
       SVG (он поддерживает backdrop-filter как обычный HTML-элемент).
    2) warm — тёплое пятно очага у .chat-bubble-cat живёт в radial-gradient
       на 18% 100% (нижний левый угол пузыря — ровно там, где начинается
       хвостик), но обрывалось на границе пузыря. Радиальный градиент здесь
       — не копия чужого CSS, а собственное приближение той же тёплой точки
       (oklch(0.72 0.17 55)), угасающее к кончику: тепло теперь течёт из
       пузыря в хвостик, а не обрывается на стыке. У пользовательской
       стороны акцента нет — там градиент вертикальный (свет сверху/масса
       снизу), не угловой, добавлять было бы нечего. */
export function BubbleTail({ side, warm = false }: { side: 'left' | 'right'; warm?: boolean }) {
  const isLeft = side === 'left'
  const gradientId = useId()
  return (
    // backdrop-filter не применяется к корню <svg> в Chromium (проверено
    // рендером: computed backdropFilter оставался "none" несмотря на
    // инлайн-стиль на самом svg) — нужен обычный HTML-элемент с явным
    // размером, оборачивающий SVG, а не сам svg-узел.
    <div
      className={`absolute bottom-0 h-5 w-5 overflow-visible ${isLeft ? '-left-5' : '-right-5'}`}
      style={{ backdropFilter: 'blur(16px) saturate(150%)' }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`size-full ${isLeft ? '' : 'scale-x-[-1]'}`}
        style={{ overflow: 'visible' }}
      >
        {/* Заливка — вся фигура. Обводка — ТОЛЬКО видимая дуга: прямые рёбра
            (верх, право) совпадают с краем пузыря и не должны нести свою
            линию поверх его собственной — иначе на стыке виден шов, даже
            когда сама заливка уже не имеет зазора. */}
        <path d="M20 0 C20 11 11 20 0 20 H20 V0 Z" fill="var(--tail-fill)" />
        {warm && (
          <>
            <defs>
              <radialGradient id={gradientId} cx="0.85" cy="0.1" r="0.75">
                <stop offset="0%" stopColor="oklch(0.72 0.17 55 / 0.3)" />
                <stop offset="100%" stopColor="oklch(0.72 0.17 55 / 0)" />
              </radialGradient>
            </defs>
            <path d="M20 0 C20 11 11 20 0 20 H20 V0 Z" fill={`url(#${gradientId})`} />
          </>
        )}
        <path
          d="M20 0 C20 11 11 20 0 20"
          fill="none"
          stroke="var(--tail-stroke)"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

type ChatBubbleProps = {
  text: string
  isUser: boolean
  isLastOfGroup: boolean
  /** 0 — свежая реплика у низа, 1 — уехала далеко вверх (#13) */
  depth: number
  reaction?: Reaction | null
  onReact: (r: Reaction | null) => void
  onReply: () => void
  reduceMotion: boolean
}

export function ChatBubble({
  text,
  isUser,
  isLastOfGroup,
  depth,
  reaction,
  onReact,
  onReply,
  reduceMotion,
}: ChatBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const longPressTimer = useRef<number | null>(null)
  const draggingRef = useRef(false)

  const x = useMotionValue(0)
  // Иконка ответа проявляется по мере протяжки — сам жест объясняет себя,
  // без подсказки-туториала.
  const replyOpacity = useTransform(x, isUser ? [-56, -18, 0] : [0, 18, 56], isUser ? [1, 0, 0] : [0, 0, 1])
  const replyScale = useTransform(x, isUser ? [-56, -20] : [20, 56], [1, 0.6])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    }
  }, [])

  /*
   * Момент открытия меню. Нужен из-за реального бага, найденного удержанием
   * в браузере: меню появлялось на 450-й мс, пока палец ЕЩЁ ПРИЖАТ, и
   * подкладывало под себя оверлей-«клик вне». Отпускание того же самого
   * жеста прилетало в этот оверлей и закрывало меню мгновенно — выбрать
   * реакцию было физически невозможно ни мышью, ни пальцем.
   * Оверлей игнорирует всё, что прилетело в первые 300 мс своей жизни:
   * это хвост открывающего жеста, а не новый выбор пользователя.
   */
  const openedAt = useRef(0)

  function startLongPress() {
    longPressTimer.current = window.setTimeout(() => {
      if (draggingRef.current) return
      hapticReaction()
      openedAt.current = Date.now()
      setMenuOpen(true)
    }, 450)
  }
  /*
   * Отменяет только НЕ СРАБОТАВШЕЕ удержание. Раньше эта же функция висела
   * на onPointerLeave, и получался второй способ убить меню собственным
   * жестом: всплывшее меню перекрывает верх пузыря, курсор/палец оказывается
   * над ним → браузер шлёт pointerleave на пузырь → отмена. Мышью меню
   * умирало ровно в тот момент, когда его собирались использовать.
   * Теперь после открытия отменять уже нечего: таймер отработал.
   */
  function cancelLongPress() {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
  }

  async function copyText() {
    try {
      await navigator.clipboard?.writeText(text)
      hapticDone()
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // буфер недоступен (не https/старый браузер) — молчим, как и вся
      // остальная опциональная периферия в этом проекте
    }
    setMenuOpen(false)
  }

  /*
   * #13 · Глубина. Ушедшее вверх отъезжает и теряет насыщенность — ровно то,
   * что делает воздушная перспектива в реальном мире. Держим мягко: масштаб
   * до 0.975 и прозрачность до 0.78. История остаётся фоном, но не становится
   * недоступной: переписка — память, а не декоративная глубина сцены.
   */
  const depthScale = reduceMotion ? 1 : 1 - depth * 0.025
  const depthOpacity = reduceMotion ? 1 : 1 - depth * 0.22
  const depthSaturate = reduceMotion ? 1 : 1 - depth * 0.25

  /*
   * Типографика: раньше вся речь напарника шла шрифтом Caveat целиком —
   * читаемо на одной фразе, утомительно на сотнях сообщений. Теперь оба
   * борта набраны ОДНИМ размером/интерлиньяжем (0.95rem/leading-relaxed) —
   * идентичная сетка вместо «у кота крупнее и теснее» — рукописный стиль
   * возвращается точечно, только на словах в *звёздочках* (EmphasisText).
   */
  const bubbleClass = isUser
    ? 'chat-bubble-user px-4 py-2.5 text-[0.95rem] leading-relaxed'
    : 'chat-bubble-cat px-4 py-2.5 font-sans text-[0.95rem] leading-relaxed text-secondary-foreground'

  return (
    <div
      className={`relative ${isUser ? 'ml-auto max-w-[82%]' : 'max-w-[88%]'}`}
      style={{
        // Переменные для SVG-хвостика живут на ОБЩЕМ родителе пузыря и его
        // хвостика (см. #10 ниже — хвостик теперь не внутри .glass-shine,
        // а рядом с ней), а не на самой .glass-shine: кастомные CSS-свойства
        // наследуются вниз по дереву, не между соседями — на внутреннем
        // div'е они были бы невидимы хвостику-сиблингу (замерено рендером:
        // computed --tail-fill на обёртке хвостика была пустой строкой,
        // fill молча падал на чёрный по умолчанию).
        // Значение должно зеркалить заливку .chat-bubble-cat в globals.css —
        // когда контраст пузыря поднимали (0.16/0.62 → 0.4/0.9), эту
        // константу забыли обновить, и хвостик разошёлся цветом с телом
        // пузыря, к которому приклеен. Найдено сверкой с реальным
        // скриншотом устройства.
        //
        // isUser: пузырь красится вертикальным градиентом (светлый верх →
        // тёмный низ, .chat-bubble-user), а хвостик сидит СНИЗУ (#10c) —
        // раньше здесь стоял ВЕРХНИЙ (0%) стоп градиента, оставшийся от
        // старой версии, когда хвостик был сверху. Хвостик красился светлым,
        // хотя рядом с ним самая тёмная часть пузыря (100%-стоп). Теперь —
        // тот же нижний стоп, что реально граничит с хвостиком.
        ['--tail-fill' as string]: isUser
          ? 'oklch(0.8 0.2 132)'
          : 'oklch(0.4 0.02 150 / 0.9)',
        ['--tail-stroke' as string]: isUser ? 'transparent' : 'oklch(1 0 0 / 0.2)',
      }}
    >
      {/* Иконка-цель ответа лежит ПОД пузырём и открывается протяжкой. */}
      <motion.span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isUser ? '-right-9' : '-left-9'}`}
        style={{ opacity: replyOpacity, scale: replyScale }}
      >
        <Reply className="size-4 text-primary" />
      </motion.span>

      <motion.div
        style={{
          x,
          scale: depthScale,
          opacity: depthOpacity,
          filter: `saturate(${depthSaturate})`,
          transformOrigin: isUser ? 'right center' : 'left center',
          // Угол, из которого растёт хвостик, — острый (0px, было 28.8px,
          // --radius-2xl): техника #10e ниже держится на том, что прямые
          // рёбра хвостика встречают ТАКИЕ ЖЕ прямые рёбра пузыря, без
          // зазора и без спорящей с ними дуги. Только у ПОСЛЕДНЕЙ реплики
          // группы (хвостик и аватар растут снизу, как в WhatsApp/Telegram/
          // iMessage): более ранние реплики пачки остаются круглыми со всех
          // сторон.
          ...(isLastOfGroup
            ? { [isUser ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: '0px' }
            : {}),
        }}
        // Тянуть можно только к своей стороне: реплика уходит «в ответ», а не
        // болтается в обе стороны. dragElastic — упругое сопротивление за
        // порогом: жест сообщает, что предел есть, без запрета.
        drag={reduceMotion ? false : 'x'}
        dragDirectionLock
        dragConstraints={isUser ? { left: -72, right: 0 } : { left: 0, right: 72 }}
        dragElastic={0.18}
        dragSnapToOrigin
        onDragStart={() => {
          draggingRef.current = true
          cancelLongPress()
        }}
        onDrag={(_, info) => {
          // Хаптика ровно на пересечении порога, один раз за жест.
          if (Math.abs(info.offset.x) > 44 && !crossedRef(draggingRef)) {
            hapticThreshold()
            markCrossed(draggingRef)
          }
        }}
        onDragEnd={(_, info) => {
          draggingRef.current = false
          resetCrossed(draggingRef)
          if (Math.abs(info.offset.x) > 44) onReply()
        }}
        transition={SPRING_GESTURE}
        whileTap={{ scale: depthScale * 0.98 }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        className={`glass-shine relative select-none whitespace-pre-wrap rounded-2xl ${bubbleClass} ${isUser ? 'message-land' : ''}`}
      >
        <EmphasisText text={text} />
      </motion.div>

      {/* #10 · Хвостик — СНАРУЖИ пузыря, не внутри. .glass-shine (см. выше)
          несёт overflow:hidden ради diagonal-блика — любой ребёнок с
          отрицательным отступом внутри неё обрезался по границе пузыря,
          поэтому пять прошлых попыток формы визуально «работали», но на
          самом деле никогда не высовывались за край: то, что казалось
          хвостиком, было лишь видимым остатком фигуры ВНУТРИ пузыря.
          Найдено не рендером формы, а проверкой — достаточно было
          посмотреть, что оборачивает BubbleTail. style={{x}} — та же
          motion-value, что двигает сам пузырь при swipe-to-reply: без неё
          хвостик остался бы на месте, пока пузырь уезжает в протяжке. */}
      {isLastOfGroup && (
        <motion.div
          aria-hidden="true"
          style={{ x }}
          className={`pointer-events-none absolute bottom-0 ${isUser ? 'right-0' : 'left-0'}`}
        >
          <BubbleTail side={isUser ? 'right' : 'left'} warm={!isUser} />
        </motion.div>
      )}

      {/* Поставленная реакция живёт на кромке пузыря — она про эту реплику,
          а не отдельная строка в ленте. */}
      <AnimatePresence>
        {reaction && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.5, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={SPRING_GESTURE}
            onClick={() => {
              hapticReaction()
              onReact(null)
            }}
            aria-label="Убрать реакцию"
            // before:-inset-2.5: видимый бейдж остаётся size-7 (28px), но
            // тач-зона расширяется до ~44px — тот же приём, что у точек
            // section-nav.tsx.
            className={`absolute -bottom-3 flex size-7 items-center justify-center rounded-full border border-white/12 bg-secondary text-xs shadow-[0_4px_12px_-4px_oklch(0_0_0/0.6)] before:absolute before:-inset-2.5 ${
              isUser ? 'left-1' : 'right-1'
            }`}
          >
            {(() => {
              const R = REACTIONS.find((r) => r.key === reaction)
              return R ? (
                <R.Icon
                  className="size-3.5 text-primary"
                  // fill для сердца и лапки: поставленная реакция — «залитая»,
                  // как в мессенджерах, а не контурная иконка-действие
                  fill="currentColor"
                  aria-hidden="true"
                />
              ) : null
            })()}
          </motion.button>
        )}
      </AnimatePresence>

      {/* #11 · Меню реакций + копирование. Всплывает над пузырём, закрывается
          тапом вне — стандартное поведение long-press-меню. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onPointerDown={() => {
                if (Date.now() - openedAt.current < 300) return
                setMenuOpen(false)
              }}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
              transition={SPRING_GESTURE}
              className={`absolute -top-14 z-40 flex items-center gap-0.5 rounded-full border border-white/12 bg-secondary p-1 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.7)] ${
                isUser ? 'right-0' : 'left-0'
              }`}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    hapticReaction()
                    onReact(reaction === r.key ? null : r.key)
                    setMenuOpen(false)
                  }}
                  aria-label={r.label}
                  className={`flex size-11 items-center justify-center rounded-full transition-colors ${
                    reaction === r.key ? 'bg-primary/20' : 'hover:bg-white/8'
                  }`}
                >
                  <r.Icon
                    className={`size-4 ${reaction === r.key ? 'text-primary' : 'text-foreground'}`}
                    fill={reaction === r.key ? 'currentColor' : 'none'}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />
              <button
                type="button"
                onClick={copyText}
                aria-label="Скопировать"
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/8"
              >
                <Copy className="size-3.5 text-foreground" aria-hidden="true" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={SPRING_SNAPPY}
            className={`absolute -top-7 flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-foreground shadow-[0_4px_14px_-6px_oklch(0_0_0/0.6)] ${
              isUser ? 'right-0' : 'left-0'
            }`}
          >
            <Check className="size-3 text-primary" aria-hidden="true" />
            Скопировано
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/*
 * Отметка «порог пройден» держится на самом ref-объекте жеста, а не в state:
 * во время протяжки нельзя вызывать рендер на каждый кадр — это тот же
 * принцип, по которому таймер long-press в этом проекте живёт в ref.
 */
type CrossFlag = { crossed?: boolean }
function crossedRef(ref: React.MutableRefObject<boolean> & CrossFlag) {
  return ref.crossed === true
}
function markCrossed(ref: React.MutableRefObject<boolean> & CrossFlag) {
  ref.crossed = true
}
function resetCrossed(ref: React.MutableRefObject<boolean> & CrossFlag) {
  ref.crossed = false
}
