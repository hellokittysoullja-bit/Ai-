/**
 * Геометрия и палитра существа — без 'use client', чтобы серверные
 * компоненты (первый кадр, loading) могли рисовать того же напарника,
 * что и интерактивный маскот.
 *
 * Палитра: тёмный угольный мех с контурной обводкой (sticker-стиль),
 * лаймовые глаза, оранжевый акцент (уши/подушечки/нос) и огонёк на хвосте —
 * метафора стрика: не дать огню погаснуть.
 */

export const FUR = "oklch(0.27 0.018 135)";
export const FUR_DARK = "oklch(0.22 0.014 135)";
export const FUR_LIGHT = "oklch(0.45 0.03 135)";
/** Цвет верхнего света на мехе (трёхтоновый объём) */
export const SHEEN = "oklch(0.38 0.025 135)";
/** Контурная обводка силуэта */
export const OUTLINE = "oklch(0.12 0.01 130)";
/** Оранжевый акцент: ушные раковины, подушечки, нос, штрихи румянца */
export const ACCENT = "oklch(0.62 0.16 40)";
export const FLAME = "oklch(0.72 0.17 55)";
export const FLAME_CORE = "oklch(0.87 0.15 90)";
export const EYE = "var(--color-primary)";
export const EYE_DARK = "oklch(0.62 0.19 130)";
export const INK = "oklch(0.13 0.01 130)";
export const WARM = "oklch(0.75 0.15 65)";
export const WHITE = "oklch(0.98 0 0)";

/** Пушистый контур: замкнутый путь с меховыми буграми (детерминированный) */
export function furPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps: number,
  depth: number,
  seed: number,
) {
  const pts: Array<[number, number]> = [];
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    const wobble = 1 + (rand() - 0.5) * 0.07;
    pts.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < bumps; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % bumps];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    const qx = mx + (dx / len) * depth;
    const qy = my + (dy / len) * depth;
    d += ` Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

export const BODY = furPath(100, 118, 62, 57, 15, 7, 42);
export const BELLY = furPath(100, 134, 33, 26, 10, 4, 7);

/**
 * Рваный меховой силуэт тела: 44 пика случайной длины (детерминировано,
 * seed 7, центр 100×118, радиусы 60×55, пики 3–9 с «завалом» вниз по бокам).
 */
export const FUR_BODY =
  "M 100.0 63.0 L 104.5 60.2 L 108.5 63.6 L 113.5 61.3 L 116.9 65.2 L 124.1 58.7 L 124.9 68.0 L 132.2 64.2 L 132.4 71.7 L 139.6 70.0 L 139.3 76.4 L 146.3 76.4 L 145.3 82.0 L 152.7 82.8 L 150.5 88.3 L 156.6 90.9 L 154.6 95.2 L 162.1 98.1 L 157.6 102.5 L 165.8 106.3 L 159.4 110.2 L 164.4 115.3 L 160.0 118.0 L 163.8 123.8 L 159.4 125.8 L 166.0 132.9 L 157.6 133.5 L 161.9 140.9 L 154.6 140.8 L 156.3 147.8 L 150.5 147.7 L 152.2 155.4 L 145.3 154.0 L 145.8 161.4 L 139.3 159.6 L 139.7 168.0 L 132.4 164.3 L 131.0 171.2 L 124.9 168.0 L 124.1 178.4 L 116.9 170.8 L 113.7 176.5 L 108.5 172.4 L 104.9 181.2 L 100.0 173.0 L 95.4 177.1 L 91.5 172.4 L 86.4 175.9 L 83.1 170.8 L 77.7 173.8 L 75.1 168.0 L 69.0 171.2 L 67.6 164.3 L 60.3 168.0 L 60.7 159.6 L 52.2 163.4 L 54.7 154.0 L 49.2 154.3 L 49.5 147.7 L 39.9 149.8 L 45.4 140.8 L 37.9 140.9 L 42.4 133.5 L 34.8 132.7 L 40.6 125.8 L 33.1 124.0 L 40.0 118.0 L 31.4 115.0 L 40.6 110.2 L 34.8 106.4 L 42.4 102.5 L 35.8 97.3 L 45.4 95.2 L 40.3 89.2 L 49.5 88.3 L 49.4 84.4 L 54.7 82.0 L 54.7 77.4 L 60.7 76.4 L 61.0 70.8 L 67.6 71.7 L 68.6 65.6 L 75.1 68.0 L 77.9 64.1 L 83.1 65.2 L 86.5 61.1 L 91.5 63.6 L 95.2 55.7 L 100.0 63.0 Z";

export const EYE_L = { x: 74, y: 102 };
export const EYE_R = { x: 126, y: 102 };
export const EYE_RX = 16;
export const EYE_RY = 18;
