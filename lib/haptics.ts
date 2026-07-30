/**
 * Хаптика: подтверждение действия телом, минуя зрение.
 * Работает на Android (Chrome); на iOS Safari navigator.vibrate
 * отсутствует — тихо ничего не происходит. Ноль вреда, чистый плюс.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // старые браузеры могут бросить — молчим
  }
}

/** Лёгкий тик: нажатие главной кнопки (старт сессии) */
export function hapticStart() {
  vibrate(15)
}

/** Двойной мягкий: находка появилась */
export function hapticReward() {
  vibrate([20, 80, 30])
}

/** Едва заметный: завершение сессии */
export function hapticDone() {
  vibrate(10)
}
