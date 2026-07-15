import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai'
import { z } from 'zod'
import {
  buildInstructions,
  type CompanionMode,
  type MemoryContextPayload,
} from '@/lib/companion'

export const maxDuration = 30

export async function POST(req: Request) {
  const {
    messages,
    mode = 'companion',
    memory = null,
    clientHour,
  }: {
    messages: UIMessage[]
    mode?: CompanionMode
    memory?: MemoryContextPayload | null
    clientHour?: number
  } = await req.json()

  const result = streamText({
    model: 'openai/gpt-5.5',
    instructions: buildInstructions({ mode, memory, clientHour }),
    messages: await convertToModelMessages(messages),
    tools: {
      // Клиентские инструменты: выполняются на устройстве (память живёт в браузере)
      savePlan: {
        description:
          'Сохранить план на завтра, когда он согласован с человеком. Вызывай один раз, с самым важным делом.',
        inputSchema: z.object({
          task: z.string().describe('Дело целиком, как его назвал человек'),
          firstStep: z
            .string()
            .describe('Первый крошечный физический шаг, например «открыть файл презентации»'),
          startTime: z
            .string()
            .optional()
            .describe('Примерное время старта, например «09:00» или «после обеда»'),
        }),
      },
      rememberFact: {
        description:
          'Запомнить один короткий важный факт о человеке для будущих разговоров (имя, над чем работает, что мешает).',
        inputSchema: z.object({
          fact: z.string().describe('Один факт, максимум одно предложение'),
        }),
      },
      startFocus: {
        description:
          'Предложить начать фокус-сессию прямо сейчас с конкретным первым шагом. Вызывай, когда шаг раздроблен и человек готов действовать сейчас (не вечером при планировании завтра).',
        inputSchema: z.object({
          firstStep: z
            .string()
            .describe('Первый крошечный физический шаг, например «открыть файл отчёта»'),
          minutes: z
            .number()
            .optional()
            .describe('Рекомендуемая длительность: 15, 25 или 45 минут. По умолчанию 15.'),
        }),
      },
    },
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
