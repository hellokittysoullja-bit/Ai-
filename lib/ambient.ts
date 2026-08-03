/**
 * Эмбиент костра: синтез через WebAudio, ноль аудиофайлов.
 * Паттерн Calm: тихий фоновый звук снижает perceived effort сессии
 * и маскирует отвлекающие шумы. Строго опт-ин, громкость минимальная.
 *
 * Устройство: фильтрованный коричневый шум (гул пламени) +
 * случайные короткие щелчки (потрескивание веток).
 */

let ctx: AudioContext | null = null
let running: { stop: () => void; setLevel: (v: number) => void } | null = null

/**
 * Три уровня вместо «вкл/выкл» (#47). Разница между «тихо» и «обычно» — не
 * прихоть: в наушниках и через динамик телефона один и тот же гейн даёт
 * совершенно разную громкость, и без выбора человек просто выключает звук
 * целиком вместо того, чтобы сделать его удобным.
 */
export const AMBIENT_GAIN = { off: 0, quiet: 0.013, normal: 0.028 } as const
export type AmbientGainLevel = keyof typeof AMBIENT_GAIN

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

export function isAmbientPlaying(): boolean {
  return running !== null
}

export function startCampfire(level: AmbientGainLevel = 'normal') {
  if (running) {
    // Уже горит — просто меняем громкость, не пересобирая граф: пересборка
    // дала бы слышимый обрыв ровно в момент, когда человек крутит уровень.
    currentLevel = AMBIENT_GAIN[level]
    running.setLevel(currentLevel)
    return
  }
  const ac = audioCtx()
  if (!ac) return

  const master = ac.createGain()
  master.gain.value = 0
  master.connect(ac.destination)
  // Плавный вход за 1.5 с — звук «разгорается», а не включается
  master.gain.linearRampToValueAtTime(AMBIENT_GAIN[level], ac.currentTime + 1.5)

  // Гул пламени: коричневый шум через низкий фильтр
  const bufferLen = ac.sampleRate * 2
  const buffer = ac.createBuffer(1, bufferLen, ac.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufferLen; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  const noise = ac.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const lowpass = ac.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 320
  noise.connect(lowpass)
  lowpass.connect(master)
  noise.start()

  // Дыхание пламени: медленная модуляция громкости гула
  const lfo = ac.createOscillator()
  lfo.frequency.value = 0.13
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0.008
  lfo.connect(lfoGain)
  lfoGain.connect(master.gain)
  lfo.start()

  // Потрескивание: случайные короткие высокочастотные щелчки
  let crackleTimer: number | null = null
  function scheduleCrackle() {
    crackleTimer = window.setTimeout(
      () => {
        if (!running) return
        const t = ac!.currentTime
        const pop = ac!.createOscillator()
        const g = ac!.createGain()
        pop.type = 'triangle'
        pop.frequency.value = 900 + Math.random() * 2200
        g.gain.setValueAtTime(0.012 + Math.random() * 0.014, t)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05)
        pop.connect(g)
        g.connect(master)
        pop.start(t)
        pop.stop(t + 0.12)
        scheduleCrackle()
      },
      180 + Math.random() * 900,
    )
  }
  scheduleCrackle()

  running = {
    setLevel(v: number) {
      const t = ac.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(v, t + 0.4)
    },
    stop() {
      if (crackleTimer) window.clearTimeout(crackleTimer)
      // Плавное затухание — костёр гаснет, а не обрывается
      const t = ac.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 0.8)
      window.setTimeout(() => {
        noise.stop()
        lfo.stop()
        master.disconnect()
      }, 900)
    },
  }

  currentLevel = AMBIENT_GAIN[level]
  attachVisibilityGuard()
}

export function stopCampfire() {
  if (!running) return
  const r = running
  running = null
  r.stop()
}

/**
 * Костёр замолкает, когда приложение уходит в фон (#47).
 *
 * Без этого звук продолжает идти поверх входящего звонка, чужого видео или
 * музыки, которую человек включил, свернув вкладку, — и выключить его можно
 * только вернувшись в приложение, которое он только что осознанно покинул.
 * Гасим уровнем, а не stop(): граф остаётся живым, и возврат во вкладку
 * восстанавливает звук ровно там, где он был, без пересборки и щелчка.
 */
let currentLevel = 0
let visibilityGuardAttached = false

function attachVisibilityGuard() {
  if (visibilityGuardAttached) return
  if (typeof document === 'undefined') return
  visibilityGuardAttached = true
  document.addEventListener('visibilitychange', () => {
    if (!running) return
    running.setLevel(document.hidden ? 0 : currentLevel)
  })
}
