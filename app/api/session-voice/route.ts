import { generateText } from 'ai'
import { personaBase } from '@/lib/companion'

export const maxDuration = 15

type Moment = 'start' | 'middle' | 'late' | 'done' | 'early-exit'

const momentPrompts: Record<Moment, string> = {
  start:
    'Человек только что нажал «старт». Скажи одну короткую фразу (максимум 12 слов), что ты рядом и он уже в игре.',
  middle:
    'Половина сессии позади. Одна короткая фраза поддержки (максимум 12 слов), без пафоса.',
  late: 'Осталось совсем немного. Одна короткая фраза (максимум 12 слов) — финишная прямая.',
  done:
    'Сессия закончена, человек отработал её целиком. Одна-две короткие фразы радости за конкретное дело, без пафоса. Упомяни, что твой остров стал чуть больше.',
  'early-exit':
    'Человек вышел из сессии раньше таймера. Это НЕ провал: он начал, а старт — главное. Одна-две короткие тёплые фразы без малейшего упрёка. Можно упомянуть, что остров всё равно вырос.',
}

export async function POST(req: Request) {
  try {
    const {
      moment,
      task,
      minutes,
    }: { moment: Moment; task: string; minutes?: number } = await req.json()

    const prompt = momentPrompts[moment]
    if (!prompt || !task) {
      return Response.json({ text: null }, { status: 400 })
    }

    const { text } = await generateText({
      model: 'openai/gpt-5.4-nano',
      instructions: `${personaBase}

Режим: ФОКУС-СЕССИЯ. Человек работает над: «${task}»${
        minutes ? ` (сессия ${minutes} минут)` : ''
      }. Отвечай ТОЛЬКО самой фразой, без кавычек и пояснений.`,
      prompt,
    })

    return Response.json({ text: text.trim() })
  } catch {
    // Клиент упадёт на пресеты
    return Response.json({ text: null }, { status: 500 })
  }
}
