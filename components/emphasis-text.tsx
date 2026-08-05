/**
 * Рукописные слова внутри обычного текста. Раньше вся речь напарника шла
 * шрифтом Caveat целиком — в топовых чат-продуктах (Apple Messages, Linear,
 * ChatGPT, Claude, Notion) основной читаемый текст всегда набирается
 * обычной гарнитурой: глаза читают тысячи сообщений, декоративный шрифт
 * их утомляет. Рукописный стиль остаётся, но только как акцент на
 * отдельных словах — Von Restorff Effect: то, что отличается от фона,
 * замечается само, без утяжеления всего текста.
 *
 * Конвенция разметки: *слово* или *короткая фраза* — источник (системный
 * промпт в lib/companion.ts, скриптовый фолбэк в lib/scripted-companion.ts,
 * статичные реплики в компонентах) оборачивает 1, изредка 2 ключевых слова
 * за реплику. Всё остальное остаётся обычным шрифтом.
 */
export function EmphasisText({ text }: { text: string }) {
  if (!text.includes('*')) return <>{text}</>

  const re = /\*([^*]+)\*/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = re.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <span key={key++} className="font-hand text-[1.08em]">
        {match[1]}
      </span>,
    )
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return <>{parts}</>
}
