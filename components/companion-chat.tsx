'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MascotSvg } from '@/components/mascot-svg'
import { ArrowRight, ArrowUp, CalendarCheck, Play, Sparkles } from 'lucide-react'
import Link from 'next/link'
import {
  addNote,
  buildMemoryContext,
  getChatMessages,
  saveChatMessages,
  savePlan,
  type MemoryContext,
} from '@/lib/memory'
import { scriptedReply } from '@/lib/scripted-companion'

type CompanionChatProps = {
  mode: 'companion' | 'focus'
  greeting: string
  placeholder?: string
  onPlanSaved?: () => void
  /** Скрыть чипы-подсказки пустого чата. Нужно, когда над чатом уже показан
      свой набор чипов (стартер-чипы новичка на HomeScreen) — два визуально
      одинаковых ряда пилюль подряд, ведущих к разным действиям (мгновенный
      старт vs сообщение боту), путают сильнее, чем помогают. */
  showSuggestions?: boolean
}

function CompanionAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center">
      <MascotSvg expression="calm" size={34} />
    </div>
  )
}

export function CompanionChat({
  mode,
  greeting,
  placeholder,
  onPlanSaved,
  showSuggestions = true,
}: CompanionChatProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const memoryRef = useRef<MemoryContext | null>(null)

  useEffect(() => {
    buildMemoryContext().then((m) => {
      memoryRef.current = m
    })
  }, [])

  const { messages, sendMessage, status, addToolOutput, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/companion',
      body: () => ({
        mode,
        memory: memoryRef.current,
        clientHour: new Date().getHours(),
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Graceful degradation: LLM недоступен (нет ключа, лимит, сеть) —
    // напарник отвечает скриптовым мозгом из своей памяти. Никогда не молчит.
    onError() {
      setMessages((prev) => {
        const lastUser = [...prev].reverse().find((m) => m.role === 'user')
        const userText =
          lastUser?.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p.type === 'text' ? p.text : ''))
            .join(' ') ?? ''
        const reply = scriptedReply(userText, memoryRef.current, new Date().getHours())

        const parts: (typeof prev)[number]['parts'] = [{ type: 'text', text: reply.text }]
        if (reply.startStep) {
          parts.push({
            type: 'tool-startFocus',
            toolCallId: `scripted-${Date.now()}`,
            state: 'output-available',
            input: { firstStep: reply.startStep, minutes: reply.minutes ?? 15 },
            output: 'Кнопка «Начинаю» показана в чате.',
          } as (typeof prev)[number]['parts'][number])
        }

        // Убираем возможный пустой/оборванный ответ ассистента после ошибки
        const cleaned =
          prev.length > 0 && prev[prev.length - 1].role === 'assistant'
            ? prev.slice(0, -1)
            : prev

        return [
          ...cleaned,
          { id: `scripted-${Date.now()}`, role: 'assistant' as const, parts },
        ]
      })
    },
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return

      if (toolCall.toolName === 'savePlan') {
        const { task, firstStep, startTime } = toolCall.input as {
          task: string
          firstStep: string
          startTime?: string
        }
        savePlan({ task, firstStep, startTime }).then(async () => {
          memoryRef.current = await buildMemoryContext()
          onPlanSaved?.()
          addToolOutput({
            tool: 'savePlan',
            toolCallId: toolCall.toolCallId,
            output: 'План сохранён. Утром напомнишь про первый шаг.',
          })
        })
      }

      if (toolCall.toolName === 'rememberFact') {
        const { fact } = toolCall.input as { fact: string }
        addNote(fact).then(async () => {
          memoryRef.current = await buildMemoryContext()
          addToolOutput({
            tool: 'rememberFact',
            toolCallId: toolCall.toolCallId,
            output: 'Запомнил.',
          })
        })
      }

      if (toolCall.toolName === 'startFocus') {
        // Карточку с кнопкой рисует разметка ниже; здесь просто подтверждаем
        addToolOutput({
          tool: 'startFocus',
          toolCallId: toolCall.toolCallId,
          output: 'Кнопка «Начинаю» показана в чате.',
        })
      }
    },
  })

  const bottomRef = useRef<HTMLDivElement>(null)

  // «Он тебя помнит»: разговор переживает перезагрузку страницы.
  // Восстанавливаем последние сообщения при открытии чата.
  const chatRestoredRef = useRef(false)
  useEffect(() => {
    if (chatRestoredRef.current) return
    chatRestoredRef.current = true
    getChatMessages<(typeof messages)[number]>().then((saved) => {
      if (saved.length > 0) setMessages(saved)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Сохраняем после каждого завершённого обмена (не во время стриминга)
  useEffect(() => {
    if (!chatRestoredRef.current) return
    if (status === 'streaming' || status === 'submitted') return
    if (messages.length === 0) return
    saveChatMessages(messages)
  }, [messages, status])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // После скриптового ответа статус может быть 'error' — чат должен жить дальше
  const canSend = status === 'ready' || status === 'error'

  function submit() {
    if (!input.trim() || !canSend) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
          <motion.div
            className="flex items-start gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <CompanionAvatar />
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-1.5 font-hand text-lg leading-snug">
              {greeting}
            </div>
          </motion.div>

          {messages.length === 0 && showSuggestions && (
            <motion.div
              className="ml-10 flex flex-col gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                можно просто нажать
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Не могу заставить себя начать',
                  'Раздроби мне задачу',
                  'Просто тяжело сегодня',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => sendMessage({ text: chip })}
                    className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-foreground backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_10px_28px_-12px_oklch(0.86_0.22_130/0.55)] active:translate-y-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Link
                href="/app/session"
                className="mt-1 inline-flex w-fit items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-primary transition-opacity hover:opacity-80"
              >
                или сразу к делу
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </motion.div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col gap-2 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <motion.div
                      key={i}
                      className="flex w-full items-start gap-2"
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    >
                      {message.role !== 'user' && <CompanionAvatar />}
                      <div
                        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl ${
                          message.role === 'user'
                            ? 'ml-auto rounded-tr-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground'
                            : 'rounded-tl-sm bg-secondary px-3 py-1.5 font-hand text-lg leading-snug text-secondary-foreground'
                        }`}
                      >
                        {part.text}
                      </div>
                    </motion.div>
                  )
                }

                if (part.type === 'tool-savePlan' && part.state === 'output-available') {
                  const plan = part.input as {
                    task: string
                    firstStep: string
                    startTime?: string
                  }
                  return (
                    <div
                      key={i}
                      className="ml-10 flex max-w-[85%] flex-col gap-1 rounded-2xl border border-primary/40 bg-card px-4 py-3"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                        <CalendarCheck className="size-3.5" aria-hidden="true" />
                        план положен
                      </span>
                      <span className="text-sm font-semibold">{plan.task}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        Первый шаг: {plan.firstStep}
                        {plan.startTime ? ` — ${plan.startTime}` : ''}
                      </span>
                    </div>
                  )
                }

                if (part.type === 'tool-startFocus' && part.state === 'output-available') {
                  const { firstStep, minutes } = part.input as {
                    firstStep: string
                    minutes?: number
                  }
                  const d = minutes && [15, 25, 45].includes(minutes) ? minutes : 15
                  return (
                    <div
                      key={i}
                      className="ml-10 flex max-w-[85%] flex-col gap-2 rounded-2xl border border-primary/40 bg-card px-4 py-3"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                        готов к старту · {d} мин
                      </span>
                      <span className="text-sm font-semibold">{firstStep}</span>
                      <Button
                        size="sm"
                        className="gap-1.5 font-semibold"
                        onClick={() =>
                          router.push(
                            `/app/session?step=${encodeURIComponent(firstStep)}&d=${d}`,
                          )
                        }
                      >
                        <Play className="size-3.5" aria-hidden="true" />
                        Начинаю
                      </Button>
                    </div>
                  )
                }

                if (part.type === 'tool-rememberFact' && part.state === 'output-available') {
                  const { fact } = part.input as { fact: string }
                  return (
                    <span
                      key={i}
                      className="ml-10 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      <Sparkles className="size-3" aria-hidden="true" />
                      запомнил: {fact}
                    </span>
                  )
                }

                return null
              })}
            </div>
          ))}

          {status === 'submitted' && (
            <div className="flex items-center gap-2">
              <CompanionAvatar />
              <span
                className="flex items-center gap-1 px-1 py-2.5"
                aria-label="Напарник печатает"
              >
                <span
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                  style={{ animationDelay: '-0.3s' }}
                />
                <span
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                  style={{ animationDelay: '-0.15s' }}
                />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none" />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="border-t border-border bg-background px-4 py-3 pb-20"
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder ?? 'Напиши напарнику…'}
            aria-label="Сообщение напарнику"
            className="h-11 flex-1 rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend || !input.trim()}
            aria-label="Отправить"
            className="size-11 rounded-xl"
          >
            <ArrowUp className="size-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
