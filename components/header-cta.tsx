"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Инвариант: в кадре всегда ровно одно primary-действие.
 * Шапочный «Начать» виден тогда и только тогда, когда CTA героя (#hero-cta)
 * не виден. Прежняя логика (scrollY > 0.6·vh) оставляла ПЕРВЫЙ кадр на
 * мобильном вообще без действия: hero-CTA за сгибом, шапочный ещё скрыт —
 * подтверждено скриншотом с реального iPhone.
 *
 * Защита от регрессии: если #hero-cta не найден (страница без hero),
 * CTA показывается сразу — кнопка никогда не исчезает навсегда.
 */
export function HeaderCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("hero-cta");
    if (!target) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // rootMargin -56px сверху: зона за sticky-шапкой не считается «видимой»
      { threshold: 0.4, rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
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
      // .press-fade, не .press: тот же конфликт transition-property, что и
      // в hero — .press (только transform) и transition-opacity (только
      // opacity) взаимно исключали друг друга, кнопка выскакивала рывком
      // вместо плавного проявления за 300мс.
      className={`press-fade font-semibold ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      Начать
    </Button>
  );
}
