import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/landing/hero'
import { Problem } from '@/components/landing/problem'
import { HowItWorks } from '@/components/landing/how-it-works'
import { WorldSection } from '@/components/landing/world-section'
import { Pricing } from '@/components/landing/pricing'
import { Footer } from '@/components/footer'

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <WorldSection />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
