"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import { GroundPool, HeroScene } from "@/components/hero-scene";
import { Button } from "@/components/ui/button";

/**
 * Первый экран: одна плотная композиция вместо двух зон, разбросанных по
 * полутора экранам. Промис (заголовок) поднят В КАДР — на десктопе он больше
 * не уходит под сгиб. Сцена остаётся иммерсивным фоном (её крафт — ров), но
 * слова оффера видны сразу: сцена не важнее промиса, они делят первый экран.
 *
 * Иерархия (сверху вниз, ни одного дубля):
 * - надзаголовок фиксирует боль («самое трудное — начать»);
 * - H1 — обещание, с рукописным подчёркиванием ключевого слова (bespoke-деталь);
 * - подзаголовок — конкретика механики + дифференциатор «без стриков, без стыда»;
 * - живой чат-вход: существо здоровается, ты отвечаешь премиальной репликой —
 *   отличительный интерактивный крючок, а не статичная кнопка.
 */

const OPENING_LINE =
  "Привет. Я Напарник. Я не планировщик — я тот, кто сидит рядом, когда трудно начать.";

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
      className="font-hand text-xl leading-snug text-secondary-foreground md:text-2xl"
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
  const [showCta, setShowCta] = useState(false);
  const [expression, setExpression] = useState<MascotExpression>("calm");

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
    <section className="grain relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-4 pb-14 pt-6">
      {/* Атмосфера: ночная сцена с луной и звёздами — иммерсивный фон */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <HeroScene />
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center gap-4 text-center">
        {/* Существо в пятне света очага */}
        <div className="relative flex flex-col items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.22_130/0.22)_0%,transparent_70%)] blur-2xl"
          />
          <MascotSvg
            expression={expression}
            size={196}
            label="Напарник — пушистое существо с зелёными глазами"
            className="relative z-10"
          />
          <GroundPool className="-mt-10 -mb-12" />
        </div>

        {/* Надзаголовок: фиксирует боль до обещания */}
        <span
          className="hero-rise font-mono text-[11px] uppercase tracking-[0.22em] text-primary/85"
          style={{ "--rise-delay": "0.2s" } as CSSProperties}
        >
          самое трудное — начать
        </span>

        {/* Промис В КАДРЕ: рукописное подчёркивание ключевого слова — bespoke */}
        <h1
          className="hero-rise text-balance text-[2.6rem] font-bold leading-[1.03] tracking-tight md:text-5xl"
          style={{ "--rise-delay": "0.32s" } as CSSProperties}
        >
          Существо, которое не даст тебе{" "}
          <span className="scribble-underline text-primary">
            слиться
            <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 8 Q 22 2 42 6 T 78 5 Q 90 5 98 7" />
            </svg>
          </span>
        </h1>

        {/* Подзаголовок: конкретика + дифференциатор */}
        <p
          className="hero-rise text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ "--rise-delay": "0.46s" } as CSSProperties}
        >
          Помогает начать, сидит рядом во время работы и растит остров из твоих
          стартов.{" "}
          <span className="font-medium text-foreground/80">
            Без стриков. Без стыда.
          </span>
        </p>

        {/* Живой чат-вход: он здоровается, ты отвечаешь — премиальная реплика */}
        <div
          className="hero-rise mt-1 flex w-full flex-col gap-2.5"
          style={{ "--rise-delay": "0.62s" } as CSSProperties}
          aria-live="polite"
        >
          <div className="max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-white/5 bg-secondary/85 px-5 py-3.5 text-left shadow-xl backdrop-blur-md">
            <WordReveal
              text={OPENING_LINE}
              startDelay={0.85}
              className="font-hand text-xl leading-snug text-secondary-foreground md:text-2xl"
            />
          </div>

          <AnimatePresence initial={false}>
            {steps.map((step, i) =>
              step.kind === "companion" ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-white/5 bg-secondary/85 px-5 py-3.5 text-left shadow-xl backdrop-blur-md"
                >
                  <TypedLine text={step.text} onDone={() => setShowCta(true)} />
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
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
            <div className="flex flex-wrap justify-end gap-2 pt-0.5">
              {(Object.keys(REPLIES) as ReplyKey[]).map((key) => (
                <Link
                  key={key}
                  href="/app"
                  onClick={(e) => {
                    e.preventDefault();
                    choose(key);
                  }}
                  className="group rounded-2xl rounded-br-md border border-white/12 bg-white/[0.04] px-5 py-3 text-[15px] font-medium text-foreground backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_10px_28px_-12px_oklch(0.86_0.22_130/0.55)] active:translate-y-0"
                >
                  {REPLIES[key].visitor}
                </Link>
              ))}
            </div>
          )}

          {showCta && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
              className="flex justify-center pt-2"
            >
              <Button
                render={<Link href="/app" />}
                nativeButton={false}
                size="lg"
                className="press font-semibold"
              >
                Пойдём попробуем
              </Button>
            </motion.div>
          )}
        </div>

        {/* Тихий прямой вход + доверие: не давит на «поговорить» тех, кто готов сразу */}
        {!answered && (
          <Link
            href="/app"
            className="hero-rise font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-primary"
            style={{ "--rise-delay": "0.78s" } as CSSProperties}
          >
            или сразу в приложение →
          </Link>
        )}
        <span
          className="hero-rise font-mono text-[11px] tracking-wide text-muted-foreground/70"
          style={{ "--rise-delay": "0.86s" } as CSSProperties}
        >
          бесплатно, без карты и регистрации
        </span>
      </div>
    </section>
  );
}
