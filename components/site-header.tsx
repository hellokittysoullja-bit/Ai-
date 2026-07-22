import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeaderCta } from "@/components/header-cta";

export function SiteHeader() {
  return (
    <header className="glass-nav sticky top-0 z-50 border-b border-white/10">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            Н
          </span>
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
