"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * STICKY-КОНТЕКСТ ТЕКУЩЕГО ДЕЛА.
 *
 * Появляется ТОЛЬКО после того, как исходная карточка ушла выше вьюпорта
 * ленты, и исчезает при возвращении к ней. Это не декоративная плашка «для
 * надёжности»: безусловный sticky отнимал бы 48px мобильного вьюпорта в тот
 * момент, когда карточка и так видна целиком, то есть дублировал бы сам себя.
 *
 * backdrop-blur — прогрессивное улучшение: контраст держится на собственном
 * тёмном фоне плашки, blur только добавляет глубину там, где поддерживается.
 * Без него (старый Safari, слабое устройство) читаемость не меняется.
 */
export function StickyTaskBar({
  visible,
  step,
  minutes,
  onChange,
}: {
  visible: boolean;
  step: string;
  minutes: number;
  onChange: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          // height анимируем вместе с opacity: плашка РАЗДВИГАЕТ ленту, а не
          // ложится поверх реплики — иначе первое сообщение под шапкой
          // оказывается частично закрытым ровно в момент чтения.
          initial={reduceMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: 58, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
          }
          className="relative z-10 shrink-0 overflow-hidden px-4"
        >
          <div className="mx-auto mt-2.5 flex h-11 max-w-md items-center gap-3 rounded-[20px] border border-white/[0.08] bg-secondary/70 pl-4 pr-1 backdrop-blur-md">
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {step}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-[13px] leading-[18px] text-muted-foreground"
            >
              {minutes} мин
            </span>
            {/* Полноценная тач-цель 44×44 при визуальной высоте строки 44:
                «Изменить» — единственный выход из текущего контекста, и
                промах по нему стоит человеку выхода из приложения. */}
            <button
              type="button"
              onClick={onChange}
              className="press flex h-11 shrink-0 items-center justify-center rounded-[18px] px-3 text-sm text-foreground/90 transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              Изменить
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
