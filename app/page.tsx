import { ReferenceCharts } from '@/components/ReferenceCharts';
import { StockQimenTool } from '@/components/StockQimenTool';

export default function HomePage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-[1520px] px-4 py-5 sm:px-6 sm:py-8 xl:px-10">
      <div className="pointer-events-none absolute inset-x-4 top-4 h-[420px] rounded-[2.75rem] border border-gold/15 bg-[radial-gradient(circle_at_top,rgba(199,153,75,0.12),transparent_62%),linear-gradient(180deg,rgba(44,26,19,0.82),rgba(16,10,9,0.16))] shadow-[inset_0_1px_0_rgba(248,238,219,0.08)] sm:inset-x-6 xl:inset-x-10" />
      <section className="relative grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.92fr)]">
        <StockQimenTool />
        <ReferenceCharts />
      </section>
    </main>
  );
}
