"use client";

import { motion, useReducedMotion } from "motion/react";

const day = [
  {
    time: "21:40",
    title: "Вечером — 3 минуты",
    text: "Напарник разбирает с тобой завтра и превращает «поработать над проектом» в одно физическое действие.",
    quote:
      "Значит, завтра просто открываешь файл диплома. Всё, больше ничего не планируем.",
  },
  {
    time: "09:12",
    title: "Утром он пишет первым",
    text: "Не пуш «пора работать», а сообщение от живого существа. Начать — легче, чем отказать.",
    quote: "Я тут. Помнишь — просто открыть файл. Я рядом.",
  },
  {
    time: "09:31",
    title: "Сессия вдвоём",
    text: "Ты работаешь — он рядом. Body doubling без второго человека. Отвлёкся? Мягко вернёт.",
    quote: "Полёт нормальный. Я никуда не ухожу.",
  },
  {
    time: "10:04",
    title: "Его мир растёт",
    text: "Каждый старт — новый кусочек острова. Провалил день? Ничего не сгорает. Ноль, не минус.",
    quote: "Смотри, у нас вырос первый росток. Это твой.",
  },
];

export function HowItWorks() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="how" className="grain relative scroll-mt-20 overflow-hidden">
      {/* Большое amber-свечение слева */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-1/2 h-[700px] w-[500px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.17_55/0.10)_0%,transparent_65%)] blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-24 md:py-36">
        <motion.div
          className="mb-16 flex flex-col gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
          <h2 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Один день{" "}
            <span className="text-primary">с напарником</span>
          </h2>
          <p className="text-lg text-foreground/60 md:text-xl">
            Он пишет первым. Ты просто отвечаешь.
          </p>
        </motion.div>

        {/* Вертикальная лента: более толстая нить, lime-цвет */}
        <div className="relative flex flex-col gap-16 border-l-4 border-primary/40 pl-8 md:pl-14">
          {day.map((step, i) => (
            <motion.article
              key={step.time}
              className="relative flex flex-col gap-4"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                type: "spring",
                stiffness: 160,
                damping: 22,
                delay: reduceMotion ? 0 : i * 0.12,
              }}
            >
              {/* Узел на нити — больше и заметнее */}
              <span
                aria-hidden="true"
                className="absolute -left-8 top-2 size-4 -translate-x-1/2 rounded-full border-2 border-primary bg-primary/30 ring-4 ring-primary/10 md:-left-14"
              />
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tracking-widest text-primary">
                  {step.time}
                </span>
              </div>
              <h3 className="text-2xl font-bold md:text-3xl">{step.title}</h3>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {step.text}
              </p>
              {/* Цитата крупнее */}
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-5 py-4">
                <p
                  className={`font-hand text-xl leading-snug text-primary md:text-2xl ${
                    i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.5deg]"
                  }`}
                >
                  «{step.quote}»
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
