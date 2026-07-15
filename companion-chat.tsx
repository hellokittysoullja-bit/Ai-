'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'

type CompanionChatProps = {
  mode: 'plan' | 'focus'
  greeting: string
  placeholder?: string
}

export function CompanionChat({ mode, greeting, placeholder }: CompanionChatProps) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/companion',
      body: { mode },
    }),
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
          <div className="flex items-start gap-2">
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
              <Image
                src="/images/naparnik-hero.png"
                alt=""
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm leading-relaxed">
              {greeting}
            </div>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.role === 'user' ? 'justify-end' : ''
              }`}
            >
              {message.role !== 'user' && (
                <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src="/images/naparnik-hero.png"
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-primary-foreground'
                    : 'rounded-tl-sm bg-secondary text-secondary-foreground'
                }`}
              >
                {message.parts.map((part, i) =>
                  part.type === 'text' ? <span key={i}>{part.text}</span> : null,
                )}
              </div>
            </div>
          ))}

          {status === 'submitted' && (
            <div className="flex items-center gap-2">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/images/naparnik-hero.png"
                  alt=""
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
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
