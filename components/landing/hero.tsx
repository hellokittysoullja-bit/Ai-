"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import { GroundPool, HeroScene } from "@/components/hero-scene";
import { Button } from "@/components/ui/button";
import { SPRING_SNAPPY } from "@/lib/motion";

/**
 * Первый экран: одна плотная композиция вместо двух зон, разбросанных по
 * полутора экранам. Промис (заголовок) поднят В КАДР — на десктопе он больше
 * не уходит под сгиб. Сцена остаётся иммерсивным фоном (её крафт — ров), но
 * слова оффера видны сразу: сцена не важнее промиса, они делят первый экран.
 *
 * Иерархия (сверху вниз, ни одного дубля):
 * - H1 — голос персонажа: «Начать — самое трудное. Я прихожу первым»
 *   с рукописным подчёркиванием слова-обещания (bespoke-деталь);
 * - рядом с чатом — рукописная пометка «даже если ты пропал на неделю» —
 *   расширяет обещание H1, а не повторяет его;
 * - на lg+ — две колонки: оффер слева, существо и чат справа;
 * - подзаголовок — конкретика механики + дифференциатор «без стриков, без стыда»;
 * - живой чат-вход: существо здоровается, ты отвечаешь премиальной репликой —
 *   отличительный интерактивный крючок;
 * - главный CTA виден с первой секунды (не заперт за диалогом), внизу экрана —
 *   подсказка скролла: hero не должен читаться как конец страницы.
 */

const OPENING_LINE =
  "Привет. Я Напарник. Если сил совсем нет — давай просто побудем рядом минуту.";

const REPLIES = {
  procrastinate: {
    visitor: "Вечно откладываю дела",
    companion:
      "Знакомо. Это не лень — мозгу просто нужен кто-то рядом в момент старта. Пойдём, покажу, как это работает.",
  },
  curious: {
    visitor: "Просто посмотреть",
    companion:
      "Заходи. У меня тут остров, который растёт от каждого твоего старта. Попробуй одно крошечное дело — увидишь.",
  },
} as const;

type ReplyKey = keyof typeof REPLIES;

const INTRO_CHOICE_KEY = "naparnik:intro";

type SceneStep = { kind: "companion" | "visitor"; text: string };

function WordReveal({
  text,
  startDelay = 0.55,
  step = 0.085,
  className,
}: {
  text: string;
  startDelay?: number;
  step?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <p className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={i}>
            <span
              className="hero-word"
              style={{
                animationDelay: `${(startDelay + i * step).toFixed(2)}s`,
              }}
            >
              {word}
            </span>{" "}
          </span>
        ))}
      </span>
    </p>
  );
}

function TypedLine({ text, onDone }: { text: string; onDone?: () => void }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? text.length : 0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.();
      return;
    }
    let done = false;
    const fireDone = () => {
      if (!done) {
        done = true;
        onDoneRef.current?.();
      }
    };
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) {
        clearInterval(id);
        fireDone();
      }
    }, 16);
    finishRef.current = () => {
      clearInterval(id);
      setShown(text.length);
      fireDone();
    };
    return () => clearInterval(id);
  }, [text, reduceMotion]);

  return (
    <p
      className="font-hand text-lg leading-snug text-secondary-foreground md:text-2xl"
      onClick={() => finishRef.current()}
    >
      {text.slice(0, shown)}
      {shown < text.length && (
        <span className="ml-0.5 inline-block h-[0.9em] w-0.5 animate-pulse rounded bg-primary align-middle" />
      )}
    </p>
  );
}

export function Hero() {
  const [steps, setSteps] = useState<SceneStep[]>([]);
  const [answered, setAnswered] = useState(false);
  const [expression, setExpression] = useState<MascotExpression>("calm");
  // CTA виден с первой секунды (не заперт за диалогом), но ответ существа
  // всё равно должен закрывать дофаминовую петлю действием, а не повисать
  // в пустоте — импульс на уже видимую кнопку вместо второй, конкурирующей
  const [ctaBoost, setCtaBoost] = useState(false);
  // Клиентский переход на /app не мгновенен (первая загрузка бандла) —
  // 200-300мс без визуального отклика читаются мозгом как «не сработало»,
  // тянет за собой повторный клик. Гвардим от двойного клика в самом
  // обработчике: disabled на Link-рендере base-ui ничего не даёт
  // (:disabled — псевдокласс нативных форм, у <a> его не бывает).
  const [navigating, setNavigating] = useState(false);

  function choose(key: ReplyKey) {
    setAnswered(true);
    setExpression("happy");
    try {
      window.localStorage.setItem(INTRO_CHOICE_KEY, key);
    } catch {
      // приватный режим — не критично
    }
    setSteps([{ kind: "visitor", text: REPLIES[key].visitor }]);
    setTimeout(() => {
      setSteps((prev) => [
        ...prev,
        { kind: "companion", text: REPLIES[key].companion },
      ]);
    }, 550);
  }

  return (
    <section
      id="hero"
      className="grain grain-hero relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-10 pt-3 [@media(max-height:760px)_and_(max-width:1023px)]:pb-4 [@media(max-height:760px)_and_(max-width:1023px)]:pt-1"
    >
      {/* Атмосфера: ночная сцена с луной и звёздами — иммерсивный фон */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <HeroScene />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-3 text-center [@media(max-height:760px)_and_(max-width:1023px)]:gap-1.5 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-center lg:gap-x-16 lg:text-left">
        {/* Десктоп по референсу: оффер слева, существо и живой чат справа.
            На мобильном обе колонки схлопываются в display:contents,
            порядок кадра задают order-классы (сцена → промис → чат → CTA) */}
        <div className="contents lg:flex lg:flex-col lg:items-start lg:gap-5">
          {/* Промис голосом персонажа: первая фраза — боль, вторая —
            обещание от первого лица. Каракуля — под словом обещания */}
          <h1
            className="hero-rise order-2 text-balance text-[2.6rem] font-bold leading-[1.03] tracking-tight [@media(max-height:760px)_and_(max-width:1023px)]:text-4xl md:text-5xl lg:order-none"
            style={{ "--rise-delay": "0.32s" } as CSSProperties}
          >
            {/* Хроматическая вспышка сходится в резкий текст ровно к моменту,
              когда начинает рисоваться каракуля-подчёркивание (0.95s) —
              взгляд сперва «фокусируется», потом ловит штрих */}
            <span className="chroma-appear">
              Начать — самое трудное. Я прихожу{" "}
              <span
                className="scribble-underline scribble-draw text-primary"
                style={{ "--scribble-delay": "0.95s" } as CSSProperties}
              >
                первым
                <svg
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8 Q 22 2 42 6 T 78 5 Q 90 5 98 7"
                    pathLength={1}
                  />
                  {/* Второй проход штриха: настоящая каракуля рисуется в два
                    движения с разным нажимом — идеальная дуга выдаёт машину */}
                  <path
                    d="M4 10 Q 30 6 55 8 T 97 9"
                    pathLength={1}
                    style={{
                      strokeWidth: 2.5,
                      opacity: 0.55,
                      animationDelay: "1.35s",
                    }}
                  />
                </svg>
              </span>
              {"."}
            </span>
          </h1>

          {/* Подзаголовок: конкретика + дифференциатор */}
          <p
            className="hero-rise order-3 text-pretty text-base leading-snug text-foreground/70 md:text-lg md:leading-relaxed lg:order-none"
            style={{ "--rise-delay": "0.46s" } as CSSProperties}
          >
            Напарник сидит рядом, пока ты работаешь, и растит остров из твоих
            стартов.{" "}
            <span className="font-medium text-foreground/95">
              Без стриков. Без стыда.
            </span>
          </p>

          {/* Главный CTA: на мобильном — последний в кадре (order-5), на
            десктопе — в текстовой колонке сразу под оффером */}
          <div
            className="hero-rise order-5 mt-1 flex w-full flex-col items-center gap-2.5 lg:order-none lg:items-start"
            style={{ "--rise-delay": "0.78s" } as CSSProperties}
          >
            <motion.div
              animate={ctaBoost ? { scale: [1, 1.045, 1] } : {}}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="w-full sm:w-auto"
            >
              <Button
                render={<Link href="/app" />}
                nativeButton={false}
                size="lg"
                onClick={(e: React.MouseEvent) => {
                  if (navigating) {
                    e.preventDefault();
                    return;
                  }
                  setNavigating(true);
                }}
                className={`press w-full max-w-xs font-semibold shadow-[0_12px_36px_-12px_oklch(0.86_0.22_130/0.55)] transition-shadow duration-500 sm:w-auto sm:px-10 ${
                  ctaBoost
                    ? "shadow-[0_16px_44px_-10px_oklch(0.86_0.22_130/0.75)]"
                    : ""
                }`}
              >
                {navigating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Иду…
                  </>
                ) : (
                  "Начать первое дело →"
                )}
              </Button>
            </motion.div>
            {/* /75 давал 4.23:1 на 12px — ниже порога WCAG AA (4.5:1),
                замерено canvas-конвертацией computed color. Полная
                непрозрачность muted-foreground держит ~6:1+. */}
            <span className="font-mono text-xs tracking-wide text-muted-foreground">
              бесплатно · без карты и регистрации
            </span>
          </div>
        </div>

        <div className="contents lg:flex lg:flex-col lg:items-center lg:gap-2">
          {/* Существо в пятне света очага. На коротких вьюпортах существо
            и его подсветка уменьшаются НАСТОЯЩИМ CSS-размером (не
            transform:scale — тот не меняет коробку в потоке, поэтому старый
            scale-90 здесь ничего не спасал: CTA всё равно уезжал за сгиб на
            любом вьюпорте короче ~800px, что и подтвердил замер) */}
          <div className="relative order-1 flex origin-bottom flex-col items-center lg:order-none">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.22_130/0.22)_0%,transparent_70%)] blur-2xl [@media(max-height:760px)_and_(max-width:1023px)]:h-32 [@media(max-height:760px)_and_(max-width:1023px)]:w-32 lg:h-56 lg:w-56"
            />
            <MascotSvg
              expression={expression}
              size={152}
              label="Напарник — пушистое существо с зелёными глазами"
              className="relative z-10 [@media(max-height:760px)_and_(max-width:1023px)]:size-28 lg:size-[196px]"
            />
            <GroundPool className="-mt-9 -mb-11 [@media(max-height:760px)_and_(max-width:1023px)]:-mt-6 [@media(max-height:760px)_and_(max-width:1023px)]:-mb-8 [@media(max-height:760px)_and_(max-width:1023px)]:scale-75" />
          </div>

          {/* Живой чат-вход: он здоровается, ты отвечаешь — премиальная реплика */}
          <div
            className="hero-rise order-4 mt-1 flex w-full flex-col gap-2 lg:order-none"
            style={{ "--rise-delay": "0.62s" } as CSSProperties}
            aria-live="polite"
          >
            {/* Аватар-мордочка слева от реплики: на скрине-хиро существо
                стоит наверху кадра, а реплика — ниже подзаголовка, через
                луну и заголовок. Прежний хвостик-«запятая» указывал в
                сторону, а не на существо, и терялся на таком расстоянии —
                атрибуция «это говорит именно кот» держалась только на
                чтении текста «Я Напарник». Тот же приём, что в реальном
                чате (CompanionAvatar в companion-chat.tsx), даёт мгновенную
                атрибуцию без чтения и опережает продукт: это уже чат. */}
            <div className="flex items-end gap-1.5">
              <div className="flex size-7 shrink-0 items-center justify-center self-start">
                <MascotSvg expression="calm" size={28} />
              </div>
              <div className="glass relative max-w-[calc(92%-2.125rem)] self-start rounded-2xl rounded-tl-sm px-4 py-3 text-left">
                <WordReveal
                  text={OPENING_LINE}
                  startDelay={0.85}
                  className="font-hand text-lg leading-snug text-secondary-foreground md:text-2xl"
                />
              </div>
            </div>

            <AnimatePresence initial={false}>
              {steps.map((step, i) =>
                step.kind === "companion" ? (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={SPRING_SNAPPY}
                    className="flex max-w-[92%] items-end gap-1.5 self-start"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center">
                      <MascotSvg expression="happy" size={28} />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-secondary/85 px-4 py-3 text-left shadow-xl backdrop-blur-md">
                      <TypedLine
                        text={step.text}
                        onDone={() => setCtaBoost(true)}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={SPRING_SNAPPY}
                    className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-5 py-2.5 shadow-[0_8px_24px_-8px_oklch(0.86_0.22_130/0.5)]"
                  >
                    <p className="text-sm font-semibold leading-relaxed text-primary-foreground">
                      {step.text}
                    </p>
                  </motion.div>
                ),
              )}
            </AnimatePresence>

            {!answered && (
              // justify-start + rounded-full: чипы — это ЕЩЁ НЕ отправленная
              // реплика, а предложенный ответ. rounded-2xl rounded-br-md
              // справа — та же форма, что у уже отправленного сообщения
              // визитёра чуть ниже (self-end bg-primary rounded-br-md) —
              // до клика чип выглядел как «я уже это сказал». Пилюля +
              // левый край снимают путаницу и совпадают с чипами-подсказками
              // везде в приложении (CompanionChat, HomeScreen).
              <div className="flex flex-wrap justify-start gap-2 pt-0.5">
                {(Object.keys(REPLIES) as ReplyKey[]).map((key) => (
                  <Link
                    key={key}
                    href="/app"
                    onClick={(e) => {
                      e.preventDefault();
                      choose(key);
                    }}
                    // Микро-магнетизм: существо радуется, когда ты тянешься ответить —
                    // сцена откликается на намерение раньше действия (живая, не картинка)
                    onMouseEnter={() => setExpression("happy")}
                    onMouseLeave={() => setExpression("calm")}
                    className="group glass glass-interactive press rounded-full px-4 py-2.5 text-[15px] font-medium text-foreground hover:text-primary"
                  >
                    {REPLIES[key].visitor}
                  </Link>
                ))}
              </div>
            )}

            {/* Рукописная заметка на полях: расширяет обещание H1, а не
              повторяет его. Тёплый цвет пера, не лайм: лайм в кадре
              остаётся за «первым» и CTA. На коротких вьюпортах — первая
              жертва: это расширение обещания, а не само обещание, и не
              стоит того, чтобы ради неё CTA уезжал за сгиб. */}
            <div
              className="hero-rise hidden items-start gap-1.5 self-start pl-1 [@media(min-height:761px)_and_(max-width:1023px)]:flex lg:flex"
              style={
                {
                  "--rise-delay": "1.2s",
                  color: "oklch(0.85 0.15 88 / 0.85)",
                } as CSSProperties
              }
            >
              <svg
                viewBox="0 0 20 24"
                className="mt-0.5 h-5 w-4 shrink-0 opacity-80"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M16 22 Q 6 18 7 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M3 10 L7 4 L11 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="-rotate-2 font-hand text-lg leading-tight">
                даже если ты
                <br />
                пропал на неделю
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Подсказка «ниже есть ещё»: hero занимает весь экран, и без якоря
          нижняя кромка читается как конец страницы. */}
      <a
        href="#how"
        // px-3 py-2.5: сам текст+иконка были ~28px высотой — ниже
        // рекомендованного минимума тап-зоны (44px, WCAG 2.5.5 / Apple HIG).
        // Паддинг расширяет только хит-зону, без изменения видимого размера.
        // /60 давал <4.5:1 контраста на 12px — заменено на полный muted-foreground.
        className="hero-rise absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 px-3 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary [@media(max-height:680px)]:hidden"
        style={{ "--rise-delay": "1.5s" } as CSSProperties}
      >
        как это работает
        <svg
          width="14"
          height="8"
          viewBox="0 0 14 8"
          fill="none"
          aria-hidden="true"
          className="motion-safe:animate-bounce"
        >
          <path
            d="M1 1 L7 7 L13 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </section>
  );
}
