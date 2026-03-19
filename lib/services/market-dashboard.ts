import type {
  MarketDashboardRequest,
  MarketDashboardResponse,
  QimenResult,
} from '@/lib/contracts/qimen';
import { evaluateQimenAuspiciousPatterns } from '@/lib/qimen/auspicious-patterns';
import { generateQimenChart } from '@/lib/qimen/engine';
import {
  getMarketStockPool,
  getMarketStockPoolCacheMeta,
} from '@/lib/services/market-screen';

const PALACE_WUXING_MAP: Record<number, string> = {
  1: '水',
  2: '土',
  3: '木',
  4: '木',
  5: '土',
  6: '金',
  7: '金',
  8: '土',
  9: '火',
};

function countEntries(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, 'zh-Hans-CN');
    });
}

function toPatternInput(qimen: QimenResult) {
  return {
    stock_id: 'MARKET',
    stock_name: '全市场',
    qimen_data: {
      天盘干: qimen.palaces.map((palace) => palace.skyGan ?? ''),
      地盘干: qimen.palaces.map((palace) => palace.groundGan ?? ''),
      门盘: qimen.palaces.map((palace) => palace.door ?? '--'),
      神盘: qimen.palaces.map((palace) => palace.god ?? '--'),
      宫位信息: qimen.palaces.map((palace) => ({
        id: palace.position,
        五行: palace.wuxing ?? PALACE_WUXING_MAP[palace.position] ?? '',
        八卦: palace.name,
      })),
      值使门: qimen.valueDoor,
      全局时间: {
        日干支: qimen.meta?.dayGanzhi ?? '',
        时干支: qimen.meta?.hourGanzhi ?? '',
        是否伏吟: qimen.meta?.isFuyin ?? false,
      },
    },
  };
}

export async function getMarketDashboard(
  request: MarketDashboardRequest = {},
): Promise<MarketDashboardResponse> {
  const [items, cacheMeta] = await Promise.all([
    getMarketStockPool({
      patternConfigOverride: request.patternConfigOverride,
      riskConfigOverride: request.riskConfigOverride,
    }),
    Promise.resolve(getMarketStockPoolCacheMeta()),
  ]);
  const currentBoard = generateQimenChart(new Date());
  const currentBoardEvaluation = evaluateQimenAuspiciousPatterns(
    toPatternInput(currentBoard),
    request.patternConfigOverride,
  );
  const hasBAboveGE =
    currentBoardEvaluation.counts.COMPOSITE > 0 ||
    currentBoardEvaluation.counts.A > 0 ||
    currentBoardEvaluation.counts.B > 0;
  const patternHeat = items.reduce(
    (acc, item) => {
      acc.COMPOSITE += item.patternSummary.counts.COMPOSITE;
      acc.A += item.patternSummary.counts.A;
      acc.B += item.patternSummary.counts.B;
      acc.C += item.patternSummary.counts.C;
      return acc;
    },
    { COMPOSITE: 0, A: 0, B: 0, C: 0 },
  );
  const topSectors = countEntries(
    items.map((item) => item.stock.sector || item.stock.market),
  ).slice(0, 5);

  return {
    marketSignal: {
      hasBAboveGE,
      statusLabel: hasBAboveGE ? '有吉气' : '建议观望',
      summary: hasBAboveGE
        ? `当前市场局评为 ${currentBoardEvaluation.rating} 级，${currentBoardEvaluation.corePatternsLabel || currentBoardEvaluation.summary}`
        : '当前市场局未见 B 级以上吉格，建议控制仓位并等待更清晰的共振信号。',
      referenceRating: currentBoardEvaluation.rating,
      referencePatterns: currentBoardEvaluation.activeMatches.map((item) => item.name),
    },
    patternHeat,
    topSectors,
    topStocks: items.slice(0, 5).map((item) => ({
      code: item.stock.code,
      name: item.stock.name,
      sector: item.stock.sector,
      rating: item.patternSummary.rating,
      totalScore: item.patternSummary.totalScore,
    })),
    updatedAt: cacheMeta.updatedAt ?? new Date().toISOString(),
    universeSize: items.length,
    cache: {
      cached: cacheMeta.cached,
      expiresAt: cacheMeta.expiresAt,
    },
  };
}
