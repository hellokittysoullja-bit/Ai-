"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { House, Timer, Sprout } from "lucide-react";
import { getActiveSession, getUnseenWorldCount } from "@/lib/memory";

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

  // К-Д · Активная сессия видна с любого экрана: бейдж оставшихся минут
  // на табе «Фокус» (паттерн активного звонка iOS). Ощущение контроля:
  // ушёл на Мир — сессия не «исчезла».
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  useEffect(() => {
    let id: number | undefined;
    const tick = async () => {
      const s = await getActiveSession();
      if (!s) {
        setMinutesLeft(null);
        return;
      }
      const left = Math.ceil(
        (s.minutes * 60 - (Date.now() - s.startedAt) / 1000) / 60,
      );
      setMinutesLeft(left > 0 ? left : null);
    };
    tick();
    id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [pathname]);

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
          const showTimer =
            tab.href === "/app/session" && minutesLeft !== null && !active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`press relative flex min-h-12 min-w-20 flex-col items-center gap-1 rounded-2xl px-5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              }`}
            >
              {/* Спокойный active-state: tint + короткая линия. Он сохраняет
                  игровую узнаваемость исходника, но не превращает каждый вход
                  на Дом в зелёное световое пятно. */}
              {active && (
                <motion.span
                  layoutId="nav-mark"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-primary/[0.07] after:absolute after:inset-x-7 after:top-0 after:h-0.5 after:rounded-full after:bg-primary"
                  aria-hidden="true"
                />
              )}
              <span className="relative">
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
                {showBadge && (
                  <span
                    className="absolute -right-1 -top-1 size-2 rounded-full bg-reward"
                    aria-hidden="true"
                  />
                )}
                {showTimer && (
                  <span
                    className="absolute -right-3.5 -top-1.5 rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground"
                    aria-hidden="true"
                  >
                    {minutesLeft}м
                  </span>
                )}
              </span>
              <span className="relative">{tab.label}</span>
              {showBadge && <span className="sr-only">— есть новое</span>}
              {showTimer && (
                <span className="sr-only">
                  — идёт сессия, осталось {minutesLeft} мин
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
