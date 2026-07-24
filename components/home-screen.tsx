"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { CompanionChat } from "@/components/companion-chat";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import {
  getCompanionName,
  getFinds,
  getPatterns,
  getPlan,
  getStarts,
  saveCompanionName,
  todayKey,
  type Patterns,
  type Plan,
} from "@/lib/memory";
import {
  ISLAND_ELEMENT_NAMES,
  ISLAND_POOL,
  LANDMARK_COUNT,
} from "@/lib/island-elements";
import { landmarkAnchors, landmarkNodes } from "@/lib/island-sprites";
import {
  enableCheckins,
  getCheckinState,
  mirrorCompanionName,
  registerServiceWorker,
  type CheckinState,
} from "@/lib/checkin";
import { Bell } from "lucide-react";

type FirstWord = {
  greeting: string;
  /** Есть план на сегодня — показываем кнопку «Начинаю» */
  actionStep: string | null;
  /** Новичок без стартов — показываем чипы мгновенного первого старта */
  showStarterChips?: boolean;
};

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
  const isEvening = hour >= 18 || hour < 4;
  const today = todayKey(now);

  // М3 · Ночная весточка: новый день должен приносить новизну (R1).
  // Вчера был — сегодня кот рассказывает, что было ночью. Вариативно
  // (по дню и числу стартов), привязано к реальному острову.
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
    patterns.daysAway === 1 ? nightTales[(patterns.totalStarts + dayN) % nightTales.length] : "";

  // Прощение как дефолт (механика Duolingo без её кнута): пауза — это
  // просто пауза. Длинная — дневник острова, короткая — тихая радость.
  const awayLine =
    patterns.daysAway !== null && patterns.daysAway >= 3
      ? awayDiary[
          (patterns.totalStarts + patterns.daysAway) % awayDiary.length
        ] + " "
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

  // План, положенный на сегодня (вчера вечером) или прямо сегодня на сегодня
  if (plan && plan.forDate === today) {
    const time = plan.startTime ? ` в ${plan.startTime}` : "";
    return {
      greeting: `${awayLine}Ты решил: «${plan.task}»${time}. Не думай про всё дело — просто ${plan.firstStep.toLowerCase()}.${hourLine} ${companionName ?? "Я"} рядом, жми кнопку.`,
      actionStep: plan.firstStep,
    };
  }

  // План на завтра уже положен, сейчас день — подтверждение
  if (plan && !isEvening) {
    return {
      greeting: `На завтра у нас уже лежит план: «${plan.task}». А сегодня можно ничего не доказывать. Хочешь — поболтаем, хочешь — начнём что-то маленькое.`,
      actionStep: null,
    };
  }

  if (plan && isEvening) {
    return {
      greeting: `План на завтра уже готов: «${plan.task}», первый шаг — ${plan.firstStep.toLowerCase()}. Утром ${companionName ?? "я"} напишу первым. Можешь спать спокойно.`,
      actionStep: null,
    };
  }

  // Первый визит — ВСЕГДА раньше общей вечерней ветки, вне зависимости от
  // часа. Баг, который чинит эта строка: план физически не может
  // существовать на первом визите, поэтому раньше isEvening-проверка ниже
  // перехватывала любого новичка, зашедшего вечером/ночью — он не видел
  // ни приветствия, ни стартер-чипов, а сразу получал «давай распланируем
  // завтра». Для человека, который только что пришёл с лендинга, это
  // рвёт обещание «попробуй одно крошечное дело — увидишь» и убивает
  // весь эффект нулевого трения до первого старта.
  if (patterns.totalStarts === 0) {
    // К-В · Тёплый старт: выбор, сделанный в диалоге на лендинге, продолжает
    // разговор здесь — раньше он сохранялся и никогда не читался
    if (intro === "procrastinate") {
      return {
        greeting:
          "Ты сказал, что вечно откладываешь. Это не лечится силой воли — только крошечным стартом. Выбери шаг ниже, я рядом.",
        actionStep: null,
        showStarterChips: true,
      };
    }
    if (intro === "curious") {
      return {
        greeting:
          "Заходи, смотри. Это мой дом, а остров растёт от твоих стартов. Попробуй один крошечный шаг — увидишь, как это работает.",
        actionStep: null,
        showStarterChips: true,
      };
    }
    return {
      greeting:
        "Привет. Я Напарник. Я не буду учить тебя жить — я помогаю начинать. Выбери крошечный шаг ниже — и начнём прямо сейчас. Или напиши мне, что висит.",
      actionStep: null,
      showStarterChips: true,
    };
  }

  if (isEvening) {
    return {
      greeting:
        "Вечер — лучшее время договориться с завтрашним собой. Давай за три минуты решим: одно дело, один первый шаг, одно время. Напиши, что завтра важно.",
      actionStep: null,
    };
  }

  return {
    greeting: `${nightLine}${awayLine}Плана на сегодня нет — и это не минус, это ноль. Выбери одно крошечное действие прямо сейчас, или напиши мне, что висит — раздробим.${hourLine}`,
    actionStep: null,
  };
}

/**
 * Первая реплика чата. На нулевом старте — объясняет механику: чат ещё
 * не прожит, объяснение уместно. С первого же старта эта же строка
 * продолжала звучать как онбординг для человека, который её давно знает —
 * лендинг обещает «сообщение от живого существа», а не диктофонную запись.
 * totalStarts и имя уже приходят в HomeScreen из того же refresh(),
 * здесь только выбор реплики, не новый источник данных.
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

export function HomeScreen() {
  const router = useRouter();
  const [firstWord, setFirstWord] = useState<FirstWord | null>(null);
  const [stats, setStats] = useState<Patterns | null>(null);

  // Endowment: названное существо становится «моим». Имя спрашиваем
  // после первого старта — когда ценность уже прожита, а не обещана.
  const [companionName, setCompanionName] = useState<string | null>(null);
  const [nameLoaded, setNameLoaded] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  async function giveName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveCompanionName(trimmed);
    setCompanionName(trimmed);
    // Дублируем имя в IndexedDB, чтобы весточки от напарника были персональными
    void mirrorCompanionName(trimmed);
  }

  // Проактивные весточки: «он пишет первым», когда приложение закрыто.
  // Работает только там, где браузер это умеет (установленная PWA на Chrome).
  const [checkinState, setCheckinState] = useState<CheckinState>("unsupported");
  const [checkinBusy, setCheckinBusy] = useState(false);

  // U5: enableCheckins может вернуть "available" при выданном разрешении —
  // это значит, что нужна установка PWA. Без подсказки кнопка была тупиком:
  // тап → ничего не меняется → тап → ничего.
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

  // reduceMotion объявляем первым — используется ниже
  const reduceMotion = useReducedMotion();

  // Маскот оживает ТОЛЬКО при возвращении после паузы (daysAway ≥ 1).
  // На каждый mount — НЕ анимируем: habituation убивает дофамин к 5-му визиту.
  // Событийный триггер (вернулся!) = surprise = дофамин. Variable Reward.
  const shouldAnimateMascot =
    !reduceMotion &&
    stats !== null &&
    // Событийный триггер: вернулся после паузы ИЛИ первый визит.
    // Первый визит: peak moment bond-formation — маскот должен отреагировать.
    // Возвращение после паузы: Variable Reward — дофамин от surprise.
    // ONLY return after real pause (daysAway≥1) = Variable Reward.
    // totalStarts===0 REMOVED: HomeScreen remounts on every tab switch →
    // bounce would fire 3x/session → habituation → dopamine dies by visit 5.
    // Rare event = dopamine peak. Frequent = background noise.
    stats.daysAway !== null && stats.daysAway >= 1;

  // Выражение маскота по контексту: вернулся после паузы — искренняя радость,
  // есть шаг — собран, поздний вечер — сонный, иначе спокоен
  const hour = new Date().getHours();
  const mascotExpression: MascotExpression =
    stats?.daysAway !== null && stats !== null && stats.daysAway >= 2
      ? "happy"
      : firstWord?.actionStep
        ? "focused"
        : hour >= 22 || hour < 5
          ? "sleepy"
          : "calm";

  const [lastStepLabel, setLastStepLabel] = useState<string | null>(null);
  const [rareFound, setRareFound] = useState(0);

  async function refresh() {
    const [plan, patterns, name, starts, finds] = await Promise.all([
      getPlan(),
      getPatterns(),
      getCompanionName(),
      getStarts(),
      getFinds(),
    ]);
    const lastStart = starts.length > 0 ? starts[starts.length - 1] : null;
    setLastStepLabel(lastStart?.label ?? null);
    setRareFound(finds.filter((f) => f.rarity === "rare").length);
    const lastFind = finds.length > 0 ? finds[finds.length - 1].name : null;
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
  }

  useEffect(() => {
    refresh();
    // Тихо ставим service worker и узнаём, доступны ли весточки
    void registerServiceWorker();
    void getCheckinState().then(setCheckinState);
  }, []);

  function startNow(step: string) {
    router.push(`/app/session?step=${encodeURIComponent(step)}&plan=1`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-white/[0.06] bg-gradient-to-b from-card/55 via-card/15 to-transparent">
        <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
          <div className="flex items-start gap-3">
            {/*
              Mascot: bounce ТОЛЬКО при событии «вернулся после паузы» (daysAway ≥ 1).
              На каждый mount — статичен. Habituation убивает дофамин к 5-му визиту.
              Событийный триггер = Variable Reward = настоящий дофамин.
              keyframes [1, 1.14, 0.95, 1.05, 1] = радостный прыжок, не угроза.

              Тёплое пятно света позади — тот же очаг, что на лендинге, только
              статичный: существо живёт в своём мире и на этом экране, не в
              списке иконок. Continuity без анимационной цены.
            */}
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
            {/*
              Greeting: iMessage pattern — появляется ТОЛЬКО когда данные загружены.
              Не на mount (иначе «…» fade-in = jank = negative prediction error).
              AnimatePresence ждёт firstWord, потом slide-up 0.25s.
            */}
            <AnimatePresence>
              {firstWord ? (
                <motion.p
                  key="greeting"
                  className="pt-1 font-hand text-xl leading-snug"
                  initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  {firstWord.greeting}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Момент дарения имени: один раз, после первого старта.
              Названное существо — уже не приложение, а «мой». */}
          {nameLoaded &&
            !companionName &&
            stats !== null &&
            stats.totalStarts >= 1 && (
              <form
                className="glass flex flex-col gap-2 rounded-2xl p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  giveName(nameDraft);
                }}
              >
                <p className="font-hand text-lg leading-snug">
                  Слушай… у меня ведь до сих пор нет имени. Дашь мне его? Я буду
                  откликаться.
                </p>
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Как меня зовут?"
                    maxLength={24}
                    aria-label="Имя для напарника"
                    className="glass h-10 min-w-0 flex-1 rounded-xl px-3 text-sm"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-10"
                    disabled={!nameDraft.trim()}
                  >
                    Так и зовут
                  </Button>
                </div>
              </form>
            )}

          {/* Весточки от напарника: предлагаем один раз, после того как
              человек уже назвал существо. Только там, где браузер их умеет.
              Ни спама, ни давления — «один тихий раз в день». */}
          {checkinState === "available" && !!companionName && (
            <div className="glass flex flex-col gap-2 rounded-2xl p-3">
              <div className="flex items-start gap-2">
                <Bell
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="font-hand text-lg leading-snug">
                  Хочешь, я буду махать тебе с острова раз в день? Один тихий
                  раз, без спама — и никаких «ты пропал».
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-10 self-start"
                onClick={turnOnCheckins}
                disabled={checkinBusy}
              >
                {checkinBusy ? "Секунду…" : "Да, махай мне"}
              </Button>
              {checkinHint && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Почти получилось: чтобы я мог писать первым, добавь меня на
                  экран «Домой» (Поделиться → На экран «Домой») — и нажми ещё
                  раз.
                </p>
              )}
            </div>
          )}

          {checkinState === "enabled" && !!companionName && (
            <p className="flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
              <Bell
                className="size-3.5 shrink-0 text-primary"
                aria-hidden="true"
              />
              {companionName} будет тихо махать тебе с острова раз в день.
            </p>
          )}

          {firstWord?.actionStep && (
            <Button
              size="lg"
              className="w-full gap-2 font-semibold"
              onClick={() => startNow(firstWord.actionStep as string)}
            >
              <Play className="size-4" aria-hidden="true" />
              Начинаю
            </Button>
          )}

          {/* К-Б → М1 · Главное действие в ОДИН тап и с нулевым решением:
              опытный пользователь получал больше трения, чем новичок
              (3 тапа против 1). Повтор последнего шага — мгновенный старт;
              «Другое дело» — путь в сетап для нового */}
          {stats &&
            stats.totalStarts > 0 &&
            !firstWord?.actionStep &&
            !firstWord?.showStarterChips && (
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full gap-2 font-semibold"
                  onClick={() =>
                    lastStepLabel
                      ? router.push(
                          `/app/session?step=${encodeURIComponent(lastStepLabel)}&d=15`,
                        )
                      : router.push("/app/session")
                  }
                >
                  <Play className="size-4" aria-hidden="true" />
                  {lastStepLabel
                    ? `Повторить: «${
                        lastStepLabel.length > 22
                          ? lastStepLabel.slice(0, 21).trimEnd() + "…"
                          : lastStepLabel
                      }»`
                    : "Начать сессию"}
                </Button>
                {lastStepLabel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 self-center text-muted-foreground"
                    onClick={() => router.push("/app/session")}
                  >
                    Другое дело
                  </Button>
                )}
              </div>
            )}

          {firstWord?.showStarterChips && (
            <div className="flex flex-col gap-2">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Первый старт за 15 минут — тап и всё:
              </p>
              <div className="flex flex-wrap gap-2">
                {starterChips.map((chip) => (
                  <Link
                    key={chip}
                    href={`/app/session?step=${encodeURIComponent(chip)}&d=15`}
                    className="glass glass-interactive press rounded-full px-4 py-2 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {chip}
                  </Link>
                ))}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Каждый старт растит остров →
              </p>
            </div>
          )}

          {/* М2 · Goal gradient: ближайшая цель прогрессии видна прямо с
              Дома (раньше — только в Мире). До 10-го старта — следующий
              ориентир с призрачным силуэтом; дальше — счёт редких находок */}
          {stats && stats.totalStarts > 0 && (
            <Link
              href="/app/world"
              className="glass press flex items-center gap-3 rounded-2xl px-4 py-2.5"
            >
              {stats.totalStarts < LANDMARK_COUNT ? (
                <>
                  <svg
                    viewBox={`${landmarkAnchors[stats.totalStarts].x - 24} ${landmarkAnchors[stats.totalStarts].y - 36} 48 48`}
                    className="h-9 w-9 shrink-0 opacity-60 saturate-[0.35]"
                    aria-hidden="true"
                  >
                    {landmarkNodes[stats.totalStarts]}
                  </svg>
                  <span className="min-w-0 text-sm leading-snug text-muted-foreground">
                    Следующий старт вырастит{" "}
                    <span className="font-semibold text-foreground">
                      «{ISLAND_ELEMENT_NAMES[stats.totalStarts]}»
                    </span>
                    {stats.lastStartDate === todayKey(new Date())
                      ? " — остров уже вырос сегодня, смотри →"
                      : " →"}
                  </span>
                </>
              ) : (
                <span className="text-sm leading-snug text-muted-foreground">
                  Редких находок:{" "}
                  <span className="font-semibold text-reward">
                    {rareFound} из{" "}
                    {ISLAND_POOL.filter((e) => e.rarity === "rare").length}
                  </span>{" "}
                  — полная сессия повышает шанс →
                </span>
              )}
            </Link>
          )}
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <CompanionChat
          mode="companion"
          greeting={buildChatGreeting(stats?.totalStarts ?? 0, companionName)}
          onPlanSaved={refresh}
          showSuggestions={!firstWord?.showStarterChips}
        />
      </div>
    </div>
  );
}
