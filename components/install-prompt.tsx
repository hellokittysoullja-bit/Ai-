'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

/**
 * Протез object permanence: у СДВГ «вне поля зрения = не существует».
 * Иконка на домашнем экране — не маркетинг, а канал возврата,
 * который не требует ни разрешений, ни уведомлений.
 *
 * Показываем один раз, только после первого старта (ценность уже прожита),
 * и никогда не возвращаемся, если человек закрыл — уважение к «нет».
 */

const DISMISSED_KEY = 'naparnik:installDismissed'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return true
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPrompt({ companionName }: { companionName: string | null }) {
  // 'chrome' — есть нативный prompt; 'ios' — подсказка про «На экран Домой»
  const [mode, setMode] = useState<'hidden' | 'chrome' | 'ios'>('hidden')
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') return
    } catch {
      /* приватный режим */
    }

    if (isIos()) {
      setMode('ios')
      return
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('chrome')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setMode('hidden')
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* приватный режим */
    }
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    // Любой исход — больше не пристаём: «нет» значит «нет»
    dismiss()
    void choice
  }

  if (mode === 'hidden') return null

  const name = companionName ?? 'я'

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/40 p-3">
      <div className="flex items-start gap-2">
        <Home className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="font-hand text-lg leading-snug">
          {mode === 'chrome'
            ? `Хочешь, ${name === 'я' ? 'я поселюсь' : `${name} поселится`} у тебя на главном экране? Одна иконка — и ты меня не потеряешь из виду.`
            : `Чтобы не терять меня из виду: нажми «Поделиться», потом «На экран „Домой“» — и я всегда буду в одном тапе.`}
        </p>
      </div>
      <div className="flex gap-2">
        {mode === 'chrome' && (
          <Button size="sm" variant="secondary" className="h-10" onClick={install}>
            Поселить на экран
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-10 text-muted-foreground" onClick={dismiss}>
          {mode === 'chrome' ? 'Не сейчас' : 'Понятно'}
        </Button>
      </div>
    </div>
  )
}
