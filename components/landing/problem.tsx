"use client";

import { motion, useReducedMotion } from "motion/react";

const failedTools = [
  "Notion с идеальной системой — заброшен через 9 дней",
  "Todoist с 47 просроченными задачами",
  "Pomodoro-таймер, который ты забываешь включить",
  "планировщик, который стыдит красными цифрами",
];

export function Problem() {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-label="Проблема" className="relative overflow-hidden">
      {/* Большое тёплое свечение слева */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.17_55/0.09)_0%,transparent_65%)] blur-3xl"
      />
      {/* Звёздочки */}
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute size-0.5 rounded-full bg-foreground/20"
          style={{
            top: `${5 + ((i * 17) % 85)}%`,
            left: `${6 + ((i * 29) % 88)}%`,
            opacity: 0.1 + (i % 3) * 0.06,
          }}
        />
      ))}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card/30 to-transparent"
      />

      <div className="relative mx-auto max-w-2xl px-6 py-32 md:py-48">
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

          {/* Зачёркнутый список — крупнее */}
          <ul className="flex flex-col gap-5">
            {failedTools.map((tool, i) => (
              <motion.li
                key={tool}
                className="text-xl leading-relaxed text-foreground/65 line-through decoration-destructive decoration-2 md:text-2xl"
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
