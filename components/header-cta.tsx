"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * «Начать» в шапке появляется только после скролла за hero — один
 * primary-CTA на вьюпорт («Попробовать» живёт в hero).
 *
 * Защита от регрессии: если страница короткая (скроллить почти нечего),
 * CTA показывается сразу — чтобы кнопка НИКОГДА не исчезала навсегда.
 */
export function HeaderCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const compute = () => {
      const scrollable = document.body.scrollHeight - window.innerHeight;
      // Скроллить почти нечего → CTA нужна сразу (короткие страницы).
      if (scrollable < window.innerHeight * 0.4) {
        setVisible(true);
        return;
      }
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  return (
    <Button
      render={
        <Link
          href="/app"
          tabIndex={visible ? undefined : -1}
          aria-hidden={!visible}
        />
      }
      nativeButton={false}
      size="sm"
      className={`press font-semibold transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      Начать
    </Button>
  );
}
