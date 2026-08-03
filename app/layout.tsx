import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Neucha } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
});

/**
 * Голос существа. Заменяет Caveat: связная скоропись Caveat читается
 * заметно медленнее на кириллице, а реплики напарника — не декоративная
 * подпись, а текст, который человек действительно читает на каждом экране.
 * Neucha рукописна по форме, но набрана раздельными знаками и нарисована
 * под кириллицу — тот же тёплый голос без платы за разбор букв.
 * У Neucha одно начертание (400), поэтому weight указан явно: без него
 * next/font падает на сборке.
 */
const neucha = Neucha({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-neucha",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-rc-one.vercel.app"),
  title: "Напарник — существо, которое не даст тебе слиться",
  description:
    "Не ещё один планировщик. Напарник пишет тебе первым, помогает начать и растит свой мир из твоих фокус-сессий. Без стриков. Без стыда.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Напарник",
  },
  openGraph: {
    title: "Напарник — существо, которое не даст тебе слиться",
    description:
      "Помогает начать, сидит рядом во время работы и растит остров из твоих стартов. Бесплатно, без карты и регистрации.",
    type: "website",
    locale: "ru_RU",
    siteName: "Напарник",
  },
  twitter: {
    card: "summary_large_image",
    title: "Напарник — существо, которое не даст тебе слиться",
    description:
      "Помогает начать, сидит рядом во время работы и растит остров из твоих стартов.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#1a1d17",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      // Плавный скролл к якорям («Как это работает») задан через CSS
      // (app/globals.css, под prefers-reduced-motion). Next.js предупреждает,
      // что без явного opt-in его роутер может конфликтовать с CSS-плавностью
      // при переходах между страницами — data-атрибут снимает конфликт, сам
      // scroll-behavior по-прежнему приходит из CSS и уважает reduced-motion.
      data-scroll-behavior="smooth"
      className={`bg-background ${manrope.variable} ${jetbrainsMono.variable} ${neucha.variable}`}
    >
      <body className="antialiased font-sans">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
