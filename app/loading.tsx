import { GroundPool, HeroScene, MascotStatic } from "@/components/hero-scene";

/**
 * Состояние загрузки = первый кадр продукта, а не спиннер.
 * Существо уже здесь: дышит и моргает на чистом SVG без JS,
 * поэтому даже на медленной сети первый контакт — живой мир.
 */
export default function Loading() {
  return (
    <div className="grain relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <HeroScene />
      </div>
      <div className="relative flex flex-col items-center">
        <MascotStatic size={200} className="relative z-10" />
        <GroundPool className="-mt-11" />
      </div>
      <span className="sr-only">Загрузка</span>
    </div>
  );
}
