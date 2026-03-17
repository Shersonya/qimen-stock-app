import Image from 'next/image';

import { referenceBoards } from '@/lib/reference-boards';

export function ReferenceCharts() {
  return (
    <aside className="space-y-4">
      <div className="rounded-[2rem] border border-vermilion/10 bg-white/80 p-6 shadow-glow">
        <p className="text-sm uppercase tracking-[0.28em] text-gold">固定参考盘</p>
        <h2 className="mt-2 font-serif text-3xl text-ink">三大市场奇门盘</h2>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          无论是否已完成查询，右侧始终固定展示沪市、深市与创业板的奇门九宫参考盘。
        </p>
      </div>
      {referenceBoards.map((reference) => (
        <figure
          key={reference.key}
          className="overflow-hidden rounded-[2rem] border border-vermilion/10 bg-white/80 shadow-glow"
        >
          <Image
            alt={reference.title}
            className="h-auto w-full bg-[#f8f2e5]"
            height={940}
            src={reference.image}
            sizes="(min-width: 1280px) 420px, 100vw"
            width={1200}
          />
          <figcaption className="p-5">
            <h3 className="font-serif text-2xl text-ink">{reference.title}</h3>
            <p className="mt-2 text-xs uppercase tracking-[0.22em] text-gold">
              {reference.datetimeLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink/75">
              {reference.description}
            </p>
          </figcaption>
        </figure>
      ))}
    </aside>
  );
}
