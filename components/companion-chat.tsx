'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg } from '@/components/mascot-svg'
import { ArrowDown, ArrowRight, ArrowUp, CalendarCheck, Play, Sparkles } from 'lucide-react'
import { hapticStart } from '@/lib/haptics'
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

function CompanionAvatar({ reacting = false }: { reacting?: boolean }) {
  // Кружок-подложка: тёмный кот на тёмном фоне читался пятнышком.
  // Тёплое кольцо — тот же очаг, что горит на лендинге и на «Доме»:
  // отделяет существо от фона и держит один световой язык во всём
  // продукте. Реакция на новую реплику — контингентный социальный
  // отклик: существо отзывается на СОБЫТИЕ, а не мигает по таймеру.
  return (
    <div
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-secondary/80"
      style={{
        boxShadow: reacting
          ? '0 0 0 2px oklch(0.72 0.17 55 / 0.35), 0 0 14px -2px oklch(0.72 0.17 55 / 0.5)'
          : '0 0 0 1px oklch(0.72 0.17 55 / 0.12)',
        transition: 'box-shadow 260ms ease-out',
      }}
    >
      <MascotSvg expression={reacting ? 'happy' : 'calm'} size={30} />
    </div>
  )
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
  const scrollRef = useRef<HTMLDivElement>(null)

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

  // U4: скроллим по факту нового сообщения, а не на каждый чанк стрима —
  // scrollIntoView на каждом токене дёргал ленту.
  //
  // Скроллим сам контейнер, а не через scrollIntoView на маркере: при
  // восстановлении переписки из памяти лента открывалась на scrollTop 0 —
  // человек видел САМОЕ СТАРОЕ сообщение, а свежее было срезано нижней
  // кромкой. Обещание «он тебя помнит» встречало старым контекстом.
  // Первый скролл — мгновенный (это не анимация, это стартовая позиция),
  // последующие — плавные. rAF: к моменту эффекта шрифты могли ещё не
  // примениться, и высота ленты была занижена.
  const didInitialScrollRef = useRef(false)
  useEffect(() => {
    if (messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    const instant = !didInitialScrollRef.current
    didInitialScrollRef.current = true
    const run = () =>
      el.scrollTo({ top: el.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
    run()
    if (!instant) return
    // Первый заход требует нескольких точек синхронизации: на момент
    // коммита рукописный Caveat ещё не применён, лента ниже вьюпорта не
    // переполнена, и scrollTo молча схлопывается в ноль. Повторяем после
    // кадра, после готовности шрифтов и с запасом по таймеру.
    requestAnimationFrame(run)
    let cancelled = false
    const guarded = () => {
      if (!cancelled) run()
    }
    document.fonts?.ready.then(guarded).catch(() => {})
    const t = window.setTimeout(guarded, 300)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, status])

  // Контингентный отклик существа: реагирует на ПРИХОД новой реплики, а не
  // на каждый рендер. Восстановленную из памяти историю не отыгрываем —
  // иначе кот «радуется» вчерашнему сообщению при каждом открытии.
  const [reactingId, setReactingId] = useState<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)
  const seenHistoryRef = useRef(false)
  useEffect(() => {
    let lastAssistant: (typeof messages)[number] | undefined
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistant = messages[i]
        break
      }
    }
    if (!lastAssistant) return
    if (!seenHistoryRef.current) {
      seenHistoryRef.current = true
      lastAssistantIdRef.current = lastAssistant.id
      return
    }
    if (lastAssistant.id === lastAssistantIdRef.current) return
    lastAssistantIdRef.current = lastAssistant.id
    setReactingId(lastAssistant.id)
    const t = window.setTimeout(() => setReactingId(null), 1600)
    return () => window.clearTimeout(t)
  }, [messages])

  // Ушёл вверх по переписке — показываем возврат вниз. Стандартная
  // аффорданса чата, без неё длинная история становится ловушкой.
  const [atBottom, setAtBottom] = useState(true)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () =>
      setAtBottom(el.scrollHeight - el.clientHeight - el.scrollTop < 24)
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [messages.length])

  // После скриптового ответа статус может быть 'error' — чат должен жить дальше
  const canSend = status === 'ready' || status === 'error'

  function submit() {
    if (!input.trim() || !canSend) return
    // Подтверждение телом в момент отправки: действие получает отклик
    // раньше, чем придёт ответ по сети.
    hapticStart()
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* justify-end на мобильном: сообщения примыкают к полю ввода, короткий
          чат (1-2 реплики) выглядит обжитым, а не оборванным. На десктопе
          (md:justify-start) высота вьюпорта велика — при justify-end единственная
          реплика улетала к низу, а между ней и приветствием-шапкой зияла
          пропасть, читавшаяся как «не прогрузилось». Сверху вниз реплики
          примыкают к шапке, а свободное место уходит вниз к полю ввода — это
          нормальный «пустой чат в ожидании», а не разрыв. Overflow и autoscroll
          на bottomRef не затронуты. */}
      {/* U3: сообщения растут сверху, инпут прижат к таб-бару (sticky) —
          прежний justify-end на мобиле прижимал одинокий гритинг к низу и
          оставлял мёртвую дыру посреди экрана */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <CompanionAvatar />
            {/* Тот же материал, что у реплик ниже (.glass): приветствие и
                сообщения произносит один и тот же персонаж, а выглядели они
                как два разных источника — сплошная заливка против стекла. */}
            <div className="glass max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground">
              {greeting}
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
                  // Stagger 45мс — в стандартном диапазоне 20–80мс и только
                  // при первом появлении списка: ряд «собирается», а не
                  // выпрыгивает плитой. Дальше чипы исчезают навсегда, так
                  // что повторной ценой это не станет.
                  <motion.button
                    key={chip}
                    type="button"
                    onClick={() => {
                      hapticStart()
                      sendMessage({ text: chip })
                    }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.4 + ci * 0.045,
                      type: 'spring',
                      stiffness: 300,
                      damping: 24,
                    }}
                    className="glass glass-interactive press rounded-full px-3.5 py-2 text-sm text-foreground hover:text-primary"
                  >
                    {chip}
                  </motion.button>
                ))}
              </div>
              {/* min-h-11: цель была 143×17px — ниже минимума 24px по
                  WCAG 2.5.8, при том что это единственный быстрый выход
                  из чата прямо к сессии */}
              <Link
                href="/app/session"
                className="mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-80"
              >
                или сразу к делу
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          )}

          {messages.map((message, mi) => {
            // Группировка подряд идущих реплик одного говорящего — то, что
            // отличает переписку от списка блоков. Хвостик у пузыря здесь
            // сверху (rounded-tl-sm/tr-sm), поэтому «голова» группы — ПЕРВОЕ
            // сообщение: только оно получает хвост и аватар, остальные
            // прижимаются к нему и идут с ровными углами.
            const prev = messages[mi - 1]
            const isFirstOfGroup = !prev || prev.role !== message.role
            const isUser = message.role === 'user'
            return (
            <div
              key={message.id}
              className={`flex flex-col gap-2 ${isFirstOfGroup ? '' : '-mt-2'} ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <motion.div
                      key={i}
                      className="flex w-full items-start gap-2"
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    >
                      {!isUser &&
                        (isFirstOfGroup ? (
                          <CompanionAvatar reacting={reactingId === message.id} />
                        ) : (
                          // Место аватара держим всегда: без распорки вторая
                          // реплика группы уезжала под аватар и колонка «плыла»
                          <div className="size-9 shrink-0" aria-hidden="true" />
                        ))}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl ${
                          isUser
                            ? `ml-auto bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground ${isFirstOfGroup ? 'rounded-tr-sm' : ''}`
                            : `glass px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground ${isFirstOfGroup ? 'rounded-tl-sm' : ''}`
                        }`}
                      >
                        {part.text}
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
                      className="glass ml-10 flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                        <CalendarCheck className="size-3.5" aria-hidden="true" />
                        план положен
                      </span>
                      <span className="text-sm font-semibold">{plan.task}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        Первый шаг: {plan.firstStep}
                        {plan.startTime ? ` — ${plan.startTime}` : ''}
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
                    <div
                      key={i}
                      className="glass ml-10 flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        готов к старту · {d} мин
                      </span>
                      <span className="text-sm font-semibold">{firstStep}</span>
                      <Button
                        size="sm"
                        className="gap-1.5 font-semibold"
                        onClick={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(firstStep)}&d=${d}`,
                          )
                        }
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        Начинаю
                      </Button>
                    </div>
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
            <div className="flex items-center gap-2">
              <CompanionAvatar />
              <span
                className="flex items-center gap-1 px-1 py-2.5"
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
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Возврат к свежему: появляется только когда лента реально уведена
          вверх. Выход быстрее входа (140 против 200мс) — появление можно
          рассматривать, исчезновение только ждать. */}
      <AnimatePresence>
        {!atBottom && messages.length > 0 && (
          <motion.button
            type="button"
            onClick={() => {
              const el = scrollRef.current
              el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
            }}
            aria-label="К свежим сообщениям"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            // Справа и НЕпрозрачная: кнопка плавает над лентой, а стекло
            // пропускало текст сообщения насквозь и читалось как дефект.
            // Край вместо центра — тот же выбор, что в мессенджерах: не
            // закрывает середину реплики, куда смотрят при чтении.
            className="press pointer-events-auto absolute bottom-20 right-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/12 bg-secondary shadow-[0_6px_18px_-6px_oklch(0_0_0/0.7)]"
          >
            <ArrowDown className="size-4 text-foreground" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="sticky bottom-16 z-10 border-t border-border bg-background/92 px-4 py-3 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder ?? 'Напиши напарнику…'}
            aria-label="Сообщение напарнику"
            className="glass h-11 flex-1 rounded-xl px-4 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend || !input.trim()}
            aria-label="Отправить"
            className="size-11 rounded-xl"
          >
            <ArrowUp className="size-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
