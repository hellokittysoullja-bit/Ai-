/**
 * Тихий ночной фон приложения — континуитет со сценой лендинга без её
 * драмы и без анимации.
 *
 * /app открывают десятки раз в день: любое повторяющееся движение здесь —
 * трата батареи и путь к habituation (тот же принцип, что уже применён к
 * маскоту на home-screen — bounce только на событие, не на каждый mount).
 * Поэтому фон полностью статичен: ни одного keyframe, ни одного SMIL —
 * тёплая вертикальная тьма и горстка неподвижных звёзд. Атмосфера есть,
 * но она не соревнуется за внимание с текстом и не садит батарею.
 *
 * Рендерится один раз в app/app/layout.tsx (fixed, вне потока документа —
 * не задевает существующую вёрстку трёх вложенных экранов) и живёт через
 * все переходы Дом/Фокус/Мир без перемонтирования и мигания.
 *
 * БЕЗ отрицательного z-index (сознательно): и <html>, и <body> здесь несут
 * собственный явный bg-background (dark-first тема). В этой связке z-index
 * < 0 на fixed-элементе прячет его под фон корневого элемента — эмпирически
 * подтверждено (element inspection + попиксельная проверка PNG), а не
 * только «правильно» по спецификации на бумаге. Порядок в DOM (этот блок
 * рендерится ПЕРВЫМ, до остального контента) при z-index: auto даёт тот же
 * визуальный результат — элемент под контентом — без этой ловушки.
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

export function AppBackdrop() {
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
      {/* Кинематографичная виньетка: на телефоне (узкий вьюпорт) края почти
          не тронуты — эллипс покрывает почти всё поле. На широком десктопе
          зона за колонкой контента (max-w-md по центру) уходит в тень, и
          пустота по бокам читается как намеренное «letterbox», а не как
          недогруженная страница. Чистая атмосфера, ноль влияния на вёрстку. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 82% 82% at 50% 42%, transparent 52%, oklch(0.12 0.006 130 / 0.55) 100%)",
        }}
      />
      {/* Дальнее эхо очага — едва тёплое пятно вверху, не движется.
          Размер в vw: на узком /app (мобильный, основной случай) —
          компактно и незаметно; на широких edge-экранах (404/error,
          могут открыть на десктопе) то же пятно не теряется в пустоте. */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 rounded-full opacity-80 blur-3xl"
        style={{
          width: "clamp(18rem, 34vw, 40rem)",
          height: "clamp(18rem, 34vw, 40rem)",
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.08) 0%, transparent 65%)",
        }}
      />
      {/* Зерно: последний штрих плоского фона. Без него градиент+виньетка+
          очаг всё равно читаются гладкой заливкой на OLED — глаз не называет
          это словом, но разница между «плоско» и «дорого» физически в этом
          зерне (см. тренд dark glassmorphism 2026: noise + градиент + тонкая
          кромка). Турбулентность вместо PNG — не гонит лишний файл, тайлится
          бесшовно. mix-blend-mode: overlay + 3.5% — на пороге восприятия,
          выше уже читалось бы как «зашумлённая камера», не текстура. */}
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
      {/* ЗЕМЛЯ. Без неё чат висел в чёрной пустоте — «сделано на коленке».
          Два холма-силуэта (чуть светлее неба — читаются как масса при любой
          автояркости OLED) дают сцене пол, а разговору — место действия:
          ночной остров, не void. Статичный SVG, ноль анимации. */}
      {/* h-[38vh]: док ввода + таб-бар перекрывают нижние ~130px экрана —
          при 22vh от холмов оставалась полоска в 18px, сцена не читалась
          вовсе (проверено скриншотом). Теперь холмы поднимаются над
          панелями и видны за лентой чата. */}
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
          тёплый свет реально виден за нижними пузырями ленты, а не срезан
          доком ввода (прежний bottom-0 translate-y-1/2 был почти целиком
          спрятан). «Сидим рядом у огня»: это же свечение объясняет тёплую
          подсветку пузырей кота (.chat-bubble-cat) — свет в сцене един. */}
      <div
        className="absolute bottom-[150px] left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full blur-3xl"
        style={{
          width: "clamp(20rem, 60vw, 36rem)",
          height: "clamp(12rem, 32vw, 19rem)",
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.2) 0%, oklch(0.72 0.17 55 / 0.07) 45%, transparent 70%)",
        }}
      />
    </div>
  );
}
