'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg } from '@/components/mascot-svg'
import { RevealIsland, type RevealNewItem } from '@/components/reveal-island'
import { Check, ChevronRight, Circle, Sparkles, Sprout, X } from 'lucide-react'
import {
  addFind,
  clearActiveSession,
  clearPlan,
  consumeQueueStep,
  getActiveSession,
  getCompanionName,
  getFinds,
  getPatterns,
  getPlan,
  getStarts,
  getStepQueue,
  readAmbientLevel,
  recordStart,
  saveActiveSession,
  savePlan,
  saveSessionResult,
  saveStepQueue,
  todayKey,
  updateStartMinutes,
  writeAmbientLevel,
  type AmbientLevel,
  type IslandFindEntry,
} from '@/lib/memory'
import {
  drawFind,
  elementNameForStartNumber,
  ISLAND_POOL,
  LANDMARK_COUNT,
  RARITY_LABEL,
  type Rarity,
} from '@/lib/island-elements'
import { playStartSigh } from '@/lib/reward-sound'
import { startCampfire, stopCampfire } from '@/lib/ambient'
import {
  hapticDone,
  hapticMovementDone,
  hapticSelection,
  hapticStart,
} from '@/lib/haptics'
import {
  DURATION_LABEL,
  DURATIONS,
  recommendDuration,
  type Duration,
} from '@/lib/duration'

// Русская плюрализация «N ненайденных находок»: без неё тизер на малых
// остатках («ещё 2 ненайденных находок») читается машинным — ровно в момент,
// когда коллекция почти собрана и каждый знак внимания на счету
function pluralFinds(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'ненайденная находка'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return 'ненайденные находки'
  return 'ненайденных находок'
}

/**
 * ГОТОВЫЕ ПЕРВЫЕ ДВИЖЕНИЯ. Пустое поле для человека с плохим фокусом — это
 * не свобода, это стена: сформулировать шаг само по себе требует ровно той
 * исполнительной функции, которой в этот момент нет. Чип снимает не работу,
 * а вход в работу.
 * Формулировки — физические действия, а не намерения: «открыть документ»
 * можно сделать не решаясь, «поработать над документом» — нельзя.
 */
const stepChips = ['Открыть документ', 'Убрать одну вещь', 'Написать одну строку']

const HIDE_DIGITS_KEY = 'naparnik:hideDigits'

/**
 * Реплика сетапа. На первой сессии объясняет правило («первое движение — не
 * вся задача») — это ещё не прожито. На последующих — то же объяснение
 * читается как будто существо забыло, что уже говорило это вчера.
 */
function buildSetupLine(
  prefilledStep: string,
  priorSessions: number,
  companionName: string | null,
): string {
  if (prefilledStep) return 'Движение выбрано. Просто жми — я рядом.'
  if (priorSessions === 0) {
    return 'Что делаем? Назови одно движение — не всю задачу.'
  }
  return companionName
    ? `Погнали. Что в фокусе? ${companionName} рядом.`
    : 'Погнали. Что в фокусе? Я рядом.'
}

/**
 * #31 · КОГДА ПРЕДЛАГАТЬ ДРОБЛЕНИЕ.
 *
 * Кнопка «Раздробить» рядом с каждым введённым символом — это шум, который
 * обесценивает саму функцию: если продукт предлагает раздробить «открыть
 * файл», значит он не понимает, что читает, и его совету незачем доверять.
 * Предлагаем только тогда, когда формулировка ДЕЙСТВИТЕЛЬНО похожа на
 * большое дело: либо длинная, либо содержит слова тотальности («всю»,
 * «весь», «полностью», «до конца»), либо называет объект целиком
 * («презентация», «проект», «отчёт») без глагола-действия рядом.
 */
/*
 * Без \b на границах: `\b` в JS-регулярках определяется через ASCII \w
 * ([A-Za-z0-9_]) и не видит кириллицу словом вообще — граница «до» и
 * «после» кириллического слова для движка попросту не существует, поэтому
 * `\bвсю\b` не матчит «всю» ни в какой позиции текста. Поймано не в теории,
 * а прогоном реальной фразы: «Сделать всю презентацию для клиента» не
 * триггерила дробление ни разу, при том что это ровно тот большой ввод,
 * ради которого функция существует. Без границ поиск — по подстроке, что
 * для этого небольшого списка ключевых слов не даёт вредных ложных
 * срабатываний (риск получить «весь» внутри случайного другого слова
 * дешевле, чем не сработать вовсе на реальном большом деле).
 */
const BIG_WORDS =
  /(вс[юёе]|весь|полностью|до конца|целиком|разобрат|доделат|закончит|проект|презентац|отчёт|отчет|диплом|курсов|статью|сайт|дизайн|переезд|уборк)/i

function looksBig(task: string): boolean {
  const t = task.trim()
  if (t.length < 8) return false
  if (BIG_WORDS.test(t)) return true
  // Длинная формулировка сама по себе — сигнал: одно физическое движение
  // редко требует больше пяти слов («Сделать всю презентацию для клиента» —
  // уже 5, и это несомненно большое дело; порог 6 пропускал ровно такие
  // фразы, если бы в них не нашлось слова из списка выше).
  return t.split(/\s+/).length >= 5
}

const AMBIENT_LABEL: Record<AmbientLevel, string> = {
  off: 'выкл',
  quiet: 'тихо',
  normal: 'обычно',
}
const AMBIENT_ORDER: AmbientLevel[] = ['off', 'quiet', 'normal']

type Moment = 'start' | 'middle' | 'late' | 'done' | 'early-exit'

const fallbackVoice: Record<Moment, string> = {
  start: 'Я рядом. Одно действие за раз.',
  middle: 'Половина есть. Ты реально в игре.',
  late: 'Осталось чуть-чуть. Финишная прямая.',
  done: 'Начато и отработано. Мой остров стал чуть больше.',
  'early-exit': 'Ты начал — это главное. Остров всё равно вырос. Ноль стыда.',
}

async function fetchVoice(moment: Moment, task: string, minutes: number): Promise<string> {
  try {
    const res = await fetch('/api/session-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moment, task, minutes }),
    })
    if (!res.ok) return fallbackVoice[moment]
    const data = (await res.json()) as { text: string | null }
    return data.text || fallbackVoice[moment]
  } catch {
    return fallbackVoice[moment]
  }
}

type Phase = 'setup' | 'starting' | 'running' | 'done'

export function FocusSession() {
  const reducedMotion = useReducedMotion()
  const searchParams = useSearchParams()
  const prefilledStep = searchParams.get('step') ?? ''
  const fromPlan = searchParams.get('plan') === '1'
  const prefilledDuration = Number(searchParams.get('d'))

  const [phase, setPhase] = useState<Phase>('setup')
  const [task, setTask] = useState(prefilledStep)

  const inputRef = useRef<HTMLInputElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  /** #36 · Произвольная длительность раскрывается по запросу, не сразу. */
  const [customOpen, setCustomOpen] = useState(false)
  /** #44 · Длинная формулировка разворачивается по тапу, а не режется молча. */
  const [showFullTask, setShowFullTask] = useState(false)

  /*
   * #37 · Sticky-двойник CTA появляется, только когда исходная кнопка
   * физически ушла из вида. Наблюдаем сам узел: высота формы меняется от
   * раскрытия дробления, степпера и объяснения рекомендации — любой расчёт
   * по пикселям рассыпался бы на первом же из этих изменений.
   */
  const [ctaOutOfView, setCtaOutOfView] = useState(false)
  useEffect(() => {
    if (phase !== 'setup') {
      setCtaOutOfView(false)
      return
    }
    const el = ctaRef.current
    if (!el) return
    /*
     * threshold: 0 (только пересечение 0%↔何-то) плюс `entry.isIntersecting`
     * — это была настоящая ошибка, не опечатка: isIntersecting истинно уже
     * при ЛЮБОМ ненулевом пересечении. Замерено рендером: кнопка сетапа,
     * обрезанная overflow-hidden предком до 17% своей высоты (тонкая
     * полоска у самого края), всё ещё считалась «видимой» — sticky-двойник
     * ни разу не появлялся, а оригинал оставался практически невидимым
     * огрызком. threshold: [0, 1] даёт колбэк и на границе 0%, и на 100%;
     * решение — по intersectionRatio, не по булеву флагу: дубликат нужен
     * ровно тогда, когда оригинал виден НЕ ПОЛНОСТЬЮ, а не только когда он
     * не виден совсем. Порог 0.98, не 1, — запас на субпиксельное округление.
     */
    const io = new IntersectionObserver(
      ([entry]) => setCtaOutOfView(entry.intersectionRatio < 0.98),
      { threshold: [0, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [phase])

  const [companionName, setCompanionName] = useState<string | null>(null)
  const [priorSessions, setPriorSessions] = useState(0)

  // #34 · Дефолт из истории, а не из вкуса. 15 минут до загрузки данных:
  // безопасный вариант выигрывает при любой неопределённости.
  const [minutes, setMinutes] = useState<number>(
    (DURATIONS as readonly number[]).includes(prefilledDuration) ? prefilledDuration : 15,
  )
  const [advice, setAdvice] = useState<{ minutes: Duration; reason: string | null }>({
    minutes: 15,
    reason: null,
  })
  // Осознанный выбор человека перекрывает рекомендацию навсегда в рамках
  // этого экрана: подставлять «своё лучше» поверх сделанного выбора —
  // ровно то, за что интерфейсы справедливо ненавидят.
  const [durationTouched, setDurationTouched] = useState(Boolean(prefilledDuration))

  useEffect(() => {
    void getCompanionName().then(setCompanionName)
    void getPatterns().then((p) => setPriorSessions(p.totalStarts))
    void getStarts().then((starts) => {
      const a = recommendDuration(starts)
      setAdvice(a)
      if (!prefilledDuration) {
        setMinutes((current) => (durationTouched ? current : a.minutes))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ----------------------------- Дробление ----------------------------- */

  const [brokenSteps, setBrokenSteps] = useState<string[] | null>(null)
  const [breaking, setBreaking] = useState(false)
  const [breakFailed, setBreakFailed] = useState(false)
  async function breakDown() {
    if (!task.trim() || breaking) return
    setBreaking(true)
    setBreakFailed(false)
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim() }),
      })
      if (res.ok) {
        const data = (await res.json()) as { steps: string[] | null }
        // #32 · Максимум три варианта. Модель иногда возвращает больше, и
        // список из шести микрошагов возвращает ровно ту проблему, ради
        // которой человек нажал кнопку: снова слишком много решений.
        if (data.steps?.length) setBrokenSteps(data.steps.slice(0, 3))
        else setBreakFailed(true)
      } else {
        setBreakFailed(true)
      }
    } catch {
      setBreakFailed(true)
    } finally {
      setBreaking(false)
    }
  }

  const [secondsLeft, setSecondsLeft] = useState(0)
  const [voice, setVoice] = useState(fallbackVoice.start)
  const [doneVoice, setDoneVoice] = useState<string | null>(null)
  const [endedEarly, setEndedEarly] = useState(false)

  const [grownElement, setGrownElement] = useState<{
    name: string
    rarity: Rarity | 'landmark'
    landmarksUnlocked: number
    finds: IslandFindEntry[]
    newItem: RevealNewItem
  } | null>(null)

  // Ритуал завершения: план на завтра на пике дофамина.
  const [tomorrowTask, setTomorrowTask] = useState('')
  const [tomorrowStep, setTomorrowStep] = useState('')
  const [planSaved, setPlanSaved] = useState(false)
  const [planFormOpen, setPlanFormOpen] = useState(false)

  const [nextUp, setNextUp] = useState<{
    step: string | null
    queueTask: string | null
    tease: string | null
  }>({ step: null, queueTask: null, tease: null })

  useEffect(() => {
    if (planFormOpen) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }
  }, [planFormOpen])

  // Защита состояния потока: пока идёт сессия, нижний таб-бар — это всегда
  // видимая рампа выхода ровно в тот момент, когда мы держим человека в
  // фокусе. Не ловушка: «Закончить раньше» на экране остаётся.
  useEffect(() => {
    const immersive = phase === 'starting' || phase === 'running'
    if (immersive) document.body.dataset.focusImmersive = 'true'
    else delete document.body.dataset.focusImmersive
    return () => {
      delete document.body.dataset.focusImmersive
    }
  }, [phase])

  // Последовательное раскрытие финала: сначала награда одна на экране
  const [restRevealed, setRestRevealed] = useState(false)

  const [hideDigits, setHideDigits] = useState(false)
  useEffect(() => {
    try {
      setHideDigits(localStorage.getItem(HIDE_DIGITS_KEY) === '1')
    } catch {
      /* приватный режим */
    }
  }, [])

  /* ----------------------- Окружающий звук (#47) ----------------------- */

  const [ambient, setAmbient] = useState<AmbientLevel>('off')
  useEffect(() => {
    setAmbient(readAmbientLevel())
  }, [])
  useEffect(() => {
    // Звук стартует ТОЛЬКО в running и ТОЛЬКО после явного выбора человека:
    // никакого автостарта аудио — браузеры его и так блокируют, но дело не
    // в блокировке, а в том, что внезапный звук из свёрнутой вкладки
    // пугает и заставляет искать, что орёт.
    if (phase === 'running' && ambient !== 'off') startCampfire(ambient)
    else stopCampfire()
    return () => stopCampfire()
  }, [phase, ambient])

  function cycleAmbient() {
    const next = AMBIENT_ORDER[(AMBIENT_ORDER.indexOf(ambient) + 1) % AMBIENT_ORDER.length]
    hapticSelection()
    setAmbient(next)
    writeAmbientLevel(next)
  }

  function toggleDigits() {
    setHideDigits((v) => {
      try {
        localStorage.setItem(HIDE_DIGITS_KEY, v ? '0' : '1')
      } catch {
        /* приватный режим */
      }
      return !v
    })
  }

  useEffect(() => {
    if (phase !== 'done') return
    if (!grownElement) setRestRevealed(true)
  }, [phase, grownElement])

  const totalRef = useRef(0)
  const startIdRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const firedMomentsRef = useRef<Set<Moment>>(new Set())

  const speak = useCallback((moment: Moment, taskLabel: string, mins: number) => {
    if (firedMomentsRef.current.has(moment)) return
    firedMomentsRef.current.add(moment)
    fetchVoice(moment, taskLabel, mins).then(setVoice)
  }, [])

  /* ------------------- #45 · Первое движение сделано ------------------- */

  /*
   * Подтверждение НЕ спрашивают через пятнадцать секунд после старта.
   * Всплывающий вопрос «ну как, начал?» посреди первых минут — это ровно
   * то прерывание, от которого продукт обещает защищать: он вырывает из
   * работы, чтобы спросить, работает ли человек.
   * Кнопка просто есть, всегда, ниже таймера. Жмёт её человек сам, когда
   * реально сделал движение, — и именно поэтому росток за неё честен.
   */
  const [movementDone, setMovementDone] = useState(false)
  function confirmMovement() {
    if (movementDone) return
    hapticMovementDone()
    setMovementDone(true)
  }

  // Мягкий возврат из отвлечения (#58): СДВГ-мозг уходит в другую вкладку —
  // это норма, а не провал. Вернулся — встречаем без упрёка.
  const hiddenAtRef = useRef<number | null>(null)
  const [backFromDrift, setBackFromDrift] = useState(false)

  // Честный таймер: остаток вычисляется от абсолютного времени старта,
  // а не тиками — фоновая вкладка и троттлинг браузера не искажают часы.
  useEffect(() => {
    if (phase !== 'running') return
    const update = () => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000
      setSecondsLeft(Math.max(0, Math.ceil(totalRef.current - elapsed)))
    }
    update()
    const id = setInterval(update, 1000)
    const onVisible = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now()
        return
      }
      /*
       * #58 · Возврат пересчитывает остаток ОДНИМ шагом. Никакой
       * «доигранной» анимации пропущенного времени: человек не должен
       * смотреть, как цифра проматывается с 14:03 до 09:17 за двадцать
       * кадров — это выглядит как поломка и заново привлекает внимание к
       * тому, сколько он отсутствовал.
       */
      update()
      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > 120_000) {
        setBackFromDrift(true)
        window.setTimeout(() => setBackFromDrift(false), 6000)
      }
      hiddenAtRef.current = null
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [phase])

  // Сессия переживает закрытие вкладки
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    getActiveSession().then((s) => {
      if (!s) return
      totalRef.current = s.minutes * 60
      startedAtRef.current = s.startedAt
      startIdRef.current = s.startId
      firedMomentsRef.current = new Set()
      setTask(s.task)
      setMinutes(s.minutes)
      const elapsed = (Date.now() - s.startedAt) / 1000
      setSecondsLeft(Math.max(0, Math.ceil(s.minutes * 60 - elapsed)))
      setVoice(fallbackVoice.start)
      setPhase('running')
    })
  }, [])

  // Завершение по нулю — отдельным эффектом, а не изнутри setState-апдейтера
  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0 && totalRef.current > 0) {
      finish(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase])

  /*
   * #56 · Переход в running — 320мс, а не отдельный экран на 2.2 секунды.
   *
   * Раньше между сетапом и сессией стоял полноэкранный кадр «Сажусь рядом»
   * с собственным маскотом на 170px. Метафора хорошая, но платил за неё
   * человек: каждый старт стоил двух с лишним секунд ожидания, а к пятой
   * сессии сцена перестаёт читаться как ритуал и начинает читаться как
   * загрузка. Хуже — это и есть тот самый «резкий route flash», от
   * которого предостерегает спецификация: экран целиком подменялся другим.
   * Теперь маскот НЕ появляется — он и так был на экране всё это время и
   * просто остаётся на месте, пока вокруг него складывается форма. Это
   * точнее передаёт «он сидит рядом», чем прилёт нового персонажа.
   */
  useEffect(() => {
    if (phase !== 'starting') return
    const t = window.setTimeout(() => setPhase('running'), reducedMotion ? 0 : 320)
    return () => window.clearTimeout(t)
  }, [phase, reducedMotion])

  // Живое присутствие: на каждой четверти пути котик коротко радуется
  const lastQuarterRef = useRef(0)
  const [cheering, setCheering] = useState(false)
  useEffect(() => {
    if (phase !== 'running' || totalRef.current === 0) return
    const q = Math.floor((1 - secondsLeft / totalRef.current) * 4)
    if (q > lastQuarterRef.current && q < 4) {
      lastQuarterRef.current = q
      setCheering(true)
      const t = window.setTimeout(() => setCheering(false), 2600)
      return () => window.clearTimeout(t)
    }
  }, [secondsLeft, phase])

  // Реплики по ходу сессии
  useEffect(() => {
    if (phase !== 'running' || totalRef.current === 0) return
    const progress = 1 - secondsLeft / totalRef.current
    if (progress >= 0.85) speak('late', task, minutes)
    else if (progress >= 0.5) speak('middle', task, minutes)
  }, [secondsLeft, phase, speak, task, minutes])

  const [starting, setStarting] = useState(false)

  async function start() {
    if (!task.trim() || starting) return
    setStarting(true)
    /*
     * #55 · Хаптика через 40–60мс ПОСЛЕ нажатия, не раньше. Отдача,
     * совпадающая с касанием, ощущается как щелчок самого экрана; отдача
     * чуть позже — как ответ системы на действие. Разница в пятьдесят
     * миллисекунд, а смысл противоположный: «я нажал» против «меня
     * услышали».
     */
    window.setTimeout(() => hapticStart(), 50)
    playStartSigh()
    totalRef.current = minutes * 60
    setSecondsLeft(minutes * 60)
    firedMomentsRef.current = new Set()
    lastQuarterRef.current = 0
    setMovementDone(false)
    setVoice(fallbackVoice.start)
    setPhase(reducedMotion ? 'running' : 'starting')
    startedAtRef.current = Date.now()

    // Старт записывается в момент старта: инициация — и есть валюта
    const entry = await recordStart({ label: task, fromPlan })
    startIdRef.current = entry.id

    await consumeQueueStep(task)
    await saveActiveSession({
      startedAt: startedAtRef.current,
      minutes,
      task,
      startId: entry.id,
    })

    // План исполнен — убираем: и когда старт пришёл из плана, и когда
    // человек сам начал шаг, лежащий в плане (иначе утром продукт
    // предложит уже сделанное — стейл-план подрывает доверие к памяти)
    const plan = await getPlan()
    if (plan && ((fromPlan && plan.forDate === todayKey()) || plan.firstStep === task)) {
      await clearPlan()
    }

    speak('start', task, minutes)
    setStarting(false)
  }

  async function finish(early: boolean) {
    await clearActiveSession()
    const workedMin = Math.min(
      (Date.now() - startedAtRef.current) / 60000,
      totalRef.current / 60,
    )
    if (startIdRef.current) {
      await updateStartMinutes(startIdRef.current, workedMin)
    }
    const starts = await getStarts()
    const n = starts.length

    let grownName: string | null = null
    let grownRarity: 'landmark' | Rarity | null = null

    if (n <= LANDMARK_COUNT) {
      // Первые 10 стартов — предсказуемые ориентиры: новичку нужна ясная
      // история. Находок пула тут структурно быть не может.
      const name = elementNameForStartNumber(n)
      grownName = name
      grownRarity = name ? 'landmark' : null
      setGrownElement(
        name
          ? {
              name,
              rarity: 'landmark',
              landmarksUnlocked: n - 1,
              finds: [],
              newItem: { kind: 'landmark', index: n - 1 },
            }
          : null,
      )
    } else {
      const finds = await getFinds()
      let pity = 0
      for (let i = finds.length - 1; i >= 0 && finds[i].rarity === 'common'; i--) pity++
      const find = drawFind(!early, pity)
      const findEntry = { ...find, date: todayKey(), startId: startIdRef.current ?? '' }
      if (startIdRef.current) {
        await addFind(findEntry)
      }
      grownName = find.name
      grownRarity = find.rarity
      setGrownElement({
        name: find.name,
        rarity: find.rarity,
        landmarksUnlocked: LANDMARK_COUNT,
        finds,
        newItem: { kind: 'find', find: findEntry, findIndex: finds.length },
      })
    }

    /*
     * След для «Дома» (#25, #50). Записываем ровно то, что произошло:
     * сколько отработано, была ли сессия полной и подтвердил ли человек
     * первое движение. «Дом» из этих трёх фактов сам собирает честный
     * итог — и не может сказать «первое движение сделано» тому, кто
     * просто открыл экран и вышел.
     */
    await saveSessionResult({
      task,
      minutes: Math.round(workedMin),
      plannedMinutes: minutes,
      movementConfirmed: movementDone,
      grownName,
      grownRarity,
      finishedAt: Date.now(),
    })

    hapticDone()
    setEndedEarly(early)
    setDoneVoice(null)
    setPlanSaved(false)
    setPlanFormOpen(false)
    setRestRevealed(false)
    setTomorrowTask('')
    setTomorrowStep('')
    setEndSheetOpen(false)

    // «Ещё разок»: следующая цель видна в момент пика, не после него.
    const queue = await getStepQueue()
    let tease: string | null = null
    if (n < LANDMARK_COUNT) {
      const nextName = elementNameForStartNumber(n + 1)
      if (nextName) tease = `следующий старт вырастит «${nextName}»`
    } else {
      const allFinds = await getFinds()
      const foundKeys = new Set(allFinds.map((f) => f.key))
      const unfound = ISLAND_POOL.filter((e) => !foundKeys.has(e.key)).length
      let pityNow = 0
      for (let i = allFinds.length - 1; i >= 0 && allFinds[i].rarity === 'common'; i--)
        pityNow++
      tease =
        pityNow >= 5
          ? 'следующая находка будет необычной — или лучше'
          : unfound === 1
            ? 'на острове осталась последняя ненайденная находка'
            : unfound > 0
              ? `на острове ещё ${unfound} ${pluralFinds(unfound)}`
              : 'остров собран полностью — теперь он густеет'
    }
    setNextUp({
      step: queue?.steps[0] ?? null,
      queueTask: queue?.task ?? null,
      tease,
    })

    setPhase('done')
    fetchVoice(early ? 'early-exit' : 'done', task, minutes).then(setDoneVoice)
  }

  async function saveTomorrowPlan() {
    if (!tomorrowTask.trim() || !tomorrowStep.trim()) return
    await savePlan({ task: tomorrowTask.trim(), firstStep: tomorrowStep.trim() })
    setPlanSaved(true)
  }

  /* ------------------- #48 · Лист раннего завершения ------------------- */

  const [endSheetOpen, setEndSheetOpen] = useState(false)

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = totalRef.current > 0 ? 1 - secondsLeft / totalRef.current : 0

  /* ============================== SETUP ============================== */

  if (phase === 'setup' || phase === 'starting') {
    const ready = task.trim().length > 0
    const folding = phase === 'starting'

    return (
      // overflow-y-auto + min-h-0: страница выше — h-dvh + overflow-hidden
      // (см. app/app/session/page.tsx), так что длинный сетап (раскрытое
      // дробление, развёрнутый степпер длительности) скроллится ВНУТРИ
      // этой колонки, а не раздвигает документ за пределы вьюпорта — там,
      // где его нижние 69px постоянно перекрыты фикс-навом.
      <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
        {/*
          #26 · СЦЕНА СЖАТА. Маскот был 150px и жил в flex-1 по центру
          вертикали — на 844px-экране декоративная часть съедала верхние
          420px, и первая интерактивная зона начиналась ровно на середине
          экрана. Человек приходит сюда назвать движение и нажать кнопку;
          130px и две строки реплики оставляют на это всё остальное.
        */}
        <motion.div
          className="flex shrink-0 flex-col items-center gap-2 pb-5"
          animate={folding ? { scale: 0.92, opacity: 0.6 } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <MascotSvg expression="calm" label={companionName ?? 'Напарник'} size={130} />
          <p className="max-w-[19rem] text-balance text-center t-voice line-clamp-2">
            {buildSetupLine(prefilledStep, priorSessions, companionName)}
          </p>
        </motion.div>

        <motion.div
          className="flex flex-1 flex-col gap-6"
          animate={folding ? { y: 24, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          style={folding ? { pointerEvents: 'none' } : undefined}
        >
          {/*
            #27, #28 · ОДИН ОБЪЕКТ ВЫБОРА, НЕ ДВЕ КОНКУРИРУЮЩИЕ СЕКЦИИ.
            Раньше готовые чипы и своё поле стояли как два независимых
            блока: человек читал их как «выбери из списка» ИЛИ «напиши
            сам» и всерьёз решал, каким из двух способов пользоваться —
            лишнее решение ровно перед действием, ради которого он пришёл.
            Здесь это одна рамка с одним заголовком: чипы — быстрые
            заготовки внутри поля, а не альтернатива ему.
            Название «Первое движение», не «Первый шаг»: человек не обещает
            закончить задачу, он обещает сдвинуться. Формулировка снимает
            обязательство, которое он не готов взять.
          */}
          <div className="surface-card flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-0.5">
              <span className="t-eyebrow">Первое движение</span>
              <span className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
                Что можно сделать без подготовки?
              </span>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Готовые движения">
              {stepChips.map((chip) => {
                const selected = task === chip
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      /*
                       * #29 · Чип превращается в ВЫБРАННУЮ ЗАДАЧУ, а не
                       * просто подсвечивается: текст переезжает в поле,
                       * курсор встаёт в конец, и человек может дописать
                       * формулировку под себя. Присвоение через
                       * минимальную правку (IKEA-эффект) без
                       * принудительной кастомизации: хочешь — оставь как
                       * есть, хочешь — сделай своим одним словом.
                       */
                      if (task !== chip) hapticSelection()
                      setTask(chip)
                      setBrokenSteps(null)
                      const el = inputRef.current
                      if (el) {
                        window.requestAnimationFrame(() => {
                          el.focus()
                          el.setSelectionRange(chip.length, chip.length)
                        })
                      }
                    }}
                    aria-pressed={selected}
                    className={`press-state inline-flex min-h-11 items-center gap-1.5 rounded-[16px] px-3.5 py-2 t-secondary font-medium ${
                      selected
                        ? 'surface-active chip-selected chip-sweep text-foreground'
                        : 'surface-quiet text-foreground'
                    }`}
                  >
                    {selected && (
                      <Check className="chip-check size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    {chip}
                  </button>
                )
              })}
            </div>

            {/* Разделитель «или» — не декор: он сообщает, что чипы и поле
                это ОДИН выбор с двумя способами, а не два независимых. */}
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="h-px flex-1 bg-white/[0.07]" />
              <span className="t-micro" style={{ color: 'var(--ivory-500)' }}>
                или
              </span>
              <span className="h-px flex-1 bg-white/[0.07]" />
            </div>

            {/*
              #30 · ПОЛЕ ДОЛЖНО ВЫГЛЯДЕТЬ КАК ПОЛЕ.
              Постоянный label вместо плейсхолдера-как-подписи: плейсхолдер
              исчезает при первом же символе, и человек, отвлёкшийся на
              середине (то есть ровно наш человек), возвращается к тексту
              без подписи над ним. Крестик очистки — только когда есть что
              чистить. Счётчика нет: реального лимита нет, а счётчик без
              лимита это тревога без причины.
            */}
            <label className="flex flex-col gap-1.5">
              <span className="t-micro" style={{ color: 'var(--ivory-500)' }}>
                Моё первое движение
              </span>
              <div className="surface-quiet flex items-center gap-2 rounded-[16px] px-3 focus-within:shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--lime-400)_45%,transparent)]">
                <input
                  ref={inputRef}
                  value={task}
                  onChange={(e) => {
                    setTask(e.target.value)
                    setBrokenSteps(null)
                    setBreakFailed(false)
                  }}
                  /*
                   * #30 · Enter НЕ запускает сессию. Раньше запускал — и
                   * это стоило человеку случайного старта каждый раз,
                   * когда он привычно жал Enter, чтобы «подтвердить»
                   * введённое, или когда мобильная клавиатура подставляла
                   * «Готово». Старт — необратимое действие (запись в
                   * историю, обнуление плана), у него должна быть ровно
                   * одна дверь, и она подписана.
                   */
                  enterKeyHint="done"
                  placeholder="Открыть файл презентации"
                  aria-label="Моё первое движение"
                  // text-base (16px): при меньшем кегле Safari на iOS зумит
                  // всю страницу при фокусе на поле.
                  className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-[var(--ivory-500)]"
                />
                {task && (
                  <button
                    type="button"
                    onClick={() => {
                      setTask('')
                      setBrokenSteps(null)
                      inputRef.current?.focus()
                    }}
                    aria-label="Очистить"
                    className="press-state -mr-1 flex size-11 shrink-0 items-center justify-center rounded-[14px]"
                    style={{ color: 'var(--ivory-500)' }}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </label>

            {/*
              #31 · Дробление предлагается ТОЛЬКО на крупной формулировке.
              Кнопка рядом с каждым введённым символом обесценивает саму
              функцию: продукт, предлагающий раздробить «открыть файл»,
              выглядит так, будто не понимает, что читает.
            */}
            <AnimatePresence>
              {looksBig(task) && !brokenSteps && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 pt-1">
                    <p className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
                      Это похоже на большое дело.
                    </p>
                    <button
                      type="button"
                      onClick={breakDown}
                      disabled={breaking}
                      className="press-state surface-quiet inline-flex min-h-11 items-center gap-2 self-start rounded-[16px] px-4 py-2 t-secondary font-semibold text-foreground disabled:opacity-60"
                    >
                      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {breaking ? 'Дроблю…' : 'Раздробить на первое движение'}
                    </button>
                    {breakFailed && (
                      <p className="t-meta" style={{ color: 'var(--ivory-500)' }}>
                        Не получилось раздробить — я сейчас без связи. Напиши
                        сам самое маленькое: что можно сделать прямо не вставая?
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* #32 · Скелетон повторяет ФОРМУ будущего списка: три строки
                разной длины, а не серый блок. Подмена контентом происходит
                без сдвига раскладки. */}
            {breaking && !brokenSteps && (
              <div className="flex flex-col gap-1.5 pt-1" aria-hidden="true">
                {['82%', '64%', '73%'].map((w, i) => (
                  <div
                    key={w}
                    className="step-skeleton h-11 rounded-[16px] bg-foreground/[0.06]"
                    style={{ width: w, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}

            {brokenSteps && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="t-micro" style={{ color: 'var(--ivory-500)' }}>
                  Выбери одно — остальное я запомню
                </p>
                <div className="flex flex-col gap-1.5" role="group" aria-label="Микрошаги">
                  {brokenSteps.map((step, i) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => {
                        // Остальные шаги не выбрасываются: очередь помнит их
                        // и сама предложит следующий после этой сессии.
                        void saveStepQueue(
                          task,
                          brokenSteps.filter((s) => s !== step),
                        )
                        hapticSelection()
                        setTask(step)
                        setBrokenSteps(null)
                      }}
                      className="press-state surface-quiet flex items-center justify-between gap-2 rounded-[16px] px-3.5 py-3 text-left t-secondary font-medium text-foreground"
                    >
                      <span className="min-w-0">{step}</span>
                      {/*
                        #32 · Самый лёгкий помечен ВСЛУХ, а не выбран
                        молча за человека. Скрытый предвыбор — это решение,
                        принятое без него и без объяснения; подпись — это
                        подсказка, от которой можно отказаться.
                      */}
                      {i === 0 && (
                        <span className="shrink-0 t-micro text-primary">самое лёгкое</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------- Длительность ------------------------- */}

          <div className="flex flex-col gap-2">
            <span className="t-eyebrow">Сколько побудем</span>
            <div className="flex gap-2">
              {DURATIONS.map((d) => {
                const active = minutes === d
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (minutes !== d) hapticSelection()
                      setMinutes(d)
                      setDurationTouched(true)
                    }}
                    aria-pressed={active}
                    /* #54 · Активный сегмент приподнимается на 1px. Не
                       свечение и не три одновременно горящие карточки:
                       выбранное просто чуть ближе к человеку. */
                    className={`press-state flex flex-1 flex-col items-center gap-0.5 rounded-[18px] px-2 py-3 transition-transform ${
                      active
                        ? 'surface-active -translate-y-px text-foreground'
                        : 'surface-quiet text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1 tabular-nums t-card font-semibold">
                      {active && (
                        <Check className="chip-check size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      )}
                      {d} мин
                    </span>
                    <span
                      className="t-micro"
                      style={{ color: active ? 'var(--ivory-100)' : 'var(--ivory-500)' }}
                    >
                      {DURATION_LABEL[d]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/*
              #35, #54 · Объяснение рекомендации — под группой, с
              фиксированной высотой в две строки: без неё контейнер прыгал
              бы на каждой смене выбора, и сам акт выбора сопровождался бы
              скачком раскладки. Crossfade по ключу, не мгновенная подмена.
            */}
            <div className="flex min-h-[40px] items-start">
              <AnimatePresence mode="wait">
                <motion.p
                  key={durationTouched ? `own-${minutes}` : 'advice'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="t-meta"
                  style={{ color: 'var(--ivory-500)' }}
                >
                  {!durationTouched && advice.reason
                    ? advice.reason
                    : minutes === 15
                      ? 'Короткий разгон, если просто нужно сдвинуться с места.'
                      : minutes === 25
                        ? 'Классический фокус-блок, не выматывает.'
                        : 'Для дела, в которое стоит погрузиться.'}
                </motion.p>
              </AnimatePresence>
            </div>

            {/*
              #36 · «Другое время» раскрывается ПОСТЕПЕННО. Степпер, видимый
              сразу, — это четвёртый вариант рядом с тремя, то есть ровно
              то расширение выбора, которого мы избегали тремя кнопками
              выше. Тем, кому нужно своё, — один тап; остальным — ничего.
            */}
            {!customOpen ? (
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="press-state inline-flex min-h-11 w-fit items-center px-1 t-secondary underline-offset-4 hover:underline"
                style={{ color: 'var(--ivory-500)' }}
              >
                Другое время
              </button>
            ) : (
              <div className="surface-quiet flex items-center justify-between gap-3 rounded-[18px] px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(5, minutes - 5)
                    if (next !== minutes) hapticSelection()
                    setMinutes(next)
                    setDurationTouched(true)
                  }}
                  aria-label="Меньше на пять минут"
                  className="press-state flex size-11 items-center justify-center rounded-[14px] t-task font-semibold text-foreground"
                >
                  −
                </button>
                <span className="tabular-nums t-card font-semibold text-foreground">
                  {minutes} мин
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(120, minutes + 5)
                    if (next !== minutes) hapticSelection()
                    setMinutes(next)
                    setDurationTouched(true)
                  }}
                  aria-label="Больше на пять минут"
                  className="press-state flex size-11 items-center justify-center rounded-[14px] t-task font-semibold text-foreground"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* ----------------------------- CTA ----------------------------- */}

          <div ref={ctaRef} className="flex flex-col gap-2 pt-1">
            {/*
              #39 · DISABLED ОБЪЯСНЯЕТ ПРИЧИНУ. Серая кнопка без объяснения —
              тупик: человек видит, что нельзя, и не видит, что сделать.
              Причина стоит НАД кнопкой (её читают до попытки нажать) и
              уходит скринридеру тем же текстом через aria-describedby, а не
              только цветом.
            */}
            {!ready && (
              <p
                id="cta-reason"
                className="text-center t-meta"
                style={{ color: 'var(--ivory-500)' }}
              >
                Напиши одно маленькое действие.
              </p>
            )}
            <button
              type="button"
              onClick={start}
              disabled={!ready || starting}
              aria-describedby={!ready ? 'cta-reason' : undefined}
              /* 56px — зона большого пальца. Кнопка живёт в потоке, а не
                 прибита к низу навсегда: прибитый CTA закрывает содержимое
                 на коротком экране, а sticky-двойник ниже появляется
                 ровно тогда, когда исходная кнопка ушла из вида. */
              className="press-state flex h-[56px] w-full items-center justify-center rounded-[18px] bg-primary t-body font-semibold text-primary-foreground disabled:opacity-40"
            >
              {/* #38 · Текст CTA говорит, что произойдёт, а не «Начать» */}
              {starting ? 'Готовлю место…' : ready ? `Начать ${minutes} минут` : 'Сначала выбери первое движение'}
            </button>
            {/* #40 · Честный контракт рядом с кнопкой, не мелким шрифтом
                внизу экрана: правила названы ДО нажатия. */}
            <p className="text-center t-meta" style={{ color: 'var(--ivory-500)' }}>
              Старт оставит след. Росток появится после первого движения.
            </p>
          </div>
        </motion.div>

        {/*
          #37 · Sticky-двойник CTA: только когда исходная кнопка ушла за
          пределы своего скролл-контейнера (см. IntersectionObserver выше —
          он честно смотрит на клиппинг предком с overflow-hidden, не
          только на границы всего вьюпорта).
          bottom-20 (80px), не bottom-0: страница (page.tsx) резервирует
          ровно эти 80px под фикс-нав через собственный pb-20 — тот же
          отступ и здесь, иначе дубликат CTA садится точно туда же, откуда
          мы только что убрали оригинал: под таб-бар.
        */}
        <AnimatePresence>
          {ctaOutOfView && !folding && (
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="surface-float fixed inset-x-0 bottom-20 z-30 px-4 pt-3 pb-3"
            >
              <button
                type="button"
                onClick={start}
                disabled={!ready || starting}
                className="press-state mx-auto flex h-[56px] w-full max-w-md items-center justify-center rounded-[18px] bg-primary t-body font-semibold text-primary-foreground disabled:opacity-40"
              >
                {starting
                  ? 'Готовлю место…'
                  : ready
                    ? `Начать ${minutes} минут`
                    : 'Сначала выбери первое движение'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  /* ============================= RUNNING ============================= */

  if (phase === 'running') {
    const lastMinute = secondsLeft <= 60 && secondsLeft > 0
    /*
     * #43 · ПРОГРЕСС НЕ ДАВИТ. Первые две трети дуга держится на низкой
     * заметности: цель ещё далеко, и подсвечивать расстояние до неё —
     * значит весь этот отрезок напоминать, сколько ещё осталось. В
     * последней четверти она проявляется: goal gradient работает только
     * вблизи цели, а раньше просто утомляет.
     */
    const ringVisible = progress >= 0.75
    const ringOpacity = ringVisible ? 1 : 0.32

    return (
      <>
        {/* Скрим под подвалом: горизонт в фоне общий на все три экрана и сам
            по себе ничего не гасит под собой — карточки Дома отделяются
            своим фоном, а здесь сноска висела бы голым текстом прямо на
            силуэтах ростка/ёлки/фонаря. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 h-[34vh] bg-gradient-to-t from-background/85 to-transparent"
        />
        {/*
         * Контейнер сцены — та же ловушка, что задокументирована в §5.2
         * проекта: центрирование flex-контента, который может оказаться
         * выше своего бокса, тихо выталкивает верх за пределы вьюпорта —
         * человек не увидит ни «Сейчас», ни задачу, и не поймёт, что
         * прокрутки для этого не предусмотрено вовсе (justify-center без
         * overflow не даёт добраться до утраченной части скроллом).
         * justify-[safe_center] — ровно то исключение в спецификации flexbox,
         * для которого оно придумано: центрирует, ПОКА контент помещается,
         * и откатывается к выравниванию по старту, если нет — старт всегда
         * остаётся доступным. overflow-y-auto + min-h-0 — второй слой
         * защиты для браузеров без поддержки safe-центрирования: тогда то
         * же самое достигается прокруткой, а не невидимым обрезанием.
         * pb-24 (96px, не vh): страница уже резервирует нижние 80px под
         * фикс-нав (page.tsx, h-dvh + pb-20) — этот отступ держит контент
         * ещё и выше гряды силуэтов на фоне, фиксированным числом, а не
         * долей вьюпорта, которая на разных экранах даёт разный запас.
         */}
        <motion.div
          className="focus-dim mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-[safe_center] gap-5 overflow-y-auto px-4 pb-24 pt-8"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          {/*
            #44 · ЗАДАЧА ОСТАЁТСЯ ВИДИМОЙ — и стоит НАД таймером, а не под
            ним. Порядок не косметика: человек, поднявший глаза от работы,
            должен первым делом увидеть, чем он занят, и только потом
            сколько осталось. Обратный порядок превращает экран в таймер с
            подписью вместо «я делаю вот это, и время идёт».
          */}
          <div className="flex flex-col items-center gap-1">
            <span className="t-eyebrow">Сейчас</span>
            <p
              className={`max-w-[19rem] text-balance text-center t-task font-semibold text-foreground ${
                showFullTask ? '' : 'line-clamp-2'
              }`}
            >
              {task}
            </p>
            {!showFullTask && task.length > 60 && (
              <button
                type="button"
                onClick={() => setShowFullTask(true)}
                className="min-h-11 px-2 t-meta underline-offset-4 hover:underline"
                style={{ color: 'var(--ivory-500)' }}
              >
                Показать полностью
              </button>
            )}
          </div>

          {/* Существо — центр сцены: дышит, радуется четвертям, встречает
              из отвлечения. Кольцо прогресса — на нём же: время читается на
              том объекте, за которым и так следит взгляд. */}
          <div className="relative flex items-center justify-center">
            <svg
              className="pointer-events-none absolute -inset-4"
              viewBox="0 0 156 156"
              aria-hidden="true"
            >
              <circle
                cx="78"
                cy="78"
                r="72"
                fill="none"
                stroke="color-mix(in oklab, var(--foreground) 12%, transparent)"
                strokeWidth="4"
              />
              <circle
                cx="78"
                cy="78"
                r="72"
                fill="none"
                stroke={lastMinute ? 'var(--ember-400)' : 'var(--primary)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 72}
                style={{
                  strokeDashoffset: 2 * Math.PI * 72 * (1 - progress),
                  transform: 'rotate(-90deg)',
                  transformOrigin: '78px 78px',
                  opacity: ringOpacity,
                  transition: reducedMotion
                    ? 'none'
                    : 'stroke-dashoffset 1s linear, opacity 3s ease, stroke 4s ease',
                }}
              />
            </svg>
            <motion.div
              animate={
                reducedMotion
                  ? undefined
                  : { y: [0, -4, 0], rotate: [0, 0, -1.5, 0, 1.5, 0, 0] }
              }
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MascotSvg
                expression={cheering || backFromDrift ? 'happy' : 'focused'}
                label="Напарник работает рядом"
                size={130}
              />
            </motion.div>
          </div>

          {/*
            #42 · ТАЙМЕР — ГЛАВНЫЙ ОБЪЕКТ. 64px, tabular-nums: ширина цифр
            не меняется, поэтому строка не дёргается на каждой секунде, и
            периферийное зрение не ловит это движение как событие.
            Разделитель не мигает по той же причине.
            #57 · В последнюю минуту цвет уходит в ember, а не в красный:
            приближение конца — это приближение награды, а не провала.
          */}
          {hideDigits ? (
            <p className="t-voice" style={{ color: 'var(--ivory-500)' }}>
              время идёт — я слежу
            </p>
          ) : (
            // role="timer" имеет implicit aria-live="off": polite означал бы
            // объявление КАЖДОЙ секунды скринридером.
            <div
              role="timer"
              aria-label={`Осталось ${Math.floor(secondsLeft / 60)} минут`}
              className={`text-[64px] font-bold leading-none tabular-nums tracking-tight ${
                lastMinute ? 'timer-final' : ''
              }`}
            >
              {mm}:{ss}
            </div>
          )}

          {/*
            #46 · РЕЖИМ «ПРОСТО ОСТАТЬСЯ». Если человек ещё ничего не
            сделал, приложение не давит. Строка снимает страх провала —
            и при этом НЕ выдаёт росток: награда за присутствие
            обесценила бы награду за действие, а вместе с ней и само
            различие между ними.
          */}
          <p
            className="max-w-[19rem] text-balance text-center t-voice-sm"
            style={{ color: 'var(--ivory-500)' }}
          >
            {backFromDrift
              ? 'Ты отходил — это нормально. Фокус продолжался, мы всё ещё в деле.'
              : cheering
                ? 'Четверть пути позади. Идём.'
                : movementDone
                  ? voice
                  : 'Можно просто побыть рядом с делом. Это тоже возвращение.'}
          </p>

          {/*
            #45 · ПОДТВЕРЖДЕНИЕ ПЕРВОГО ДВИЖЕНИЯ — ненавязчиво и по
            собственной воле. Никакого всплывающего «ну как, начал?» через
            пятнадцать секунд: это ровно то прерывание, от которого продукт
            обещает защищать. После нажатия кнопка превращается в статус и
            больше не показывается в этой сессии — задача сделана, обсуждать
            нечего.
          */}
          <AnimatePresence mode="wait">
            {movementDone ? (
              <motion.p
                key="done"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
                className="flex items-center gap-2 t-secondary text-primary"
              >
                <Sprout className="size-4 shrink-0" aria-hidden="true" />
                Росток ждёт тебя на острове
              </motion.p>
            ) : (
              <motion.button
                key="confirm"
                type="button"
                onClick={confirmMovement}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="press-state surface-quiet flex min-h-11 items-center gap-2 rounded-[16px] px-4 py-2.5 t-secondary font-medium text-foreground"
              >
                {/*
                  Пустое кольцо, не Check: тот же залитый галочкой значок,
                  что уже используется как «выбрано» на чипах и длительности
                  (#29, #54), здесь — на кнопке, которая ЕЩЁ НЕ нажата —
                  визуально читался как «уже подтверждено» ДО тапа (поймано
                  на реальном скриншоте: кадр до клика неотличим от кадра
                  после). Circle держит контракт чётким: заливка появляется
                  только в подтверждённом состоянии выше, а не заранее.
                */}
                <Circle className="size-4 shrink-0 text-primary" aria-hidden="true" />
                Первое движение сделано
              </motion.button>
            )}
          </AnimatePresence>

          {/* -------------------- Периферия сессии -------------------- */}

          <div className="flex flex-col items-center gap-3 pt-1">
            {/* #47 · Один контрол звука, три состояния, выбор запоминается. */}
            <div className="flex items-center gap-3">
              <span className="t-micro" style={{ color: 'var(--ivory-500)' }}>
                Костёр
              </span>
              <button
                type="button"
                onClick={cycleAmbient}
                aria-label={`Костёр: ${AMBIENT_LABEL[ambient]}. Нажми, чтобы сменить`}
                className="press-state surface-quiet flex min-h-11 items-center gap-1 rounded-[16px] px-1 py-1"
              >
                {AMBIENT_ORDER.map((level) => (
                  <span
                    key={level}
                    className={`rounded-[12px] px-2.5 py-1.5 t-micro ${
                      ambient === level
                        ? 'bg-primary/15 font-semibold text-primary'
                        : 'text-[var(--ivory-500)]'
                    }`}
                  >
                    {AMBIENT_LABEL[level]}
                  </span>
                ))}
              </button>
            </div>

            <button
              type="button"
              onClick={toggleDigits}
              className="min-h-11 px-2 t-meta underline-offset-2 hover:underline"
              style={{ color: 'var(--ivory-500)' }}
            >
              {hideDigits ? 'показать цифры' : 'спрятать цифры'}
            </button>

            {/* #48 · Раннее завершение НЕ прячем — прятать выход значит
                делать экран ловушкой, а ловушка стоит доверия ко всему
                продукту. Но и не завершаем по одному тапу: лист объясняет,
                что именно сохранится. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEndSheetOpen(true)}
              className="h-11 rounded-full px-5 t-secondary"
              style={{ color: 'var(--ivory-500)' }}
            >
              Закончить раньше
            </Button>
          </div>
        </motion.div>

        {/* ----------------- #48 · Лист подтверждения ----------------- */}
        <AnimatePresence>
          {endSheetOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-40 bg-black/50"
                onClick={() => setEndSheetOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Закончить этот фокус?"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="surface-float fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] px-4 pt-5"
                style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
              >
                <div className="mx-auto flex max-w-md flex-col gap-3">
                  <p className="t-card font-semibold text-foreground">
                    Закончить этот фокус?
                  </p>
                  {/* Честно и без обвинения: что сохранится, а что нет.
                      Второе предложение — не угроза, а правило, названное
                      заранее; человек имеет право знать цену до выбора. */}
                  <p className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
                    След за возвращение сохранится.
                    <br />
                    {movementDone
                      ? 'Росток появится — первое движение ты уже сделал.'
                      : 'Росток появится, если первое движение уже сделано.'}
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    {/* Главная кнопка листа — ОСТАТЬСЯ. Порядок и вес
                        отражают, чего человек чаще хочет на самом деле,
                        когда открывает такой лист, но выход остаётся
                        полноразмерным и легко достижимым: подталкивать
                        можно, ловить — нельзя. */}
                    <button
                      type="button"
                      onClick={() => setEndSheetOpen(false)}
                      className="press-state flex h-[54px] w-full items-center justify-center rounded-[18px] bg-primary t-body font-semibold text-primary-foreground"
                    >
                      Остаться ещё немного
                    </button>
                    <button
                      type="button"
                      onClick={() => finish(true)}
                      className="press-state surface-quiet flex h-[48px] w-full items-center justify-center t-secondary font-medium text-foreground"
                    >
                      Закончить
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    )
  }

  /* ============================== DONE ============================== */

  return (
    // Тот же safe-center + overflow-y-auto, что в running: находка, план и
    // выбор после сессии — самый длинный контент экрана, и на компактных
    // вьюпортах он не обязан помещаться в один кадр без прокрутки.
    <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col items-center justify-[safe_center] gap-6 overflow-y-auto px-4 py-8">
      <MascotSvg expression="excited" label="Напарник радуется" size={110} />
      <div className="flex flex-col gap-2 text-center">
        {/*
          #50 · РАЗНЫЕ ИТОГИ ДЛЯ РАЗНЫХ ДЕЙСТВИЙ. Один «Сделано!» на все
          случаи врёт сразу в двух направлениях: тому, кто открыл экран и
          вышел, и тому, кто отработал сорок пять минут. Человек знает, что
          он сделал, — и несовпадение с текстом считывает мгновенно, после
          чего перестаёт верить и честной похвале тоже.
        */}
        <h2 className="t-display font-bold">
          {endedEarly
            ? movementDone
              ? 'Первое движение сделано.'
              : 'Ты вернулся к делу.'
            : `${minutes} минут завершены.`}
        </h2>
        <p className="t-voice" style={{ color: 'var(--ivory-500)' }}>
          {doneVoice ?? fallbackVoice[endedEarly ? 'early-exit' : 'done']}
        </p>
      </div>

      {/* Пик — находка прорастает НА настоящем острове, не на карточке
          поверх него. RevealIsland ведёт хореографию предвкушение →
          прорастание и зовёт onRevealed, когда пора показывать выбор. */}
      {grownElement && (
        <motion.div
          className="w-full"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0.3 } : { duration: 0.5, ease: 'easeOut' }}
        >
          <Link
            href="/app/world"
            className="press-state surface-card group flex w-full flex-col items-center gap-2 overflow-hidden px-4 pb-4 pt-3 text-center"
          >
            <RevealIsland
              landmarksUnlocked={grownElement.landmarksUnlocked}
              finds={grownElement.finds}
              newItem={grownElement.newItem}
              rarity={grownElement.rarity}
              onRevealed={() => {
                /*
                 * #51 · СНАЧАЛА НАГРАДА, ПОТОМ ВЫБОР. Пауза перед
                 * появлением кнопок — не задержка ради задержки: пока на
                 * экране четыре CTA, награда конкурирует с ними за
                 * взгляд и перестаёт быть пиком. Конец, превращённый в
                 * панель управления, не запоминается.
                 */
                window.setTimeout(() => setRestRevealed(true), reducedMotion ? 0 : 600)
              }}
            />
            <span
              className={`t-micro font-mono uppercase tracking-widest ${
                grownElement.rarity === 'rare' ? 'text-reward' : 'text-primary'
              }`}
            >
              {grownElement.rarity === 'landmark'
                ? 'на острове появилось'
                : RARITY_LABEL[grownElement.rarity]}
            </span>
            <span className="text-balance t-task font-bold">{grownElement.name}</span>
          </Link>
        </motion.div>
      )}

      <motion.div
        className="flex w-full flex-col items-center gap-6"
        initial={false}
        animate={{ opacity: restRevealed ? 1 : 0, y: restRevealed ? 0 : 12 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{ pointerEvents: restRevealed ? 'auto' : 'none' }}
        aria-hidden={!restRevealed}
      >
        {!planSaved ? (
          !planFormOpen ? (
            <div className="flex w-full flex-col gap-2">
              {/* Однотаповый договор: на пике печатать — стена. Если из
                  дробления остался следующий шаг — план продолжает ту же
                  задачу; иначе «это же дело» повторяется завтра. */}
              <button
                type="button"
                onClick={() => {
                  void savePlan({
                    task: nextUp.queueTask ?? task,
                    firstStep: nextUp.step ?? task,
                  })
                  setPlanSaved(true)
                }}
                className="press-state surface-quiet flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="t-secondary font-semibold text-foreground">
                    {nextUp.step ? 'Завтра — следующий шаг' : 'Это же дело — завтра'}
                  </span>
                  <span className="truncate t-secondary" style={{ color: 'var(--ivory-500)' }}>
                    «{nextUp.step ?? task}»
                  </span>
                </span>
                <span className="shrink-0 t-micro font-mono uppercase tracking-widest text-primary">
                  один тап
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPlanFormOpen(true)}
                className="press-state surface-quiet flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="t-secondary font-semibold text-foreground">
                  Своё дело на завтра
                </span>
                <ChevronRight
                  className="size-4"
                  style={{ color: 'var(--ivory-500)' }}
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            <div className="surface-card flex w-full flex-col gap-3 p-4">
              <p className="t-secondary font-semibold text-foreground">
                Договоримся с завтрашним собой?
              </p>
              <input
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="Что завтра важно"
                aria-label="Дело на завтра"
                className="surface-quiet h-11 rounded-[16px] px-4 text-base outline-none placeholder:text-[var(--ivory-500)]"
              />
              <input
                value={tomorrowStep}
                onChange={(e) => setTomorrowStep(e.target.value)}
                placeholder="Первое крошечное движение"
                aria-label="Первое движение завтрашнего дела"
                className="surface-quiet h-11 rounded-[16px] px-4 text-base outline-none placeholder:text-[var(--ivory-500)]"
              />
              <Button
                size="lg"
                onClick={saveTomorrowPlan}
                disabled={!tomorrowTask.trim() || !tomorrowStep.trim()}
                className="h-11 font-semibold"
              >
                Положить план
              </Button>
              <p className="text-center t-micro" style={{ color: 'var(--ivory-500)' }}>
                можно пропустить — это не обязанность
              </p>
            </div>
          )
        ) : (
          <div className="surface-card flex w-full flex-col gap-1 p-4 text-center">
            <p className="t-secondary font-semibold text-foreground">
              План лежит. Утром напишу первым.
            </p>
            <p className="t-secondary" style={{ color: 'var(--ivory-500)' }}>
              Просто открой эту страницу утром — первое слово будет за мной.
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-2">
          {nextUp.tease && (
            <p className="text-center t-micro" style={{ color: 'var(--ivory-500)' }}>
              {nextUp.tease}
            </p>
          )}

          {/*
            #52 · ГЛАВНАЯ КНОПКА — «ВЕРНУТЬСЯ ДОМОЙ», не «ещё одна сессия».
            Что было: продолжение стояло первым и было лаймовым, а уход —
            бледной ghost-строкой. Для продукта, обещающего «без стыда»,
            это тихое противоречие: экран визуально одобрял только тех, кто
            продолжает, и эмоционально наказывал за нормальное завершение —
            ровно за то поведение, которое здесь и должно быть нормой.
            Продолжить по-прежнему можно в один тап, и кнопка полноразмерная.
          */}
          <Button
            render={<Link href="/app" />}
            nativeButton={false}
            size="lg"
            className="h-[54px] w-full font-semibold"
          >
            Вернуться домой
          </Button>
          <button
            type="button"
            className="press-state surface-quiet flex h-[48px] w-full items-center justify-center px-4 t-secondary font-medium text-foreground"
            onClick={() => {
              // Очередь дробления сама подставляет следующий микрошаг —
              // продолжение той же работы в один тап
              setTask(nextUp.step ?? '')
              setDoneVoice(null)
              setEndedEarly(false)
              setGrownElement(null)
              setMovementDone(false)
              setShowFullTask(false)
              setPhase('setup')
            }}
          >
            <span className="line-clamp-1 text-pretty">
              {nextUp.step ? `Продолжить: «${nextUp.step}»` : `Продолжить ещё ${minutes} минут`}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
