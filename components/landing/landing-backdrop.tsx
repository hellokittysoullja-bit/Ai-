import { ParallaxStars } from "./parallax-stars";

/**
 * Этап 2: непрерывная ночная сцена.
 *
 * Один общий фон на весь лендинг вместо чёрных провалов между секциями:
 * - вертикальный колор-скрипт ночи (горизонт hero → глубокая ночь →
 *   тёплая зелёная кромка перед финалом);
 * - звёзды, рассыпанные по всей высоте страницы, часть тихо мерцает;
 * - градиент и звёзды рендерятся на сервере; параллакс звёзд —
 *   клиентское улучшение поверх (без JS фон полностью работает).
 *
 * Секции лендинга прозрачные и рисуются поверх; hero перекрывает фон
 * своим собственным небом; цвет стыка совпадает (oklch(0.21 0.018 135)).
 *
 * Яркость звёзд зашита в альфа-канал цвета, а не в opacity элемента:
 * CSS-анимация пульса анимирует opacity и перебила бы инлайн-значение —
 * мерцающие звёзды вспыхивали бы до полной яркости. С альфой в цвете
 * пульс масштабируется от базовой яркости каждой звезды.
 */

type Star = readonly [number, number, number, number, number?];

// [top %, left %, размер px, яркость (альфа), длительность мерцания s?]
const STARS: readonly Star[] = [
  [8, 12, 2, 0.2],
  [11, 82, 2.5, 0.3, 5],
  [14, 46, 1.5, 0.16],
  [18, 68, 2, 0.26, 6.5],
  [21, 24, 1.5, 0.18],
  [26, 90, 2, 0.24],
  [29, 8, 2.5, 0.3, 5.5],
  [33, 56, 1.5, 0.16],
  [37, 74, 2, 0.22, 7],
  [41, 30, 1.5, 0.18],
  [45, 88, 2, 0.26],
  [49, 14, 2, 0.22, 6],
  [53, 62, 1.5, 0.15],
  [57, 40, 2, 0.24],
  [61, 80, 2.5, 0.28, 5.2],
  [65, 20, 1.5, 0.16],
  [70, 70, 2, 0.22, 6.8],
  [74, 46, 1.5, 0.15],
  [78, 88, 2, 0.24],
  [82, 10, 2, 0.2, 5.8],
  [86, 58, 1.5, 0.14],
  [91, 34, 2, 0.18],
  [95, 76, 1.5, 0.14],
  // Дозасветка межсекционных зон: пустой экран без единой светящейся точки
  // читается как «сломано», с звёздами — как «ночь»
  [24, 52, 2, 0.24, 6.2],
  [31, 38, 2.5, 0.28],
  [39, 60, 2, 0.22, 5.4],
  [47, 44, 1.5, 0.2],
  [55, 26, 2, 0.26, 7.2],
  [59, 90, 2, 0.22],
  [67, 52, 2.5, 0.26, 6.4],
  [72, 16, 2, 0.2],
];

export function LandingBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Колор-скрипт ночи сверху вниз — ни одного участка «мёртвого» чёрного.
          Нижний стоп близок к --background: стык с футером без видимого шва */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.21 0.018 135) 0%, oklch(0.175 0.012 140) 22%, oklch(0.16 0.014 165) 48%, oklch(0.17 0.012 145) 72%, oklch(0.185 0.014 135) 100%)",
        }}
      />
      {/* Дыхание горизонта: едва заметные пятна света вместо плоской тьмы */}
      <div
        className="absolute left-1/2 top-[30%] h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.08) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[50%] h-[440px] w-[680px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.05) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[68%] h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.86 0.22 130 / 0.07) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute left-1/2 top-[86%] h-[420px] w-[640px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.86 0.22 130 / 0.05) 0%, transparent 65%)",
        }}
      />
      {/* Звёзды на всю высоту страницы; параллакс-слой даёт глубину неба */}
      <ParallaxStars>
        {STARS.map(([top, left, size, alpha, twinkle], i) => (
          <span
            key={i}
            className={
              twinkle
                ? "absolute animate-pulse rounded-full motion-reduce:animate-none"
                : "absolute rounded-full"
            }
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: size,
              height: size,
              backgroundColor: `oklch(0.92 0.01 210 / ${alpha})`,
              ...(twinkle
                ? {
                    animationDuration: `${twinkle}s`,
                    animationDelay: `${(i % 5) * 0.7}s`,
                  }
                : null),
            }}
          />
        ))}
      </ParallaxStars>
    </div>
  );
}
