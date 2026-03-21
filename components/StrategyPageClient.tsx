'use client';

import { useState } from 'react';

import { LimitUpPanel } from '@/components/LimitUpPanel';
import { TdxScanPanel } from '@/components/TdxScanPanel';

type StrategyPageClientProps = {
  demoMode?: boolean;
};

type StrategyTab = 'tdx' | 'limitUp';

const STRATEGY_TABS: Array<{
  id: StrategyTab;
  label: string;
  caption: string;
}> = [
  {
    id: 'tdx',
    label: '通达信美柱美阳阳',
    caption: 'TDX 逐行翻译 + 全市场扫描',
  },
  {
    id: 'limitUp',
    label: '涨停板筛选',
    caption: '近 30 日涨停信号 + 股票池入口',
  },
];

export function StrategyPageClient({ demoMode = false }: StrategyPageClientProps) {
  const [activeTab, setActiveTab] = useState<StrategyTab>('tdx');

  return (
    <section className="workbench-page" data-testid="strategy-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">策略选股</p>
          <h2>通达信策略与涨停板筛选的双 Tab 工作台</h2>
          <p>
            这一页先把策略入口、表单、结果表与分页/排序交互打通，后续 issue 会继续接入股票池联动
            和批量诊断。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">{demoMode ? 'Demo 数据已启用' : 'Live API 已就绪'}</span>
          <span className="mystic-chip">双 Tab</span>
          <span className="mystic-chip">表单 + 结果表</span>
        </div>
      </header>

      <div className="mt-6">
        <div
          aria-label="策略工作台切换"
          className="flex flex-wrap gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-2"
          role="tablist"
        >
          {STRATEGY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                aria-controls={`${tab.id}-panel`}
                aria-selected={isActive}
                className={`workbench-tab flex-1 text-left ${isActive ? 'is-active' : ''}`}
                id={`${tab.id}-tab`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                <span className="block text-base font-semibold">{tab.label}</span>
                <span className="mt-1 block text-xs leading-5 text-current/70">{tab.caption}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <div
            aria-labelledby="tdx-tab"
            className={activeTab === 'tdx' ? 'block' : 'hidden'}
            id="tdx-panel"
            role="tabpanel"
          >
            <TdxScanPanel demoMode={demoMode} />
          </div>
          <div
            aria-labelledby="limitUp-tab"
            className={activeTab === 'limitUp' ? 'block' : 'hidden'}
            id="limitUp-panel"
            role="tabpanel"
          >
            <LimitUpPanel demoMode={demoMode} />
          </div>
        </div>
      </div>
    </section>
  );
}
