'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg, type MascotExpression } from '@/components/mascot-svg'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarCheck,
  Check,
  Play,
  Sparkles,
  Sprout,
} from 'lucide-react'
import Link from 'next/link'
import {
  addNote,
  buildMemoryContext,
  getChatMessages,
  getStarts,
  saveChatMessages,
  savePlan,
  type MemoryContext,
} from '@/lib/memory'
import { ISLAND_ELEMENT_NAMES, LANDMARK_COUNT } from '@/lib/island-elements'
import { scriptedReply } from '@/lib/scripted-companion'

type CompanionChatProps = {
  mode: 'companion' | 'focus'
  greeting: string
  placeholder?: string
  onPlanSaved?: () => void
  /** Скрыть чипы-подсказки пустого чата. Нужно, когда над чатом уже показан
      свой набор чипов (стартер-чипы новичка на HomeScreen) — два визуально
      одинаковых ряда пилюль подряд, ведущих к разным действиям (мгновенный
      старт vs сообщение боту), путают сильнее, чем помогают. */
  showSuggestions?: boolean
}

function CompanionAvatar({
  expression = 'calm',
}: {
  expression?: MascotExpression
}) {
  // Существо ВЕЗДЕ живёт в свете своего очага. Кольцо — тонкий тёплый
  // градиент (сильнее снизу, откуда в сцене бьёт свет костра из
  // AppBackdrop): аватар перестаёт быть «иконкой в кружке» и становится
  // персонажем, сидящим у огня. Свет в сцене един.
  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.72_0.17_55/0.32)_0%,transparent_70%)]"
      />
      {/* Кольцо очага: conic с тёплым максимумом внизу. Непрозрачность
          поднята (0.85 в пике) и кольцо утолщено до 2px — на скриншотах
          прежнее кольцо при 0.55/1.5px растворялось в тёмной сцене,
          персонаж терял связь с костром */}
      <div
        aria-hidden="true"
        className="absolute -inset-0.5 rounded-full"
        style={{
          background:
            'conic-gradient(from 200deg, oklch(0.75 0.17 55 / 0.85), oklch(0.72 0.17 55 / 0.25) 40%, oklch(1 0 0 / 0.12) 65%, oklch(0.75 0.17 55 / 0.85))',
          mask: 'radial-gradient(circle, transparent calc(50% - 2.5px), black calc(50% - 0.5px))',
          WebkitMask:
            'radial-gradient(circle, transparent calc(50% - 2.5px), black calc(50% - 0.5px))',
        }}
      />
      <div className="relative flex size-9 items-center justify-center rounded-full bg-secondary/80">
        <MascotSvg expression={expression} size={30} />
      </div>
    </div>
  )
}

/** Выражение существа живёт вместе с тем, что оно говорит, — как у героя
    лендинга. Вопрос — заинтересованный прищур (focused), приглашение к
    старту / радость — happy, остальное — спокойствие. Считается по тексту
    реплики: ноль лишнего состояния. */
function inferExpression(
  text: string,
  hasStartCard: boolean,
): MascotExpression {
  if (hasStartCard) return 'excited'
  if (/(!|отлично|получилось|горжусь|ура|красота|засчитан)/i.test(text))
    return 'happy'
  if (/\?\s*$/.test(text)) return 'focused'
  return 'calm'
}

/** Реплика кота ПИШЕТСЯ рукой — то же ремесло, что OPENING_LINE в hero:
    посимвольное проявление с чернильным курсором. Работает и для стрима
    (текст догоняет растущий target), и для мгновенных скриптовых ответов.
    Тап по пузырю — дописать сразу. Reduced-motion — сразу весь текст. */
function HandwrittenInk({
  text,
  animate,
  onInk,
}: {
  text: string
  animate: boolean
  /** Пинг на каждый тик пера — родитель подскролливает ленту */
  onInk?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const [shown, setShown] = useState(animate && !reduceMotion ? 0 : text.length)
  const doneRef = useRef(!animate || reduceMotion)

  useEffect(() => {
    if (doneRef.current) {
      setShown(text.length)
      return
    }
    if (shown >= text.length) return
    const id = setInterval(() => {
      setShown((s) => {
        const next = Math.min(s + 2, text.length)
        if (next >= text.length) doneRef.current = true
        return next
      })
      onInk?.()
    }, 24)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, shown])

  return (
    <span
      onClick={() => {
        doneRef.current = true
        setShown(text.length)
      }}
    >
      {text.slice(0, shown)}
      {shown < text.length && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.85em] w-0.5 animate-pulse rounded bg-primary align-middle"
        />
      )}
      {/* Полный текст сразу — скринридеру, не глазам */}
      <span className="sr-only">{text.slice(shown)}</span>
    </span>
  )
}

/** Держит выравнивание пузыря в сгруппированной серии сообщений кота —
    аватар показываем только на первой реплике серии (паттерн iMessage/
    Telegram: повторяющийся столбик одинаковых котов — шум, не сигнал) */
/**
 * S3 · «Старт = прорастание» (уникальная механика карточки старта,
 * раунд 4). Red Team убил hold-to-start: 700мс удержания — трение,
 * замаскированное под ритуал. Человек с СДВГ отпустит на 400мс,
 * получит «почти зажглось» и бросит. Мы добавили препятствие в момент
 * максимального сопротивления.
 *
 * Теперь тап МГНОВЕННО запускает анимацию: кнопка распадается на
 * частицы, которые летят вверх и собираются в силуэт следующего
 * ориентира острова. Человек ВИДИТ, что его тап уже что-то вырастил —
 * отступать поздно (commitment через видимый результат, не через
 * трение). Анимация длится 900мс — ровно столько, чтобы мозг
 * зафиксировал «я это сделал», но недостаточно, чтобы раздражать.
 * Клавиатура и reduced-motion получают мгновенный переход без анимации.
 */
function SproutStartButton({
  onStart,
  nextElementName,
}: {
  onStart: () => void
  nextElementName: string | null
}) {
  const reduceMotion = useReducedMotion()
  const [sprouting, setSprouting] = useState(false)
  const firedRef = useRef(false)

  if (reduceMotion || !nextElementName) {
    return (
      <Button
        className="press cta-sheen h-12 w-full gap-2 text-base font-semibold"
        onClick={onStart}
      >
        <Play className="size-4" aria-hidden="true" />
        Начинаю
      </Button>
    )
  }

  return (
    <span className="relative flex flex-col gap-1">
      <button
        type="button"
        aria-label={`Начинаю — вырастить «${nextElementName}»`}
        onClick={() => {
          if (firedRef.current) return
          firedRef.current = true
          setSprouting(true)
          // Переход на сессию — после того, как человек увидел результат
          window.setTimeout(onStart, 900)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!firedRef.current) {
              firedRef.current = true
              onStart()
            }
          }
        }}
        className="press relative h-12 w-full touch-none select-none overflow-hidden rounded-lg bg-primary text-base font-semibold text-primary-foreground"
      >
        {/* Частицы: 8 точек разлетаются от центра кнопки вверх и
            собираются в силуэт следующего ориентира. Каждая частица —
            кусочек «я это сделал», который уже нельзя отменить. */}
        <AnimatePresence>
          {sprouting && (
            <>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                const distance = 40 + (i % 3) * 20
                return (
                  <motion.span
                    key={i}
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 size-2 rounded-full bg-primary-foreground"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance - 60,
                      opacity: 0,
                      scale: 0.3,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.7,
                      delay: i * 0.03,
                      ease: [0.2, 0.8, 0.4, 1],
                    }}
                  />
                )
              })}
              {/* Силуэт следующего ориентира: собирается из частиц,
                  дышит 200мс, потом переход */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center font-hand text-lg text-primary-foreground"
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 20 }}
              >
                {nextElementName}
              </motion.span>
            </>
          )}
        </AnimatePresence>
        <span
          className={`relative flex items-center justify-center gap-2 transition-opacity duration-200 ${
            sprouting ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Play className="size-4" aria-hidden="true" />
          Начинаю
        </span>
      </button>
      <AnimatePresence>
        {sprouting && (
          <motion.span
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center font-mono text-[10px] uppercase tracking-widest text-primary"
          >
            уже растёт
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/**
 * Сцена шага: объект + действие. Каждый универсальный шаг получает
 * визуальный образ — мозг видит, ЧТО делать, а не читает инструкцию.
 */
function stepScene(step: string): { icon: string } {
  if (/стол|вещь|убрать/i.test(step)) return { icon: '🗄️' }
  if (/файл|вкладк|открыть/i.test(step)) return { icon: '📂' }
  if (/письм|почт|разобрать/i.test(step)) return { icon: '✉️' }
  if (/предложен|написать|кривое/i.test(step)) return { icon: '✏️' }
  if (/место|вернуть/i.test(step)) return { icon: '🏠' }
  if (/бумаг|выписать|голова/i.test(step)) return { icon: '📝' }
  return { icon: '🎯' }
}

function AvatarSpacer() {
  return <div aria-hidden="true" className="w-9 shrink-0" />
}

export function CompanionChat({
  mode,
  greeting,
  placeholder,
  onPlanSaved,
  showSuggestions = true,
}: CompanionChatProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const memoryRef = useRef<MemoryContext | null>(null)

  useEffect(() => {
    buildMemoryContext().then((m) => {
      memoryRef.current = m
    })
  }, [])

  const { messages, sendMessage, status, addToolOutput, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/companion',
      body: () => ({
        mode,
        memory: memoryRef.current,
        clientHour: new Date().getHours(),
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Graceful degradation: LLM недоступен (нет ключа, лимит, сеть) —
    // напарник отвечает скриптовым мозгом из свое�� памяти. Никогда не молчит.
    onError() {
      setMessages((prev) => {
        const lastUser = [...prev].reverse().find((m) => m.role === 'user')
        const userText =
          lastUser?.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join(' ') ?? ''
        const reply = scriptedReply(userText, memoryRef.current, new Date().getHours())

        const parts: (typeof prev)[number]['parts'] = [{ type: 'text', text: reply.text }]
        if (reply.startStep) {
          parts.push({
            type: 'tool-startFocus',
            toolCallId: `scripted-${Date.now()}`,
            state: 'output-available',
            input: { firstStep: reply.startStep, minutes: reply.minutes ?? 15 },
            output: 'Кнопка «Начинаю» показана в чате.',
          } as (typeof prev)[number]['parts'][number])
        }

        // Убираем возможный пустой/оборванный ответ ассистента после ошибки
        const cleaned =
          prev.length > 0 && prev[prev.length - 1].role === 'assistant'
            ? prev.slice(0, -1)
            : prev

        return [
          ...cleaned,
          { id: `scripted-${Date.now()}`, role: 'assistant' as const, parts },
        ]
      })
    },
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return

      if (toolCall.toolName === 'savePlan') {
        const { task, firstStep, startTime } = toolCall.input as {
          task: string
          firstStep: string
          startTime?: string
        }
        savePlan({ task, firstStep, startTime }).then(async () => {
          memoryRef.current = await buildMemoryContext()
          onPlanSaved?.()
          addToolOutput({
            tool: 'savePlan',
            toolCallId: toolCall.toolCallId,
            output: 'План сохранён. Утром напомнишь про первый шаг.',
          })
        })
      }

      if (toolCall.toolName === 'rememberFact') {
        const { fact } = toolCall.input as { fact: string }
        addNote(fact).then(async () => {
          memoryRef.current = await buildMemoryContext()
          addToolOutput({
            tool: 'rememberFact',
            toolCallId: toolCall.toolCallId,
            output: 'Запомнил.',
          })
        })
      }

      if (toolCall.toolName === 'startFocus') {
        // Карточку с кнопкой рисует разметка ниже; здесь просто подтверждаем
        addToolOutput({
          tool: 'startFocus',
          toolCallId: toolCall.toolCallId,
          output: 'Кнопка «Начинаю» показана в чате.',
        })
      }
    },
  })

  const bottomRef = useRef<HTMLDivElement>(null)

  // «Он тебя помнит»: разговор переживает перезагрузку страницы.
  // Восстанавливаем последние сообщения при открытии чата.
  const chatRestoredRef = useRef(false)
  useEffect(() => {
    if (chatRestoredRef.current) return
    chatRestoredRef.current = true
    getChatMessages<(typeof messages)[number]>().then((saved) => {
      if (saved.length > 0) setMessages(saved)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Сохраняем после каждого завершённого обмена (не во время стриминга)
  useEffect(() => {
    if (!chatRestoredRef.current) return
    if (status === 'streaming' || status === 'submitted') return
    if (messages.length === 0) return
    saveChatMessages(messages)
  }, [messages, status])

  // U4 + «не дёргай читающего»: автоскролл только если человек и так у низа
  // ленты ЛИБО он сам только что отправил сообщение. Если он ускроллил вверх
  // перечитать — новое сообщение не вырывает ленту из рук (стандарт
  // Telegram/iMessage; вырывание = потеря контроля = злость).
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  // FAB «вниз»: когда человек ускроллил вверх, даём явный путь обратно —
  // стандарт Telegram/iMessage; без него возврат к свежему сообщению — жест
  // вслепую
  const [showJump, setShowJump] = useState(false)
  useEffect(() => {
    const lastRole = messages[messages.length - 1]?.role
    if (nearBottomRef.current || lastRole === 'user') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, status])

  // После скриптового ответа ста��ус может быть 'error' — чат должен жить дальше
  const canSend = status === 'ready' || status === 'error'

  // Счётчик отправок — ключ для анимации «стрелка выстреливает вверх»
  const [sendCount, setSendCount] = useState(0)

  // Рукописная анимация — только для реплик, родившихся в ЭТОЙ сессии.
  // Восстановленная история пишется мгновенно: перечитывать вчерашний
  // разговор через посимвольное проявление — пытка, не ремесло.
  const bornBeforeRef = useRef<Set<string> | null>(null)
  if (bornBeforeRef.current === null && messages.length > 0) {
    bornBeforeRef.current = new Set(messages.map((m) => m.id))
  }

  // Временные метки: фиксируем момент рождения реплики в этой сессии.
  // Только для живых сообщений — приписывать восстановленной истории
  // сегодняшнее время было бы враньём (честность > декорация)
  const bornAtRef = useRef(new Map<string, string>())

  function submit() {
    if (!input.trim() || !canSend) return
    sendMessage({ text: input })
    setInput('')
    setSendCount((n) => n + 1)
  }

  // S2 · «Кот раздаёт карты» (уникальная механика чата). Каждый вопрос
  // бота — требование решения при ability≈0 (Fogg): на скриншотах человек
  // трижды печатал «Да»/«Какое»/«Хз» руками, а бот отвечал новым вопросом.
  // Выход из петли — не текст, а колода: под вопросом кот раскладывает
  // веером три готовые карты-шага. Тап по карте = мгновенный старт сессии,
  // клавиатура не нужна вообще. Хик: выбор из 3 конкретных карт на порядок
  // легче открытого вопроса «назови дело». Карты исчезают, как только
  // человек начал печатать сам — колода не спорит с рукой.
  const lastMsg = messages[messages.length - 1]
  const lastAssistantAsks =
    lastMsg?.role === 'assistant' &&
    !lastMsg.parts.some((p) => p.type === 'tool-startFocus') &&
    // Не только «?» в конце: «Назови одно дело…» — тоже требование
    // решения без вопросительного знака (Red Team р.3 поймал, что
    // деколонизированная формулировка оставляла человека без колоды)
    /\?|назови|что висит|какое дело|одно дело/i.test(
      lastMsg.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join(' ')
        .trim(),
    )
  const showQuickReplies =
    lastAssistantAsks && canSend && messages.length > 0 && input === ''

  // Раздача стабильна по id последней реплики: карты не перетасовываются
  // на каждый рендер (мерцающая колода = negative prediction error)
  const dealtCards = useMemo(() => {
    const pool = [
      'убрать одну вещь со стола',
      'открыть файл, который давно висит',
      'написать одно кривое предложение',
      'разобрать пять писем сверху',
      'вернуть одну вещь на её место',
      'выписать всё из головы на бумагу',
    ]
    let seed = 0
    const id = lastMsg?.id ?? ''
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const j = seed % (i + 1)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr.slice(0, 3)
  }, [lastMsg?.id])

  // S3 · прогноз награды на карточке старта: сколько стартов уже сделано —
  // столько элементов выросло; следующий известен по имени
  const [startsCount, setStartsCount] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    getStarts().then((s) => {
      if (alive) setStartsCount(s.length)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* justify-end на мобильн��м: сообщения примыкают к полю ввода, короткий
          чат (1-2 реплики) выглядит обжитым, а не оборванным. На десктопе
          (md:justify-start) высота вьюпорта велика — при justify-end единственная
          реплика улетала к низу, а между ней и приветствием-шапкой зияла
          пропасть, читавшаяся как «не прогрузилось». Сверху вниз реплики
          примыкают к шапке, а свободное место уходит вниз к полю ввода — это
          нормальный «пустой чат в ожидании», а не раз��ыв. Overflow и autoscroll
          на bottomRef не затронуты. */}
      {/* U3: сообщения растут сверху, инпут прижат к таб-бару (sticky) —
          прежний justify-end на мобиле прижимал одинокий гритинг к низу и
          оставлял мёртвую дыру посреди экрана */}
      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current
          if (!el) return
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120
          nearBottomRef.current = near
          setShowJump(!near)
        }}
        // overscroll-contain: резиновый отскок ленты не тянет за собой
        // всю страницу (iOS scroll chaining)
        className="relative flex flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        {/* mt-auto: лента растёт от дока ввода вверх (паттерн Telegram) —
            короткий чат обжит и примыкает к рукам, а не висит наве��ху,
            оставляя мёртвую чёрную дыру между собой и инпутом */}
        {/* pb-10: нижний зазор под градиент растворения дока — прежний
            py-4 позволял чипам заезжать под градиент и полусрезаться */}
        <div className="mx-auto mt-auto flex w-full max-w-md flex-col gap-3 px-4 pb-10 pt-4">
          {/* Разделитель дня — якорь времени, как в настоящих мессенджерах.
              Только при живой истории: над одиноким приветствием «СЕГОДНЯ» —
              шум, а не якорь */}
          {messages.length > 0 && (
            <div className="flex justify-center pb-1">
              <span className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                сегодня
              </span>
            </div>
          )}
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <CompanionAvatar />
            {/* px-3.5 py-2: у Caveat высокие выносные — при py-1.5 буквы
                упирались в кромку пузыря. Приветствие пишется рукой —
                первый контакт с существом, то же ремесло, что в hero. */}
            <div className="chat-bubble-cat max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2 font-hand text-lg leading-snug">
              <HandwrittenInk text={greeting} animate={messages.length === 0} />
            </div>
          </motion.div>

          {messages.length === 0 && showSuggestions && (
            <motion.div
              className="ml-10 flex flex-col gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                можно просто нажать
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Не могу заставить себя начать',
                  'Раздроби мне задачу',
                  'Просто тяжело сегодня',
                ].map((chip, ci) => (
                  <motion.button
                    key={chip}
                    type="button"
                    onClick={() => sendMessage({ text: chip })}
                    // Стаггер 60ms: чипы «раскладываются» один за другим —
                    // рука сама тянется к первому
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + ci * 0.06 }}
                    className="glass glass-interactive press inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm text-foreground hover:text-primary"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
              <Link
                href="/app/session"
                className="mt-1 inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-80"
              >
                или сразу к делу
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          )}

          {messages.map((message, mi) => {
            // Группировка серий (паттерн iMessage/Telegram): аватар — только
            // на первой реплике подряд идущих сообщений кота, дальше серия
            // визуально сцеплена меньшим отступом. Столбик одинаковых котов
            // (скриншот IMG_1847) — шум, который дешевит интерфейс.
            const groupedWithPrev =
              message.role === 'assistant' &&
              mi > 0 &&
              messages[mi - 1].role === 'assistant'
            const firstTextIdx = message.parts.findIndex((p) => p.type === 'text')
            // Живое выражение существа: считается из содержимого реплики
            const fullText = message.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p.type === 'text' ? p.text : ''))
              .join(' ')
            const hasStartCard = message.parts.some(
              (p) => p.type === 'tool-startFocus',
            )
            const expression =
              message.role === 'assistant'
                ? inferExpression(fullText, hasStartCard)
                : 'calm'
            const bornNow = !(bornBeforeRef.current?.has(message.id) ?? false)
            if (bornNow && !bornAtRef.current.has(message.id)) {
              bornAtRef.current.set(
                message.id,
                new Date().toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              )
            }
            const bornAt = bornAtRef.current.get(message.id)
            // Метка времени — на последней реплике серии (паттерн
            // iMessage/Telegram): под каждым пузырём — шум, в конце серии —
            // якорь. Для пользователя — галочка доставки: микро-отклик
            // «сообщение дошло», закрывающий петлю действия
            const lastOfSeries =
              mi === messages.length - 1 || messages[mi + 1].role !== message.role
            return (
            <div
              key={message.id}
              className={`flex flex-col gap-2 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              } ${groupedWithPrev ? '-mt-1.5' : ''}`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  const showAvatar = i === firstTextIdx && !groupedWithPrev
                  const isUser = message.role === 'user'
                  return (
                    <motion.div
                      key={i}
                      className="flex w-full items-start gap-2"
                      initial={{ opacity: 0, y: 12, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      // Пузырь распускается из своего угла (как в iMessage),
                      // а не всплывает целиком из ниоткуда
                      style={{
                        transformOrigin: isUser ? 'bottom right' : 'bottom left',
                      }}
                    >
                      {!isUser &&
                        (showAvatar ? (
                          <CompanionAvatar expression={expression} />
                        ) : (
                          <AvatarSpacer />
                        ))}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl ${
                          isUser
                            ? 'chat-bubble-user ml-auto rounded-tr-sm px-3.5 py-2 text-sm leading-relaxed'
                            : `chat-bubble-cat px-3.5 py-2 font-hand text-lg leading-snug text-secondary-foreground ${
                                showAvatar ? 'rounded-tl-sm' : ''
                              }`
                        }`}
                      >
                        {isUser ? (
                          part.text
                        ) : (
                          <HandwrittenInk
                            text={part.text}
                            animate={bornNow}
                            onInk={() => {
                              if (nearBottomRef.current)
                                bottomRef.current?.scrollIntoView()
                            }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )
                }

                if (part.type === 'tool-savePlan' && part.state === 'output-available') {
                  const plan = part.input as {
                    task: string
                    firstStep: string
                    startTime?: string
                  }
                  return (
                    <div
                      key={i}
                      className="chat-bubble-cat ml-11 flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                        <CalendarCheck className="size-3.5" aria-hidden="true" />
                        план положен
                      </span>
                      <span className="text-sm font-semibold">{plan.task}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        Первый шаг: {plan.firstStep}
                        {plan.startTime ? ` · ${plan.startTime}` : ''}
                      </span>
                    </div>
                  )
                }

                if (part.type === 'tool-startFocus' && part.state === 'output-available') {
                  const { firstStep, minutes } = part.input as {
                    firstStep: string
                    minutes?: number
                  }
                  const d = minutes && [15, 25, 45].includes(minutes) ? minutes : 15
                  return (
                    // Единственный настоящий CTA в ленте — обязан отличаться
                    // от обычных пузырей: primary-кромка стекла (через
                    // --glass-border, каскад-безопасно) + полноразмерная
                    // кнопка 44px. Раньше карточка сливалась с репликами.
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 14, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 22,
                        delay: 0.15,
                      }}
                      className="glass start-card-breathe ml-11 flex w-full max-w-[85%] flex-col gap-2.5 rounded-2xl px-4 py-3.5"
                      style={
                        {
                          transformOrigin: 'bottom left',
                          '--glass-border':
                            'color-mix(in oklab, var(--primary) 45%, transparent)',
                        } as React.CSSProperties
                      }
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        готов к старту · {d} мин
                      </span>
                      <span className="text-base font-semibold leading-snug text-foreground">
                        {firstStep}
                      </span>
                      <SproutStartButton
                        onStart={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(firstStep)}&d=${d}`,
                          )
                        }
                        nextElementName={
                          startsCount !== null && startsCount < LANDMARK_COUNT
                            ? ISLAND_ELEMENT_NAMES[startsCount]
                            : null
                        }
                      />
                      {/* S3 · Прогноз награды (уникальная механика карточки
                          старта): не абстрактное «что-то вырастет», а
                          конкретное имя следующего элемента острова + живая
                          полоска прогресса. RPE: дофамин пикует в момент
                          предвкушения конкретной награды, размытое обещание
                          не создаёт предсказания вообще. Goal gradient:
                          у последнего элемента усилие субъективно дешевле —
                          «остался последний» проговаривается явно. */}
                      {startsCount !== null && (
                        <span className="flex flex-col gap-1.5 pt-0.5">
                          <span
                            className="flex items-center gap-1"
                            aria-hidden="true"
                          >
                            {Array.from({ length: LANDMARK_COUNT }).map(
                              (_, di) => (
                                <span
                                  key={di}
                                  className={`h-1 flex-1 rounded-full ${
                                    di < startsCount
                                      ? 'bg-primary/80'
                                      : di === startsCount
                                        ? 'animate-pulse bg-primary/45 motion-reduce:animate-none'
                                        : 'bg-white/10'
                                  }`}
                                />
                              ),
                            )}
                          </span>
                          <span className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                            <Sprout
                              className="mt-0.5 size-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            {startsCount < LANDMARK_COUNT ? (
                              <span>
                                вырастит «{ISLAND_ELEMENT_NAMES[startsCount]}»
                                {startsCount === LANDMARK_COUNT - 1 && (
                                  <span className="font-semibold text-primary">
                                    {' — остался последний'}
                                  </span>
                                )}
                              </span>
                            ) : (
                              'вырастит новую находку на острове'
                            )}
                          </span>
                        </span>
                      )}
                    </motion.div>
                  )
                }

                if (part.type === 'tool-rememberFact' && part.state === 'output-available') {
                  const { fact } = part.input as { fact: string }
                  return (
                    <span
                      key={i}
                      className="ml-10 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      <Sparkles className="size-3" aria-hidden="true" />
                      запомнил: {fact}
                    </span>
                  )
                }

                return null
              })}
              {bornAt && lastOfSeries && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`flex items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground/80 ${
                    message.role === 'user' ? 'mr-1' : 'ml-12'
                  }`}
                >
                  {bornAt}
                  {message.role === 'user' && (
                    <Check
                      className="size-3 text-primary"
                      aria-label="Доставлено"
                    />
                  )}
                </motion.span>
              )}
            </div>
            )
          })}

          <AnimatePresence>
            {showQuickReplies && (
              <motion.div
                key={`deck-${lastMsg?.id}`}
                className="ml-11 flex flex-col gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
              >
                <motion.span
                  className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  потяни колоду — печатать не нужно
                </motion.span>
                {/* Раунд 4 · «Карты-фотографии» (уникальная механика чата).
                    Red Team убил текст-на-стекле: «убрать одну вещь со стола»
                    — абстракция, которую надо ЧИТАТЬ, а чтение = когнитивная
                    нагрузка. Теперь каждая карта — СЦЕНА: объект шага (стол,
                    файл, письмо) + рука, которая его трогает. Шаг виден,
                    а не прочитан — мозг получает образ действия, а не
                    инструкцию. Карты стали квадратными (1:1) — больше
                    места для сцены, меньше для текста. */}
                <div
                  className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="group"
                  aria-label="Готовые шаги — выбери один"
                >
                  {dealtCards.map((step, ci) => {
                    const scene = stepScene(step)
                    return (
                      <motion.button
                        key={step}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(step)}&d=15`,
                          )
                        }
                        initial={{ opacity: 0, x: 40, rotate: 4 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          rotate: ci % 2 === 0 ? -1.2 : 1.2,
                        }}
                        whileTap={{ scale: 0.97, rotate: 0 }}
                        transition={{
                          delay: 0.55 + ci * 0.1,
                          type: 'spring',
                          stiffness: 300,
                          damping: 24,
                        }}
                        className="glass flex aspect-square w-[52%] shrink-0 snap-start flex-col justify-between gap-2 rounded-2xl p-3 text-left sm:w-[38%]"
                        style={
                          {
                            '--glass-border':
                              'color-mix(in oklab, var(--primary) 30%, transparent)',
                          } as React.CSSProperties
                        }
                      >
                        {/* Сцена шага: объект + рука. Объект крупный,
                            рука — маленькая, тянется снизу. Человек видит,
                            ЧТО делать, а не читает, что делать. */}
                        <span className="relative flex flex-1 items-center justify-center">
                          <span className="text-4xl" aria-hidden="true">
                            {scene.icon}
                          </span>
                          <motion.span
                            className="absolute -bottom-1 -right-1 text-2xl"
                            aria-hidden="true"
                            initial={{ opacity: 0, y: 8, rotate: -20 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{
                              delay: 0.7 + ci * 0.1,
                              type: 'spring',
                              stiffness: 400,
                              damping: 20,
                            }}
                          >
                            👆
                          </motion.span>
                        </span>
                        <span className="flex flex-col gap-1">
                          <span className="font-hand text-base leading-tight text-secondary-foreground">
                            {step}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                            <Play className="size-3" aria-hidden="true" />
                            15 мин
                          </span>
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {status === 'submitted' && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              style={{ transformOrigin: 'bottom left' }}
            >
              <CompanionAvatar />
              {/* Точки живут в настоящем пузыре — «он уже пишет ответ»,
                  а не три сироты в пустоте */}
              <span
                className="chat-bubble-cat flex items-center gap-1 rounded-2xl rounded-tl-sm px-3.5 py-3"
                aria-label="Напарник печатает"
              >
                <span
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                  style={{ animationDelay: '-0.3s' }}
                />
                <span
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                  style={{ animationDelay: '-0.15s' }}
                />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none" />
              </span>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-16 z-10">
        {/* FAB «вниз к свежему»: появляется, только когда человек ускроллил
            вверх — явный путь назад вместо жеста вслепую */}
        <AnimatePresence>
          {showJump && (
            <motion.button
              type="button"
              aria-label="К последнему сообщению"
              initial={{ opacity: 0, y: 8, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              onClick={() =>
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
              className="glass press absolute -top-12 right-4 flex size-9 items-center justify-center rounded-full text-foreground"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          // Жёсткая линия border-t заменена растворением: лента тает в док
          // градиентом (закон непрерывности — сцена не «обрывается» на
          // границе панели, свет и фо�� едины, как у очага)
          className="relative bg-background/92 px-4 py-3 backdrop-blur-md before:pointer-events-none before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-background/80 before:to-transparent"
        >
          <div className="mx-auto flex max-w-md items-end gap-2">
            {/* textarea вместо input: длинная мысль не прячется за одной
                строкой (стандарт Telegram/iMessage). Растёт до ~4 строк
                через field-sizing / авто-высоту; Enter — отправить,
                Shift+Enter — новая ст��ока */}
            <textarea
              ref={(el) => {
                // Схлопываем высоту после отправки (submit чистит input в
                // обход onChange — без этого поле остаётся растянутым)
                if (el && input === '') el.style.height = 'auto'
              }}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value)
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 108)}px`
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  e.currentTarget.style.height = 'auto'
                  submit()
                }
              }}
              placeholder={placeholder ?? 'Напиши напарнику…'}
              aria-label="Сообщение напарнику"
              // text-base (16px) обязателен: при font-size < 16px iOS Safari
              // принудительно зумит страницу на фокусе — главный «дешёвый»
              // тик мобильных сайтов. .chat-input-dock — тёплое свечение
              // кромки на фокусе: «напарник заметил, что ты пишешь»
              className="glass chat-input-dock max-h-27 min-h-11 min-w-0 flex-1 resize-none rounded-xl px-4 py-2.5 text-base leading-relaxed transition-shadow duration-300"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSend || !input.trim()}
              aria-label="Отправить"
              className="press size-11 shrink-0 rounded-xl transition-opacity duration-200"
            >
              {/* Стрелка «выстреливает» вверх при каждой отправке — жест
                  подтверждён телом, сообщение реально улетело */}
              <motion.span
                key={sendCount}
                initial={
                  sendCount > 0 ? { y: 14, opacity: 0 } : false
                }
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="flex"
              >
                <ArrowUp className="size-5" />
              </motion.span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
