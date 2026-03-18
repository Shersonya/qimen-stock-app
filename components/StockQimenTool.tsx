'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import type { StockSearchItem } from '@/data/stocks';
import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type Market,
  type QimenApiResponse,
  type QimenApiSuccessResponse,
} from '@/lib/contracts/qimen';
import {
  type BoardViewState,
  SAMPLE_CODES_BY_MARKET,
  getDefaultPalaceIndex,
  getMarketFromStockCode,
} from '@/lib/ui';
import { FilterPanel } from '@/components/FilterPanel';
import { QimenBoard, type ResultTab } from '@/components/QimenBoard';
import { QueryPanel } from '@/components/QueryPanel';
import { ReferenceBoardPanel } from '@/components/ReferenceBoardPanel';
import { findStockByCode, formatStockDisplay } from '@/lib/stockSearch';

const RECENT_STOCK_CODES_STORAGE_KEY = 'qimen-stock-recent-codes';
const DEFAULT_STOCK_CODE = '600519';
const RECENT_STOCK_CODES_LIMIT = 10;

const IDLE_PALACES: QimenApiSuccessResponse['qimen']['palaces'] = [
  { index: 0, position: 4, name: '巽', star: '待起局', door: '未定', god: '未定' },
  { index: 1, position: 9, name: '离', star: '待起局', door: '未定', god: '未定' },
  { index: 2, position: 2, name: '坤', star: '待起局', door: '未定', god: '未定' },
  { index: 3, position: 3, name: '震', star: '待起局', door: '未定', god: '未定' },
  { index: 4, position: 5, name: '中', star: '天禽', door: '--', god: '--' },
  { index: 5, position: 7, name: '兑', star: '待起局', door: '未定', god: '未定' },
  { index: 6, position: 8, name: '艮', star: '待起局', door: '未定', god: '未定' },
  { index: 7, position: 1, name: '坎', star: '待起局', door: '未定', god: '未定' },
  { index: 8, position: 6, name: '乾', star: '待起局', door: '未定', god: '未定' },
];

type SubmitOptions = {
  focusResult?: boolean;
};

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
  const [inputValue, setInputValue] = useState(DEFAULT_STOCK_CODE);
  const [selectedStock, setSelectedStock] = useState<StockSearchItem | null>(null);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [recentStockCodes, setRecentStockCodes] = useState<string[]>([]);
  const [launchingStockCode, setLaunchingStockCode] = useState<string | null>(null);
  const [pendingResultFocus, setPendingResultFocus] = useState(false);
  const [activeTab, setActiveTab] = useState<ResultTab>('qimen');
  const [selectedMarket, setSelectedMarket] = useState<Market>('SH');
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null);
  const recentStockCodesRef = useRef<string[]>([]);
  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const boardStatus: BoardViewState =
    result ? 'ready' : isSubmitting ? 'loading' : 'idle';
  const boardPalaces = result?.qimen.palaces ?? IDLE_PALACES;

  const boardCopy = useMemo(() => {
    if (result) {
      return {
        title: `${result.stock.name} 上市时刻九宫盘`,
        subtitle:
          '排盘结果与股票关键摘要已经合并到同一区域，便于先看标的背景，再看九宫结构与局眼焦点。',
        headerBadge: `上市时间 ${result.stock.listingDate}`,
        valuePair: `${result.qimen.valueStar} / ${result.qimen.valueDoor}`,
      };
    }

    if (boardStatus === 'loading') {
      return {
        title: '阵盘聚势中',
        subtitle:
          '系统正在按上市日期与默认时辰起局，中心局眼会先行显现，随后展开完整九宫信息。',
        headerBadge: '排盘生成中',
        valuePair: undefined,
      };
    }

    if (error) {
      return {
        title: '阵盘待重启',
        subtitle:
          '当前请求未能生成九宫盘，可修正股票代码后重新起局，或从筛盘结果中直接发起。',
        headerBadge: '起局失败',
        valuePair: undefined,
      };
    }

    return {
      title: '阵盘尚未开启',
      subtitle:
        '首屏先保留起局入口和核心阵盘区域，等待你输入股票代码后再展开完整排盘与分析。',
      headerBadge: '待起局',
      valuePair: undefined,
    };
  }, [boardStatus, error, result]);

  const boardSummary = result
    ? {
        stockName: result.stock.name,
        stockCode: result.stock.code,
        market: result.stock.market,
        listingDate: result.stock.listingDate,
        listingTime: result.stock.listingTime,
        yinYang: result.qimen.yinYang,
        ju: `${result.qimen.ju}局`,
        valueStar: result.qimen.valueStar,
        valueDoor: result.qimen.valueDoor,
        synopsis: `当前主轴为 ${result.qimen.valueStar} / ${result.qimen.valueDoor}。建议先把九宫阵盘的局眼、值符星和值使门与下方结论交叉阅读。`,
      }
    : null;

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

  useEffect(() => {
    if (result?.stock.market) {
      setSelectedMarket(result.stock.market);
    }
  }, [result]);

  useEffect(() => {
    setSelectedPalaceIndex(getDefaultPalaceIndex(boardPalaces));
    setActiveTab('qimen');
  }, [boardPalaces, result]);

  async function handleSubmit(
    nextStockCode: string,
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
        body: JSON.stringify({ stockCode: nextStockCode }),
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
        const matchedStock = findStockByCode(payload.stock.code) ?? {
          code: payload.stock.code,
          name: payload.stock.name,
          market: payload.stock.market,
        };

        setSelectedStock(matchedStock);
        setInputValue(formatStockDisplay(matchedStock));
        setSearchErrorMessage(null);
        setRecentStockCodes(nextRecentStockCodes);
        setSelectedMarket(payload.stock.market);
      });
    } catch {
      startTransition(() => {
        setResult(null);
        setError(createFallbackError());
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecentStockCodeSelect(nextStockCode: string) {
    const inferredMarket = getMarketFromStockCode(nextStockCode);
    const matchedStock = findStockByCode(nextStockCode);

    setSelectedStock(matchedStock);
    setInputValue(matchedStock ? formatStockDisplay(matchedStock) : nextStockCode);
    setSearchErrorMessage(null);

    if (inferredMarket) {
      setSelectedMarket(inferredMarket);
    }

    await handleSubmit(nextStockCode);
  }

  async function handleLaunchStock(nextStockCode: string) {
    if (isSubmitting) {
      return;
    }

    const inferredMarket = getMarketFromStockCode(nextStockCode);
    const matchedStock = findStockByCode(nextStockCode);

    setLaunchingStockCode(nextStockCode);
    setSelectedStock(matchedStock);
    setInputValue(matchedStock ? formatStockDisplay(matchedStock) : nextStockCode);
    setSearchErrorMessage(null);

    if (inferredMarket) {
      setSelectedMarket(inferredMarket);
    }

    try {
      await handleSubmit(nextStockCode, { focusResult: true });
    } finally {
      setLaunchingStockCode(null);
    }
  }

  function handleSampleCodeSelect(nextStockCode: string) {
    const inferredMarket = getMarketFromStockCode(nextStockCode);
    const matchedStock = findStockByCode(nextStockCode);

    setSelectedStock(matchedStock);
    setInputValue(matchedStock ? formatStockDisplay(matchedStock) : nextStockCode);
    setSearchErrorMessage(null);

    if (inferredMarket) {
      setSelectedMarket(inferredMarket);
    }
  }

  function handleInputValueChange(nextValue: string) {
    const trimmed = nextValue.trim();
    const digitsMatch = trimmed.match(/^\d{1,6}$/);
    const inferredMarket = digitsMatch ? getMarketFromStockCode(digitsMatch[0]) : null;

    setInputValue(nextValue);
    setSelectedStock(null);

    if (inferredMarket) {
      setSelectedMarket(inferredMarket);
    }
  }

  function handleSelectedStockChange(nextStock: StockSearchItem | null) {
    setSelectedStock(nextStock);

    if (nextStock) {
      setSelectedMarket(nextStock.market);
    }
  }

  function handleMarketChange(market: Market) {
    setSelectedMarket(market);

    const marketSampleCodes = SAMPLE_CODES_BY_MARKET[market];
    const currentCandidateCode =
      selectedStock?.code ?? inputValue.trim().match(/^\d{6}$/)?.[0] ?? null;

    if (
      marketSampleCodes.length > 0 &&
      (!currentCandidateCode || !recentStockCodes.includes(currentCandidateCode))
    ) {
      const nextSampleCode = marketSampleCodes[0] ?? currentCandidateCode ?? DEFAULT_STOCK_CODE;
      const matchedStock = findStockByCode(nextSampleCode);

      setSelectedStock(matchedStock);
      setInputValue(matchedStock ? formatStockDisplay(matchedStock) : nextSampleCode);
      setSearchErrorMessage(null);
    }
  }

  return (
    <section className="mystic-page-shell">
      <div className="mx-auto max-w-[1560px] px-4 py-5 sm:px-6 sm:py-8 xl:px-8">
        <div className="relative z-10">
          <header className="mb-6 max-w-3xl">
            <p className="mystic-section-label">玄学分析系统</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)] sm:text-[15px]">
              首页现在只保留单一的稳重玄学版，首屏优先呈现起局入口、核心九宫盘和市场镇盘参考，不再出现额外风格或场景控制器。
            </p>
          </header>

          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.86fr)_minmax(0,1.14fr)] xl:items-start">
              <div className="space-y-5">
                <QueryPanel
                  inputValue={inputValue}
                  isSubmitting={isSubmitting}
                  onInputValueChange={handleInputValueChange}
                  onRecentStockCodeSelect={handleRecentStockCodeSelect}
                  onSampleCodeSelect={handleSampleCodeSelect}
                  onSearchErrorMessageChange={setSearchErrorMessage}
                  onSelectedStockChange={handleSelectedStockChange}
                  onSubmit={handleSubmit}
                  recentStockCodes={recentStockCodes}
                  searchErrorMessage={searchErrorMessage}
                  selectedStock={selectedStock}
                  selectedMarket={selectedMarket}
                />
                <ReferenceBoardPanel
                  onMarketChange={handleMarketChange}
                  selectedMarket={selectedMarket}
                />
              </div>

              <div ref={resultSectionRef}>
                <QimenBoard
                  activeTab={activeTab}
                  error={error}
                  headerBadge={boardCopy.headerBadge}
                  market={selectedMarket}
                  onSelectPalace={setSelectedPalaceIndex}
                  onTabChange={setActiveTab}
                  palaces={boardPalaces}
                  result={result}
                  selectedPalaceIndex={selectedPalaceIndex}
                  status={boardStatus}
                  subtitle={boardCopy.subtitle}
                  summary={boardSummary}
                  title={boardCopy.title}
                  valuePair={boardCopy.valuePair}
                />
              </div>
            </div>

            <FilterPanel
              isLaunchingStock={isSubmitting}
              launchingStockCode={launchingStockCode}
              onLaunchStock={handleLaunchStock}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
