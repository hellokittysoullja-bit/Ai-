"use client";

import { motion, useReducedMotion } from "motion/react";

// 3 пункта вместо 4: три удара читаются, четыре — уже список жалоб
const failedTools = [
  "Notion с идеальной системой — заброшен через 9 дней",
  "Todoist с 47 просроченными задачами",
  "Pomodoro-таймер, который ты забываешь включить",
];

export function Problem() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-label="Проблема" className="relative overflow-hidden">
      {/* Гребень холма на стыке с hero: земля сцены продолжается, а не обрывается.
          Цвет совпадает с травой у нижней кромки hero-сцены. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full md:h-16"
        viewBox="0 0 800 56"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0 L800 0 L800 20 Q640 40 460 30 Q240 20 0 38 Z"
          fill="oklch(0.15 0.014 135)"
        />
      </svg>

      {/* Большое тёплое свечение слева */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.17_55/0.09)_0%,transparent_65%)] blur-3xl"
      />

      <div className="relative mx-auto max-w-2xl px-6 py-24 md:py-36">
        <motion.div
          className="flex flex-col gap-12"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {/* Огромный заголовок */}
          <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Тебе не нужен ещё один инструмент.
          </h2>

          {/* Зачёркнутый список: тонкая приглушённая линия — констатация, не крик */}
          <ul className="flex flex-col gap-5">
            {failedTools.map((tool, i) => (
              <motion.li
                key={tool}
                className="text-xl leading-relaxed text-foreground/45 line-through decoration-destructive/45 decoration-[1.5px] md:text-2xl"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 22,
                  delay: reduceMotion ? 0 : i * 0.15,
                }}
              >
                {tool}
              </motion.li>
            ))}
          </ul>

          {/* Финальный текст — крупнее и контрастнее */}
          <motion.p
            className="text-pretty text-xl leading-relaxed md:text-2xl"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 20,
              delay: reduceMotion ? 0 : 0.65,
            }}
          >
            Все они требуют одного: чтобы ты сам их открыл. То есть той самой
            силы воли, которой нет в момент прокрастинации. Тебе нужен{" "}
            <span className="font-hand text-3xl text-primary md:text-4xl">
              кто-то, кто скажет «начинай»
            </span>{" "}
            — и придёт к тебе сам.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
