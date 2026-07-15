const failedTools = [
  'Notion с идеальной системой, заброшен через 9 дней',
  'Todoist с 47 просроченными задачами',
  'Pomodoro-таймер, который ты забываешь включить',
  'Планировщик, который стыдит красными цифрами',
]

export function Problem() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <div className="flex flex-1 flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">
              [ честно ]
            </p>
            <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
              Тебе не нужен ещё один инструмент. Тебе нужен кто-то, кто скажет
              «начинай» в нужный момент.
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              Все приложения для фокуса требуют одного: чтобы ты сам их открыл.
              То есть требуют той самой силы воли, которой нет в момент
              прокрастинации. Это очки, которые нужно разглядеть, чтобы надеть.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-3">
            {failedTools.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-muted-foreground"
              >
                <span aria-hidden="true" className="mt-0.5 font-mono text-destructive">
                  ✕
                </span>
                {item}
              </li>
            ))}
            <li className="flex items-start gap-3 rounded-xl border border-primary/40 bg-background p-4 text-sm font-medium leading-relaxed">
              <span aria-hidden="true" className="mt-0.5 font-mono text-primary">
                ✓
              </span>
              Напарник, который приходит к тебе сам
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
