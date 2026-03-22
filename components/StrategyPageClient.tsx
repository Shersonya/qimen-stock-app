'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LimitUpPanel } from '@/components/LimitUpPanel';
import { TdxScanPanel } from '@/components/TdxScanPanel';
import type { LimitUpStock, PoolStock } from '@/lib/contracts/strategy';
import { useToast } from '@/lib/hooks/use-toast';
import type { TdxScanResult } from '@/lib/tdx/types';
import { addToPool, createPool, getActivePool } from '@/lib/services/stock-pool';
import { getShanghaiDateString } from '@/lib/utils/date';

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
  const [activePool, setActivePool] = useState(() => getActivePool());
  const [toastMessage, setToastMessage] = useToast();

  function ensureActivePool() {
    return getActivePool() ?? createPool('策略观察池', []);
  }

  function commitPoolStocks(stocks: PoolStock[]) {
    const targetPool = ensureActivePool();
    const updatedPool = addToPool(targetPool.id, stocks) ?? targetPool;

    setActivePool(updatedPool);
    setToastMessage(`已将 ${stocks.length} 只股票加入 ${updatedPool.name}。`);
  }

  function mapTdxStockToPool(item: TdxScanResult): PoolStock {
    const addDate = getShanghaiDateString();
    const tdxSignalType =
      item.meiZhu && item.meiYangYang
        ? 'both'
        : item.meiYangYang
          ? 'meiYangYang'
          : 'meiZhu';
    const addSource =
      item.meiZhu && item.meiYangYang
        ? `美柱 + 美阳阳共振 / 信号日 ${item.signalDate}`
        : item.meiYangYang
          ? `美阳阳扫描 / 信号日 ${item.signalDate}`
          : `美柱扫描 / 信号日 ${item.signalDate}`;

    return {
      stockCode: item.stockCode,
      stockName: item.stockName,
      market: item.market,
      addReason: 'tdx_signal',
      addDate,
      addSource,
      tdxSignalType,
    };
  }

  function mapLimitUpStockToPool(item: LimitUpStock): PoolStock {
    const addDate = getShanghaiDateString();

    return {
      stockCode: item.stockCode,
      stockName: item.stockName,
      market: item.market,
      addReason: 'limit_up',
      addDate,
      addSource: `近 30 日涨停 ${item.limitUpCount} 次 / 最近涨停 ${item.lastLimitUpDate}`,
      limitUpCount: item.limitUpCount,
    };
  }

  return (
    <section className="workbench-page" data-testid="strategy-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">策略选股</p>
          <h2>通达信策略与涨停板筛选的双 Tab 工作台</h2>
          <p>
            现在可以直接把筛选结果加入本地股票池，再切到股票池页继续做批量诊断和快照管理。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">{demoMode ? 'Demo 数据已启用' : 'Live API 已就绪'}</span>
          <span className="mystic-chip">双 Tab</span>
          <span className="mystic-chip">表单 + 结果表</span>
          <Link className="mystic-chip" href="/stock-pool">
            {activePool ? `${activePool.name} / ${activePool.stocks.length} 只` : '未创建股票池'}
          </Link>
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
            <TdxScanPanel
              activePoolName={activePool?.name}
              demoMode={demoMode}
              onAddAllStocks={(items) => commitPoolStocks(items.map(mapTdxStockToPool))}
              onAddStock={(item) => commitPoolStocks([mapTdxStockToPool(item)])}
              poolStockCodes={activePool?.stocks.map((stock) => stock.stockCode)}
            />
          </div>
          <div
            aria-labelledby="limitUp-tab"
            className={activeTab === 'limitUp' ? 'block' : 'hidden'}
            id="limitUp-panel"
            role="tabpanel"
          >
            <LimitUpPanel
              activePoolName={activePool?.name}
              demoMode={demoMode}
              onAddAllStocks={(items) => commitPoolStocks(items.map(mapLimitUpStockToPool))}
              onAddStock={(item) => commitPoolStocks([mapLimitUpStockToPool(item)])}
              poolStockCodes={activePool?.stocks.map((stock) => stock.stockCode)}
            />
          </div>
        </div>
      </div>

      {toastMessage ? (
        <div className="workbench-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}
