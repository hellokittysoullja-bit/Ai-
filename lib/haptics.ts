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

/*
 * Ниже — хаптика, привязанная к СОБЫТИЯМ МИРА, а не к тапам (#28).
 * Разница принципиальная: отдача на каждый тап — это шум, к нему рука
 * привыкает за день и перестаёт различать. Отдача на событие («вырос
 * ориентир», «редкая находка») остаётся значимой, потому что заработана и
 * случается редко. Тот же принцип контингентности, что и в сцене: самое
 * заметное — ответ на событие, а не таймер.
 */

/** Ориентир вырос на острове: короткий «толчок земли» — два нарастающих. */
export function hapticLandmark() {
  vibrate([12, 60, 28])
}

/** Редкая находка (сияние): узнаваемый тройной перелив — только для rare. */
export function hapticRare() {
  vibrate([10, 50, 18, 50, 34])
}

/** Реакция поставлена на реплику: одиночный мягкий тик, тише старта. */
export function hapticReaction() {
  vibrate(8)
}

/** Порог pull-to-refresh пройден: подтверждение до отпускания пальца. */
export function hapticThreshold() {
  vibrate(12)
}
