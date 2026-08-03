"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { MascotSvg, type MascotExpression } from "@/components/mascot-svg";

/**
 * КОМПАКТНАЯ ШАПКА ЭКРАНА — 54px.
 *
 * Что было: первый viewport занимала рукописная реплика на 3–4 строки с
 * маскотом 52px, под ней блок находок и крупная кнопка повтора. Переписка
 * начиналась ниже сгиба — то есть главный объект экрана человек не видел
 * без скролла.
 *
 * Стало: имя, статус и лицо существа живут в строке фиксированной высоты
 * (52–56px по спеке), а весь освободившийся viewport отдан чату и одной
 * карточке действия. Характер никуда не делся — он переехал в сами
 * сообщения, где рукописный голос и уместен.
 *
 * Высота задана явно (h-[54px]), а не собрана из padding'ов: шапка —
 * якорь раскладки, под неё позиционируется sticky-контекст, и «примерно
 * 54px» здесь означало бы дрожащий верх экрана при смене длины имени.
 */
export function AppTopbar({
  name,
  expression,
  status = "я здесь",
}: {
  name: string;
  expression: MascotExpression;
  status?: string;
}) {
  return (
    <header className="relative z-20 flex h-[54px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-4">
      {/* Аватар 32px с тем же тёплым кольцом, что у реплик в чате: одно
          существо, один световой язык во всём продукте. */}
      <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-secondary/80">
        <MascotSvg expression={expression} label={name} size={26} />
      </div>

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold leading-tight text-foreground">
          {name}
        </span>
        {/* Статус — 11/14, uppercase-микролейбл из типографической шкалы.
            Точка перед текстом: «здесь» — это состояние присутствия, его
            читают глазом за 100мс, не вчитываясь в слово. */}
        <span className="flex items-center gap-1.5 text-[11px] leading-[14px] text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-1.5 shrink-0 rounded-full bg-primary"
          />
          {status}
        </span>
      </div>

      {/* 44×44 — усиленная тач-цель (WCAG 2.5.8 требует 24, для главных
          мобильных контролов берём 44). Иконка внутри 20px. */}
      <Link
        href="/app/world"
        aria-label="История острова"
        className="press ml-auto flex size-11 shrink-0 items-center justify-center rounded-[20px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
      >
        <History className="size-5" aria-hidden="true" />
      </Link>
    </header>
  );
}
