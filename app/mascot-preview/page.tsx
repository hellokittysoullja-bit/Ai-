'use client'

import Image from 'next/image'
import { MascotSvg, type MascotExpression } from '@/components/mascot-svg'

const expressions: MascotExpression[] = ['calm', 'happy', 'focused', 'sleepy', 'excited']

export default function MascotPreviewPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-10">
      <h1 className="text-xl font-bold">Сравнение: старый кот vs новый SVG-маскот</h1>

      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">старый (3D-генерация)</p>
        <div className="relative size-40 overflow-hidden rounded-3xl">
          <Image src="/images/naparnik-hero.png" alt="Старый маскот" fill className="object-cover" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">новый (SVG, живой)</p>
        <div className="grid grid-cols-2 gap-4">
          {expressions.map((e) => (
            <div key={e} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3">
              <MascotSvg expression={e} size={130} label={`Маскот: ${e}`} />
              <span className="font-mono text-[10px] text-muted-foreground">{e}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
