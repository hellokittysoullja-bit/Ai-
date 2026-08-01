"use client";

import { useEffect, useState } from "react";
import { getFinds, getStarts } from "@/lib/memory";
import { LANDMARK_COUNT } from "@/lib/island-elements";

/**
 * Тихий ночной фон приложения — континуитет со сценой лендинга без её драмы.
 *
 * /app открывают десятки раз в день, поэтому сцена подчинена трём правилам,
 * которые разрешают противоречие «живое vs. не отвлекающее»:
 *
 *  1) ДИЕГЕТИЧНОСТЬ — двигается только то, что двигалось бы в реальном мире
 *     (небо, дыхание существа). Ни одна UI-поверхность не пульсирует.
 *  2) МЕДЛЕННОСТЬ — 7–23с. Habituation выжигает быстрый цикл, а не движение
 *     как таковое; на этих периодах глаз не ловит «анимацию».
 *  3) КОНТИНГЕНТНОСТЬ — самое заметное движение (сияние) появляется только
 *     как ответ на заработанное событие, а не по таймеру. Награда не
 *     приедается, потому что она заслужена.
 *
 * Рендерится один раз в app/app/layout.tsx (fixed, вне потока документа) и
 * живёт через все переходы Дом/Фокус/Мир без перемонтирования.
 *
 * БЕЗ отрицательного z-index (сознательно): и <html>, и <body> здесь несут
 * собственный явный bg-background. В этой связке z-index < 0 на fixed-элементе
 * прячет его под фон корневого элемента — эмпирически подтверждено. Порядок в
 * DOM (этот блок рендерится ПЕРВЫМ) при z-index: auto даёт тот же результат.
 */

const STARS: ReadonlyArray<readonly [number, number, number, number]> = [
  [6, 14, 1.5, 0.32],
  [9, 78, 1.5, 0.26],
  [15, 42, 1.5, 0.22],
  [23, 88, 2, 0.3],
  [31, 20, 1.5, 0.2],
  [38, 64, 1.5, 0.26],
  [46, 8, 1.5, 0.18],
  [54, 92, 2, 0.24],
  [62, 34, 1.5, 0.18],
  [70, 72, 1.5, 0.24],
  [79, 16, 1.5, 0.16],
  [87, 56, 1.5, 0.2],
];

/**
 * #20 · Фаза луны по реальному лунному календарю.
 * Синодический месяц 29.53059 суток от известного новолуния (2000-01-06).
 * Возвращает 0..1, где 0 и 1 — новолуние, 0.5 — полная луна.
 * Луна появляется только после 10-го ориентира («Луна над островом») —
 * небо буквально меняется за прохождение карты, а дальше живёт своим
 * циклом: мир существует по своим законам, а не по нашим сессиям.
 */
function moonPhase(now: Date): number {
  const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
  const SYNODIC = 29.530588853 * 86400000;
  const diff = now.getTime() - KNOWN_NEW_MOON;
  const phase = ((diff % SYNODIC) + SYNODIC) % SYNODIC;
  return phase / SYNODIC;
}

export function AppBackdrop() {
  const [hasAurora, setHasAurora] = useState(false);
  const [hasMoon, setHasMoon] = useState(false);
  // Фазу считаем в состоянии, а не при рендере: Date.now() на сервере и на
  // клиенте различаются → hydration mismatch. Тот же паттерн React #418,
  // что уже поймали в маскоте на prefers-reduced-motion.
  const [phase, setPhase] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [finds, starts] = await Promise.all([getFinds(), getStarts()]);
      if (!alive) return;
      setHasAurora(finds.some((f) => f.key === "aurora"));
      setHasMoon(starts.length >= LANDMARK_COUNT);
      setPhase(moonPhase(new Date()));
    })();
    return () => {
      alive = false;
    };
  }, []);

  /*
   * Освещённая доля диска и сторона освещения. Растущая луна (phase < 0.5)
   * освещена справа, убывающая — слева. Рисуем маской: тёмный круг
   * съезжает по диску — та же механика, что видит глаз в небе.
   */
  const lit = phase === null ? 0 : 1 - Math.abs(phase * 2 - 1); // 0..1
  const waxing = phase !== null && phase < 0.5;
  const maskShift = phase === null ? 0 : (waxing ? -1 : 1) * (1 - lit) * 1.9;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.24 0.024 135) 0%, oklch(0.175 0.014 145) 40%, oklch(0.17 0.008 130) 100%)",
        }}
      />
      {/* Кинематографичная виньетка: на телефоне края почти не тронуты, на
          широком десктопе зона за колонкой контента уходит в тень — пустота
          по бокам читается как намеренное «letterbox». */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 82% 82% at 50% 42%, transparent 52%, oklch(0.12 0.006 130 / 0.55) 100%)",
        }}
      />
      {/* Дальнее эхо очага — едва тёплое пятно вверху, не движется. */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 rounded-full opacity-80 blur-3xl"
        style={{
          width: "clamp(18rem, 34vw, 40rem)",
          height: "clamp(18rem, 34vw, 40rem)",
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.08) 0%, transparent 65%)",
        }}
      />

      {/* #18 · СЕВЕРНОЕ СИЯНИЕ — только если найдено (rare). Два полотна с
          разными периодами: один слой читается как «анимация», два в
          противофазе — как погода. Держится в верхней трети, далеко от
          текста; blend 'screen' складывает свет, не перекрашивает сцену. */}
      {hasAurora && (
        <div
          className="absolute inset-x-0 top-0 h-[46vh] overflow-hidden"
          style={{ mixBlendMode: "screen" }}
        >
          <div
            className="aurora-veil absolute inset-x-[-10%] top-0 h-full blur-2xl"
            style={{
              background:
                "linear-gradient(175deg, oklch(0.82 0.16 155 / 0.3) 0%, oklch(0.78 0.13 190 / 0.14) 42%, transparent 78%)",
            }}
          />
          <div
            className="aurora-veil aurora-veil-2 absolute inset-x-[-14%] top-0 h-[78%] blur-3xl"
            style={{
              background:
                "linear-gradient(168deg, oklch(0.86 0.18 145 / 0.2) 0%, oklch(0.8 0.12 205 / 0.1) 55%, transparent 82%)",
            }}
          />
        </div>
      )}

      {/* Зерно: последний штрих плоского фона — разница между «плоско» и
          «дорого» физически в нём. Турбулентность вместо PNG. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          opacity: 0.035,
          mixBlendMode: "overlay",
        }}
      />
      {STARS.map(([top, left, size, alpha], i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: `clamp(${size * 1}px, ${size * 0.14}vw, ${size * 1.9}px)`,
            height: `clamp(${size * 1}px, ${size * 0.14}vw, ${size * 1.9}px)`,
            backgroundColor: `oklch(0.92 0.01 210 / ${alpha})`,
          }}
        />
      ))}

      {/* #20 · ЛУНА — 10-я награда, дальше живёт по реальному календарю.
          В новолуние (lit < 0.06) не рисуем вовсе: пустое небо в новолуние —
          это и есть достоверность, а не потерянный элемент. */}
      {hasMoon && phase !== null && lit > 0.06 && (
        <svg
          className="absolute right-[14%] top-[11%] h-auto w-[clamp(2.6rem,7vw,4rem)]"
          viewBox="0 0 20 20"
        >
          <defs>
            <mask id="moon-mask">
              <rect x="0" y="0" width="20" height="20" fill="black" />
              <circle cx="10" cy="10" r="6" fill="white" />
              {/* Тёмный круг съезжает по диску: положение задаёт и фазу,
                  и сторону освещения — одна цифра вместо восьми картинок. */}
              <circle
                cx={10 + maskShift * 6}
                cy="10"
                r="6"
                fill="black"
              />
            </mask>
          </defs>
          {/* Гало — свет вокруг диска, а не свечение UI-элемента */}
          <circle
            cx="10"
            cy="10"
            r="9"
            fill="oklch(0.92 0.03 210 / 0.05)"
            style={{ filter: "blur(1.2px)" }}
          />
          <g mask="url(#moon-mask)">
            <circle cx="10" cy="10" r="6" fill="oklch(0.93 0.02 205 / 0.5)" />
          </g>
        </svg>
      )}

      {/* ЗЕМЛЯ. Без неё чат висел в чёрной пустоте. Два холма-силуэта дают
          сцене пол, а разговору — место действия: ночной остров, не void.
          h-[38vh]: док ввода + таб-бар перекрывают нижние ~130px — при 22vh
          от холмов оставалась полоска в 18px. */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[38vh] w-full"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <path
          d="M0 16 Q 18 9 36 13 T 70 12 Q 86 10 100 14 L 100 30 L 0 30 Z"
          fill="oklch(0.21 0.025 140)"
        />
        <path
          d="M0 22 Q 25 16 50 19 T 100 18 L 100 30 L 0 30 Z"
          fill="oklch(0.185 0.02 138)"
        />
      </svg>

      {/* ОЧАГ. Центр поднят на 150px от низа — над перекрывающими панелями:
          тёплый свет реально виден за нижними пузырями ленты. «Сидим рядом у
          огня»: это же свечение объясняет тёплую подсветку .chat-bubble-cat. */}
      <div
        className="absolute bottom-[150px] left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full blur-3xl"
        style={{
          width: "clamp(20rem, 60vw, 36rem)",
          height: "clamp(12rem, 32vw, 19rem)",
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.2) 0%, oklch(0.72 0.17 55 / 0.07) 45%, transparent 70%)",
        }}
      />

      {/* #19 · СУЩЕСТВО У КОСТРА. Раньше напарник существовал только как
          аватар в шапке — «интерфейсный элемент». Теперь он физически сидит
          в сцене, спиной, чуть левее очага: тот, с кем ты рядом смотришь на
          огонь. Силуэт, без черт лица — домысленное присутствие сильнее
          прорисованного, и это не второй «персонаж» в конкуренции с маскотом.
          Дышит только грудная клетка (7s).
          Позиция и плотность выверены в браузере: на 168px композер срезал
          силуэт до одних ушей, на 124px — накрывал целиком. На 214px фигура
          читается, но лента скроллит текст мимо неё — столкновения с
          репликами неизбежны на узком экране. Поэтому opacity-50: существо
          обязано проигрывать тексту. Оно атмосфера, а не объект поверх
          контента — на полной плотности почти чёрный силуэт читался
          «дыркой» рядом со временем реплики. */}
      <svg
        className="absolute bottom-[214px] left-[5%] h-auto w-[clamp(2.2rem,6vw,2.9rem)] opacity-50"
        viewBox="0 0 40 44"
      >
        {/* Ореол от очага: край силуэта, обращённый к огню, ловит тепло */}
        <ellipse
          cx="26"
          cy="30"
          rx="13"
          ry="16"
          fill="oklch(0.72 0.17 55 / 0.07)"
          style={{ filter: "blur(3px)" }}
        />
        <g className="creature-breathe">
          {/* Корпус сидящей фигуры — каплевидный, чуть наклонён к огню */}
          <path
            d="M20 43 C 9 43 7 33 9.5 25 C 11.5 18.5 15 16 20 16 C 25 16 28.5 18.5 30.5 25 C 33 33 31 43 20 43 Z"
            fill="oklch(0.145 0.015 145)"
          />
          {/* Голова */}
          <circle cx="20" cy="11" r="7.2" fill="oklch(0.145 0.015 145)" />
          {/* Ушки — узнаваемая силуэтная примета кота */}
          <path d="M14.4 6.2 L 13.2 0.6 L 18.2 4.2 Z" fill="oklch(0.145 0.015 145)" />
          <path d="M25.6 6.2 L 26.8 0.6 L 21.8 4.2 Z" fill="oklch(0.145 0.015 145)" />
          {/* Контровой свет по кромке со стороны огня — читается объём */}
          <path
            d="M30.5 25 C 33 33 31 43 20 43 C 27 41.5 29.5 33.5 27.6 26 Z"
            fill="oklch(0.72 0.17 55 / 0.3)"
          />
          <path
            d="M20 3.8 A 7.2 7.2 0 0 1 27.2 11 A 7.2 7.2 0 0 1 25.4 15.6 C 26.6 13.2 26.4 8 23.4 5.4 Z"
            fill="oklch(0.72 0.17 55 / 0.26)"
          />
        </g>
        {/* Хвост обёрнут вокруг — не дышит вместе с корпусом, он лежит */}
        <path
          d="M11 41.5 C 4.5 41 2.5 36.5 5.5 33.5"
          stroke="oklch(0.145 0.015 145)"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
