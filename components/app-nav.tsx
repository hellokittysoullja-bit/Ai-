"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Timer, Sprout } from "lucide-react";
import { getUnseenWorldCount } from "@/lib/memory";

/**
 * Нижний nav — только навигация ВНУТРИ приложения.
 * Путь назад на лендинг — в app-header (app/app/layout.tsx).
 * Принцип: bottom nav = core app actions, не site navigation.
 */
const tabs = [
  { href: "/app", label: "Дом", icon: House, exact: true },
  { href: "/app/session", label: "Фокус", icon: Timer, exact: false },
  { href: "/app/world", label: "Мир", icon: Sprout, exact: false },
];

export function AppNav() {
  const pathname = usePathname();
  const [worldUnseen, setWorldUnseen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/app/world")) {
      setWorldUnseen(false);
      return;
    }
    getUnseenWorldCount().then((n) => setWorldUnseen(n > 0));
  }, [pathname]);

  return (
    <nav
      aria-label="Основная навигация"
      className="glass-nav fixed inset-x-0 bottom-0 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          const showBadge = tab.href === "/app/world" && worldUnseen && !active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl px-6 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
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
          );
        })}
      </div>
    </nav>
  );
}
