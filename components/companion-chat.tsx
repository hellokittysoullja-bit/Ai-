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
  saveChatMessages,
  savePlan,
  type MemoryContext,
} from '@/lib/memory'
import { scriptedReply } from '@/lib/scripted-companion'

type CompanionChatProps = {
  mode: 'companion' | 'focus'
  greeting: string
  placeholder?: string
  /** Контент, который скроллится ВМЕСТЕ с лентой над сообщениями
      (карточки Дома). Один скролл-контейнер = композер всегда виден
      над доком — лечит «поле ввода срезано доком» на Доме */
  header?: React.ReactNode
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
  return (
    <div className="flex size-9 shrink-0 items-center justify-center">
      <MascotSvg expression={expression} size={34} />
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

function HandwrittenInk({ text }: { text: string; animate?: boolean; onInk?: () => void }) {
  return <span>{text}</span>
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
  header,
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
    // На Доме карточки (CTA, цель) — шапка той же ленты: восстановленная
    // история НЕ должна проматывать их при загрузке (CTA обязан быть
    // первым, что видит человек). Скроллим только к живым сообщениям
    // этой сессии; в режиме фокуса поведение прежнее.
    if (mode === 'companion') {
      const hasLive = messages.some(
        (m) => !(bornBeforeRef.current?.has(m.id) ?? false),
      )
      if (!hasLive) return
    }
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* justify-end на мобильн��м: сообщения примыкают к полю ввода, короткий
          чат (1-2 реплики) выглядит обжитым, а не оборванным. На десктопе
          (md:justify-start) высота вьюпорта велика — при justify-end единственная
          реплика улетала к низу, а между ней и приветствием-шапкой зияла
          пропасть, читавшаяся как «не прогрузилось». Сверху вниз реплики
          примыкают к шапке, а свободное место уходит вниз к полю ввода — это
          нор��альный «пустой чат в ожидании», а не раз��ыв. Overflow и autoscroll
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
        {/* Карточки Дома — шапка ленты: один скролл на всё, композер
            никогда не ныряет под док (архитектура Telegram: контент
            и сообщения в одном контейнере, инпут — вне его) */}
        {header}
        {/* mt-auto: лента растёт от дока ввода вверх (паттерн Telegram) —
            короткий чат обжит и примыкает к рукам, а не висит наве����ху,
            оставляя мёртвую чёрную дыру между собой и инпутом */}
        {/* pb-10: нижний зазор под градиент растворения дока — прежний
            py-4 позволял чипам заезжать под градиент и полусрезаться */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pb-6 pt-4">
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
            <div className="chat-bubble-cat max-w-[82%] rounded-2xl rounded-tl-md px-3.5 py-2 font-hand text-[17px] leading-snug">
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
                    className="action-chip press inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm text-foreground hover:border-white/20"
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
            // Метка времени — ТОЛЬКО у самого свежего сообщения ленты
            // (паттерн iMessage «Delivered»): подтверждение живёт на
            // фронте разговора и уступает место следующему. Петля
            // «отправил → дошло» закрыта (v7), лента остаётся чистой
            // от постоянных метаданных (v1/v2) — оба плюса без цены
            const lastOfSeries = mi === messages.length - 1
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
                        className={`max-w-[82%] whitespace-pre-wrap rounded-2xl ${
                          isUser
                            ? 'chat-bubble-user ml-auto rounded-tr-md px-3.5 py-2 text-sm leading-relaxed'
                            : `chat-bubble-cat px-3.5 py-2 font-hand text-[17px] leading-snug text-secondary-foreground ${
                                showAvatar ? 'rounded-tl-md' : ''
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
                      className="surface-card ml-11 flex w-full max-w-[82%] flex-col gap-2.5 rounded-2xl border-l-2 border-l-primary px-4 py-3.5"
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
                        className="home-primary-action press h-12 w-full gap-2 text-base font-semibold"
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
              className="surface-card press absolute -top-14 right-4 flex size-11 items-center justify-center rounded-full text-foreground"
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
          {/* ЕДИНАЯ капсула (паттерн iMessage/Telegram): поле и кнопка
              отправки — один материал, а не поле + оторванный круг,
              читавшийся как «скролл наверх». Свечение фокуса — на капсуле
              через :focus-within */}
          <div className="chat-input-dock mx-auto flex min-h-13 max-w-md items-end gap-2 rounded-2xl p-1 pl-4 transition-colors duration-150">
            {/* textarea вместо input: длинная мысль не прячется за одной
                строкой (стандарт Telegram/iMessage). Растёт до ~4 строк
                через авто-высоту; Enter — отправить, Shift+Enter — новая
                строка */}
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
              // тик мобильных сайтов
              className="max-h-27 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!canSend || !input.trim()}
              aria-label="Отправить"
              className={`press size-11 shrink-0 rounded-xl border-0 shadow-none transition-colors duration-150 ${
                input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
