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

/** Приветствие: аватар-кружок + две строки текста. */
export function GreetingSkeleton() {
  // Только текстовая часть: живой маскот рендерится рядом всегда (он не
  // ждёт данных), поэтому дублировать его кружком здесь нельзя — при
  // подмене получилось бы два аватара подряд. size-13/pt-1 повторяют
  // реальную колонку приветствия.
  return (
    <div className="flex flex-1 flex-col gap-2 pt-2" aria-hidden="true">
      <Bar w="92%" h={13} />
      <Bar w="78%" h={13} />
      <Bar w="55%" h={13} />
    </div>
  );
}

/**
 * Карточка награды: спрайт + подпись + прогресс + крупный CTA.
 * Высота CTA 52px — ровно как у живой кнопки, чтобы низ карточки не поехал.
 */
export function RewardCardSkeleton() {
  return (
    // rounded-2xl и gap-3 — ровно как у живой карточки, иначе подмена
    // читается сменой формы, а не проявлением содержимого.
    <div
      className="glass flex flex-col gap-3 rounded-2xl p-4"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3.5">
        <div className="skeleton-pulse size-14 shrink-0 rounded-xl bg-foreground/[0.07]" />
        <div className="flex flex-1 flex-col gap-2">
          <Bar w="58%" h={10} />
          <Bar w="40%" h={18} />
        </div>
      </div>
      {/* Тропа (#22): точки-следы, а не сегменты — повторяем новый трек */}
      <div className="flex h-4 items-center justify-between">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-pulse size-1.5 rounded-full bg-foreground/[0.07]"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <Bar w="70%" h={12} />
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
