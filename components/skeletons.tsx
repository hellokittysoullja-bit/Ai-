/**
 * Скелетоны первого кадра (#29).
 *
 * Данные «Дома» и «Мира» лежат в localStorage и читаются в useEffect —
 * значит ПЕРВЫЙ кадр всегда рендерился с stats === null и firstWord === null,
 * то есть пустотой на месте приветствия и карточки награды. Пустота потом
 * скачком заменялась контентом: классический layout shift, и, что хуже,
 * полсекунды экран выглядел сломанным.
 *
 * Скелетон повторяет ГЕОМЕТРИЮ будущего контента (высоты и радиусы взяты с
 * реальных блоков), поэтому подмена происходит без сдвига — глаз видит
 * «уже здесь, дочитывается», а не «пусто → дёрнулось».
 *
 * Мерцание намеренно медленное (2.4с) и слабое: быстрый шиммер на этом
 * экране соревновался бы за внимание с текстом — ровно то, чего этот
 * проект избегает. В prefers-reduced-motion пульсация выключается через
 * .skeleton-pulse в globals.css, форма остаётся.
 */

function Bar({
  w,
  h = 12,
  className = "",
}: {
  w: string;
  h?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-pulse rounded-full bg-foreground/[0.07] ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

/**
 * Карточка «Первое движение»: micro-label → заголовок → мета → CTA 52 →
 * secondary 44 → подпись. Скелетон повторяет ГЕОМЕТРИЮ будущей карточки
 * один в один (радиус 24, padding 20, те же высоты), поэтому появление
 * данных не двигает ни один пиксель раскладки. Ни спиннера, ни
 * горизонтального прожектора через весь экран.
 */
export function FirstMoveCardSkeleton() {
  return (
    <div
      className="glass flex flex-col gap-3 rounded-[24px] p-5"
      aria-hidden="true"
    >
      <Bar w="38%" h={11} />
      <Bar w="72%" h={18} />
      <Bar w="52%" h={13} />
      {/* Кнопка-заглушка остаётся серой: лаймовый акцент до появления
          реального действия обещал бы кнопку, которой ещё нет. */}
      <div className="skeleton-pulse h-[52px] w-full rounded-2xl bg-foreground/[0.07]" />
      <div className="skeleton-pulse h-11 w-full rounded-2xl bg-foreground/[0.04]" />
      <div className="flex justify-center">
        <Bar w="64%" h={11} />
      </div>
    </div>
  );
}

/** Плитка острова в «Мире»: сетка карточек-находок. */
export function IslandSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="glass skeleton-pulse h-44 w-full rounded-3xl bg-foreground/[0.05]" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass skeleton-pulse h-24 rounded-2xl bg-foreground/[0.05]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Живая подпись для скринридера: скелетон сам по себе aria-hidden. */
export function LoadingLabel({ children }: { children: string }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {children}
    </span>
  );
}
