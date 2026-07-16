// Service worker напарника.
// Единственная механика, которую нельзя сделать в самой вкладке:
// «он пишет первым», когда приложение закрыто. Работает БЕЗ нашего
// сервера и без базы — через Periodic Background Sync прямо в браузере
// пользователя. Ничего никуда не уходит: полная анонимность.

const CHECKIN_TAG = 'companion-checkin'
const DB_NAME = 'naparnik'
const STORE = 'kv'

// Тёплые весточки — тем же голосом, что и на «Доме». Никогда не упрёк,
// никогда не «ты пропал». Только присутствие рядом.
const MESSAGES = [
  'Я на острове, приглядываю за костром. Заходи, когда сможешь.',
  'Ничего не сгорело и не откатилось. Всё ждёт тебя ровно там, где ты оставил.',
  'Смотрел на волны и думал о тебе. Один маленький старт — и я рядом.',
  'Море сегодня тихое. Если захочешь начать — я тут же сяду рядом.',
  'Просто хотел, чтобы ты знал: я здесь. Без спешки, без давления.',
  'Остров стоит, я развёл огонь. Твой следующий старт что-нибудь вырастит.',
]

// Минимальный доступ к IndexedDB — чтобы прочитать имя, которое человек
// дал существу. localStorage в service worker недоступен, поэтому имя
// клиент дублирует сюда.
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function readKey(key) {
  return openDb()
    .then(
      (db) =>
        new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readonly')
          const req = tx.objectStore(STORE).get(key)
          req.onsuccess = () => resolve(req.result ?? null)
          req.onerror = () => resolve(null)
        }),
    )
    .catch(() => null)
}

async function showCheckin() {
  const name = await readKey('companionName')
  // Детерминированный выбор по дню — чтобы весточка не повторялась подряд
  const dayIndex = Math.floor(Date.now() / 86_400_000) % MESSAGES.length
  const body = MESSAGES[dayIndex]
  const title = name ? `${name} машет тебе с острова` : 'Напарник машет тебе с острова'

  await self.registration.showNotification(title, {
    body,
    icon: '/images/app-icon.png',
    badge: '/images/app-icon.png',
    tag: CHECKIN_TAG,
    // Мягко: без вибрации-«тревоги», уведомление можно спокойно закрыть
    requireInteraction: false,
    data: { url: '/app' },
  })
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === CHECKIN_TAG) {
    event.waitUntil(showCheckin())
  }
})

// Клик по весточке — открыть дом (или сфокусировать уже открытую вкладку)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
