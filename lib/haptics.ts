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

/**
 * Двойной короткий: сессия отработана.
 * Раньше был слабее старта (10мс против 15мс) — завершить работу
 * ощущалось менее значимым, чем её начать. Иерархия по силе: старт (15,
 * один толчок) < это (заметнее, но проще reward-паттерна) < находка
 * (hapticReward — самая богатая, отдельный более поздний момент).
 */
export function hapticDone() {
  vibrate([15, 40, 20])
}
