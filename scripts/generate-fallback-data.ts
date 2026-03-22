import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { filterLimitUpStocks } from '@/lib/services/limit-up';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { analyzeStockForMarketScreen } from '@/lib/qimen/analysis';
import { mapWithConcurrency } from '@/lib/utils/async';

const OUTPUT_LIMIT_UP_PATH = path.join(process.cwd(), 'data/limit-up-fallback.generated.json');
const OUTPUT_MARKET_SCREEN_PATH = path.join(
  process.cwd(),
  'data/market-screen-fallback.generated.json',
);
const FALLBACK_MARKET_SCREEN_LIMIT = 150;
const LISTING_INFO_CONCURRENCY = 6;

async function collectAllLimitUpItems() {
  const firstPage = await filterLimitUpStocks({
    lookbackDays: 30,
    minLimitUpCount: 1,
    excludeST: false,
    excludeKechuang: false,
    excludeNewStock: false,
    sortBy: 'limitUpCount',
    sortOrder: 'desc',
    page: 1,
    pageSize: 200,
  });
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize));
  const remainingPages = await mapWithConcurrency(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_unused, index) => index + 2),
    2,
    async (page) =>
      (
        await filterLimitUpStocks({
          lookbackDays: 30,
          minLimitUpCount: 1,
          excludeST: false,
          excludeKechuang: false,
          excludeNewStock: false,
          sortBy: 'limitUpCount',
          sortOrder: 'desc',
          page,
          pageSize: 200,
        })
      ).items,
  );

  const items = [firstPage.items, ...remainingPages].flat();
  const tradingDates = Array.from(
    new Set(items.flatMap((item) => item.limitUpDates)),
  ).sort((left, right) => left.localeCompare(right));

  return {
    generatedAt: new Date().toISOString(),
    filterDate: firstPage.filterDate,
    lookbackDays: firstPage.lookbackDays,
    tradingDates,
    items,
  };
}

async function buildMarketScreenFallback(limitUpItems: Awaited<ReturnType<typeof collectAllLimitUpItems>>) {
  const selected = limitUpItems.items.slice(0, FALLBACK_MARKET_SCREEN_LIMIT);
  const enriched = await mapWithConcurrency(selected, LISTING_INFO_CONCURRENCY, async (item) => {
    try {
      const listing = await getStockListingInfo(item.stockCode);
      const snapshot = analyzeStockForMarketScreen({
        code: listing.code,
        name: listing.name,
        market: listing.market,
        listingDate: listing.listingDate,
      });

      return {
        ...snapshot,
        stock: {
          ...snapshot.stock,
          sector: item.sector ?? null,
        },
      };
    } catch {
      return null;
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceFilterDate: limitUpItems.filterDate,
    items: enriched.filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
}

async function main() {
  const limitUp = await collectAllLimitUpItems();
  const marketScreen = await buildMarketScreenFallback(limitUp);

  writeFileSync(OUTPUT_LIMIT_UP_PATH, `${JSON.stringify(limitUp, null, 2)}\n`, 'utf8');
  writeFileSync(OUTPUT_MARKET_SCREEN_PATH, `${JSON.stringify(marketScreen, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        limitUpItems: limitUp.items.length,
        limitUpTradingDates: limitUp.tradingDates.length,
        marketScreenItems: marketScreen.items.length,
        outputLimitUp: OUTPUT_LIMIT_UP_PATH,
        outputMarketScreen: OUTPUT_MARKET_SCREEN_PATH,
      },
      null,
      2,
    ),
  );
}

void main();
