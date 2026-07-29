'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
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
import { hapticStart } from '@/lib/haptics'
import Link from 'next/link'
import {
  addNote,
  buildMemoryContext,
  getChatMessages,
  getChatTimestamps,
  saveChatMessages,
  saveChatTimestamps,
  savePlan,
  todayKey,
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
  reacting = false,
  expression = 'calm',
}: {
  reacting?: boolean
  expression?: MascotExpression
}) {
  // Кружок-подложка: тёмный кот на тёмном фоне читался пятнышком.
  // Тёплое кольцо — тот же очаг, что горит на лендинге и на «Доме»:
  // отделяет существо от фона и держит один световой язык во всём
  // продукте. Реакция на новую реплику — контингентный социальный
  // отклик: существо отзывается на СОБЫТИЕ, а не мигает по таймеру.
  // Два независимых сигнала: reacting — «это только что пришло» (кольцо),
  // expression — «что вообще сказано» (мимика, читается из текста реплики
  // в inferExpression). Радость от новизны и тон сообщения не всегда
  // совпадают: кот может искренне обрадоваться (кольцо), сказав при этом
  // что-то сфокусированное — оба сигнала живут не подменяя друг друга.
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
      <MascotSvg expression={reacting ? 'happy' : expression} size={30} />
    </div>
  )
}

/** Мимика существа считается из содержимого его же реплики — ноль
    дополнительного состояния, тот же приём, что у героя лендинга.
    Карточка «Начинаю» — само предвкушение старта, excited оправдан сюжетно
    сильнее, чем нейтральный calm. */
function inferExpression(text: string, hasStartCard: boolean): MascotExpression {
  if (hasStartCard) return 'excited'
  if (/(!|отлично|получилось|горжусь|ура|красота|засчитан)/i.test(text)) return 'happy'
  if (/\?\s*$/.test(text)) return 'focused'
  return 'calm'
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Ярлык дня для разделителя переписки: «Сегодня» / «Вчера» / дата */
function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const key = todayKey(d)
  if (key === todayKey()) return 'Сегодня'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === todayKey(yesterday)) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
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
  const reduceMotion = useReducedMotion()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Счётчик отправок — ключ для "запуска" стрелки: старая улетает вверх,
  // новая приходит снизу. Реальный отклик на КЛЮЧЕВОЕ редкое действие
  // (не команда с клавиатуры сотни раз в день — Эмиль здесь не запрещает).
  const [sendCount, setSendCount] = useState(0)

  // Растущее поле ввода вместо однострочного input: длинная мысль не
  // обрезается и не скроллится внутри крошечной строки — само поле
  // раскрывается вверх, как в любом настоящем мессенджере.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

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
  // Момент первого появления каждой реплики — в state (не в ref), иначе
  // свежий таймстемп новой реплики никогда не попадёт на экран: ref не
  // вызывает перерендер сам по себе.
  const [times, setTimes] = useState<Record<string, string>>({})
  useEffect(() => {
    if (chatRestoredRef.current) return
    chatRestoredRef.current = true
    Promise.all([
      getChatMessages<(typeof messages)[number]>(),
      getChatTimestamps(),
    ]).then(([saved, loadedTimes]) => {
      setTimes(loadedTimes)
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
    // Метка времени — на момент ПЕРВОГО появления реплики, а не на момент
    // сохранения: иначе восстановленная история переписывала бы себе
    // время каждым визитом.
    setTimes((prev) => {
      let changed = false
      const next = { ...prev }
      for (const m of messages) {
        if (!next[m.id]) {
          next[m.id] = new Date().toISOString()
          changed = true
        }
      }
      if (changed) saveChatTimestamps(next)
      return changed ? next : prev
    })
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
    setSendCount((c) => c + 1)
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
      {/* Локальный очаг переписки: эхо AppBackdrop гаснет к тому месту, где
          реально идёт разговор — здесь он читается собственным тёплым
          пятном. Статично (Operate-поверхность, без анимации), в DOM ДО
          скролл-контейнера — оба слоя static/auto, порядок в разметке сам
          кладёт пятно позади содержимого без единого z-index. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/4 rounded-full opacity-80 blur-3xl sm:h-80 sm:w-80"
        style={{
          background:
            'radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.2) 0%, transparent 70%)',
        }}
      />
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <CompanionAvatar />
            {/* Тот же материал, что у реплик ниже (.chat-bubble-cat):
                приветствие и сообщения произносит один и тот же персонаж —
                и один и тот же материал, с гарантированным контрастом
                текста независимо от участка сцены под пузырём. */}
            <div className="chat-bubble-cat max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground">
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
                    className="glass glass-interactive press rounded-full px-3.5 py-2 text-sm text-foreground shadow-[0_4px_14px_-8px_oklch(0_0_0/0.45)] hover:text-primary"
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
            const next = messages[mi + 1]
            const isFirstOfGroup = !prev || prev.role !== message.role
            const isLastOfGroup = !next || next.role !== message.role
            const isUser = message.role === 'user'

            // Мимика существа — из содержимого ЕГО ЖЕ реплики, ноль
            // дополнительного состояния (тот же приём, что у героя
            // лендинга). Карточка «Начинаю» — само предвкушение старта.
            const fullText = message.parts
              .filter((p) => p.type === 'text')
              .map((p) => (p.type === 'text' ? p.text : ''))
              .join(' ')
            const hasStartCard = message.parts.some((p) => p.type === 'tool-startFocus')
            const expression: MascotExpression = isUser
              ? 'calm'
              : inferExpression(fullText, hasStartCard)

            // Разделитель дня: только когда дата реально СМЕНИЛАСЬ между
            // соседними репликами — на свежем чате без истории делитель
            // не нужен, «Сегодня» перед первой же репликой — просто шум.
            const thisTime = times[message.id]
            const prevTime = prev ? times[prev.id] : undefined
            const showDayDivider =
              !!thisTime &&
              !!prevTime &&
              todayKey(new Date(thisTime)) !== todayKey(new Date(prevTime))

            return (
            <div key={message.id} className="flex flex-col gap-2">
              {showDayDivider && (
                <div className="my-1 flex items-center justify-center">
                  <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {formatDayLabel(thisTime)}
                  </span>
                </div>
              )}
              <div
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
                          <CompanionAvatar
                            reacting={reactingId === message.id}
                            expression={expression}
                          />
                        ) : (
                          // Место аватара держим всегда: без распорки вторая
                          // реплика группы уезжала под аватар и колонка «плыла»
                          <div className="size-9 shrink-0" aria-hidden="true" />
                        ))}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl ${
                          isUser
                            ? `chat-bubble-user ml-auto px-3 py-2 text-sm leading-relaxed ${isFirstOfGroup ? 'rounded-tr-sm' : ''}`
                            : `chat-bubble-cat px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground ${isFirstOfGroup ? 'rounded-tl-sm' : ''}`
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
                      className="chat-bubble-cat ml-10 flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3"
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
                      className="glass start-card-breathe ml-10 flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3"
                      style={{ '--glass-border': 'color-mix(in oklab, var(--primary) 45%, transparent)' } as CSSProperties}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        готов к старту · {d} мин
                      </span>
                      <span className="text-sm font-semibold">{firstStep}</span>
                      <Button
                        size="sm"
                        className="cta-sheen gap-1.5 font-semibold"
                        onClick={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(firstStep)}&d=${d}`,
                          )
                        }
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        Начинаю
                      </Button>
                      {/* Связка «нажал → выросло» видна и внутри самого
                          диалога, не только в карточке вехи наверху экрана —
                          та же механика упомянута там, где реально жмут. */}
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Sprout className="size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                        этот старт вырастит что-то на острове
                      </span>
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
              {/* Таймстемп — раз на группу (у последней реплики), а не на
                  каждую: как в реальных мессенджерах, не как лог событий.
                  Галочка — только у своих и только когда реплика ушла
                  (не во время стриминга: секунду назад это было бы ложью). */}
              {isLastOfGroup && thisTime && (
                <span
                  className={`flex items-center gap-1 px-1 font-mono text-[10px] text-muted-foreground/70 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {formatClock(thisTime)}
                  {isUser && status !== 'streaming' && status !== 'submitted' && (
                    <Check className="size-3" aria-hidden="true" />
                  )}
                </span>
              )}
              </div>
            </div>
            )
          })}

          {status === 'submitted' && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <CompanionAvatar />
              {/* Тот же .glass + тень, что у реплик: пузырь-ожидание — это
                  форма реплики В ПРОЦЕССЕ, а не отдельный виджет рядом с ней. */}
              <span
                className="glass flex items-center gap-1 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-[0_4px_16px_-8px_oklch(0_0_0/0.5)]"
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
            className="press pointer-events-auto absolute bottom-28 right-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/12 bg-secondary shadow-[0_6px_18px_-6px_oklch(0_0_0/0.7)]"
          >
            <ArrowDown className="size-4 text-foreground" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Плавающая "капсула" вместо сплошной панели во весь экран: градиент
          растворяет уходящие вверх реплики в фон ДО композера — та же
          маска-затухание, что у премиальных чатов (Linear, iMessage), а
          не жёсткий обрез бордером. items-end: поле растёт вверх, кнопка
          остаётся прижатой к низу строки, как у любого настоящего мессенджера. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="sticky bottom-16 z-10 bg-gradient-to-t from-background via-background/85 to-transparent px-4 pt-6 pb-3"
      >
        {/* Мягкое гало вместо жёсткого кольца: тот же токен primary, но как
            рассеянный свет (тонкий контур + вынесенное свечение), а не
            сплошная неоновая обводка — так фокус читается премиально, а
            не как игровой хайлайт. */}
        <div className="glass mx-auto flex max-w-md items-end gap-2 rounded-2xl px-3 py-2 shadow-[0_10px_30px_-12px_oklch(0_0_0/0.55)] transition-shadow duration-200 focus-within:shadow-[0_0_0_1.5px_oklch(0.86_0.22_130/0.4),0_0_22px_-4px_oklch(0.86_0.22_130/0.4),0_10px_30px_-12px_oklch(0_0_0/0.55)]">
          <textarea
            ref={textareaRef}
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
            rows={1}
            placeholder={placeholder ?? 'Напиши напарнику…'}
            aria-label="Сообщение напарнику"
            className="max-h-[7.5rem] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend || !input.trim()}
            aria-label="Отправить"
            className="size-10 shrink-0 rounded-xl"
          >
            {/* Разметка НЕ ветвится по reduceMotion. Раньше здесь стояло
                {reduceMotion ? <ArrowUp/> : <AnimatePresence>…}, и это давало
                разное дерево на сервере (useReducedMotion → null) и на клиенте
                при гидратации (→ true) — React #418, воспроизводилось только
                в режиме «уменьшить движение». Структура теперь одна и та же,
                варьируется лишь длительность: при reduced-motion стрелка
                меняется мгновенно, без полёта. */}
            <span className="relative flex size-5 items-center justify-center overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={sendCount}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <ArrowUp className="size-5" />
                </motion.span>
              </AnimatePresence>
            </span>
          </Button>
        </div>
      </form>
    </div>
  )
}
