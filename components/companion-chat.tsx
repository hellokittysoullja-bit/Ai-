'use client'

import { useEffect, useRef, useState } from 'react'
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
  Play,
  Sparkles,
  Sprout,
} from 'lucide-react'
import Link from 'next/link'
import {
  addNote,
  buildMemoryContext,
  getChatMessages,
  saveChatMessages,
  savePlan,
  type MemoryContext,
} from '@/lib/memory'
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
    // напарник отвечает скриптовым мозгом из своей памяти. Никогда не молчит.
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

  function submit() {
    if (!input.trim() || !canSend) return
    sendMessage({ text: input })
    setInput('')
    setSendCount((n) => n + 1)
  }

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
            короткий чат обжит и примыкает к рукам, а не висит наверху,
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
                        {plan.startTime ? ` ��� ${plan.startTime}` : ''}
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
                      <Button
                        className="press h-12 w-full gap-2 text-base font-semibold"
                        onClick={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(firstStep)}&d=${d}`,
                          )
                        }
                      >
                        <Play className="size-4" aria-hidden="true" />
                        Начинаю
                      </Button>
                      {/* Мостик к петле прогрессии: старт — не абстрактная
                          «продуктивность», а конкретный рост твоего острова */}
                      <span className="flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
                        <Sprout
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        этот старт вырастит что-то на острове
                      </span>
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
            </div>
            )
          })}

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
          // границе панели, свет и фон едины, как у очага)
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
