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
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.24 0.024 135) 0%, oklch(0.175 0.014 145) 40%, oklch(0.17 0.008 130) 100%)",
        }}
      />
      {/* Дальнее эхо очага — едва тёплое пятно вверху, не движется */}
      <div
        className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/3 rounded-full opacity-80 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.72 0.17 55 / 0.08) 0%, transparent 65%)",
        }}
      />
      {STARS.map(([top, left, size, alpha], i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            width: size,
            height: size,
            backgroundColor: `oklch(0.92 0.01 210 / ${alpha})`,
          }}
        />
      ))}
    </div>
  );
}
