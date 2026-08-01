import { SiteHeader } from "@/components/site-header";
import { SectionNav } from "@/components/landing/section-nav";
import { Hero } from "@/components/landing/hero";
import { LandingBackdrop } from "@/components/landing/landing-backdrop";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { WorldSection } from "@/components/landing/world-section";
import { Presence } from "@/components/landing/presence";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/footer";

// Лендинг собирается в статический HTML на этапе билда: первый кадр приходит
// с CDN в первом же байте, без промежуточного состояния загрузки.
export const dynamic = "force-static";

// Structured data (schema.org) — Google строит рич-сниппет из этого:
// имя, назначение, «бесплатно», аудитория. Топ-сайты держат JSON-LD
// на каждой ключевой странице.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Напарник",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "Существо, которое пишет тебе первым, помогает начать дело и растит свой мир из твоих фокус-сессий. Для людей с СДВГ и прокрастинацией. Без стриков и стыда.",
  url: "https://ai-rc-one.vercel.app",
  inLanguage: "ru-RU",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "RUB",
  },
  audience: {
    "@type": "Audience",
    audienceType: "Люди с СДВГ и прокрастинацией",
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Structured data для поисковиков — не рендерится визуально */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Деградация без JS: секции с моушн-скрытием становятся видимыми */}
      <noscript>
        <style>{`[style*="opacity:0"], [style*="opacity: 0"] { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>
      <SiteHeader />
      <SectionNav />
      {/* relative — якорь для общего ночного фона под всеми секциями */}
      <main className="relative flex-1">
        <LandingBackdrop />
        <Hero />
        <Problem />
        <HowItWorks />
        <WorldSection />
        <Presence />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
