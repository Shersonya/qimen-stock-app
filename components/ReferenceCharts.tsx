import Image from 'next/image';

import { referenceBoards } from '@/lib/reference-boards';

export function ReferenceCharts() {
  return (
    <aside className="space-y-3 xl:sticky xl:top-6">
      <div className="rounded-[1.9rem] border border-gold/20 bg-[linear-gradient(180deg,rgba(18,12,10,0.98),rgba(63,35,23,0.94))] p-5 text-[#fff3de] shadow-altar">
        <p className="text-[11px] uppercase tracking-[0.42em] text-[#d5ae68]">镇盘参照</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h2 className="font-serif text-[2rem] text-[#fff6e7]">三市镇盘</h2>
          <span className="rounded-full border border-gold/20 bg-vermilion/12 px-3 py-1 text-xs tracking-[0.18em] text-[#f1c37b]">
            常驻侧栏
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#ead4ae]/76">
          以三市固定时刻镇盘，随时对照个股起局与市场大势。
        </p>
      </div>
      {referenceBoards.map((reference, index) => (
        <figure
          key={reference.key}
          className="overflow-hidden rounded-[1.7rem] border border-gold/18 bg-[linear-gradient(180deg,rgba(18,12,10,0.98),rgba(69,39,27,0.96))] text-[#fff3de] shadow-altar"
        >
          <div className="border-b border-gold/12 bg-[radial-gradient(circle_at_top,rgba(166,118,41,0.16),transparent_68%),linear-gradient(180deg,rgba(19,13,11,0.82),rgba(60,35,25,0.44))] p-3">
            <div className="overflow-hidden rounded-[1.15rem] border border-gold/14 bg-[#140e0d]/70">
              <Image
                alt={reference.title}
                className="h-auto w-full contrast-[1.02] saturate-[0.82] sepia-[0.12]"
                height={860}
                loading={index < 2 ? 'eager' : 'lazy'}
                sizes="(min-width: 1280px) 420px, 100vw"
                src={reference.image}
                width={1200}
              />
            </div>
          </div>
          <figcaption className="p-4 pt-3">
            <h3 className="font-serif text-[1.55rem] text-[#fff6e7]">{reference.title}</h3>
            <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-[#d5ae68]">
              {reference.datetimeLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#ead4ae]/74">
              {reference.description}
            </p>
          </figcaption>
        </figure>
      ))}
    </aside>
  );
}
