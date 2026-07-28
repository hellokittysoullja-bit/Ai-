import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Обрезка по границе слова, не по символу: рваное «созда…» на
 * кнопке-герое читается как брак. Если естественный пробел найти
 * негде (одно длинное слово) — режем по символам, это лучше, чем
 * не обрезать вовсе.
 */
export function trimLabel(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  const safe = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return `${safe}…`
}
