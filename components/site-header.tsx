import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeaderCta } from "@/components/header-cta";
import { MascotStatic } from "@/components/hero-scene";

export function SiteHeader() {
  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-white/10">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-1.5">
          {/* Живой микро-кот вместо лаймового квадрата с «Н»: лицо бренда в
              шапке (дышит и моргает на SMIL), а лайм в кадре остаётся за
              смыслом — глазами, «первым» и CTA */}
          <MascotStatic size={30} className="-mt-0.5" />
          <span className="text-sm font-bold tracking-tight">напарник</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            render={<Link href="#how" />}
            nativeButton={false}
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
          >
            Как это работает
          </Button>
          <Button
            render={<Link href="#world" />}
            nativeButton={false}
            size="sm"
            variant="ghost"
            className="hidden text-muted-foreground sm:inline-flex"
          >
            Мир
          </Button>
          <HeaderCta />
        </nav>
      </div>
    </header>
  );
}
