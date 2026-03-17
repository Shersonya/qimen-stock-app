'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type QimenApiResponse,
  type QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import { ErrorNotice } from '@/components/ErrorNotice';
import { MarketScreenPanel } from '@/components/MarketScreenPanel';
import { PlumResult } from '@/components/PlumResult';
import { QimenGrid } from '@/components/QimenGrid';
import { QimenSummary } from '@/components/QimenSummary';
import { StockCodeForm } from '@/components/StockCodeForm';

const RECENT_STOCK_CODES_STORAGE_KEY = 'qimen-stock-recent-codes';
const DEFAULT_STOCK_CODE = '600519';
const RECENT_STOCK_CODES_LIMIT = 10;

type SubmitOptions = {
  focusResult?: boolean;
};

type ResultTab = 'qimen' | 'plum';

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

function readRecentStockCodes(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_STOCK_CODES_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string' && /^\d{6}$/.test(item))
      .slice(0, RECENT_STOCK_CODES_LIMIT);
  } catch {
    return [];
  }
}

function writeRecentStockCodes(stockCodes: string[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENT_STOCK_CODES_STORAGE_KEY,
      JSON.stringify(stockCodes),
    );
  } catch {
    // Ignore storage failures so the main query flow stays available.
  }
}

function prependRecentStockCode(stockCodes: string[], stockCode: string): string[] {
  return [stockCode, ...stockCodes.filter((item) => item !== stockCode)].slice(
    0,
    RECENT_STOCK_CODES_LIMIT,
  );
}

export function StockQimenTool() {
  const [result, setResult] = useState<QimenApiSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockCode, setStockCode] = useState(DEFAULT_STOCK_CODE);
  const [recentStockCodes, setRecentStockCodes] = useState<string[]>([]);
  const [launchingStockCode, setLaunchingStockCode] = useState<string | null>(null);
  const [pendingResultFocus, setPendingResultFocus] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>('qimen');
  const recentStockCodesRef = useRef<string[]>([]);
  const resultSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setRecentStockCodes(readRecentStockCodes());
  }, []);

  useEffect(() => {
    recentStockCodesRef.current = recentStockCodes;
  }, [recentStockCodes]);

  useEffect(() => {
    if (!pendingResultFocus || (!result && !error)) {
      return;
    }

    resultSectionRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });
    setPendingResultFocus(false);
  }, [pendingResultFocus, result, error]);

  async function handleSubmit(
    stockCode: string,
    options: SubmitOptions = {},
  ) {
    if (options.focusResult) {
      setPendingResultFocus(true);
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/qimen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockCode }),
      });

      let payload: QimenApiResponse | null = null;

      try {
        payload = (await response.json()) as QimenApiResponse;
      } catch {
        payload = null;
      }

      if (!payload || !response.ok || isApiErrorResponse(payload)) {
        startTransition(() => {
          setResult(null);
          setError(payload && isApiErrorResponse(payload) ? payload.error : createFallbackError());
        });

        return;
      }

      const nextRecentStockCodes = prependRecentStockCode(
        recentStockCodesRef.current,
        payload.stock.code,
      );

      writeRecentStockCodes(nextRecentStockCodes);

      startTransition(() => {
        setError(null);
        setResult(payload);
        setStockCode(payload.stock.code);
        setRecentStockCodes(nextRecentStockCodes);
        setActiveTab('qimen');
      });
    } catch {
      startTransition(() => {
        setResult(null);
        setError(createFallbackError());
        setActiveTab('qimen');
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecentStockCodeSelect(nextStockCode: string) {
    setStockCode(nextStockCode);
    await handleSubmit(nextStockCode);
  }

  async function handleLaunchStock(nextStockCode: string) {
    if (isSubmitting) {
      return;
    }

    setLaunchingStockCode(nextStockCode);
    setStockCode(nextStockCode);

    try {
      await handleSubmit(nextStockCode, { focusResult: true });
    } finally {
      setLaunchingStockCode(null);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[2.45rem] border border-gold/18 bg-[linear-gradient(180deg,rgba(18,12,10,0.98),rgba(63,35,23,0.94))] shadow-altar">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(176,126,45,0.18),transparent_72%)]" />
      <div className="relative p-3 sm:p-4">
        <StockCodeForm
          isSubmitting={isSubmitting}
          onRecentStockCodeSelect={handleRecentStockCodeSelect}
          onStockCodeChange={setStockCode}
          onSubmit={handleSubmit}
          recentStockCodes={recentStockCodes}
          stockCode={stockCode}
        />
        <section
          className="mt-4 overflow-hidden rounded-[1.9rem] border border-gold/20 bg-[linear-gradient(180deg,rgba(247,236,214,0.96),rgba(231,209,164,0.9))] scroll-mt-6"
          data-testid="qimen-result-section"
          ref={resultSectionRef}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/18 bg-[linear-gradient(180deg,rgba(40,24,18,0.96),rgba(68,42,26,0.92))] px-5 py-5 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.38em] text-[#d5ae68]">
                分析结果
              </p>
              <h2 className="mt-2 font-serif text-[2rem] text-[#fff3df] sm:text-[2.4rem]">
                {result ? '股票排盘摘要' : error ? '起局未成' : '等待起局'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#ead4ae]/74">
                {result
                  ? '本次查询已生成奇门盘，并同步尝试按当日开盘价起梅花卦，可在下方切换查看。'
                  : error
                    ? '起局请求未成功，可修正股票代码，或从下面的筛选结果里直接起局。'
                    : '输入股票代码后，这里会收起冗余说明，只保留排盘结果与关键对照信息。'}
              </p>
            </div>
            <div className="rounded-full border border-gold/22 bg-[#fff2db]/10 px-4 py-2 text-sm text-[#f1c37b]">
              {result
                ? result.plum.status === 'ready'
                  ? '双引擎已就绪'
                  : `${result.qimen.yinYang}遁 ${result.qimen.ju}局`
                : error
                  ? '起局失败'
                  : '尚未起局'}
            </div>
          </div>
          {result ? (
            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div
                aria-label="分析结果标签"
                className="flex flex-wrap gap-2"
                role="tablist"
              >
                <button
                  aria-controls="analysis-panel-qimen"
                  aria-selected={activeTab === 'qimen'}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'qimen'
                      ? 'border-vermilion bg-vermilion text-[#fff3de]'
                      : 'border-gold/18 bg-[#fff8ed] text-ink hover:border-vermilion hover:text-vermilion'
                  }`}
                  id="analysis-tab-qimen"
                  onClick={() => setActiveTab('qimen')}
                  role="tab"
                  type="button"
                >
                  奇门盘
                </button>
                <button
                  aria-controls="analysis-panel-plum"
                  aria-selected={activeTab === 'plum'}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'plum'
                      ? 'border-vermilion bg-vermilion text-[#fff3de]'
                      : 'border-gold/18 bg-[#fff8ed] text-ink hover:border-vermilion hover:text-vermilion'
                  }`}
                  id="analysis-tab-plum"
                  onClick={() => setActiveTab('plum')}
                  role="tab"
                  type="button"
                >
                  梅花易数
                </button>
              </div>
              {activeTab === 'qimen' ? (
                <section
                  aria-labelledby="analysis-tab-qimen"
                  id="analysis-panel-qimen"
                  role="tabpanel"
                >
                  <QimenSummary result={result} />
                  <section className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-gold/90">
                          九宫盘
                        </p>
                        <h3 className="mt-1 font-serif text-2xl text-ink">
                          上市时刻九宫盘
                        </h3>
                      </div>
                      <div className="rounded-full border border-gold/18 bg-vermilion/10 px-3 py-1 text-xs tracking-[0.2em] text-vermilion">
                        {result.qimen.valueStar} / {result.qimen.valueDoor}
                      </div>
                    </div>
                    <QimenGrid palaces={result.qimen.palaces} />
                  </section>
                </section>
              ) : (
                <section
                  aria-labelledby="analysis-tab-plum"
                  id="analysis-panel-plum"
                  role="tabpanel"
                >
                  <PlumResult plum={result.plum} />
                </section>
              )}
            </div>
          ) : (
            <div className="px-5 py-6 sm:px-6 sm:py-7">
              {error ? (
                <div className="mb-4">
                  <ErrorNotice error={error} />
                </div>
              ) : null}
              <div className="rounded-[1.55rem] border border-dashed border-gold/26 bg-[#fff9ee]/35 px-5 py-5">
                <p className="font-serif text-2xl text-ink">
                  {error ? '请重新起局' : '等待起局'}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/68">
                  请输入沪市主板、深市主板或创业板股票代码，系统会按真实上市日期与默认
                  09:30 时辰生成奇门九宫盘，并尝试按当日开盘价起梅花卦。
                </p>
              </div>
            </div>
          )}
        </section>
        <MarketScreenPanel
          isLaunchingStock={isSubmitting}
          launchingStockCode={launchingStockCode}
          onLaunchStock={handleLaunchStock}
        />
      </div>
    </section>
  );
}
