export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <span className="sr-only">Загрузка</span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:0ms]" />
        <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:200ms]" />
        <span className="size-2 animate-pulse rounded-full bg-primary [animation-delay:400ms]" />
      </div>
    </div>
  )
}
