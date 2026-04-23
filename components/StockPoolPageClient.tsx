'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { BatchDiagnosisPanel } from '@/components/BatchDiagnosisPanel';
import { DiagnosisCompareTable } from '@/components/DiagnosisCompareTable';
import { ErrorNotice } from '@/components/ErrorNotice';
import { PoolManagerPanel } from '@/components/PoolManagerPanel';
import { useIsMobileViewport } from '@/components/useIsMobileViewport';
import { requestBatchDiagnosis } from '@/lib/client-api';
import { useToast } from '@/lib/hooks/use-toast';
import type { ApiError } from '@/lib/contracts/qimen';
import type {
  BatchDiagnosisProgress,
  ComparisonTableData,
  DragonHeadManualReviewStatus,
  PoolStockDiagnosis,
  PoolSnapshot,
  StockPool,
} from '@/lib/contracts/strategy';
import { getDemoStockPools } from '@/lib/demo-fixtures';
import { isDiagnosisStale } from '@/lib/services/batch-diagnosis';
import {
  cleanupExpiredData,
  createPool,
  deletePool,
  exportPool,
  getActivePool,
  getAllPools,
  getSnapshots,
  importPool,
  removeFromPool,
  saveSnapshot,
  setActivePool,
  addToPool,
} from '@/lib/services/stock-pool';
import { toApiError } from '@/lib/utils/api-error';
import { buildDiagnosisPath } from '@/lib/ui';

type StockPoolPageClientProps = {
  demoMode?: boolean;
};

type SnapshotComparison = {
  added: string[];
  removed: string[];
};

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function formatDateLabel(value?: string) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function createComparisonTableData(pool: StockPool | null): ComparisonTableData {
  const items = (pool?.stocks ?? [])
    .filter(
      (
        stock,
      ): stock is StockPool['stocks'][number] & {
        diagnosisResult: NonNullable<StockPool['stocks'][number]['diagnosisResult']>;
      } => Boolean(stock.diagnosisResult),
    )
    .map((stock) => ({
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      rating: stock.diagnosisResult.rating,
      totalScore: stock.diagnosisResult.totalScore,
      riskLevel: stock.diagnosisResult.riskLevel,
      action: stock.diagnosisResult.action,
      actionLabel: stock.diagnosisResult.actionLabel,
      successProbability: stock.diagnosisResult.successProbability,
      summary: stock.diagnosisResult.summary,
      diagnosisTime: stock.diagnosisResult.diagnosisTime,
      stale: isDiagnosisStale(stock.diagnosisResult.diagnosisTime),
    }))
    .sort((left, right) => right.totalScore - left.totalScore);

  return {
    generatedAt: pool?.updatedAt ?? new Date().toISOString(),
    sortBy: 'totalScore',
    items,
  };
}

function createSnapshotComparison(
  pool: StockPool | null,
  snapshot: PoolSnapshot | null,
): SnapshotComparison | null {
  if (!pool || !snapshot) {
    return null;
  }

  const currentCodes = new Set(pool.stocks.map((stock) => stock.stockCode));
  const snapshotCodes = new Set(snapshot.stocks.map((stock) => stock.stockCode));

  return {
    added: pool.stocks
      .filter((stock) => !snapshotCodes.has(stock.stockCode))
      .map((stock) => `${stock.stockCode} ${stock.stockName}`),
    removed: snapshot.stocks
      .filter((stock) => !currentCodes.has(stock.stockCode))
      .map((stock) => `${stock.stockCode} ${stock.stockName}`),
  };
}

export function StockPoolPageClient({
  demoMode = false,
}: StockPoolPageClientProps) {
  const pathname = usePathname();
  const [pools, setPools] = useState<StockPool[]>([]);
  const [activePool, setActivePoolState] = useState<StockPool | null>(null);
  const [snapshots, setSnapshots] = useState<PoolSnapshot[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [newPoolName, setNewPoolName] = useState('策略观察池');
  const [importValue, setImportValue] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useToast();
  const [error, setError] = useState<ApiError | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<ApiError | null>(null);
  const [progress, setProgress] = useState<BatchDiagnosisProgress | null>(null);
  const [isRunningDiagnosis, setIsRunningDiagnosis] = useState(false);
  const [mobileSection, setMobileSection] = useState<'manager' | 'diagnosis' | 'history'>(
    'manager',
  );
  const isMobileViewport = useIsMobileViewport();

  function syncPoolState(seedDemo = false) {
    cleanupExpiredData();

    if (seedDemo && getAllPools().length === 0) {
      for (const pool of getDemoStockPools()) {
        importPool(JSON.stringify(pool));
      }

      const seededActivePool = getActivePool();

      if (seededActivePool && getSnapshots(seededActivePool.id).length === 0) {
        saveSnapshot(seededActivePool.id);
      }
    }

    const nextPools = getAllPools();
    const nextActivePool = getActivePool();
    const nextSnapshots = nextActivePool
      ? [...getSnapshots(nextActivePool.id)].sort(
          (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
        )
      : [];

    setPools(nextPools);
    setActivePoolState(nextActivePool);
    setSnapshots(nextSnapshots);
    setSelectedCodes((current) =>
      current.filter((stockCode) =>
        Boolean(nextActivePool?.stocks.some((stock) => stock.stockCode === stockCode)),
      ),
    );
    setSelectedSnapshotId((current) => {
      if (!nextSnapshots.length) {
        return '';
      }

      return nextSnapshots.some((snapshot) => snapshot.snapshotId === current)
        ? current
        : nextSnapshots[0]!.snapshotId;
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncPoolState(demoMode);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [demoMode]);

  const comparisonData = useMemo(() => createComparisonTableData(activePool), [activePool]);
  const staleCount = useMemo(
    () => comparisonData.items.filter((item) => item.stale).length,
    [comparisonData.items],
  );
  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.snapshotId === selectedSnapshotId) ?? null,
    [selectedSnapshotId, snapshots],
  );
  const snapshotComparison = useMemo(
    () => createSnapshotComparison(activePool, selectedSnapshot),
    [activePool, selectedSnapshot],
  );

  function showToast(message: string) {
    setToastMessage(message);
  }

  function withPoolRefresh(action: () => void, successMessage?: string) {
    try {
      setError(null);
      action();
      syncPoolState();

      if (successMessage) {
        showToast(successMessage);
      }
    } catch (nextError) {
      setError(toApiError(nextError, 'API_ERROR', '股票池操作失败，请稍后重试。'));
    }
  }

  function handleCreatePool() {
    withPoolRefresh(() => {
      const pool = createPool(newPoolName, []);

      setNewPoolName(`${pool.name}-扩展池`);
    }, '已创建新的空股票池。');
  }

  function handleSelectPool(poolId: string) {
    withPoolRefresh(() => {
      setActivePool(poolId);
    });
  }

  function handleDeletePool() {
    if (!activePool) {
      return;
    }

    if (!window.confirm(`确认删除股票池“${activePool.name}”吗？`)) {
      return;
    }

    withPoolRefresh(() => {
      deletePool(activePool.id);
    }, '已删除当前股票池。');
  }

  function handleExportPool() {
    if (!activePool) {
      return;
    }

    try {
      setError(null);

      const payload = exportPool(activePool.id);
      const filename = `${sanitizeFileName(activePool.name) || 'stock-pool'}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      downloadFile(filename, payload, 'application/json;charset=utf-8');
      showToast('已导出当前股票池 JSON。');
    } catch (nextError) {
      setError(toApiError(nextError, 'API_ERROR', '导出股票池失败，请稍后重试。'));
    }
  }

  function handleImportPool() {
    if (!importValue.trim()) {
      setError({
        code: 'API_ERROR',
        message: '请先粘贴股票池 JSON，再执行导入。',
      });
      return;
    }

    withPoolRefresh(() => {
      importPool(importValue);
      setImportValue('');
      setIsImportOpen(false);
    }, '已导入股票池 JSON。');
  }

  function handleSaveSnapshot() {
    if (!activePool) {
      return;
    }

    withPoolRefresh(() => {
      saveSnapshot(activePool.id);
    }, '已保存当前股票池快照。');
  }

  function handleToggleStock(stockCode: string) {
    setSelectedCodes((current) =>
      current.includes(stockCode)
        ? current.filter((item) => item !== stockCode)
        : [...current, stockCode],
    );
  }

  function handleToggleAll() {
    if (!activePool?.stocks.length) {
      setSelectedCodes([]);
      return;
    }

    setSelectedCodes((current) =>
      current.length === activePool.stocks.length
        ? []
        : activePool.stocks.map((stock) => stock.stockCode),
    );
  }

  function handleRemoveSelected() {
    if (!activePool || selectedCodes.length === 0) {
      return;
    }

    withPoolRefresh(() => {
      removeFromPool(activePool.id, selectedCodes, 'manual');
      setSelectedCodes([]);
    }, `已从股票池移除 ${selectedCodes.length} 只股票。`);
  }

  function handleRemoveStock(stockCode: string) {
    if (!activePool) {
      return;
    }

    withPoolRefresh(() => {
      removeFromPool(activePool.id, [stockCode], 'manual');
    }, `已移除 ${stockCode}。`);
  }

  function handleUpdateDragonHeadReview(
    stockCode: string,
    patch: {
      manualStatus?: DragonHeadManualReviewStatus;
      manualNote?: string;
    },
  ) {
    if (!activePool) {
      return;
    }

    const stock = activePool.stocks.find((item) => item.stockCode === stockCode);

    if (!stock?.dragonHeadReview) {
      return;
    }

    const updatedStock = {
      ...stock,
      dragonHeadReview: {
        ...stock.dragonHeadReview,
        ...patch,
        reviewedAt: new Date().toISOString(),
      },
    };

    addToPool(activePool.id, [updatedStock]);
    syncPoolState();
  }

  async function runDiagnosis(stockCodes: string[]) {
    if (!activePool || stockCodes.length === 0 || isRunningDiagnosis) {
      return;
    }

    const uniqueStockCodes = Array.from(new Set(stockCodes));
    const nextResults: PoolStockDiagnosis[] = [];
    let failedCount = 0;

    setDiagnosisError(null);
    setIsRunningDiagnosis(true);
    setProgress({
      total: uniqueStockCodes.length,
      completed: 0,
      failed: 0,
      results: [],
    });

    for (const [index, stockCode] of uniqueStockCodes.entries()) {
      setProgress({
        total: uniqueStockCodes.length,
        completed: index,
        failed: failedCount,
        currentStock: stockCode,
        results: [...nextResults],
      });

      try {
        const response = await requestBatchDiagnosis({
          stockCodes: [stockCode],
          poolId: activePool.id,
        });
        const result = response[0];

        if (result) {
          nextResults.push(result);
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }

      setProgress({
        total: uniqueStockCodes.length,
        completed: index + 1,
        failed: failedCount,
        currentStock: stockCode,
        results: [...nextResults],
      });
    }

    if (nextResults.length > 0) {
      const resultMap = new Map(nextResults.map((result) => [result.stockCode, result]));
      const updatedStocks = activePool.stocks
        .filter((stock) => resultMap.has(stock.stockCode))
        .map((stock) => ({
          ...stock,
          diagnosisResult: resultMap.get(stock.stockCode),
        }));

      addToPool(activePool.id, updatedStocks);
      syncPoolState();
    }

    if (failedCount > 0) {
      setDiagnosisError({
        code: 'API_ERROR',
        message: `有 ${failedCount} 只股票诊断失败，已保留成功结果。`,
      });
    }

    showToast(`批量诊断完成：成功 ${nextResults.length} / ${uniqueStockCodes.length}。`);
    setIsRunningDiagnosis(false);
  }

  const removedStocks = activePool?.removedStocks ?? [];

  const mobileSectionItems = [
    {
      id: 'manager' as const,
      label: '股票池',
      shortLabel: '股票池',
      hint: '增删、导入、快照',
    },
    {
      id: 'diagnosis' as const,
      label: '批量诊断',
      shortLabel: '诊断',
      hint: '执行与对比',
    },
    {
      id: 'history' as const,
      label: '历史留痕',
      shortLabel: '留痕',
      hint: '剔除与快照',
    },
  ];
  const activeMobileSection =
    mobileSectionItems.find((item) => item.id === mobileSection) ?? mobileSectionItems[0];

  return (
    <section className="workbench-page" data-testid="stock-pool-page">
      <header className="workbench-page-header">
        <div>
          <p className="mystic-section-label">股票池</p>
          <h2>本地股票池、批量诊断与历史快照工作台</h2>
          <p>
            股票池以浏览器本地持久化为真源，支持跨页入池、导入导出、快照留痕和串行奇门诊断。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mystic-chip">{demoMode ? 'Demo 股票池已就绪' : 'LocalStorage 持久化'}</span>
          <span className="mystic-chip">批量诊断</span>
          <span className="mystic-chip">快照对比</span>
        </div>
      </header>

      {error ? (
        <div className="mt-6">
          <ErrorNotice error={error} title="股票池操作异常" />
        </div>
      ) : null}

      {isMobileViewport ? (
        <div className="mt-6 space-y-6" data-testid="stock-pool-mobile-layout">
          <section className="workbench-card" data-testid="stock-pool-mobile-switcher">
            <p className="mystic-section-label">移动工作台</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              先选区块，再做操作
            </h3>
            <div
              className="mt-4 flex gap-2 overflow-x-auto pb-1"
              role="tablist"
              aria-label="股票池移动分区"
            >
              {mobileSectionItems.map((item) => (
                <button
                  aria-label={item.label}
                  aria-selected={mobileSection === item.id}
                  className={`workbench-tab min-w-[5.4rem] flex-none px-4 py-3 text-center ${
                    mobileSection === item.id ? 'is-active' : ''
                  }`}
                  key={item.id}
                  onClick={() => setMobileSection(item.id)}
                  role="tab"
                  type="button"
                >
                  <span className="text-sm font-semibold">{item.shortLabel}</span>
                </button>
              ))}
            </div>
            <div
              className="mt-3 rounded-[1.15rem] border border-white/10 bg-black/10 px-4 py-3 text-sm text-[var(--text-secondary)]"
              data-testid="stock-pool-mobile-section-caption"
            >
              <span className="font-semibold text-[var(--text-primary)]">
                {activeMobileSection.label}
              </span>
              {' · '}
              {activeMobileSection.hint}
            </div>
          </section>

          {mobileSection === 'manager' ? (
            <PoolManagerPanel
              activePool={activePool}
              getDiagnosisHref={(stockCode) => buildDiagnosisPath(stockCode, pathname)}
              importValue={importValue}
              isDiagnosing={isRunningDiagnosis}
              isImportOpen={isImportOpen}
              mobileMode={isMobileViewport}
              newPoolName={newPoolName}
              onCreatePool={handleCreatePool}
              onDeletePool={handleDeletePool}
              onExportPool={handleExportPool}
              onImportPool={handleImportPool}
              onImportValueChange={setImportValue}
              onNewPoolNameChange={setNewPoolName}
              onRemoveSelected={handleRemoveSelected}
              onRemoveStock={handleRemoveStock}
              onUpdateDragonHeadReview={handleUpdateDragonHeadReview}
              onRunStockDiagnosis={(stockCode) => {
                void runDiagnosis([stockCode]);
              }}
              onSaveSnapshot={handleSaveSnapshot}
              onSelectPool={handleSelectPool}
              onToggleAll={handleToggleAll}
              onToggleImport={() => setIsImportOpen((current) => !current)}
              onToggleStock={handleToggleStock}
              pools={pools}
              selectedCodes={selectedCodes}
            />
          ) : null}

          {mobileSection === 'diagnosis' ? (
            <div className="space-y-6">
              <BatchDiagnosisPanel
                error={diagnosisError}
                isRunning={isRunningDiagnosis}
                onRunAll={() => {
                  void runDiagnosis(activePool?.stocks.map((stock) => stock.stockCode) ?? []);
                }}
                onRunSelected={() => {
                  void runDiagnosis(selectedCodes);
                }}
                progress={progress}
                selectedCount={selectedCodes.length}
                staleCount={staleCount}
                totalCount={activePool?.stocks.length ?? 0}
              />

              {comparisonData.items.length > 0 ? (
                <DiagnosisCompareTable data={comparisonData} />
              ) : (
                <section className="workbench-card" data-testid="diagnosis-compare-empty">
                  <p className="mystic-section-label">诊断对比</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    等待批量诊断结果
                  </h3>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    先勾选股票并执行诊断，排序对比表会在这里展示得分、风险和成功率。
                  </p>
                </section>
              )}
            </div>
          ) : null}

          {mobileSection === 'history' ? (
            <div className="space-y-6">
              <section className="workbench-card" data-testid="removed-stocks-panel">
                <p className="mystic-section-label">已剔除股票</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {removedStocks.length} 条历史记录
                </h3>
                {removedStocks.length > 0 ? (
                  <ul className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                    {removedStocks.slice().reverse().map((stock) => (
                      <li
                        className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                        key={`${stock.stockCode}-${stock.removeDate}`}
                      >
                        <div className="font-semibold text-[var(--text-primary)]">
                          {stock.stockCode} {stock.stockName}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {stock.removeReason} / {stock.removeDate}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    还没有剔除记录，手动移除股票后会在这里留痕。
                  </p>
                )}
              </section>

              <section className="workbench-card" data-testid="snapshot-panel">
                <p className="mystic-section-label">历史快照</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {snapshots.length} 份快照可对比
                </h3>

                {snapshots.length > 0 ? (
                  <>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                        选择快照
                      </span>
                      <select
                        className="mystic-select w-full"
                        onChange={(event) => setSelectedSnapshotId(event.target.value)}
                        value={selectedSnapshotId}
                      >
                        {snapshots.map((snapshot) => (
                          <option key={snapshot.snapshotId} value={snapshot.snapshotId}>
                            {formatDateLabel(snapshot.timestamp)} / {snapshot.stockCount} 只
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="workbench-subcard">
                        <p className="mystic-section-label">当前新增</p>
                        <strong className="mt-2 block text-2xl text-[var(--text-primary)]">
                          {snapshotComparison?.added.length ?? 0}
                        </strong>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          相比快照新增的股票
                        </p>
                      </div>
                      <div className="workbench-subcard">
                        <p className="mystic-section-label">当前缺失</p>
                        <strong className="mt-2 block text-2xl text-[var(--text-primary)]">
                          {snapshotComparison?.removed.length ?? 0}
                        </strong>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          快照里有、当前池已无的股票
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">新增股票</div>
                        <div className="mt-2">
                          {snapshotComparison?.added.length
                            ? snapshotComparison.added.join('，')
                            : '与快照一致，无新增。'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">已移除股票</div>
                        <div className="mt-2">
                          {snapshotComparison?.removed.length
                            ? snapshotComparison.removed.join('，')
                            : '与快照一致，无移除。'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    还没有历史快照。点击上方“保存快照”即可沉淀一份对比基线。
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <PoolManagerPanel
              activePool={activePool}
              getDiagnosisHref={(stockCode) => buildDiagnosisPath(stockCode, pathname)}
              importValue={importValue}
              isDiagnosing={isRunningDiagnosis}
              isImportOpen={isImportOpen}
              newPoolName={newPoolName}
              onCreatePool={handleCreatePool}
              onDeletePool={handleDeletePool}
              onExportPool={handleExportPool}
              onImportPool={handleImportPool}
              onImportValueChange={setImportValue}
              onNewPoolNameChange={setNewPoolName}
              onRemoveSelected={handleRemoveSelected}
              onRemoveStock={handleRemoveStock}
              onUpdateDragonHeadReview={handleUpdateDragonHeadReview}
              onRunStockDiagnosis={(stockCode) => {
                void runDiagnosis([stockCode]);
              }}
              onSaveSnapshot={handleSaveSnapshot}
              onSelectPool={handleSelectPool}
              onToggleAll={handleToggleAll}
              onToggleImport={() => setIsImportOpen((current) => !current)}
              onToggleStock={handleToggleStock}
              pools={pools}
              selectedCodes={selectedCodes}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-6">
              <BatchDiagnosisPanel
                error={diagnosisError}
                isRunning={isRunningDiagnosis}
                onRunAll={() => {
                  void runDiagnosis(activePool?.stocks.map((stock) => stock.stockCode) ?? []);
                }}
                onRunSelected={() => {
                  void runDiagnosis(selectedCodes);
                }}
                progress={progress}
                selectedCount={selectedCodes.length}
                staleCount={staleCount}
                totalCount={activePool?.stocks.length ?? 0}
              />

              {comparisonData.items.length > 0 ? (
                <DiagnosisCompareTable data={comparisonData} />
              ) : (
                <section className="workbench-card" data-testid="diagnosis-compare-empty">
                  <p className="mystic-section-label">诊断对比</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    等待批量诊断结果
                  </h3>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    先勾选股票并执行诊断，排序对比表会在这里展示得分、风险和成功率。
                  </p>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="workbench-card" data-testid="removed-stocks-panel">
                <p className="mystic-section-label">已剔除股票</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {removedStocks.length} 条历史记录
                </h3>
                {removedStocks.length > 0 ? (
                  <ul className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                    {removedStocks.slice().reverse().map((stock) => (
                      <li
                        className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                        key={`${stock.stockCode}-${stock.removeDate}`}
                      >
                        <div className="font-semibold text-[var(--text-primary)]">
                          {stock.stockCode} {stock.stockName}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {stock.removeReason} / {stock.removeDate}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    还没有剔除记录，手动移除股票后会在这里留痕。
                  </p>
                )}
              </section>

              <section className="workbench-card" data-testid="snapshot-panel">
                <p className="mystic-section-label">历史快照</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {snapshots.length} 份快照可对比
                </h3>

                {snapshots.length > 0 ? (
                  <>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm text-[var(--text-secondary)]">
                        选择快照
                      </span>
                      <select
                        className="mystic-select w-full"
                        onChange={(event) => setSelectedSnapshotId(event.target.value)}
                        value={selectedSnapshotId}
                      >
                        {snapshots.map((snapshot) => (
                          <option key={snapshot.snapshotId} value={snapshot.snapshotId}>
                            {formatDateLabel(snapshot.timestamp)} / {snapshot.stockCount} 只
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="workbench-subcard">
                        <p className="mystic-section-label">当前新增</p>
                        <strong className="mt-2 block text-2xl text-[var(--text-primary)]">
                          {snapshotComparison?.added.length ?? 0}
                        </strong>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          相比快照新增的股票
                        </p>
                      </div>
                      <div className="workbench-subcard">
                        <p className="mystic-section-label">当前缺失</p>
                        <strong className="mt-2 block text-2xl text-[var(--text-primary)]">
                          {snapshotComparison?.removed.length ?? 0}
                        </strong>
                        <p className="mt-2 text-xs text-[var(--text-muted)]">
                          快照里有、当前池已无的股票
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">新增股票</div>
                        <div className="mt-2">
                          {snapshotComparison?.added.length
                            ? snapshotComparison.added.join('，')
                            : '与快照一致，无新增。'}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">已移除股票</div>
                        <div className="mt-2">
                          {snapshotComparison?.removed.length
                            ? snapshotComparison.removed.join('，')
                            : '与快照一致，无移除。'}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-[var(--text-secondary)]">
                    还没有历史快照。点击上方“保存快照”即可沉淀一份对比基线。
                  </p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}

      {toastMessage ? (
        <div className="workbench-toast" role="status">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}
