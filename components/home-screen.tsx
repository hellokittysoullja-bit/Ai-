"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
import { CompanionChat } from "@/components/companion-chat";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import {
  getActiveSession,
  getCompanionName,
  getFinds,
  getPatterns,
  getPlan,
  getSessionResult,
  consumeSessionResult,
  getStarts,
  getStepQueue,
  saveCompanionName,
  savePlan,
  todayKey,
  type ActiveSession,
  type Patterns,
  type Plan,
  type SessionResult,
} from "@/lib/memory";
import { LANDMARK_COUNT } from "@/lib/island-elements";
import {
  enableCheckins,
  getCheckinState,
  mirrorCompanionName,
  registerServiceWorker,
  type CheckinState,
} from "@/lib/checkin";
import { Bell } from "lucide-react";
import { GreetingSkeleton } from "@/components/skeletons";
import { SPRING_GESTURE } from "@/lib/motion";
import { recommendDuration, type DurationAdvice } from "@/lib/duration";
import { hapticStart } from "@/lib/haptics";
import {
  FirstMovementCard,
  type MovementSource,
} from "@/components/home/first-movement-card";
import { SessionDock, StickyContext } from "@/components/home/session-dock";
import { IslandDisclosure } from "@/components/home/island-disclosure";
import { ReturnResult } from "@/components/home/return-result";

type FirstWord = {
  greeting: string;
  /** Типографическое правило: рукописный шрифт — ТОЛЬКО голос существа.
      Инструкция интерфейса («выбери шаг ниже») — системный шрифт, отдельным
      полем: декоративные шрифты читаются медленнее (legibility-исследования),
      а смешение голоса и UI-указаний в одном пузыре размывает персонажа */
  hint?: string;
  /** Есть план на сегодня — показываем кнопку «Начинаю» */
  actionStep: string | null;
  /** Новичок без стартов — показываем чипы мгновенного первого старта */
  showStarterChips?: boolean;
  /** Вечер без плана у опытного: предлагаем однотаповый договор на завтра.
      Печатать план в 23:00 — стена (Fogg: ability на нуле в момент
      максимальной мотивации). Один тап из уже известного шага — мост. */
  offerEveningPlan?: boolean;
  /** Глубокая ночь (0:00–4:59). Инвертирует целевое действие экрана:
      единственный акцент — «положить план и лечь», старт уходит в тихую
      второстепенную ссылку. Механика, которой нет ни на одном другом
      экране: здесь продукт осознанно ПОВЫШАЕТ трение до старта, потому
      что в этот час вредное действие — именно старт. */
  nightMode?: boolean;
};

/**
 * Единая граница ночи. Раньше порогов было два — `hour < 4` для реплики
 * (buildFirstWord) и `hour < 5` для выражения маскота. Расхождение в один
 * час создавало зону 4:00–4:59, где кот УЖЕ спал глазами, но текст всё
 * ещё требовал «начни прямо сейчас» — два канала интерфейса
 * противоречили друг другу. Одна константа делает это невозможным.
 */
const NIGHT_UNTIL_HOUR = 5;

/** Готовые крошечные шаги: ноль решений до первого старта */
const starterChips = [
  "Открыть нужный файл",
  "Убрать одну вещь со стола",
  "Написать одно предложение",
];

/**
 * Дневник отсутствия: напарник жил на острове, пока человека не было.
 * Возврат через любопытство и привязанность, никогда — через вину.
 * Выбор события детерминированный, чтобы не менялся при каждом рендере.
 */
const awayDiary = [
  "Пока тебя не было, я рыбачил у причала. Море было тихое. Остров стоит, ничего не сгорело.",
  "Я тут пересчитал всё, что выросло на острове, — всё на месте. Пауза — это пауза, не откат.",
  "Без тебя я смотрел на волны и гадал, что вырастет от твоего следующего старта.",
  "Я развёл костёр и просто ждал. Это не упрёк — я рад, что ты зашёл.",
];

type IntroChoice = "procrastinate" | "curious" | null;

function buildFirstWord(
  plan: Plan | null,
  patterns: Patterns,
  now: Date,
  companionName: string | null,
  intro: IntroChoice = null,
  lastFindName: string | null = null,
): FirstWord {
  const hour = now.getHours();
  // Ночь отделена от вечера. Прежнее `hour >= 18 || hour < 4` называло
  // 2 часа ночи «вечером» (интерфейс врал) и оставляло 4:00–4:59 вообще
  // без ветки — этот час падал в дневную реплику «начни прямо сейчас».
  const isNight = hour < NIGHT_UNTIL_HOUR;
  const isEvening = hour >= 18;
  // Поздние ветки «план уже лежит» одинаковы для вечера и ночи: в 23:00 и
  // в 4:00 верный ответ один — «можешь спать спокойно».
  const isLate = isEvening || isNight;
  const today = todayKey(now);

  // М3 · Ночная весточка: новый день должен приносить новизну (R1).
  const dayN = Math.floor(now.getTime() / 86_400_000);
  const nightTales = [
    lastFindName
      ? `Ночью «${lastFindName}» тихо стояла под звёздами — я сторожил. `
      : "Ночью остров тихо дышал под звёздами — я сторожил. ",
    "Под утро над островом пролетела падающая звезда. Хороший знак. ",
    "Ночью море было гладкое, как стекло. Остров ждёт первый старт дня. ",
    lastFindName
      ? `Мне ночью показалось, что «${lastFindName}» подросла. Проверим после старта? `
      : "К утру на берегу прибавилось ракушек. Остров живёт. ",
  ];
  const nightLine =
    patterns.daysAway === 1
      ? nightTales[(patterns.totalStarts + dayN) % nightTales.length]
      : "";

  // Прощение как дефолт: пауза — это просто пауза.
  const awayLine =
    patterns.daysAway !== null && patterns.daysAway >= 3
      ? awayDiary[(patterns.totalStarts + patterns.daysAway) % awayDiary.length] +
        " "
      : patterns.daysAway !== null && patterns.daysAway === 2
        ? "Ты пришёл. Два дня — это просто два дня, остров всё помнит. "
        : "";

  // Совпадение с личным часом стартов: мягкий, честный толчок из данных
  const hourLine =
    patterns.favoriteHour !== null &&
    patterns.totalStarts >= 3 &&
    hour === patterns.favoriteHour
      ? ` Сейчас ${hour}:00 — обычно именно в это время ты реально начинаешь.`
      : "";

  // ГЛУБОКАЯ НОЧЬ (0:00–4:59). В 04:14 продукт раньше говорил «начни прямо
  // сейчас» — прицельный удар в revenge bedtime procrastination, самый
  // дорогой паттерн этой аудитории. Ветка стоит ВЫШЕ проверки плана
  // намеренно: ночной договор кладёт план на сегодняшнюю дату, и без этого
  // порядка экран, только что сказавший «иди спать», сразу подсовывал бы
  // кнопку старта. Порядок ветвей здесь и есть механика.
  if (isNight && patterns.totalStarts > 0) {
    const clock = `${hour}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (plan) {
      return {
        greeting: `Договорились: когда встанешь — ${plan.firstStep.toLowerCase()}. Больше от тебя сейчас ничего не нужно. Спи, я посторожу остров.`,
        actionStep: null,
        nightMode: true,
      };
    }
    return {
      greeting: `Сейчас ${clock}. Ночь — не время начинать: с недосыпом завтра будет вдвое тяжелее. Давай положим один шаг на утро и разойдёмся.`,
      hint: "Один тап — и всё. Начать всё равно можно, но я бы не советовал.",
      actionStep: null,
      offerEveningPlan: true,
      nightMode: true,
    };
  }

  // План, положенный на сегодня
  if (plan && plan.forDate === today) {
    const time = plan.startTime ? ` в ${plan.startTime}` : "";
    return {
      greeting: `${awayLine}Ты решил: «${plan.task}»${time}. Не думай про всё дело — просто ${plan.firstStep.toLowerCase()}.${hourLine}`,
      actionStep: plan.firstStep,
    };
  }

  if (plan && !isLate) {
    return {
      greeting: `На завтра у нас уже лежит план: «${plan.task}». А сегодня можно ничего не доказывать.`,
      actionStep: null,
    };
  }

  if (plan && isLate) {
    return {
      greeting: `План на завтра уже готов: «${plan.task}», первый шаг — ${plan.firstStep.toLowerCase()}. Утром ${companionName ?? "я"} напишу первым. Можешь спать спокойно.`,
      actionStep: null,
    };
  }

  // Первый визит — ВСЕГДА раньше общей вечерней ветки: план физически не
  // может существовать на первом визите, поэтому раньше вечерняя проверка
  // перехватывала любого новичка, зашедшего вечером, и он не видел ни
  // приветствия, ни стартер-чипов.
  if (patterns.totalStarts === 0) {
    if (intro === "procrastinate") {
      return {
        greeting:
          "Ты сказал, что вечно откладываешь. Это не лечится силой воли — только крошечным стартом. Я рядом.",
        hint: "Выбери крошечный шаг ниже — или напиши, что висит.",
        actionStep: null,
        showStarterChips: true,
      };
    }
    if (intro === "curious") {
      return {
        greeting:
          "Заходи, смотри. Это мой дом, а остров растёт от твоих стартов.",
        hint: "Попробуй один крошечный шаг ниже — увидишь, как это работает.",
        actionStep: null,
        showStarterChips: true,
      };
    }
    return {
      greeting:
        "Привет. Я Напарник. Я не буду учить тебя жить — я помогаю начинать.",
      hint: "Выбери крошечный шаг ниже — или напиши, что висит.",
      actionStep: null,
      showStarterChips: true,
    };
  }

  if (isEvening) {
    return {
      greeting:
        "Вечер — время договориться с завтрашним собой. Один тап ниже — и можно спать спокойно.",
      actionStep: null,
      offerEveningPlan: true,
    };
  }

  return {
    greeting: `${nightLine}${awayLine}Плана на сегодня нет — и это не минус, это ноль.${hourLine}`,
    actionStep: null,
  };
}

/**
 * Первая реплика чата. На нулевом старте — объясняет механику: чат ещё
 * не прожит, объяснение уместно. С первого же старта эта же строка
 * продолжала звучать как онбординг для человека, который её давно знает.
 */
function buildChatGreeting(
  totalStarts: number,
  companionName: string | null,
): string {
  if (totalStarts === 0) {
    return "Это наш чат. Вечером кладём план, днём дробим шаги, всегда — без стыда.";
  }
  const who = companionName ?? "Я";
  if (totalStarts === 1) {
    return `${who} тут. Помню твой первый старт — пиши, что нужно.`;
  }
  const startsWord = totalStarts < 5 ? "старта" : "стартов";
  return `${who} тут. Помню ${totalStarts} твоих ${startsWord} — пиши, что нужно.`;
}

/**
 * СОСТОЯНИЕ ЭКРАНА (#1) — не одна композиция на все случаи жизни.
 *
 * Раньше «Дом» рендерил все свои блоки разом и глушил лишние условиями по
 * месту: приветствие, договор на завтра, стартер-чипы, весточки, карточка
 * награды с CTA внутри, форма имени. Условий было девять штук, они
 * пересекались, и реальные комбинации никто целиком не держал в голове —
 * отсюда кадры, где на экране одновременно жили три просьбы с тремя
 * кнопками.
 *
 * Четыре состояния отвечают на четыре разных вопроса, и в каждом ровно
 * одно главное действие:
 *   focus    — «мой таймер ещё жив?»      → док возврата
 *   returned — «что я заработал?»          → результат и рост острова
 *   task     — «что мне сделать сейчас?»   → карточка первого движения
 *   open     — «а я вообще не знаю»        → короткая реплика и разговор
 */
type HomeState = "focus" | "returned" | "task" | "open";

export function HomeScreen() {
  const router = useRouter();
  const [firstWord, setFirstWord] = useState<FirstWord | null>(null);
  const [stats, setStats] = useState<Patterns | null>(null);

  // Endowment: названное существо становится «моим». Имя спрашиваем
  // после первого старта — когда ценность уже прожита, а не обещана.
  const [companionName, setCompanionName] = useState<string | null>(null);
  const [nameLoaded, setNameLoaded] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [nameBusy, setNameBusy] = useState(false);
  async function giveName(name: string) {
    const trimmed = name.trim();
    if (!trimmed || nameBusy) return;
    setNameBusy(true);
    try {
      await saveCompanionName(trimmed);
      setCompanionName(trimmed);
      void mirrorCompanionName(trimmed);
    } finally {
      setNameBusy(false);
    }
  }

  const [checkinState, setCheckinState] = useState<CheckinState>("unsupported");
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [checkinHint, setCheckinHint] = useState(false);
  async function turnOnCheckins() {
    setCheckinBusy(true);
    const next = await enableCheckins();
    setCheckinState(next);
    setCheckinBusy(false);
    if (
      next === "available" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      setCheckinHint(true);
    }
  }

  const reduceMotion = useReducedMotion();

  // Маскот оживает ТОЛЬКО при возвращении после паузы (daysAway ≥ 1).
  // На каждый mount — НЕ анимируем: habituation убивает дофамин к 5-му визиту.
  const shouldAnimateMascot =
    !reduceMotion &&
    stats !== null &&
    stats.daysAway !== null &&
    stats.daysAway >= 1;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const hour = new Date().getHours();
  const mascotExpression: MascotExpression =
    stats?.daysAway !== null && stats !== null && stats.daysAway >= 2
      ? "happy"
      : firstWord?.actionStep
        ? "focused"
        : mounted && (hour >= 22 || hour < NIGHT_UNTIL_HOUR)
          ? "sleepy"
          : "calm";

  const [lastStepLabel, setLastStepLabel] = useState<string | null>(null);
  // Очередь дробления приоритетнее повтора: «следующий шаг той же задачи» —
  // это продолжение работы, а не её повторение (Zeigarnik на самой работе)
  const [queuedStep, setQueuedStep] = useState<string | null>(null);
  const [queuedTask, setQueuedTask] = useState<string | null>(null);
  const [eveningPlanBusy, setEveningPlanBusy] = useState(false);
  const [rareFound, setRareFound] = useState(0);
  const [pityRipe, setPityRipe] = useState(false);

  // Новое: живая сессия, свежий итог и рекомендация длительности из истории
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [resultShown, setResultShown] = useState(false);
  const [advice, setAdvice] = useState<DurationAdvice>({
    minutes: 15,
    reason: null,
  });
  const [startBusy, setStartBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [plan, patterns, name, starts, finds, queue, active, result] =
      await Promise.all([
        getPlan(),
        getPatterns(),
        getCompanionName(),
        getStarts(),
        getFinds(),
        getStepQueue(),
        getActiveSession(),
        getSessionResult(),
      ]);
    const lastStart = starts.length > 0 ? starts[starts.length - 1] : null;
    setLastStepLabel(lastStart?.label ?? null);
    setQueuedStep(queue?.steps[0] ?? null);
    setQueuedTask(queue?.task ?? null);
    setRareFound(finds.filter((f) => f.rarity === "rare").length);
    setAdvice(recommendDuration(starts));
    let pity = 0;
    for (let i = finds.length - 1; i >= 0 && finds[i].rarity === "common"; i--)
      pity++;
    setPityRipe(pity >= 5);
    const lastFind = finds.length > 0 ? finds[finds.length - 1].name : null;

    /*
     * Живая сессия считается живой, только пока её время не вышло. Иначе
     * док показывал бы «00:00» и звал вернуться в фокус, который уже
     * закончился, — а вкладка Фокуса, восстановив ту же запись, сразу
     * ушла бы в финал. Два экрана рассказывали бы про одну сессию разное.
     */
    if (active && Date.now() - active.startedAt < active.minutes * 60_000) {
      setActiveSession(active);
    } else {
      setActiveSession(null);
    }
    setSessionResult(result);

    let intro: IntroChoice = null;
    try {
      const saved = window.localStorage.getItem("naparnik:intro");
      if (saved === "procrastinate" || saved === "curious") intro = saved;
    } catch {
      /* приватный режим */
    }
    setFirstWord(
      buildFirstWord(plan, patterns, new Date(), name, intro, lastFind),
    );
    setStats(patterns);
    setCompanionName(name);
    setNameLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    void registerServiceWorker();
    void getCheckinState().then(setCheckinState);
  }, [refresh]);

  /*
   * Возврат во вкладку перечитывает состояние. Без этого человек, ушедший
   * из «Дома» в Фокус и вернувшийся кнопкой «назад», видел бы док уже
   * завершённой сессии или не видел бы дока начатой — экран рассказывал бы
   * про мир версию получасовой давности.
   */
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Однотаповый вечерний договор (implementation intentions, Gollwitzer):
  // решение принимается сейчас, на пике вечернего намерения, действие —
  // завтра. Ноль печати: шаг берётся из очереди дробления или последнего старта.
  async function sealEveningPlan() {
    const step = queuedStep ?? lastStepLabel;
    if (!step || eveningPlanBusy) return;
    setEveningPlanBusy(true);
    // Ночью «завтра» календарное и человеческое расходятся на целые сутки:
    // в 4:14 30-го tomorrowKey() даёт 31-е, а человек ляжет и встанет всё
    // ещё 30-го — план оказался бы невидим весь предстоящий день.
    await savePlan({
      task: queuedTask ?? step,
      firstStep: step,
      ...(firstWord?.nightMode ? { forDate: todayKey() } : {}),
    });
    await refresh();
    setEveningPlanBusy(false);
  }

  // Приветствие — голос персонажа, вырезать нельзя. Но с третьего визита
  // это уже не знакомство, а стена текста перед единственной нужной
  // кнопкой — сворачиваем до трёх строк с «Дочитать».
  const [greetingExpanded, setGreetingExpanded] = useState(false);
  const [greetingOverflows, setGreetingOverflows] = useState(false);
  const greetingRef = useRef<HTMLParagraphElement>(null);
  const greetingClamped =
    !!stats && stats.totalStarts >= 3 && !greetingExpanded;

  useEffect(() => {
    if (!greetingClamped) {
      setGreetingOverflows(false);
      return;
    }
    const measure = () => {
      const el = greetingRef.current;
      if (el) setGreetingOverflows(el.scrollHeight - el.clientHeight > 2);
    };
    measure();
    // Рукописный шрифт на момент коммита мог ещё не примениться — высота
    // была бы посчитана по подменному шрифту.
    let cancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!cancelled) measure();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [firstWord?.greeting, greetingClamped]);

  /**
   * ОДНА ПРОСЬБА ЗА ВИЗИТ. Условия показа второстепенных блоков
   * пересекаются, а не исключают друг друга — на экране одновременно
   * оказывались договор на завтра И форма имени поверх карточки с её
   * собственным CTA. Один слот с фиксированным приоритетом:
   *   1) вечерний/ночной договор — привязан к часу, второго шанса не будет;
   *   2) имя — момент присвоения, откладывать дальше некуда;
   *   3) весточки — единственное, что спокойно доживёт до следующего визита.
   */
  const eveningOffer = Boolean(
    firstWord?.offerEveningPlan && (queuedStep ?? lastStepLabel),
  );
  const nameOffer =
    !eveningOffer &&
    nameLoaded &&
    !companionName &&
    stats !== null &&
    stats.totalStarts >= 1 &&
    !firstWord?.actionStep &&
    !firstWord?.nightMode;
  const checkinOffer =
    !eveningOffer &&
    checkinState === "available" &&
    !!companionName &&
    !firstWord?.actionStep;

  /* ---------- Что за движение предлагаем и в каком мы состоянии ---------- */

  const movement: { task: string; source: MovementSource } | null =
    firstWord?.actionStep
      ? { task: firstWord.actionStep, source: "plan" }
      : queuedStep
        ? { task: queuedStep, source: "queue" }
        : lastStepLabel
          ? { task: lastStepLabel, source: "repeat" }
          : null;

  const homeState: HomeState = activeSession
    ? "focus"
    : sessionResult && !resultShown
      ? "returned"
      : // Ночная инверсия и первый визит намеренно НЕ попадают в состояние
        // «task»: у обоих своё целевое действие, и лаймовая карточка старта
        // в них — ровно то, чего быть не должно. Ночью цель экрана — сон,
        // у новичка — мгновенный старт из чипа без выбора длительности.
        movement && !firstWord?.nightMode && !firstWord?.showStarterChips
        ? "task"
        : "open";

  function startMovement() {
    if (!movement || startBusy) return;
    setStartBusy(true);
    // Хаптика — на СОБЫТИЕ старта, не на тап по любой кнопке.
    hapticStart();
    router.push(
      `/app/session?step=${encodeURIComponent(movement.task)}&d=${advice.minutes}${
        movement.source === "plan" ? "&plan=1" : ""
      }`,
    );
  }

  /*
   * STICKY-КОНТЕКСТ появляется, когда карточка первого движения физически
   * ушла из вида. Наблюдаем сам узел, а не считаем скролл: карточка живёт
   * внутри ленты чата, её позиция зависит от высоты приветствия, числа
   * реплик и того, развернул ли человек «Дочитать», — любой расчёт по
   * пикселям здесь рассыпался бы на первом же изменении контента.
   */
  const movementCardRef = useRef<HTMLDivElement>(null);
  const [cardOutOfView, setCardOutOfView] = useState(false);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    const el = movementCardRef.current;
    if (!el || homeState !== "task") {
      setCardOutOfView(false);
      return;
    }
    /*
     * threshold: [0, 1] + intersectionRatio, не threshold: 0 + isIntersecting:
     * isIntersecting истинно уже при ЛЮБОМ ненулевом пересечении, то есть
     * карточка, обрезанная краем ленты до узкой полоски в несколько
     * процентов высоты, всё ещё считалась бы «видимой» — sticky-контекст
     * не появился бы ровно тогда, когда он нужнее всего (см. тот же баг,
     * пойманный рендером на аналогичном наблюдателе в focus-session.tsx).
     */
    const io = new IntersectionObserver(
      ([entry]) => setCardOutOfView(entry.intersectionRatio < 0.98),
      { threshold: [0, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [homeState, movement?.task]);

  /* ------------------------------- Разметка ------------------------------ */

  const introHeader = (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.17_55/0.16)_0%,transparent_70%)]"
          />
          <motion.div
            className="relative"
            animate={
              shouldAnimateMascot ? { scale: [1, 1.14, 0.95, 1.05, 1] } : {}
            }
            transition={{ duration: 0.55, ease: "easeInOut", delay: 0.3 }}
          >
            <MascotSvg
              expression={mascotExpression}
              label={companionName ?? "Напарник"}
              size={52}
            />
          </motion.div>
        </div>
        <AnimatePresence>
          {firstWord ? (
            <motion.div
              key="greeting"
              className="flex flex-col gap-1 pt-1"
              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : SPRING_GESTURE}
            >
              {/* Реплика ужата до двух-трёх строк (#7): эмоциональная
                  первая строка — голосом существа, всё остальное, что
                  нужно СДЕЛАТЬ, живёт в карточке ниже, а не в пузыре.
                  Пузырь, из которого торчит инструкция, — это уже не
                  персонаж, а системное сообщение в рукописном шрифте. */}
              <p
                ref={greetingRef}
                className={`t-voice ${greetingClamped ? "line-clamp-3" : ""}`}
              >
                {firstWord.greeting}
              </p>
              {greetingClamped && greetingOverflows && (
                <button
                  type="button"
                  onClick={() => setGreetingExpanded(true)}
                  className="inline-flex min-h-11 w-fit items-center t-meta underline-offset-4 hover:underline"
                  style={{ color: "var(--ivory-500)" }}
                >
                  Дочитать
                </button>
              )}
              {firstWord.hint && (
                <p className="t-secondary" style={{ color: "var(--ivory-500)" }}>
                  {firstWord.hint}
                </p>
              )}
            </motion.div>
          ) : (
            <GreetingSkeleton key="greeting-skeleton" />
          )}
        </AnimatePresence>
      </div>

      {/* ═══ СОСТОЯНИЕ «ВЕРНУЛСЯ» ═══ */}
      {homeState === "returned" && sessionResult && stats && (
        <ReturnResult
          result={sessionResult}
          landmarksBefore={Math.min(
            Math.max(0, stats.totalStarts - 1),
            LANDMARK_COUNT - 1,
          )}
          onCollapsed={() => {
            // Гасим флаг в памяти, а не только в state: иначе тот же итог
            // встречал бы человека при каждом открытии «Дома» ближайшие два
            // часа, и награда за одну сессию превратилась бы в баннер.
            setResultShown(true);
            void consumeSessionResult();
          }}
        />
      )}

      {/* ═══ СОСТОЯНИЕ «ДЕЛО НАЙДЕНО» — главная карточка экрана ═══ */}
      {homeState === "task" && movement && (
        <FirstMovementCard
          ref={movementCardRef}
          task={movement.task}
          source={movement.source}
          minutes={advice.minutes}
          busy={startBusy}
          onStart={startMovement}
          onOther={() => router.push("/app/session")}
        />
      )}

      {/* Вечерний договор в один тап: шаг уже известен продукту (очередь
          дробления или последний старт) — человеку остаётся согласиться.
          Ночью получает кольцо primary: это единственный акцент экрана. */}
      {eveningOffer && (
        <button
          type="button"
          onClick={sealEveningPlan}
          disabled={eveningPlanBusy}
          className={`press-state flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-60 ${
            firstWord?.nightMode ? "surface-active rounded-[18px]" : "surface-quiet"
          }`}
        >
          <span className="flex min-w-0 items-start gap-2.5">
            <CalendarCheck
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="flex min-w-0 flex-col">
              <span className="t-secondary font-semibold text-foreground">
                {/* Ночью «завтра» звучит как «через сутки» — человек ляжет и
                    встанет в тот же календарный день. «Когда встанешь»
                    совпадает и с его моделью времени, и с forDate. */}
                {firstWord?.nightMode
                  ? queuedStep
                    ? "Когда встанешь — следующий шаг"
                    : "Когда встанешь — это же дело"
                  : queuedStep
                    ? "Завтра — следующий шаг"
                    : "Завтра — это же дело"}
              </span>
              <span
                className="truncate t-secondary"
                style={{ color: "var(--ivory-500)" }}
              >
                «{queuedStep ?? lastStepLabel}»
              </span>
            </span>
          </span>
          <span className="shrink-0 t-micro font-mono uppercase tracking-widest text-primary">
            {eveningPlanBusy ? "кладу…" : "один тап"}
          </span>
        </button>
      )}

      {/* НОЧНАЯ ИНВЕРСИЯ АКЦЕНТА. Днём старт — самый тяжёлый объект экрана.
          В 4:14 та же кнопка кричала «Повторить» поверх реплики «ночь — не
          время начинать»: два взаимоисключающих приказа в одном кадре, и
          побеждал более контрастный. Ночью путь к старту сохранён целиком
          (запрет породил бы сопротивление), но перестаёт быть точкой
          притяжения взгляда — закон Фиттса, применённый наоборот. */}
      {firstWord?.nightMode && stats && stats.totalStarts > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="h-11 gap-2 self-center"
          style={{ color: "var(--ivory-500)" }}
          onClick={() => {
            const quick = queuedStep ?? lastStepLabel;
            return quick
              ? router.push(
                  `/app/session?step=${encodeURIComponent(quick)}&d=15`,
                )
              : router.push("/app/session");
          }}
        >
          Всё равно начать сейчас
        </Button>
      )}

      {/* Новичок: мгновенный старт из чипа, ноль решений до первого действия.
          Длительность не спрашиваем вовсе — 15 минут и вперёд. */}
      {firstWord?.showStarterChips && (
        <div className="flex flex-col gap-2">
          <span className="t-eyebrow">Первый старт за 15 минут — тап и всё</span>
          <div className="flex flex-wrap gap-2">
            {starterChips.map((chip) => (
              <Link
                key={chip}
                href={`/app/session?step=${encodeURIComponent(chip)}&d=15`}
                className="press-state surface-quiet inline-flex min-h-11 items-center rounded-[16px] px-4 py-2 t-secondary font-semibold text-foreground"
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Коллекция — под раскрытием, ниже действия. Скрыта у новичка: «0 из
          10» на первом экране визуализирует ноль, а не обещание. */}
      {stats && stats.totalStarts > 0 && homeState !== "focus" && (
        <IslandDisclosure
          stats={stats}
          rareFound={rareFound}
          pityRipe={pityRipe}
        />
      )}

      {/* Весточки от напарника: предлагаем один раз, после того как человек
          уже назвал существо, и только пока экран свободен от готового шага. */}
      {checkinOffer && (
        <div className="surface-quiet flex flex-col gap-2 p-3.5">
          <div className="flex items-start gap-2">
            <Bell
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p className="t-voice-sm">
              Хочешь, я буду махать тебе с острова раз в день? Один тихий раз,
              без спама — и никаких «ты пропал».
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-11 self-start"
            onClick={turnOnCheckins}
            disabled={checkinBusy}
          >
            {checkinBusy ? "Секунду…" : "Да, махай мне"}
          </Button>
          {checkinHint && (
            <p className="t-meta" style={{ color: "var(--ivory-500)" }}>
              Почти получилось: чтобы я мог писать первым, добавь меня на экран
              «Домой» (Поделиться → На экран «Домой») — и нажми ещё раз.
            </p>
          )}
        </div>
      )}

      {checkinState === "enabled" && !!companionName && (
        <p
          className="flex items-center gap-1.5 t-meta"
          style={{ color: "var(--ivory-500)" }}
        >
          <Bell className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {companionName} будет тихо махать тебе с острова раз в день.
        </p>
      )}

      {/* Просьба об имени ЖДЁТ свободного кадра: когда на экране есть готовый
          первый шаг, единственное нужное действие — начать, а форма имени
          физически отодвигает кнопку от большого пальца. */}
      {nameOffer && (
        <form
          className="surface-quiet flex flex-col gap-2 p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            giveName(nameDraft);
          }}
        >
          <p className="t-voice-sm">
            Слушай… у меня ведь до сих пор нет имени. Дашь мне его? Я буду
            откликаться.
          </p>
          <div className="flex gap-2">
            {/* text-base (16px) на инпуте обязателен: при меньшем кегле
                Safari на iOS зумит всю страницу при фокусе. */}
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Как меня зовут?"
              maxLength={24}
              aria-label="Имя для напарника"
              disabled={nameBusy}
              className="surface-quiet h-11 min-w-0 flex-1 px-3 text-base outline-none disabled:opacity-60"
            />
            <Button
              type="submit"
              size="sm"
              className="h-11"
              disabled={!nameDraft.trim() || nameBusy}
            >
              {nameBusy ? "Запоминаю…" : "Так и зовут"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );

  /**
   * КОНТЕКСТНЫЙ PLACEHOLDER (#14). Вечное «Сообщение Напарнику» не
   * подсказывает ничего — это подпись поля, а не приглашение. Текст
   * подсказки — самая дешёвая помощь, какая бывает: он ничего не занимает
   * и при этом снимает вопрос «а что сюда вообще писать», который для
   * человека с пустым полем и плохим фокусом и есть причина закрыть экран.
   */
  const composerPlaceholder =
    homeState === "focus"
      ? "Напиши, если что-то мешает…"
      : homeState === "returned"
        ? "Расскажи, как прошло…"
        : homeState === "task"
          ? "Что-то мешает начать?"
          : stats?.totalStarts === 0
            ? "Напиши задачу как получится…"
            : "Что сейчас мешает начать?";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* sr-only: без единого heading скринридер не может перескочить сюда
          по заголовкам — визуально ничего не меняет. */}
      <h1 className="sr-only">Напарник — дом</h1>

      {homeState === "task" && movement && (
        <StickyContext
          visible={cardOutOfView}
          task={movement.task}
          minutes={advice.minutes}
          compact={composing}
          onChange={() => router.push("/app/session")}
        />
      )}

      <CompanionChat
        mode="companion"
        greeting={buildChatGreeting(stats?.totalStarts ?? 0, companionName)}
        placeholder={composerPlaceholder}
        onPlanSaved={refresh}
        showSuggestions={!firstWord?.showStarterChips}
        header={introHeader}
        onPullRefresh={refresh}
        onComposingChange={setComposing}
        /* Док живой сессии — над композером, внутри чата: он про состояние
           мира, а не про переписку, но место у него ровно там, куда человек
           смотрит, когда собирается что-то сделать. */
        dock={
          activeSession ? (
            <SessionDock
              session={activeSession}
              onReturn={() => router.push("/app/session")}
            />
          ) : null
        }
        /* Во время сессии чат не подкидывает новых предложений: экран
           «Дома» в этом состоянии обязан быть тише обычного, иначе он
           соревнуется с фокусом, который сам же и запустил. */
        quiet={homeState === "focus"}
      />
    </div>
  );
}
