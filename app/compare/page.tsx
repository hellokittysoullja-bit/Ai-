import Image from 'next/image'

export const metadata = {
  title: 'Сравнение: артефакт Клода vs наша версия',
}

const PAIRS = [
  {
    title:
      'Пара 1 · Дом + чипы быстрых ответов (фото «После» №1 из артефакта)',
    claude: '/compare/claude-after-1.jpg',
    ours: '/compare/ours-chat.png',
    claudeNote:
      'Клод «После»: чипы «МОЖНО ПРОСТО НАЖАТЬ» — его лучшая находка (тап вместо набора текста). Но: CTA «Повторить: „Старт 8“» с фейковыми данными спрятан ВНУТРИ goal-карты (действие подчинено награде — инверсия иерархии), и 8-строчная рукопись на входе — перегруз декоративным шрифтом.',
    oursNote:
      'Мы: живой мозг — на «Здарова» кот отвечает памятью о реальном плане «Убрать одну вещь»; карточка старта с обещанием «этот старт вырастит что-то на острове»; чипов быстрых ответов нет — наш признанный пробел.',
  },
  {
    title:
      'Пара 2 · Goal-карта + карточка дробления (фото «После» №2 из артефакта)',
    claude: '/compare/claude-after-2.jpg',
    ours: '/compare/ours-home.png',
    claudeNote:
      'Клод «После»: карта цельная — сегментный бар + «9 ИЗ 10 · ОСТАЛСЯ ПОСЛЕДНИЙ» + «Весь остров →» без переносов. Вербальный фрейминг близости цели — его выигрыш (goal-gradient, Kivetz 2006). Но контур поля ввода горит всегда — focus-state без фокуса, ложный сигнал.',
    oursNote:
      'Мы: кнопка «Начинаю: „Убрать одну вещь“» — первая на экране, реплика с памятью времени («Сейчас 16:00…»); сегментный бар 9/10 есть, но строка «смотри →» переносится сиротой — проигрыш в аккуратности, идёт в починку.',
  },
  {
    title:
      'Пара 3 · Переписка с карточкой старта (фото «После» №3 из артефакта)',
    claude: '/compare/claude-after-3.jpg',
    ours: '/compare/ours-chat.png',
    claudeNote:
      'Клод «После»: пузыри с оранжевым кольцом аватара, реплики живее («Сижу, смотрю на пустой берег»). Но это статичные нарисованные реплики: «Как дуела» принят как задача без вопроса — тот самый баг старого прода, который его макет не лечит, а маскирует красотой.',
    oursNote:
      'Мы: настоящий мозг разбирает сообщение — приветствие получает приветствие с памятью, дело получает карточку; свет поля ввода — только по фокусу; разделитель «СЕГОДНЯ» появляется лишь при живой истории.',
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
