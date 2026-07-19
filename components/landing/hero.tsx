"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import { GroundPool, HeroScene } from "@/components/hero-scene";
import { Button } from "@/components/ui/button";

/**
 * Первый экран по принципу «статика прежде скрипта» (уровень прод-команд):
 * весь первый кадр — сцена, первая реплика, кнопки-ответы, заголовок —
 * существует уже в серверном HTML. Хореография появления (каскад слов,
 * подъём блоков) — чистый CSS (hero-word / hero-rise в globals.css),
 * поэтому кадр одинаков с JS и без него, для человека и для поисковика.
 *
 * JavaScript добавляет только поведение и ни одного пикселя содержимого:
 * взгляд существа за курсором, розыгрыш диалога после ответа, память
 * выбора (naparnik:intro), появление CTA по дочитыванию реплики.
 *
 * Деградация без JS: кнопки-ответы — настоящие ссылки в /app.
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

/**
 * Каскадное появление слов на чистом CSS: серверный HTML уже содержит весь
 * текст (скринридеры и роботы читают его сразу), а глаз видит «печать».
 */
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

/** Печатающаяся реплика (только для диалога после ответа — там JS уже точно есть) */
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
  // Диалог ПОСЛЕ ответа посетителя — единственная JS-зависимая часть сцены
  const [steps, setSteps] = useState<SceneStep[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [expression, setExpression] = useState<MascotExpression>("calm");

  function choose(key: ReplyKey) {
    setAnswered(true);
    setExpression("happy");
    // Шов лендинг → /app: приложение продолжит этот разговор
    try {
      window.localStorage.setItem(INTRO_CHOICE_KEY, key);
    } catch {
      // приватный режим — не критично
    }
    setSteps([{ kind: "visitor", text: REPLIES[key].visitor }]);
    // реплика напарника — после короткой паузы, как в живом разговоре
    setTimeout(() => {
      setSteps((prev) => [
        ...prev,
        { kind: "companion", text: REPLIES[key].companion },
      ]);
    }, 550);
  }

  return (
    <section className="grain relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Атмосфера: серверный SVG, живёт без JS — считывается за 200мс, раньше слов */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <HeroScene />
      </div>

      {/* Сцена: существо стоит в пятне света очага. Один фокус, много воздуха */}
      <div className="relative flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <MascotSvg
            expression={expression}
            size={200}
            label="Напарник — пушистое существо с зелёными глазами"
            className="relative z-10"
          />
          <GroundPool className="-mt-11 -mb-9" />
        </div>

        <div className="flex w-full flex-col gap-3" aria-live="polite">
          {/* Первая реплика: в HTML с первого байта, слова — каскадом через CSS */}
          <div
            className="hero-rise max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-secondary px-5 py-3.5"
            style={{ "--rise-delay": "0.25s" } as CSSProperties}
          >
            <WordReveal
              text={OPENING_LINE}
              className="font-hand text-xl leading-snug text-secondary-foreground md:text-2xl"
            />
          </div>

          {/* Розыгрыш диалога после ответа */}
          <AnimatePresence initial={false}>
            {steps.map((step, i) =>
              step.kind === "companion" ? (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-secondary px-5 py-3.5"
                >
                  <TypedLine text={step.text} onDone={() => setShowCta(true)} />
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-5 py-2.5"
                >
                  <p className="text-sm font-semibold leading-relaxed text-primary-foreground">
                    {step.text}
                  </p>
                </motion.div>
              ),
            )}
          </AnimatePresence>

          {/* Hick's Law: ровно 2 ответа, оформлены как «твоя следующая реплика».
              Это настоящие ссылки: без JS они честно ведут в /app */}
          {!answered && (
            <div
              className="hero-rise flex flex-wrap justify-end gap-2 pt-1"
              style={{ "--rise-delay": "2.05s" } as CSSProperties}
            >
              {(Object.keys(REPLIES) as ReplyKey[]).map((key) => (
                <Link
                  key={key}
                  href="/app"
                  onClick={(e) => {
                    e.preventDefault();
                    choose(key);
                  }}
                  className="rounded-2xl rounded-br-sm border border-primary/40 bg-primary/10 px-5 py-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-primary/20 active:translate-y-px"
                >
                  {REPLIES[key].visitor}
                </Link>
              ))}
            </div>
          )}

          {/* Пик сцены: CTA появляется когда ответ дочитан, а не по таймеру */}
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
              className="flex justify-center pt-3"
            >
              <Button
                render={<Link href="/app" />}
                nativeButton={false}
                size="lg"
                className="font-semibold"
              >
                Пойдём попробуем
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Заголовок ПОД сценой: сцена важнее слов. В серверном HTML — сразу,
          глазу проявляется после первой реплики (CSS-задержка) */}
      <div
        className="hero-rise mt-16 flex max-w-sm flex-col items-center gap-3 text-center"
        style={{ "--rise-delay": "2.6s" } as CSSProperties}
      >
        <h1 className="text-balance text-3xl font-bold leading-tight md:text-4xl">
          Существо, которое не даст тебе слиться
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">
          Помогает начать, сидит рядом во время работы и растит остров из твоих
          стартов. Без стриков. Без стыда.
        </p>
        {/* Запасной путь вперёд: тихий, на CSS-таймере, прячется после ответа */}
        {!answered && (
          <div
            className="hero-rise"
            style={{ "--rise-delay": "7s" } as CSSProperties}
          >
            <Button
              render={<Link href="/app" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="mt-2 font-semibold"
            >
              Попробовать
            </Button>
          </div>
        )}
        <span className="pt-1 font-mono text-xs text-muted-foreground">
          бесплатно, без карты и регистрации
        </span>
      </div>
    </section>
  );
}
