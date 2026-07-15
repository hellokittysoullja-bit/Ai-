'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Timer, Sprout } from 'lucide-react'

const tabs = [
  { href: '/app', label: 'Дом', icon: MessageCircle, exact: true },
  { href: '/app/session', label: 'Фокус', icon: Timer, exact: false },
  { href: '/app/world', label: 'Мир', icon: Sprout, exact: false },
]

export function AppNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-5 py-1.5 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
