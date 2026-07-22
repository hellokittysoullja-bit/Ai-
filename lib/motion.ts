import type { Transition } from "motion/react";

// Три именованных пружины вместо разбросанных по файлам stiffness/damping —
// раньше значения дрейфовали (100–200 / 18–24) без причины, не по замыслу.
// Не про то, что рассинхрон был заметен, а про то, что он был случайным.

// Заголовки и крупные блоки секций — самый медленный, самый весомый вход.
export const SPRING_REVEAL: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
};

// Элементы списков, карточки, чипы — на ступень бодрее заголовка.
export const SPRING_ITEM: Transition = {
  type: "spring",
  stiffness: 160,
  damping: 22,
};

// Мгновенный отклик: чат-баблы, импульс CTA — обратная связь без задержки.
export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 24,
};
