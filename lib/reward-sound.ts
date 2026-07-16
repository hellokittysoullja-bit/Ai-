/**
 * Звук награды: мягкий пентатонический перезвон через WebAudio.
 * Без аудиофайлов — синтез на месте, ноль байт трафика.
 * Уважает prefers-reduced-motion: беззвучно выходит.
 */

import type { Rarity } from '@/lib/island-elements'

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function note(ac: AudioContext, freq: number, at: number, dur: number, gain: number) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

/* Пентатоника ля-мажор: любые сочетания звучат мягко, без диссонанса */
const SCALE = [440, 494, 554, 659, 740, 880]

/**
 * Перезвон по тиру редкости: чем реже находка, тем длиннее
 * и выше восходящая фраза. landmark = спокойное двузвучие.
 */
export function playRewardChime(rarity: Rarity | 'landmark') {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }
  const ac = audioCtx()
  if (!ac) return
  const t = ac.currentTime + 0.02

  if (rarity === 'landmark') {
    note(ac, SCALE[0], t, 0.5, 0.05)
    note(ac, SCALE[2], t + 0.12, 0.6, 0.045)
    return
  }
  if (rarity === 'common') {
    note(ac, SCALE[1], t, 0.4, 0.05)
    note(ac, SCALE[3], t + 0.1, 0.5, 0.045)
    return
  }
  if (rarity === 'uncommon') {
    note(ac, SCALE[1], t, 0.35, 0.05)
    note(ac, SCALE[3], t + 0.1, 0.4, 0.05)
    note(ac, SCALE[4], t + 0.22, 0.6, 0.045)
    return
  }
  // rare: восходящая фраза с верхней октавой
  note(ac, SCALE[0], t, 0.3, 0.05)
  note(ac, SCALE[2], t + 0.1, 0.32, 0.05)
  note(ac, SCALE[4], t + 0.22, 0.36, 0.05)
  note(ac, SCALE[5], t + 0.36, 0.9, 0.055)
}
