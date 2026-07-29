import Image from 'next/image'

export const metadata = {
  title: 'Сравнение: артефакт Клода vs наша версия',
}

const PAIRS = [
  {
    title: 'Пара 1 · Дом целиком (фото «После» №1 из артефакта)',
    claude: '/compare/claude-after-1.jpg',
    ours: '/compare/ours-full-home.png',
    claudeNote:
      'Клод «После»: чипы «МОЖНО ПРОСТО НАЖАТЬ» — сильный ход. Но CTA «Повторить: „Старт 8“» с фейковыми данными спрятан ВНУТРИ goal-карты (действие подчинено награде — инверсия иерархии), и 8-строчная рукопись на входе — перегруз декоративным шрифтом.',
    oursNote:
      'Мы: реплика с памятью времени («Сейчас 17:00 — обычно именно в это время ты реально начинаешь»), кнопка «Начинаю: „Убрать одну вещь“» — первая на экране; чипы «МОЖНО ПРОСТО НАЖАТЬ» тоже есть; goal-карта с сегментным баром 9/10 ниже действий.',
  },
  {
    title: 'Пара 2 · Goal-карта и низ экрана (фото «После» №2 из артефакта)',
    claude: '/compare/claude-after-2.jpg',
    ours: '/compare/ours-full-home.png',
    claudeNote:
      'Клод «После»: карта цельная — сегментный бар + «9 ИЗ 10 · ОСТАЛСЯ ПОСЛЕДНИЙ» + «Весь остров →» без переносов. Вербальный фрейминг близости — его выигрыш (goal-gradient, Kivetz 2006). Но контур поля ввода горит всегда (focus-state без фокуса) и плавающий док срезает тач-зоны.',
    oursNote:
      'Мы: сегментный бар 9/10 есть, свет поля — только по фокусу, док на краю экрана (досягаемость по Фиттсу). Проигрыш: строка «— остров уже вырос сегодня, смотри →» переносится сиротой — идёт в починку.',
  },
  {
    title: 'Пара 3 · Живая переписка (фото «После» №3 из артефакта)',
    claude: '/compare/claude-after-3.jpg',
    ours: '/compare/ours-full-chat.png',
    claudeNote:
      'Клод «После»: пузыри с оранжевым кольцом, реплики живее («Сижу, смотрю на пустой берег»). Но это НАРИСОВАННЫЕ реплики: «Как дуела» принята задачей без вопроса — баг старого прода, который макет не лечит, а маскирует красотой.',
    oursNote:
      'Мы: настоящий диалог, снятый живьём — «Здарова» получает ответ с памятью плана, «Раздроби мне задачу» получает дробление; карточка старта с обещанием «этот старт вырастит что-то на острове»; «СЕГОДНЯ» — только при живой истории.',
  },
]

export default function ComparePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-balance">
          Финал против финала: артефакт Клода vs наша версия
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Слева — итоговый экран из артефакта Клода (отрендерен его HTML).
          Справа — наш живой продукт в том же состоянии (9 стартов, план
          «Убрать одну вещь», реплика на «Здарова»).
        </p>
      </header>

      {PAIRS.map((pair) => (
        <section key={pair.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{pair.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <figure className="flex flex-col gap-2">
              <figcaption className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Клод (артефакт)
              </figcaption>
              <Image
                src={pair.claude || "/placeholder.svg"}
                alt={`Артефакт Клода — ${pair.title}`}
                width={462}
                height={1200}
                className="h-auto w-full rounded-xl border border-border"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {pair.claudeNote}
              </p>
            </figure>
            <figure className="flex flex-col gap-2">
              <figcaption className="font-mono text-xs uppercase tracking-widest text-primary">
                Наша версия (живой продукт)
              </figcaption>
              <Image
                src={pair.ours || "/placeholder.svg"}
                alt={`Наша версия — ${pair.title}`}
                width={462}
                height={1200}
                className="h-auto w-full rounded-xl border border-border"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {pair.oursNote}
              </p>
            </figure>
          </div>
        </section>
      ))}

      <footer className="rounded-xl bg-secondary/50 p-4 text-sm leading-relaxed text-secondary-foreground">
        Итог red-team: у Клода два реальных выигрыша — quick-reply чипы и
        фрейминг «остался последний»; обе идеи стоит внедрить. Его три ошибки
        — CTA внутри goal-карты, вечно горящий контур поля, плавающий док —
        не внедряются (инверсия иерархии, ложный focus-сигнал, срезание
        тач-зон по Фиттсу). Наши уникальные преимущества — живой мозг с
        памятью плана и времени, обещание награды в момент решения, свет как
        событие — в статичном HTML отсутствуют в принципе.
      </footer>
    </main>
  )
}
