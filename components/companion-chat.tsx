'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { ArrowUp, CalendarCheck, Play, Sparkles } from 'lucide-react'
import {
  addNote,
  buildMemoryContext,
  savePlan,
  type MemoryContext,
} from '@/lib/memory'

type CompanionChatProps = {
  mode: 'companion' | 'focus'
  greeting: string
  placeholder?: string
  onPlanSaved?: () => void
}

function CompanionAvatar({ size = 'size-8' }: { size?: string }) {
  return (
    <div className={`relative ${size} shrink-0 overflow-hidden rounded-full`}>
      <Image
        src="/images/naparnik-hero.png"
        alt=""
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  )
}

export function CompanionChat({ mode, greeting, placeholder, onPlanSaved }: CompanionChatProps) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const memoryRef = useRef<MemoryContext | null>(null)

  useEffect(() => {
    buildMemoryContext().then((m) => {
      memoryRef.current = m
    })
  }, [])

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/companion',
      body: () => ({
        mode,
        memory: memoryRef.current,
        clientHour: new Date().getHours(),
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function submit() {
    if (!input.trim() || status !== 'ready') return
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
              <span className="font-mono text-xs text-muted-foreground">печатает…</span>
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
            disabled={status !== 'ready' || !input.trim()}
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
