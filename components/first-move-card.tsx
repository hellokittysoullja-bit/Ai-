"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { hapticStart } from "@/lib/haptics";

/**
 * КАРТОЧКА «ПЕРВОЕ ДВИЖЕНИЕ» — единственный объект действия на экране.
 *
 * Что было: смысл был рассыпан по четырём независимым элементам — текст
 * про план, счётчик находок «0 из 10», крупная кнопка «Повторить: „…"» и
 * мелкая ссылка «Другое дело». Человек собирал из них связку сам, а на
 * экране одновременно жили лотерея («и одна находка — какая, не знаю сам»)
 * и работа. Обещание награды стояло РАНЬШЕ смысла действия.
 *
 * Стало: один визуальный объект отвечает на все вопросы сразу —
 * что сделать, сколько это займёт, почему это посильно, что произойдёт
 * после, и какой есть второй маршрут. Ни счётчика, ни вероятности, ни
 * слова «редкая» до результата: показывается только ближайший
 * ГАРАНТИРОВАННЫЙ эффект.
 *
 * Геометрия из спеки, явными значениями, а не приблизительными утилитами:
 * радиус 24, внутренние отступы 20, CTA 52, secondary 44.
 */
export function FirstMoveCard({
  step,
  minutes = 15,
  onOther,
}: {
  step: string;
  minutes?: number;
  /** Второй маршрут. Полноценный control, а не ссылка мелким текстом. */
  onOther: () => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  // «Готовлю место…» — подтверждение раньше навигации. Пустой кадр между
  // тапом и следующим экраном человек читает как «не нажалось».
  const [preparing, setPreparing] = useState(false);

  function start() {
    if (preparing) return;
    hapticStart();
    setPreparing(true);
    router.push(`/app/session?step=${encodeURIComponent(step)}&d=${minutes}&plan=1`);
  }

  return (
    <motion.section
      aria-label="Первое движение"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="glass flex flex-col gap-3 rounded-[24px] p-5"
    >
      {/* Micro-label: 11/14, 650, uppercase — верхний уровень типографической
          шкалы. Говорит категорию объекта, не дублируя заголовок. */}
      <span className="font-mono text-[11px] font-semibold uppercase leading-[14px] tracking-[0.14em] text-muted-foreground">
        Первое движение
      </span>

      {/* Card title: 18/24, 650. Шаг НЕ обрезаем — весь смысл первого
          движения в том, что оно крошечное и конкретное; обрубок «перечитат…»
          возвращает страх, который карточка снимает. */}
      <h2 className="text-[18px] font-semibold leading-[24px] text-foreground text-pretty">
        {step}
      </h2>

      {/* Meta: 13/18. Вторая половина строки — снятие ставки: результат не
          обязателен, поэтому «начать» дешевле, чем «сделать». */}
      <p className="text-[13px] leading-[18px] text-muted-foreground">
        {minutes} минут · результат не обязателен
      </p>

      {/* CTA сообщает, ЧТО произойдёт после нажатия, а не отношение к делу.
          «Берусь» и «Повторить» этого не говорили. */}
      <Button
        size="lg"
        onClick={start}
        disabled={preparing}
        className="cta-sheen h-[52px] w-full rounded-2xl text-[15px] font-semibold disabled:opacity-100"
      >
        {preparing ? "Готовлю место…" : `Начать ${minutes} минут`}
      </Button>

      {/* Второй маршрут: спокойный, но полноценный control 44px. Один
          огромный CTA без альтернативы — это принудительный default. */}
      <button
        type="button"
        onClick={onOther}
        className="press flex h-11 w-full items-center justify-center rounded-2xl text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        Выбрать другое дело
      </button>

      {/* Честная петля тремя разными сущностями: след ≠ росток ≠ редкая
          находка. Здесь — только ближайший гарантированный эффект; лотерея
          и коллекция живут в «Мире», после реального действия. */}
      <p className="text-center text-[11px] leading-[16px] text-muted-foreground">
        Старт оставит след. Первое движение вырастит росток.
      </p>
    </motion.section>
  );
}
