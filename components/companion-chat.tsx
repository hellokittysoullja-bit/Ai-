'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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
  Mic,
  Play,
  Sparkles,
  Sprout,
  Square,
  X,
} from 'lucide-react'
import { useDictation } from '@/hooks/use-dictation'
import { PullToStretch } from '@/components/pull-to-stretch'
import { hapticStart } from '@/lib/haptics'
import { playMessageTick } from '@/lib/reward-sound'
import { ChatBubble, type Reaction } from '@/components/chat-bubble'
import { SPRING_ITEM, SPRING_REVEAL, SPRING_SNAPPY, stagger } from '@/lib/motion'
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
  /** Закреплённый контекст в начале ленты (карточки «Дома»): рендерится
      ВНУТРИ скролл-контейнера над приветствием, так что весь экран —
      единый скролл, а не две конкурирующие зоны. Когда header задан, лента
      открывается СВЕРХУ (человек видит контекст и приветствие), а не
      проматывается к последней реплике. */
  header?: ReactNode
  /** #23 · Обновление данных по pull-to-refresh. Передаётся только там, где
      наверху ленты реально есть что обновлять (карточки «Дома») — в чистом
      чате жест был бы пустым обещанием. */
  onPullRefresh?: () => Promise<void> | void
}

/** Цвет ореола аватара по мимике — тот же тёплый/холодный язык, что уже
    разводит очаг (тепло) и луну (холод) в остальной сцене, здесь применён
    к самому часто повторяющемуся объекту экрана вместо одного плоского
    тона на все случаи. reacting перекрывает мимику: «это только что
    пришло» — событие само по себе, ярче любого устойчивого настроения. */
function avatarGlowColor(expression: MascotExpression, reacting: boolean): string {
  if (reacting) return 'oklch(0.72 0.17 55 / 0.55)'
  switch (expression) {
    case 'happy':
    case 'excited':
      return 'oklch(0.72 0.17 55 / 0.4)'
    case 'focused':
      return 'oklch(0.86 0.22 130 / 0.32)'
    case 'sleepy':
      return 'oklch(0.62 0.05 250 / 0.28)'
    default:
      return 'oklch(0.72 0.17 55 / 0.22)'
  }
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
  // Кольцо — теперь многослойное (.avatar-ring в globals.css) и на приход
  // реплики не просто светлеет, а коротко пульсирует (.avatar-ring-active,
  // 2 вдоха и стоп) — тот же переход от «плоского индикатора» к «телесному
  // отклику», что уже применён к CTA (cta-sheen) и карточке старта
  // (start-card-breathe).
  return (
    <div
      className={`avatar-ring relative flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-secondary/80 ${
        reacting ? 'avatar-ring-active' : ''
      }`}
      style={{ ['--avatar-glow' as string]: avatarGlowColor(expression, reacting) }}
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

/**
 * #16 · Контекстные быстрые ответы вместо трёх фиксированных.
 *
 * Три вечных чипа («Не могу начать», «Раздроби задачу», «Тяжело сегодня») не
 * попадают в момент: утром с готовым планом человеку нужно не «раздроби», а
 * «поехали»; после недельной паузы — не «тяжело», а способ вернуться без
 * объяснений. По Hick's Law промах по варианту стоит не лишнего чтения, а
 * остановки: для СДВГ-аудитории это выход из приложения.
 *
 * Всегда ровно три (Хик), и первый — самый вероятный в этот момент.
 */
function buildSuggestions(memory: MemoryContext | null, hour: number): string[] {
  const chips: string[] = []
  const plan = memory?.plan ?? null
  const daysAway = memory?.patterns?.daysAway ?? null
  const totalStarts = memory?.patterns?.totalStarts ?? 0

  // Вернулся после паузы — это главный контекст, важнее времени суток.
  // Возврат без объяснений и без стыда: ровно то, чего проект не делает.
  if (daysAway !== null && daysAway >= 3) {
    chips.push('Меня не было — начнём заново')
  }

  // Есть незакрытый план: первый шаг уже сформулирован, нужен только толчок.
  if (plan?.firstStep) {
    chips.push(`Поехали: ${truncateChip(plan.firstStep)}`)
  } else if (hour >= 20 || hour < 4) {
    // Вечер — время положить план на утро, а не начинать спринт.
    chips.push('Положим план на утро')
  } else {
    chips.push('Не могу заставить себя начать')
  }

  if (!plan) chips.push('Раздроби мне задачу')
  if (hour >= 20 || hour < 4) chips.push('Не могу остановиться и лечь')
  else chips.push('Просто тяжело сегодня')

  // Новичку нужен самый маленький возможный вход.
  if (totalStarts === 0) chips.push('С чего вообще начать')

  return Array.from(new Set(chips)).slice(0, 3)
}

/** Ведущая иконка чипа — по смыслу текста, не декоративно одинаковая для
    всех трёх: продолжение уже начатого (Zeigarnik) читается стрелкой
    вперёд, план — календарём, всё остальное — искрой первого касания.
    Первое прикосновение к чату — момент Peak-End самого начала разговора,
    трём одинаковым текстовым пилюлям здесь не хватало ни одной причины
    для глаза различить их быстрее, чем прочитать целиком. */
function chipIcon(chip: string): typeof ArrowRight {
  if (/^(поехали|следующий)/i.test(chip)) return ArrowRight
  if (/план/i.test(chip)) return CalendarCheck
  return Sparkles
}

/** Чип должен читаться одним взглядом — длинный первый шаг режем по слову. */
function truncateChip(s: string): string {
  const t = s.trim()
  if (t.length <= 22) return t
  const cut = t.slice(0, 22)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > 10 ? cut.slice(0, sp) : cut).trim()}…`
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
  header,
  onPullRefresh,
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

  // Долгое нажатие (копирование + реакции) переехало в ChatBubble вместе с
  // остальными жестами реплики — держать таймер здесь, а меню там, значило
  // бы разрывать один жест между двумя файлами.

  // Растущее поле ввода вместо однострочного input: длинная мысль не
  // обрезается и не скроллится внутри крошечной строки — само поле
  // раскрывается вверх, как в любом настоящем мессенджере.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  // Контекст держим И в ref (тело запроса читает его без рендера), И в
  // state: от него зависят быстрые ответы (#16), а ref перерисовку не
  // вызывает. clientHour тоже в state — на сервере часа клиента нет, и
  // расчёт чипов прямо в рендере дал бы расхождение гидратации.
  const [memoryCtx, setMemoryCtx] = useState<MemoryContext | null>(null)
  const [clientHour, setClientHour] = useState<number | null>(null)

  useEffect(() => {
    setClientHour(new Date().getHours())
    buildMemoryContext().then((m) => {
      memoryRef.current = m
      setMemoryCtx(m)
    })
  }, [])

  const suggestionChips = useMemo(
    () =>
      clientHour === null
        ? // До монтирования — нейтральный набор, совпадающий с серверной
          // разметкой: подсказки не должны прыгать на первом кадре.
          ['Не могу заставить себя начать', 'Раздроби мне задачу', 'Просто тяжело сегодня']
        : buildSuggestions(memoryCtx, clientHour),
    [memoryCtx, clientHour],
  )

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
          const fresh = await buildMemoryContext()
          memoryRef.current = fresh
          // Чипы читают память из state — без этого «Поехали: <первый шаг>»
          // не появится до перезагрузки, хотя план уже сохранён.
          setMemoryCtx(fresh)
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
  // #30 · Свежесть реплики: id, восстановленные из памяти при открытии
  // чата, попадают сюда ДО первого рендера ленты — всё, чего здесь нет,
  // родилось только что. Один источник правды для трёх новых откликов
  // разом (пружина-«пружинка» на баблах, галочка «доставлено», позже —
  // не более того): открытие чата с историей в 20 реплик не должно
  // превращаться в фейерверк из галочек и подпрыгивающих пузырей — это
  // тот же урок, что уже поймал seenHistoryRef чуть ниже для реакции кота.
  const restoredIdsRef = useRef<Set<string>>(new Set())
  const isFresh = (id: string) => !restoredIdsRef.current.has(id)
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
      restoredIdsRef.current = new Set(saved.map((m) => m.id))
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
  /*
   * «Стартовая фаза» = первые 400 мс жизни экрана. Раньше признаком первого
   * захода служил сам факт первого срабатывания эффекта, и на ЧИСТОМ старте
   * это ломало главный сценарий: при пустой истории эффект на монтировании
   * выходил досрочно (messages.length === 0), поэтому «первым» считался уже
   * ответ на первое сообщение человека — и правило «с шапкой открываем
   * сверху» глушило скролл к нему. Проверено в браузере: scrollTop оставался
   * 0, до низа 305 px, ответ напарника целиком лежал под композером.
   * Время разделяет два разных события честно: восстановление истории
   * происходит на монтировании, новая реплика — всегда позже.
   */
  const initialPhaseOverRef = useRef(false)
  useEffect(() => {
    const t = window.setTimeout(() => {
      initialPhaseOverRef.current = true
    }, 400)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    const instant = !initialPhaseOverRef.current
    // С закреплённой шапкой «Дома» экран открывается СВЕРХУ: человек должен
    // увидеть карточку награды и приветствие, а не проскочить мимо всего
    // контекста к последней реплике восстановленной истории.
    if (instant && header) return
    const run = (behavior: ScrollBehavior) =>
      el.scrollTo({ top: el.scrollHeight, behavior })

    if (instant) {
      // Первый заход требует нескольких точек синхронизации: на момент
      // коммита рукописный Caveat ещё не применён, лента ниже вьюпорта не
      // переполнена, и scrollTo молча схлопывается в ноль. Повторяем после
      // кадра, после готовности шрифтов и с запасом по таймеру.
      run('auto')
      requestAnimationFrame(() => run('auto'))
      let cancelled = false
      const guarded = () => {
        if (!cancelled) run('auto')
      }
      document.fonts?.ready.then(guarded).catch(() => {})
      const t = window.setTimeout(guarded, 300)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    /*
     * Новая реплика: одного scrollTo мало. Лента ПРОДОЛЖАЕТ расти после
     * него — дорисовывается карточка первого шага, приезжают чипы, шрифт
     * пересчитывает высоту абзаца. Единственный плавный скролл уезжал по
     * старой высоте, и свежий ответ снова оказывался под кромкой.
     * Поэтому держим низ ~900 мс: каждый кадр подтягиваем, пока контент
     * устаканивается. Прерываемся сразу, как человек сам увёл ленту вверх —
     * автоскролл, спорящий с рукой, хуже отсутствия автоскролла.
     */
    run('smooth')
    let raf = 0
    const until = performance.now() + 900
    const follow = () => {
      if (performance.now() > until) return
      const distance = el.scrollHeight - el.clientHeight - el.scrollTop
      // > 240 px — это не «контент подрос», это человек листает историю
      if (distance > 240) return
      if (distance > 1) el.scrollTop = el.scrollHeight
      raf = requestAnimationFrame(follow)
    }
    raf = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, status])

  // Контингентный отклик существа: реагирует на ПРИХОД новой реплики, а не
  // на каждый рендер. Восстановленную из памяти историю не отыгрываем —
  // иначе кот «радуется» вчерашнему сообщению при каждом открытии.
  const [reactingId, setReactingId] = useState<string | null>(null)
  const lastAssistantIdRef = useRef<string | null>(null)
  const seenHistoryRef = useRef(false)
  // Экранный диктор молчал про новые реплики целиком (aria-live нигде не
  // стоял) — человек с диктором не узнавал, что напарник ответил, пока не
  // ощупает ленту вручную. Тот же гейт «это только что пришло, а не старая
  // история», что уже отделяет реакцию кота от простого рендера.
  const [announceText, setAnnounceText] = useState('')
  const pendingAnnounceIdRef = useRef<string | null>(null)
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
    // Мультисенсорный отклик: та же граница «это только что пришло, а не
    // старая история», что уже отделяет реакцию кота от обычного рендера —
    // тон играет ровно там же и ровно тогда же.
    playMessageTick('received')
    // Помечаем как «ждём объявления» — само объявление уходит диктору
    // ниже, только когда текст этой реплики перестанет меняться. ID
    // появляется в ленте ДО того, как стриминг долетит до конца: объявить
    // прямо здесь значило бы читать диктору одно первое слово навсегда.
    pendingAnnounceIdRef.current = lastAssistant.id
    setReactingId(lastAssistant.id)
    const t = window.setTimeout(() => setReactingId(null), 1600)
    return () => window.clearTimeout(t)
  }, [messages])

  // Фиксируем текст объявления, когда обмен реально завершился (не во время
  // streaming/submitted — тот же признак «устаканилось», что уже использует
  // эффект сохранения в память чуть ниже). pendingAnnounceIdRef гасится сразу
  // после — при восстановленной истории он просто никогда не выставлен.
  useEffect(() => {
    if (!pendingAnnounceIdRef.current) return
    if (status === 'streaming' || status === 'submitted') return
    const id = pendingAnnounceIdRef.current
    const msg = messages.find((m) => m.id === id)
    pendingAnnounceIdRef.current = null
    if (!msg) return
    setAnnounceText(
      msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p.type === 'text' ? p.text : ''))
        .join(' '),
    )
  }, [messages, status])

  // Ушёл вверх по переписке — показываем возврат вниз. Стандартная
  // аффорданса чата, без неё длинная история становится ловушкой.
  const [atBottom, setAtBottom] = useState(true)

  // #32 · Счётчик непрочитанного на кнопке возврата: голая стрелка отвечает
  // «там что-то есть», но не «сколько» — Zeigarnik/curiosity gap сильнее с
  // числом (тот же приём, что бейдж непрочитанного в Telegram/Slack).
  // Считаем ТОЛЬКО пока лента реально уведена вверх — свежая переписка,
  // прочитанная по мере прихода, к «непрочитанному» отношения не имеет.
  const [unreadCount, setUnreadCount] = useState(0)
  const lastMessageCountRef = useRef(0)
  useEffect(() => {
    const delta = messages.length - lastMessageCountRef.current
    if (delta > 0 && !atBottom) setUnreadCount((c) => c + delta)
    lastMessageCountRef.current = messages.length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])
  useEffect(() => {
    if (atBottom) setUnreadCount(0)
  }, [atBottom])

  /*
   * #13 · ГЛУБИНА ПО СКРОЛЛУ. Считаем не в CSS и не на каждый кадр скролла в
   * state (это гнало бы рендер всей ленты на каждый пиксель), а по позициям
   * DOM-узлов: сколько реплика уже ушла за верхнюю кромку вьюпорта ленты.
   *
   * scroll-timeline тут не подходит: у каждой реплики своя глубина, и она
   * зависит от положения относительно контейнера, а контейнер — не сам
   * документ. rAF-троттлинг: один пересчёт на кадр максимум.
   */
  const [depths, setDepths] = useState<Record<string, number>>({})
  const rowsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const recompute = () => {
      rafRef.current = null
      const box = el.getBoundingClientRect()
      const next: Record<string, number> = {}
      for (const [id, node] of rowsRef.current) {
        if (!node.isConnected) continue
        const r = node.getBoundingClientRect()
        // 0 — реплика ещё ниже верхней кромки; 1 — ушла на 220px выше неё.
        // 220px ≈ две-три реплики: столько нужно, чтобы отъезд читался
        // постепенным, а не мгновенным переключением состояния.
        const past = box.top - r.bottom
        next[id] = Math.max(0, Math.min(1, past / 220))
      }
      setDepths(next)
    }

    const onScroll = () => {
      setAtBottom(el.scrollHeight - el.clientHeight - el.scrollTop < 24)
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(recompute)
    }

    onScroll()
    recompute()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [messages.length])

  function depthOf(id: string): number {
    return depths[id] ?? 0
  }

  // #11 · Реакции на реплику. Ключ — `${messageId}-${partIndex}`.
  const [reactions, setReactions] = useState<Record<string, Reaction>>({})

  // #12 · Цитата: что именно отвечаем. Живёт до отправки или отмены.
  const [replyTo, setReplyTo] = useState<{ text: string; isUser: boolean } | null>(null)
  useEffect(() => {
    // Ответ на реплику — это приглашение писать: фокус в поле сразу, иначе
    // жест требует второго действия и теряет смысл.
    if (replyTo) textareaRef.current?.focus()
  }, [replyTo])

  // #15 · Диктовка дописывает распознанное в конец поля, а не заменяет его:
  // человек мог начать печатать, потом переключиться на голос.
  const dictation = useDictation((text) => {
    setInput((prev) => (prev ? `${prev.trimEnd()} ${text}` : text))
  })

  // ОЧАГ ОТВЕЧАЕТ НА РЕЧЬ. Пока напарник думает или только что заговорил,
  // костёр в сцене разгорается (.app-hearth в globals.css) — принцип
  // контингентности сцены, применённый к её главному источнику света.
  // Флаг на <body>, а не проп: AppBackdrop живёт в layout и о существовании
  // чата не знает (и не должен). Тот же механизм уже используется для
  // data-focus-immersive, так что это язык проекта, а не новая конвенция.
  // reactingId в условии обязателен: скриптовый мозг отвечает мгновенно и
  // фазу 'streaming' не проходит вообще — без него очаг молчал бы ровно там,
  // где чат работает без ключа к модели, то есть в большинстве случаев.
  const speaking =
    status === 'submitted' || status === 'streaming' || reactingId !== null
  useEffect(() => {
    if (speaking) document.body.setAttribute('data-companion-speaking', '')
    else document.body.removeAttribute('data-companion-speaking')
    return () => document.body.removeAttribute('data-companion-speaking')
  }, [speaking])

  // После скриптового ответа статус может быть 'error' — чат должен жить дальше
  const canSend = status === 'ready' || status === 'error'

  // #31 · «Напарник печатает…» — прогрессивное раскрытие. Три скачущие
  // точки уже честно говорят «идёт ответ»; подпись добавляется только
  // если ожидание реально затянулось (1.1s) — на быстрый скриптовый ответ
  // подпись успела бы разве что мигнуть, это был бы шум, а не тепло.
  const [showTypingHint, setShowTypingHint] = useState(false)
  useEffect(() => {
    if (status !== 'submitted') {
      setShowTypingHint(false)
      return
    }
    const t = window.setTimeout(() => setShowTypingHint(true), 1100)
    return () => window.clearTimeout(t)
  }, [status])

  function submit() {
    if (!input.trim() || !canSend) return
    // Диктовка активна — отправка её закрывает: иначе микрофон продолжает
    // писать в уже опустевшее поле.
    if (dictation.listening) dictation.stop()
    // Подтверждение телом в момент отправки: действие получает отклик
    // раньше, чем придёт ответ по сети.
    hapticStart()
    playMessageTick('sent')
    // #12 · Цитату передаём модели как контекст, а не как украшение в UI:
    // ответ «на это» бессмысленен, если напарник не знает, на что именно.
    const text = replyTo
      ? `> ${replyTo.text.replace(/\n/g, ' ')}\n\n${input}`
      : input
    sendMessage({ text })
    setInput('')
    setReplyTo(null)
    setSendCount((c) => c + 1)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Диктор молчал про новые реплики целиком — announceText обновляется
          только на СВОЮ, только что завершённую реплику (см. эффекты выше),
          восстановленная история и статус «печатает» сюда не попадают. */}
      <div aria-live="polite" className="sr-only">
        {announceText}
      </div>
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
      {/* #23 · Кот потягивается при pull-to-refresh. Рендерим только там, где
          наверху ленты реально есть что обновлять (передан onPullRefresh):
          жест без результата хуже, чем отсутствие жеста. */}
      {onPullRefresh && (
        <PullToStretch scrollRef={scrollRef} onRefresh={onPullRefresh} />
      )}
      <div
        ref={scrollRef}
        // Верхняя маска-затухание — только БЕЗ шапки. С закреплённым
        // контекстом «Дома» верх ленты в покое (scrollTop 0) — это маскот и
        // приветствие: гасить их первые пиксели нельзя. Шапка и так открывает
        // ленту с чистого края (pt-4), растворять там нечего.
        // grain grain-chat + relative: та же плёночная текстура, что держит
        // hero лендинга (footer.tsx, hero.tsx), вдвое тише и БЕЗ overflow-
        // hidden — этот контейнер и так overflow-y-auto, второе значение
        // перезаписало бы вертикальный скролл всей ленты. relative нужен
        // только затем, чтобы ::before мерился по этому боксу, а не по
        // дальнему предку: сама текстура при этом остаётся неподвижной
        // плёнкой поверх вьюпорта ленты, а не едет вместе с содержимым —
        // абсолютно спозиционированный узел в скролл-контейнере не скроллится.
        className={`grain grain-chat relative flex flex-1 flex-col overflow-y-auto ${
          header
            ? ""
            : "[mask-image:linear-gradient(to_bottom,transparent_0,black_24px)]"
        }`}
      >
        {/* pb-24, не py-4: композер ниже — sticky и перекрывает своим
            градиентом нижнюю часть ленты. Замерено рендером: без запаса
            последний чип-подсказка целиком лежал под композером
            (elementFromPoint в его центре возвращал textarea, не сам чип) —
            реальному пальцу нечем было в него попасть без скролла. */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 pt-4 pb-6">
          {/* Закреплённый контекст «Дома»: карточки едут в общем скролле над
              перепиской. Отделён от разговора крупной паузой (pb-2 + hairline),
              чтобы «контекст» и «беседа» читались как разные слои. */}
          {header ? (
            <div className="flex flex-col gap-5 border-b border-white/[0.06] pb-5">
              {header}
            </div>
          ) : null}
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_ITEM}
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
              transition={{ ...SPRING_ITEM, delay: 0.35 }}
            >
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                можно просто нажать
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestionChips.map((chip, ci) => {
                  const Icon = chipIcon(chip)
                  return (
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
                    initial={{ opacity: 0, y: 6, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    // #27 · Чипы приходят лестницей после приветствия:
                    // stagger из lib/motion — один шаг ритма на весь продукт.
                    transition={{ ...SPRING_SNAPPY, delay: stagger(ci, 0.4) }}
                    className="glass glass-interactive press inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-foreground shadow-[0_4px_14px_-8px_oklch(0_0_0/0.45)] hover:text-primary"
                  >
                    <Icon className="size-3.5 shrink-0 text-primary/80" aria-hidden="true" />
                    {chip}
                  </motion.button>
                  )
                })}
              </div>
              {/* min-h-11: цель была 143×17px — ниже минимума 24px по
                  WCAG 2.5.8, при том что это единственный быстрый выход
                  из чата прямо к сессии */}
              <Link
                href="/app/session"
                className="mt-1 inline-flex min-h-11 w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary transition-opacity hover:opacity-80"
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

            // #30 · Реплика родилась в этой сессии (не пришла из
            // восстановленной истории) — только такие получают «сочный»
            // вход и хлопок галочки, см. restoredIdsRef выше.
            const fresh = isFresh(message.id)

            return (
            <div
              key={message.id}
              // Узел нужен для замера глубины (#13): реф-колбэк, а не querySelector
              ref={(node) => {
                if (node) rowsRef.current.set(message.id, node)
                else rowsRef.current.delete(message.id)
              }}
              className="flex flex-col gap-2"
            >
              {showDayDivider && (
                // Хайрлайн + пилюля вместо одинокого плавающего блока:
                // Gestalt continuation — линия читает разделитель как
                // «разрыв главы» в едином потоке, а не отдельный виджет,
                // вклеенный между репликами.
                <div className="my-1 flex items-center gap-3">
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
                  <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {formatDayLabel(thisTime)}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
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
                      // Нюанс «своей стороны» (iMessage/Telegram): реплика
                      // едва подъезжает СО СТОРОНЫ своего отправителя (8px —
                      // в пределах 4-8px нормы для входа элемента, не рывок),
                      // а не одинаково всплывает снизу вне зависимости от
                      // того, чья это реплика.
                      initial={
                        reduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, y: 10, scale: 0.97, x: isUser ? 8 : -8 }
                      }
                      // #30 · «Сочный» вход (game feel: лёгкий перелёт масштаба
                      // за целевую точку и обратно, приём squash&stretch из
                      // геймдева — Swink, Game Feel) — только для реплик,
                      // родившихся в этой сессии. Восстановленная история
                      // получает старый, спокойный вход: 15 баблов, влетающих
                      // с перелётом разом при открытии чата, — это уже не
                      // полировка, а хаос.
                      animate={
                        fresh
                          ? { opacity: 1, y: 0, scale: [0.97, 1.035, 1], x: 0 }
                          : { opacity: 1, y: 0, scale: 1, x: 0 }
                      }
                      transition={
                        reduceMotion
                          ? { duration: 0.15 }
                          : fresh
                            ? { ...SPRING_SNAPPY, scale: { duration: 0.34, times: [0, 0.55, 1], ease: 'easeOut' } }
                            : SPRING_SNAPPY
                      }
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
                      {/* Материал реплики вынесен в ChatBubble: там живут
                          SVG-хвостик (#10), глубина по скроллу (#13), реакции
                          долгим нажатием (#11) и swipe-to-reply (#12). */}
                      <ChatBubble
                        text={part.text}
                        isUser={isUser}
                        isFirstOfGroup={isFirstOfGroup}
                        depth={depthOf(message.id)}
                        reaction={reactions[`${message.id}-${i}`] ?? null}
                        onReact={(r) =>
                          setReactions((prev) => {
                            const key = `${message.id}-${i}`
                            const next = { ...prev }
                            if (r) next[key] = r
                            else delete next[key]
                            return next
                          })
                        }
                        onReply={() => setReplyTo({ text: part.text, isUser })}
                        reduceMotion={!!reduceMotion}
                      />
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
                    // #33 · Договор с собой — не реплика, а печать: тот же
                    // .glass + тёплая primary-кромка, что у карточки старта
                    // ниже (готов к старту), плюс восковая печать-галочка в
                    // углу. Раньше карточка делила материал с обычной
                    // болтовнёй (chat-bubble-cat) — план, положенный на
                    // вечер, читался как одна из фраз, а не как оформленное
                    // обещание.
                    <div
                      key={i}
                      className="glass glass-shine relative ml-10 flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-3"
                      style={{ ['--glass-border' as string]: 'color-mix(in oklab, var(--primary) 40%, transparent)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary shadow-[0_4px_10px_-4px_oklch(0.86_0.22_130/0.65)]"
                      >
                        <Check className="size-3.5 text-primary-foreground" aria-hidden="true" />
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-primary">
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
                      <span className="font-mono text-xs uppercase tracking-widest text-primary">
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
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                      className="ml-10 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted-foreground"
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
                // text-muted-foreground БЕЗ доп. /70: сам токен уже даёт
                // 6.63:1 на фоне сцены (замерено попиксельно через canvas),
                // а «/70» поверх него утапливал 12px-текст до 3.81:1 — ниже
                // порога 4.5:1 для обычного текста (WCAG 1.4.3; исключение
                // 3:1 тут не действует, это не крупный текст). Приглушение
                // уже заложено в самом токене, второй слой альфы его просто
                // проваливал.
                <span
                  className={`flex items-center gap-1 px-1 font-mono text-xs text-muted-foreground ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {formatClock(thisTime)}
                  {/* text-primary: галочка «доставлено» — акцентный сигнал
                      подтверждения (тот же приём, что синие галочки в
                      мессенджерах), не просто ещё один серый символ рядом
                      с временем */}
                  {isUser && status !== 'streaming' && status !== 'submitted' && (
                    <Check
                      className={`size-3 text-primary ${fresh ? 'check-pop' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </span>
              )}
              </div>
            </div>
            )
          })}

          {/* AnimatePresence: без ннего исчезновение индикатора не анимировано
              вообще (exit требует контекста AnimatePresence) — пузырь просто
              обрывался кадром, пока настоящий ответ не появлялся рядом. */}
          <AnimatePresence>
          {status === 'submitted' && (
            <motion.div
              key="typing"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={SPRING_SNAPPY}
            >
              <CompanionAvatar expression="focused" />
              <span className="flex flex-col gap-1">
                {/* Тот же .glass + тень, что у реплик: пузырь-ожидание — это
                    форма реплики В ПРОЦЕССЕ, а не отдельный виджет рядом с ней.
                    Средняя точка — тёплый янтарь очага вместо ровно того же
                    серого: тот же приём, что уже красит галочку «доставлено»
                    в primary, — «жест жив», не просто три одинаковых пятна. */}
                <span
                  className="glass flex items-center gap-1 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-[0_4px_16px_-8px_oklch(0_0_0/0.5)]"
                  aria-label="Напарник печатает"
                >
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                    style={{ animationDelay: '-0.3s' }}
                  />
                  <span
                    className="size-1.5 animate-bounce rounded-full bg-[oklch(0.72_0.17_55/0.85)] motion-reduce:animate-none"
                    style={{ animationDelay: '-0.15s' }}
                  />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none" />
                </span>
                {/* #31 · Подпись приходит только если ожидание реально
                    затянулось — быстрый скриптовый ответ её не увидит вовсе. */}
                <AnimatePresence>
                  {showTypingHint && (
                    <motion.span
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="pl-1 font-hand text-sm text-muted-foreground"
                    >
                      напарник печатает…
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.div>
          )}
          </AnimatePresence>
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
              setUnreadCount(0)
            }}
            aria-label={
              unreadCount > 0
                ? `К свежим сообщениям — новых: ${unreadCount}`
                : 'К свежим сообщениям'
            }
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
            {/* #32 · Число, а не только точка: «там что-то есть» слабее, чем
                «там 3 новых» — Zeigarnik держит крепче, когда знает объём. */}
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-none text-primary-foreground shadow-[0_0_0_2px_var(--color-secondary)]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Плавающая "капсула" вместо сплошной панели во весь экран: градиент
          растворяет уходящие вверх реплики в фон ДО композера — та же
          маска-затухание, что у премиальных чатов (Linear, iMessage), а
          не жёсткий обрез бордером. items-end: поле растёт вверх, кнопка
          остаётся прижатой к низу строки, как у любого настоящего мессенджера.
          Просто докнутый flex-сосед, не sticky: теперь, когда родительский
          <main> реально ограничен по высоте (h-dvh), лента над ним скроллится
          по-настоящему внутри себя — композеру не нужно цепляться за скролл
          всей страницы, он и так всегда внизу колонки. */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="z-10 bg-gradient-to-t from-background via-background/85 to-transparent px-4 pt-6 pb-3"
      >
        {/* #12 · Цитата отвечаемой реплики. Появляется над полем, а не внутри
            него: текст ответа не должен смешиваться с текстом цитаты. Крестик
            обязателен — жест, из которого нет выхода, ощущается ловушкой. */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
              className="mx-auto mb-2 max-w-md overflow-hidden"
            >
              <div className="glass flex items-start gap-2 rounded-xl border-l-2 border-l-primary/70 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    {replyTo.isUser ? 'Твоя реплика' : 'Напарник'}
                  </span>
                  <p className="truncate text-xs leading-relaxed text-foreground/85">
                    {replyTo.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  aria-label="Отменить ответ на реплику"
                  className="press -mr-1 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Мягкое гало вместо жёсткого кольца: тот же токен primary, но как
            рассеянный свет (тонкий контур + вынесенное свечение), а не
            сплошная неоновая обводка — так фокус читается премиально, а
            не как игровой хайлайт.
            #34 · Два новых слоя поверх старого: (1) едва заметный подъём +
            масштаб на фокусе — поле не просто светится, а физически
            «приподнимается в готовность» (приём чек-аутов Stripe/Linear);
            (2) тёплая кромка --glass-border, когда есть что отправить,
            даже ДО фокуса — предвосхищающая аффорданса (то, что уже
            заметно готово к действию, должно выглядеть готовым). */}
        <div
          className="glass mx-auto flex max-w-md items-end gap-2 rounded-2xl px-3 py-2 shadow-[0_10px_30px_-12px_oklch(0_0_0/0.55)] transition-all duration-200 focus-within:-translate-y-0.5 focus-within:scale-[1.008] focus-within:shadow-[0_0_0_1.5px_oklch(0.86_0.22_130/0.4),0_0_22px_-4px_oklch(0.86_0.22_130/0.4),0_14px_34px_-12px_oklch(0_0_0/0.6)]"
          style={
            input.trim()
              ? { ['--glass-border' as string]: 'color-mix(in oklab, var(--primary) 30%, transparent)' }
              : undefined
          }
        >
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
            // text-base, не text-sm: меньше 16px — Safari на iOS зумит всю
            // страницу при фокусе на поле ввода, это ломает раскладку на
            // каждое открытие клавиатуры.
            // min-h-11: поле в одну строку (rows=1) мерилось 38px — ниже
            // минимума тач-цели 44px (замерено рендером).
            className="min-h-11 max-h-[7.5rem] flex-1 resize-none bg-transparent py-1.5 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          {/* #15 · Диктовка. Рендерится только там, где Web Speech реально
              есть — кнопка, которая ничего не делает, хуже её отсутствия.
              Во время записи иконка меняется на «стоп»: одна кнопка, два
              состояния, без второго элемента управления. */}
          {dictation.supported && (
            <button
              type="button"
              onClick={() => (dictation.listening ? dictation.stop() : dictation.start())}
              aria-label={dictation.listening ? 'Остановить диктовку' : 'Диктовать голосом'}
              aria-pressed={dictation.listening}
              className={`press flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                dictation.listening
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {dictation.listening ? (
                <span className="relative flex items-center justify-center">
                  {/* Пульс — контингентный сигнал «идёт запись», ровно на
                      время жеста, а не бесконечная анимация в интерфейсе. */}
                  <span className="absolute size-7 animate-ping rounded-full bg-primary/25 motion-reduce:animate-none" />
                  <Square className="relative size-4 fill-current" aria-hidden="true" />
                </span>
              ) : (
                <Mic className="size-5" aria-hidden="true" />
              )}
            </button>
          )}
          <Button
            type="submit"
            size="icon"
            disabled={!canSend || !input.trim()}
            aria-label="Отправить"
            // size-11, не size-10: 40px — тоже ниже минимума 44px
            // relative: якорь для искры отправки ниже.
            className="relative size-11 shrink-0 overflow-visible rounded-xl"
          >
            {/* #35 · Искра отправки — визуальный эквивалент hapticStart для
                десктопа и телефонов без вибромотора. Ключ по sendCount:
                новый узел на каждую отправку, поэтому CSS-анимация просто
                проигрывается заново при монтировании, без ручного тайминга. */}
            {sendCount > 0 && (
              <span
                key={sendCount}
                aria-hidden="true"
                className="send-spark pointer-events-none absolute inset-0 rounded-xl"
                style={{ boxShadow: '0 0 0 2px oklch(0.86 0.22 130 / 0.55)' }}
              />
            )}
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
