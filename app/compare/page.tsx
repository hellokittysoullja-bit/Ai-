import Image from 'next/image'

export const metadata = {
  title: 'Сравнение: артефакт Клода vs наша версия',
}

const PAIRS = [
  {
    title: 'Пара 1 · Верх Дома: приветствие + иерархия действий',
    claude: '/compare/claude-y1400.png',
    ours: '/compare/ours-home.png',
    claudeNote:
      'Клод: 6-строчная рукопись на входе; CTA «Повторить: „Старт 8“» спрятан ВНУТРИ goal-карты — действие подчинено награде (инверсия иерархии), фейковые данные выдают статичность макета.',
    oursNote:
      'Мы: короткая реплика с реальной памятью времени («Сейчас 16:00 — обычно именно так ты начинаешь»), кнопка «Начинаю: „Убрать одну вещь“» — первая на экране, без конкурентов выше.',
  },
  {
    title: 'Пара 2 · Goal-карта: прогресс к «Луне над островом»',
    claude: '/compare/claude-y3800.png',
    ours: '/compare/ours-home.png',
    claudeNote:
      'Клод: карта цельнее — иконка + сегментный бар + «9 ИЗ 10 · ОСТАЛСЯ ПОСЛЕДНИЙ» + «Весь остров →» без переносов. Вербальный фрейминг близости цели — его выигрыш (goal-gradient, Kivetz 2006).',
    oursNote:
      'Мы: сегментный бар 9/10 есть, но строка «— остров уже вырос сегодня, смотри →» переносится сиротой — проигрыш в аккуратности, признан и идёт в починку.',
  },
  {
    title: 'Пара 3 · Переписка: мозг против декораций',
    claude: '/compare/claude-y4600.png',
    ours: '/compare/ours-chat.png',
    claudeNote:
      'Клод: чипы «МОЖНО ПРОСТО НАЖАТЬ» — его лучшая находка (тап вместо набора текста). Но контур поля ввода горит всегда — focus-state без фокуса, ложный сигнал.',
    oursNote:
      'Мы: живой мозг — на «Здарова» кот отвечает памятью о реальном плане; карточка старта с обещанием «этот старт вырастит что-то на острове»; свет поля — только по фокусу.',
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
                height={681}
                className="w-full rounded-xl border border-border"
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
                height={681}
                className="w-full rounded-xl border border-border"
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
