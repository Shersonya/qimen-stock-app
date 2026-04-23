'use client';

import Link from 'next/link';

import type {
  DragonHeadManualReviewStatus,
  StockPool,
} from '@/lib/contracts/strategy';

type PoolManagerPanelProps = {
  pools: StockPool[];
  activePool: StockPool | null;
  selectedCodes: string[];
  mobileMode?: boolean;
  newPoolName: string;
  importValue: string;
  isImportOpen?: boolean;
  isDiagnosing?: boolean;
  getDiagnosisHref: (stockCode: string) => string;
  onNewPoolNameChange: (value: string) => void;
  onCreatePool: () => void;
  onSelectPool: (poolId: string) => void;
  onDeletePool: () => void;
  onToggleImport: () => void;
  onImportValueChange: (value: string) => void;
  onImportPool: () => void;
  onExportPool: () => void;
  onSaveSnapshot: () => void;
  onToggleStock: (stockCode: string) => void;
  onToggleAll: () => void;
  onRemoveSelected: () => void;
  onRemoveStock: (stockCode: string) => void;
  onRunStockDiagnosis: (stockCode: string) => void;
  onUpdateDragonHeadReview: (
    stockCode: string,
    patch: {
      manualStatus?: DragonHeadManualReviewStatus;
      manualNote?: string;
    },
  ) => void;
};

function formatDateLabel(value?: string) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function formatAddReason(pool: StockPool['stocks'][number]) {
  switch (pool.addReason) {
    case 'limit_up':
      return pool.addSource ?? `涨停 ${pool.limitUpCount ?? 0} 次`;
    case 'tdx_signal':
      return pool.addSource ?? '通达信策略';
    case 'dragon_head':
      return pool.addSource ?? `龙头博弈 / ${(pool.dragonHeadTags ?? []).join(' / ') || '候选观察'}`;
    default:
      return pool.addSource ?? '手动加入';
  }
}

function formatDiagnosisLabel(pool: StockPool['stocks'][number]) {
  if (!pool.diagnosisResult) {
    return '未诊断';
  }

  return `${pool.diagnosisResult.rating} (${pool.diagnosisResult.totalScore})`;
}

function formatManualStatus(value: DragonHeadManualReviewStatus) {
  switch (value) {
    case 'confirmed':
      return '已确认';
    case 'rejected':
      return '已否决';
    default:
      return '待复核';
  }
}

export function PoolManagerPanel({
  pools,
  activePool,
  selectedCodes,
  mobileMode = false,
  newPoolName,
  importValue,
  isImportOpen = false,
  isDiagnosing = false,
  getDiagnosisHref,
  onNewPoolNameChange,
  onCreatePool,
  onSelectPool,
  onDeletePool,
  onToggleImport,
  onImportValueChange,
  onImportPool,
  onExportPool,
  onSaveSnapshot,
  onToggleStock,
  onToggleAll,
  onRemoveSelected,
  onRemoveStock,
  onRunStockDiagnosis,
  onUpdateDragonHeadReview,
}: PoolManagerPanelProps) {
  const selectedSet = new Set(selectedCodes);
  const stockCount = activePool?.stocks.length ?? 0;
  const allSelected = stockCount > 0 && selectedCodes.length === stockCount;

  function renderDragonHeadReview(stock: StockPool['stocks'][number]) {
    const review = stock.dragonHeadReview;

    if (!review) {
      return null;
    }

    return (
      <div
        className="mt-3 rounded-2xl border border-white/10 bg-black/10 px-3 py-3"
        data-testid={`dragon-head-review-${stock.stockCode}`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="mystic-chip">龙头 {review.strengthScore} 分</span>
          <span className="mystic-chip">confidence {review.confidence}</span>
          <span className="mystic-chip">{formatManualStatus(review.manualStatus)}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
          缺失因子: {review.missingFactors.length ? review.missingFactors.join(' / ') : '无'}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          复核提示: {review.reviewFlags.length ? review.reviewFlags.join(' / ') : '无'}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[8rem,minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">人工状态</span>
            <select
              aria-label={`${stock.stockCode} 人工复核状态`}
              className="mystic-select w-full"
              onChange={(event) =>
                onUpdateDragonHeadReview(stock.stockCode, {
                  manualStatus: event.target.value as DragonHeadManualReviewStatus,
                })
              }
              value={review.manualStatus}
            >
              <option value="pending">待复核</option>
              <option value="confirmed">已确认</option>
              <option value="rejected">已否决</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-muted)]">人工备注</span>
            <input
              aria-label={`${stock.stockCode} 人工复核备注`}
              className="mystic-input w-full"
              onBlur={(event) =>
                onUpdateDragonHeadReview(stock.stockCode, {
                  manualNote: event.target.value,
                })
              }
              onChange={(event) =>
                onUpdateDragonHeadReview(stock.stockCode, {
                  manualNote: event.target.value,
                })
              }
              placeholder="记录政策、龙虎榜、情绪周期等复核结论"
              value={review.manualNote ?? ''}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <section className="workbench-card" data-testid="pool-manager-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mystic-section-label">股票池管理</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
            当前股票池: {activePool?.name ?? '暂未创建'}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            共 {stockCount} 只，创建于 {formatDateLabel(activePool?.createdAt)}。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">已选 {selectedCodes.length}</span>
          <span className="mystic-chip">活跃池 {activePool ? '已设置' : '未设置'}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.85fr),minmax(0,1.15fr)]">
        <section className="workbench-card workbench-subcard">
          <p className="mystic-section-label">池切换与导入导出</p>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-[var(--text-secondary)]">当前股票池</span>
            <select
              className="mystic-select w-full"
              onChange={(event) => onSelectPool(event.target.value)}
              value={activePool?.id ?? ''}
            >
              {pools.length > 0 ? (
                pools.map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} / {pool.stocks.length} 只
                  </option>
                ))
              ) : (
                <option value="">暂无股票池</option>
              )}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm text-[var(--text-secondary)]">新建空池名称</span>
            <input
              className="mystic-input w-full"
              onChange={(event) => onNewPoolNameChange(event.target.value)}
              placeholder="输入新股票池名称"
              type="text"
              value={newPoolName}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="mystic-button-primary" onClick={onCreatePool} type="button">
              新建空池
            </button>
            <button className="mystic-button-secondary" onClick={onToggleImport} type="button">
              {isImportOpen ? '收起导入' : '导入 JSON'}
            </button>
            <button
              className="mystic-button-secondary"
              disabled={!activePool}
              onClick={onExportPool}
              type="button"
            >
              导出
            </button>
            <button
              className="mystic-button-secondary"
              disabled={!activePool}
              onClick={onSaveSnapshot}
              type="button"
            >
              保存快照
            </button>
            <button
              className="mystic-chip"
              disabled={!activePool}
              onClick={onDeletePool}
              type="button"
            >
              删除当前池
            </button>
          </div>

          {isImportOpen ? (
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/10 p-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                  粘贴股票池 JSON
                </span>
                <textarea
                  className="mystic-input min-h-40 w-full"
                  onChange={(event) => onImportValueChange(event.target.value)}
                  placeholder='{"id":"pool_xxx","name":"核心观察池","stocks":[],"removedStocks":[]}'
                  value={importValue}
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="mystic-button-primary" onClick={onImportPool} type="button">
                  确认导入
                </button>
                <button className="mystic-button-secondary" onClick={onToggleImport} type="button">
                  取消
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="workbench-card workbench-subcard">
          <p className="mystic-section-label">池内股票</p>

          {activePool?.stocks.length ? (
            <>
              {mobileMode ? (
                <div className="mt-4 space-y-3" data-testid="stock-pool-mobile-stock-list">
                  {activePool.stocks.map((stock, index) => (
                    <article
                      className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-overlay)] px-4 py-4"
                      key={stock.stockCode}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-[var(--text-muted)]">#{index + 1}</p>
                          <p className="text-lg font-semibold text-[var(--text-primary)]">
                            {stock.stockName}
                          </p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {stock.stockCode} · {stock.market}
                          </p>
                        </div>
                        <input
                          aria-label={`选择 ${stock.stockCode}`}
                          checked={selectedSet.has(stock.stockCode)}
                          onChange={() => onToggleStock(stock.stockCode)}
                          type="checkbox"
                        />
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            加入来源
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {formatAddReason(stock)}
                          </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              加入日
                            </p>
                            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                              {stock.addDate}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                              诊断评级
                            </p>
                            <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                              {formatDiagnosisLabel(stock)}
                            </p>
                          </div>
                        </div>
                        {renderDragonHeadReview(stock)}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          className="mystic-button-secondary"
                          href={getDiagnosisHref(stock.stockCode)}
                        >
                          诊断
                        </Link>
                        <button
                          className="mystic-chip"
                          disabled={isDiagnosing}
                          onClick={() => onRunStockDiagnosis(stock.stockCode)}
                          type="button"
                        >
                          刷新评级
                        </button>
                        <button
                          className="mystic-chip"
                          disabled={isDiagnosing}
                          onClick={() => onRemoveStock(stock.stockCode)}
                          type="button"
                        >
                          剔除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-black/10">
                  <table className="workbench-settings-table" data-testid="stock-pool-table">
                    <thead>
                      <tr>
                        <th>
                          <input
                            aria-label="全选股票"
                            checked={allSelected}
                            onChange={onToggleAll}
                            type="checkbox"
                          />
                        </th>
                        <th>代码</th>
                        <th>名称</th>
                        <th>来源</th>
                        <th>加入日</th>
                        <th>诊断评级</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePool.stocks.map((stock) => (
                        <tr key={stock.stockCode}>
                          <td>
                            <input
                              aria-label={`选择 ${stock.stockCode}`}
                              checked={selectedSet.has(stock.stockCode)}
                              onChange={() => onToggleStock(stock.stockCode)}
                              type="checkbox"
                            />
                          </td>
                          <td>{stock.stockCode}</td>
                          <td>
                            <div className="font-semibold text-[var(--text-primary)]">
                              {stock.stockName}
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {stock.market}
                            </div>
                          </td>
                          <td>
                            <div>{formatAddReason(stock)}</div>
                            {renderDragonHeadReview(stock)}
                          </td>
                          <td>{stock.addDate}</td>
                          <td>{formatDiagnosisLabel(stock)}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                className="mystic-button-secondary"
                                href={getDiagnosisHref(stock.stockCode)}
                              >
                                诊断
                              </Link>
                              <button
                                className="mystic-chip"
                                disabled={isDiagnosing}
                                onClick={() => onRunStockDiagnosis(stock.stockCode)}
                                type="button"
                              >
                                刷新评级
                              </button>
                              <button
                                className="mystic-chip"
                                disabled={isDiagnosing}
                                onClick={() => onRemoveStock(stock.stockCode)}
                                type="button"
                              >
                                剔除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="mystic-button-secondary"
                  disabled={selectedCodes.length === 0 || isDiagnosing}
                  onClick={onRemoveSelected}
                  type="button"
                >
                  剔除选中
                </button>
                <button className="mystic-button-secondary" onClick={onToggleAll} type="button">
                  {allSelected ? '取消全选' : '全选'}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-[var(--text-secondary)]">
              当前池还是空的。你可以从策略选股页加入股票，或导入一份已有股票池 JSON。
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
