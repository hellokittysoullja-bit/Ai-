const steps = [
  {
    num: '01',
    title: 'Вечером — 3 минуты',
    text: 'Напарник разбирает с тобой завтрашний день и сам превращает «поработать над проектом» в «открыть файл X». Одно физическое действие.',
  },
  {
    num: '02',
    title: 'Утром он пишет первым',
    text: 'Не пуш «пора работать», а сообщение от живого существа: «Я тут. Просто открой файл, больше ничего». Начать — легче, чем отказать.',
  },
  {
    num: '03',
    title: 'Сессия вдвоём',
    text: 'Ты работаешь — он рядом. Body doubling без второго человека. Отвлёкся? Он мягко вернёт, без нотаций.',
  },
  {
    num: '04',
    title: 'Его мир растёт',
    text: 'Каждая сессия — новый кусочек его острова. Провалил день? Ничего не сгорает и не откатывается. Ноль, не минус.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          [ как это работает ]
        </p>
        <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
          Продукт, который приходит сам
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
          >
            <span className="font-mono text-sm text-primary">{step.num}</span>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
