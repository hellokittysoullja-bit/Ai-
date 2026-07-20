"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";
import { GroundPool, HeroScene } from "@/components/hero-scene";
import { Button } from "@/components/ui/button";

/**
 * Первый экран: сцена прежде слов. Луна, звёзды и существо видны
 * сразу — заголовок живёт ПОД сценой и не перекрывает небо.
 *
 * Иерархия CTA (один «король» на зону):
 * - в сцене-чате ведут две reply-плашки (лайм-tint, не solid);
 * - под заголовком — единственная solid-лайм кнопка «Попробовать».
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
    <section className="grain relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Атмосфера: ночная сцена с луной и звёздами — ничем не перекрыта */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <HeroScene />
      </div>

      {/* Сцена: существо в пятне света очага */}
      <div className="relative flex w-full max-w-md flex-col items-center gap-4">
        {/* Мягкое свечение за маскотом — не трогает небо */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.86_0.22_130/0.25)_0%,transparent_70%)] blur-2xl"
        />

        <div className="flex flex-col items-center">
          <MascotSvg
            expression={expression}
            size={240}
            label="Напарник — пушистое существо с зелёными глазами"
            className="relative z-10"
          />
          <GroundPool className="-mt-12 -mb-10" />
        </div>

        <div className="flex w-full flex-col gap-3" aria-live="polite">
          <div
            className="hero-rise max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-secondary px-5 py-3.5 shadow-lg"
            style={{ "--rise-delay": "0.25s" } as CSSProperties}
          >
            <WordReveal
              text={OPENING_LINE}
              className="font-hand text-xl leading-snug text-secondary-foreground md:text-2xl"
            />
          </div>

          <AnimatePresence initial={false}>
            {steps.map((step, i) =>
              step.kind === "companion" ? (
                <motion.div
                  key={i}
                  initial= opacity: 0, y: 12, scale: 0.97​NOTION_TWS[ ]NOTION_TWS​
                  animate= opacity: 1, y: 0, scale: 1​NOTION_TWS[ ]NOTION_TWS​
                  transition= type: "spring", stiffness: 300, damping: 24​NOTION_TWS[ ]NOTION_TWS​
                  className="max-w-[92%] self-start rounded-2xl rounded-tl-sm bg-secondary px-5 py-3.5 shadow-lg"
                >
                  <TypedLine text={step.text} onDone={() => setShowCta(true)} />
                </motion.div>
              ) : (
                <motion.div
                  key={i}
                  initial= opacity: 0, y: 12, scale: 0.97​NOTION_TWS[ ]NOTION_TWS​
                  animate= opacity: 1, y: 0, scale: 1​NOTION_TWS[ ]NOTION_TWS​
                  transition= type: "spring", stiffness: 300, damping: 24​NOTION_TWS[ ]NOTION_TWS​
                  className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-5 py-2.5"
                >
                  <p className="text-sm font-semibold leading-relaxed text-primary-foreground">
                    {step.text}
                  </p>
                </motion.div>
              ),
            )}
          </AnimatePresence>

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
                  className="press rounded-2xl rounded-br-sm border border-primary/50 bg-primary/15 px-5 py-3 text-[15px] font-semibold text-foreground shadow-sm transition-all hover:bg-primary/25 hover:shadow-md active:translate-y-px"
                >
                  {REPLIES[key].visitor}
                </Link>
              ))}
            </div>
          )}

          {showCta && (
            <motion.div
              initial= opacity: 0, y: 10​NOTION_TWS[ ]NOTION_TWS​
              animate= opacity: 1, y: 0​NOTION_TWS[ ]NOTION_TWS​
              transition=
                delay: 0.15,
                type: "spring",
                stiffness: 200,
                damping: 20,
​NOTION_TWS[              ]NOTION_TWS​
              className="flex justify-center pt-3"
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
      </div>

      {/* Заголовок ПОД сценой: сцена важнее слов, луна и звёзды видны */}
      <div
        className="hero-rise mt-16 flex max-w-md flex-col items-center gap-3 text-center"
        style={{ "--rise-delay": "2.6s" } as CSSProperties}
      >
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Существо, которое не даст тебе{" "}
          <span className="text-primary">слиться</span>
        </h1>
        <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Помогает начать, сидит рядом во время работы и растит остров из твоих
          стартов. Без стриков. Без стыда.
        </p>
        {!answered && (
          <div
            className="hero-rise"
            style={{ "--rise-delay": "2.9s" } as CSSProperties}
          >
            <Button
              render={<Link href="/app" />}
              nativeButton={false}
              size="lg"
              className="press mt-2 font-semibold"
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
