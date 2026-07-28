import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Обрезка по границе слова: рваное «созда…» на кнопке-герое читается как брак.
 * Если первое слово длиннее лимита — режем жёстко, чтобы не вернуть пустоту.
 */
export function trimLabel(label: string, max: number): string {
  const clean = label.trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}
