import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Экраны Напарника — 10 состояний",
  description: "Визуальные макеты всех состояний экрана Дома после правок архитектуры.",
}

const screens = [
  {
    id: "state-1-empty",
    title: "Дела ещё нет",
    caption: "Три быстрых входа, компактный заголовок, composer в покое.",
  },
  {
    id: "state-2-task",
    title: "Дело выбрано",
    caption: "Одна карточка «Первое движение», единственный lime-CTA.",
  },
  {
    id: "state-3-focus",
    title: "Фокус идёт",
    caption: "Тихий чат, session-dock с таймером над composer.",
  },
  {
    id: "state-4-reward",
    title: "Возврат с наградой",
    caption: "Event-card в потоке: на острове появился росток.",
  },
  {
    id: "state-5-loading",
    title: "Загрузка",
    caption: "Skeleton по будущей геометрии, без спиннера и без прыжков.",
  },
  {
    id: "state-6-typing",
    title: "Кот думает",
    caption: "Группировка сообщений, статичные точки, badge возврата вниз.",
  },
  {
    id: "state-7-sticky",
    title: "Sticky-контекст",
    caption: "Плашка появляется только когда карточка ушла из viewport.",
  },
  {
    id: "state-8-quickreply",
    title: "Quick replies и focus",
    caption: "Чипы под своим сообщением, lime focus-ring, активный send.",
  },
  {
    id: "state-9-error",
    title: "Ошибка и offline",
    caption: "Мысль сохранена, «Повторить / Скопировать», без lime.",
  },
  {
    id: "state-10-session-end",
    title: "Сессия завершена",
    caption: "Награда свернулась в строку истории, намёк на редкую находку.",
  },
]

export default function ScreensPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 md:px-8">
      <header className="mx-auto mb-10 flex max-w-6xl flex-col gap-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Визуальный референс</p>
        <h1 className="text-balance text-2xl font-semibold leading-relaxed text-foreground md:text-3xl">
          Экраны Напарника после правок
        </h1>
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Десять состояний: четыре базовых состояния Дома и шесть системных. Одно lime-пятно на экран, два шрифта,
          радиусы 16/20/22/24/28, шкала отступов 4/8/12/16/24.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen, index) => (
          <figure key={screen.id} className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
              <Image
                src={`/screens/${screen.id}.png`}
                alt={`Макет экрана: ${screen.title}`}
                width={900}
                height={1950}
                className="h-auto w-full"
                priority={index < 3}
              />
            </div>
            <figcaption className="flex flex-col gap-1 px-1">
              <span className="text-xs tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-sm font-medium text-foreground">{screen.title}</span>
              <span className="text-pretty text-xs leading-relaxed text-muted-foreground">{screen.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
