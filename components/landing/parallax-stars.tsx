"use client";

import { type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/**
 * Лёгкий параллакс звёздного слоя: при прокрутке звёзды отстают
 * от контента на 4% — небо ощущается дальше страницы (глубина,
 * как слои фона в играх). Только GPU-transform, без скролл-джека;
 * при prefers-reduced-motion слой неподвижен.
 */
export function ParallaxStars({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (value) =>
    reduceMotion ? 0 : value * -0.04,
  );

  return (
    <motion.div style={{ y }} className="absolute inset-0">
      {children}
    </motion.div>
  );
}
