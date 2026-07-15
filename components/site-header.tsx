import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
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
            render={<Link href="/app" />}
            nativeButton={false}
            size="sm"
            className="font-semibold"
          >
            Начать
          </Button>
        </nav>
      </div>
    </header>
  )
}
