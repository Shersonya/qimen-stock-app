import { ReferenceCharts } from '@/components/ReferenceCharts';
import { StockQimenTool } from '@/components/StockQimenTool';

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-vermilion/10 bg-white/60 p-8 shadow-glow backdrop-blur-sm sm:p-10">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.32em] text-gold">
            Qimen Stock Board
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-6xl">
            股票奇门排盘分析工具
          </h1>
          <p className="mt-5 text-base leading-7 text-ink/75 sm:text-lg">
            输入股票代码，系统将查询真实上市日期，以默认上市时辰 09:30
            生成时家奇门九宫盘，并同步展示沪市、深市、创业板三张固定参考盘。
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <StockQimenTool />
        <ReferenceCharts />
      </section>
    </main>
  );
}
