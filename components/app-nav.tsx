'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Timer, Sprout } from 'lucide-react'
import { getUnseenWorldCount } from '@/lib/memory'

const tabs = [
  { href: '/app', label: 'Дом', icon: MessageCircle, exact: true },
  { href: '/app/session', label: 'Фокус', icon: Timer, exact: false },
  { href: '/app/world', label: 'Мир', icon: Sprout, exact: false },
]

export function AppNav() {
  const pathname = usePathname()

  // Бейдж на «Мире»: там лежит награда, которую человек ещё не видел
  const [worldUnseen, setWorldUnseen] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/app/world')) {
      // Заход на остров гасит бейдж (сам markWorldSeen зовёт Island)
      setWorldUnseen(false)
      return
    }
    getUnseenWorldCount().then((n) => setWorldUnseen(n > 0))
  }, [pathname])

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          const Icon = tab.icon
          const showBadge = tab.href === '/app/world' && worldUnseen && !active
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {showBadge && (
                  <span
                    className="absolute -right-1 -top-1 size-2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </span>
              {tab.label}
              {showBadge && <span className="sr-only">— есть новое</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
