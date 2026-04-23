import {
  ERROR_CODES,
  type QimenDeepDiagnosisAction,
  type Market,
  type QimenStockRating,
} from '@/lib/contracts/qimen';
import {
  AppError,
} from '@/lib/errors';
import type {
  BatchDiagnosisProgress,
  PoolSnapshot,
  PoolStock,
  RemovedStock,
  StockPool,
} from '@/lib/contracts/strategy';
import {
  createPoolId,
  createSnapshotId,
  pruneExpiredSnapshots,
  readActivePoolId,
  readAllPools,
  readAllSnapshots,
  writeActivePoolId,
  writeAllPools,
  writeAllSnapshots,
} from '@/lib/storage/pool-storage';
import { getSupportedMarketFromStockCode } from '@/lib/markets';
import { getShanghaiDateString } from '@/lib/utils/date';

const VALID_ADD_REASONS = new Set<PoolStock['addReason']>([
  'limit_up',
  'tdx_signal',
  'dragon_head',
  'manual',
]);

const VALID_REMOVE_REASONS = new Set<RemovedStock['removeReason']>([
  'manual',
  'expired',
  'stop_loss',
]);

const STOCK_CODE_PATTERN = /^\d{6}$/;
const DEFAULT_POOL_NAME = '股票池';
const DEFAULT_TODAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_RETENTION_DAYS = 30;

function hasWindowStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function now() {
  return new Date();
}

function todayString(date = now()) {
  return getShanghaiDateString(date);
}

function nowIsoString(date = now()) {
  return date.toISOString();
}

function isMarket(value: unknown): value is Market {
  return value === 'SH' || value === 'SZ' || value === 'CYB' || value === 'STAR' || value === 'BJ';
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}

export function normalizePoolName(value: unknown) {
  const normalized = normalizeText(value);

  return normalized || DEFAULT_POOL_NAME;
}

export function normalizePoolId(value: unknown) {
  const normalized = normalizeText(value);

  return normalized || null;
}

export function normalizeStockCode(value: unknown) {
  const normalized = normalizeText(value).replace(/\s+/g, '');

  return STOCK_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeMarket(value: unknown, stockCode?: string) {
  if (stockCode) {
    return getSupportedMarketFromStockCode(stockCode);
  }

  if (isMarket(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();

    if (isMarket(normalized)) {
      return normalized;
    }
  }

  return null;
}

export function normalizeAddReason(value: unknown): PoolStock['addReason'] {
  return value === 'limit_up' || value === 'tdx_signal' || value === 'dragon_head' || value === 'manual'
    ? value
    : 'manual';
}

export function normalizeRemoveReason(
  value: unknown,
): RemovedStock['removeReason'] {
  return value === 'manual' || value === 'expired' || value === 'stop_loss'
    ? value
    : 'manual';
}

export function normalizeSignalType(
  value: unknown,
): PoolStock['tdxSignalType'] | undefined {
  return value === 'meiZhu' || value === 'meiYangYang' || value === 'both'
    ? value
    : undefined;
}

export function normalizeDragonHeadManualStatus(
  value: unknown,
): NonNullable<PoolStock['dragonHeadReview']>['manualStatus'] {
  return value === 'confirmed' || value === 'rejected' || value === 'pending'
    ? value
    : 'pending';
}

export function normalizeDateString(value: unknown, fallback = todayString()) {
  const normalized = normalizeText(value);

  return DEFAULT_TODAY_PATTERN.test(normalized) ? normalized : fallback;
}

export function normalizeTimestamp(value: unknown, fallback = nowIsoString()) {
  const normalized = normalizeText(value);

  return Number.isFinite(Date.parse(normalized)) ? normalized : fallback;
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeText(item))
        .filter(Boolean)
    : [];
}

export function normalizeDragonHeadReview(
  value: unknown,
): PoolStock['dragonHeadReview'] | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const strengthScore = Number(candidate.strengthScore);
  const confidence = Number(candidate.confidence);

  if (!Number.isFinite(strengthScore) || !Number.isFinite(confidence)) {
    return undefined;
  }

  const manualNote = normalizeText(candidate.manualNote);
  const reviewedAt = normalizeText(candidate.reviewedAt);

  return {
    strengthScore,
    confidence,
    missingFactors: normalizeStringList(candidate.missingFactors),
    reviewFlags: normalizeStringList(candidate.reviewFlags),
    manualStatus: normalizeDragonHeadManualStatus(candidate.manualStatus),
    manualNote: manualNote || undefined,
    reviewedAt: Number.isFinite(Date.parse(reviewedAt)) ? reviewedAt : undefined,
  };
}

export function normalizeDiagnosisResult(
  value: unknown,
  stockCode: string,
) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const diagnosisTime = normalizeTimestamp(candidate.diagnosisTime);
  const rating = candidate.rating;
  const riskLevel = candidate.riskLevel;
  const action = candidate.action;

  if (
    rating !== 'S' &&
    rating !== 'A' &&
    rating !== 'B' &&
    rating !== 'C'
  ) {
    return undefined;
  }

  if (riskLevel !== '低' && riskLevel !== '中' && riskLevel !== '高') {
    return undefined;
  }

  if (action !== 'BUY' && action !== 'WATCH' && action !== 'SELL') {
    return undefined;
  }

  return {
    stockCode,
    stockName: normalizeText(candidate.stockName) || stockCode,
    diagnosisTime,
    rating: rating as QimenStockRating,
    totalScore: Number(candidate.totalScore) || 0,
    riskLevel: riskLevel as '低' | '中' | '高',
    action: action as QimenDeepDiagnosisAction,
    actionLabel: normalizeText(candidate.actionLabel) || '观望',
    successProbability: Number(candidate.successProbability) || 0,
    summary: normalizeText(candidate.summary),
  };
}

export function normalizePoolStock(
  value: unknown,
  fallbackAddReason: PoolStock['addReason'] = 'manual',
): PoolStock | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const stockCode = normalizeStockCode(candidate.stockCode);

  if (!stockCode) {
    return null;
  }

  const stockName = normalizeText(candidate.stockName) || stockCode;
  const market = normalizeMarket(candidate.market, stockCode);

  if (!market) {
    return null;
  }

  const addReason = normalizeAddReason(candidate.addReason ?? fallbackAddReason);
  const addDate = normalizeDateString(candidate.addDate);
  const addSource = normalizeText(candidate.addSource) || undefined;
  const limitUpCountRaw = Number(candidate.limitUpCount);
  const tdxSignalType = normalizeSignalType(candidate.tdxSignalType);
  const dragonHeadTags = Array.isArray(candidate.dragonHeadTags)
    ? normalizeStringList(candidate.dragonHeadTags)
    : undefined;
  const dragonHeadReview = normalizeDragonHeadReview(candidate.dragonHeadReview);
  const diagnosisResult = normalizeDiagnosisResult(
    candidate.diagnosisResult,
    stockCode,
  );

  return {
    stockCode,
    stockName,
    market,
    addReason,
    addDate,
    addSource,
    limitUpCount: Number.isFinite(limitUpCountRaw) && limitUpCountRaw >= 0
      ? limitUpCountRaw
      : undefined,
    tdxSignalType,
    dragonHeadTags: dragonHeadTags?.length ? dragonHeadTags : undefined,
    dragonHeadReview,
    diagnosisResult,
  };
}

export function normalizePoolStocks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const stocks: PoolStock[] = [];

  for (const item of value) {
    const normalized = normalizePoolStock(item);

    if (!normalized || seen.has(normalized.stockCode)) {
      continue;
    }

    seen.add(normalized.stockCode);
    stocks.push(normalized);
  }

  return stocks;
}

export function normalizeRemovedStock(value: unknown): RemovedStock | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const stockCode = normalizeStockCode(candidate.stockCode);

  if (!stockCode) {
    return null;
  }

  const stockName = normalizeText(candidate.stockName) || stockCode;

  return {
    stockCode,
    stockName,
    removeDate: normalizeDateString(candidate.removeDate),
    removeReason: normalizeRemoveReason(candidate.removeReason),
  };
}

export function normalizeRemovedStocks(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const removedStocks: RemovedStock[] = [];

  for (const item of value) {
    const normalized = normalizeRemovedStock(item);

    if (!normalized || seen.has(normalized.stockCode)) {
      continue;
    }

    seen.add(normalized.stockCode);
    removedStocks.push(normalized);
  }

  return removedStocks;
}

export function normalizePoolSnapshot(value: unknown): PoolSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const snapshotId = normalizePoolId(candidate.snapshotId) || createSnapshotId();
  const poolId = normalizePoolId(candidate.poolId);

  if (!poolId) {
    return null;
  }

  const timestamp = normalizeTimestamp(candidate.timestamp);
  const stocks = normalizePoolStocks(candidate.stocks);
  const stockCountRaw = Number(candidate.stockCount);

  return {
    snapshotId,
    poolId,
    timestamp,
    stockCount: Number.isFinite(stockCountRaw) && stockCountRaw >= 0
      ? stockCountRaw
      : stocks.length,
    stocks,
  };
}

export function normalizeStockPool(value: unknown): StockPool | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizePoolId(candidate.id) || createPoolId();
  const name = normalizePoolName(candidate.name);
  const createdAt = normalizeTimestamp(candidate.createdAt);
  const updatedAt = normalizeTimestamp(candidate.updatedAt, createdAt);

  return {
    id,
    name,
    createdAt,
    updatedAt,
    stocks: normalizePoolStocks(candidate.stocks),
    removedStocks: normalizeRemovedStocks(candidate.removedStocks),
  };
}

export function normalizeStockPools(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const pools: StockPool[] = [];

  for (const item of value) {
    const normalized = normalizeStockPool(item);

    if (!normalized || seen.has(normalized.id)) {
      continue;
    }

    seen.add(normalized.id);
    pools.push(normalized);
  }

  return pools;
}

function resolvePools() {
  return normalizeStockPools(readAllPools());
}

function resolveSnapshots() {
  return normalizeStockSnapshots(readAllSnapshots());
}

function persistPools(pools: StockPool[]) {
  writeAllPools(normalizeStockPools(pools));
}

function persistSnapshots(snapshots: PoolSnapshot[]) {
  writeAllSnapshots(normalizeStockSnapshots(snapshots));
}

function normalizeStockSnapshots(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const snapshots: PoolSnapshot[] = [];

  for (const item of value) {
    const normalized = normalizePoolSnapshot(item);

    if (!normalized || seen.has(normalized.snapshotId)) {
      continue;
    }

    seen.add(normalized.snapshotId);
    snapshots.push(normalized);
  }

  return snapshots;
}

function mergeStockLists(existing: PoolStock[], incoming: PoolStock[]) {
  const merged = new Map<string, PoolStock>();

  for (const item of existing) {
    merged.set(item.stockCode, item);
  }

  for (const item of incoming) {
    merged.set(item.stockCode, item);
  }

  return Array.from(merged.values());
}

function removeStocksByCode(existing: PoolStock[], codes: string[]) {
  const codeSet = new Set(codes);
  const removedStocks: RemovedStock[] = [];

  const remaining = existing.filter((stock) => {
    if (!codeSet.has(stock.stockCode)) {
      return true;
    }

    removedStocks.push({
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      removeDate: todayString(),
      removeReason: 'manual',
    });

    return false;
  });

  return {
    remaining,
    removedStocks,
  };
}

export function getAllPools() {
  return clone(resolvePools());
}

export function getPoolById(poolId: string) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return null;
  }

  const pool = resolvePools().find((item) => item.id === normalizedPoolId) ?? null;

  return pool ? clone(pool) : null;
}

export function getActivePool() {
  const pools = resolvePools();
  const activePoolId = readActivePoolId();
  const activePool =
    pools.find((pool) => pool.id === activePoolId) ??
    pools[0] ??
    null;

  if (activePool && activePool.id !== activePoolId) {
    writeActivePoolId(activePool.id);
  }

  return activePool ? clone(activePool) : null;
}

export function setActivePool(poolId: string) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return null;
  }

  const pool = resolvePools().find((item) => item.id === normalizedPoolId) ?? null;

  if (!pool) {
    return null;
  }

  writeActivePoolId(pool.id);

  return clone(pool);
}

export function createPool(name: string, stocks: PoolStock[] = []) {
  const nextPool: StockPool = {
    id: createPoolId(),
    name: normalizePoolName(name),
    createdAt: nowIsoString(),
    updatedAt: nowIsoString(),
    stocks: normalizePoolStocks(stocks),
    removedStocks: [],
  };

  const nextPools = [...resolvePools(), nextPool];
  persistPools(nextPools);
  writeActivePoolId(nextPool.id);

  return clone(nextPool);
}

export function addToPool(poolId: string, stocks: PoolStock[]) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return null;
  }

  const nextStocks = normalizePoolStocks(stocks);
  if (!nextStocks.length) {
    return setActivePool(normalizedPoolId);
  }

  const pools = resolvePools();
  const index = pools.findIndex((pool) => pool.id === normalizedPoolId);

  if (index < 0) {
    return null;
  }

  const pool = pools[index];
  const updatedPool: StockPool = {
    ...pool,
    updatedAt: nowIsoString(),
    stocks: mergeStockLists(pool.stocks, nextStocks),
  };

  pools[index] = updatedPool;
  persistPools(pools);

  return clone(updatedPool);
}

export function removeFromPool(
  poolId: string,
  stockCodes: string[],
  reason: RemovedStock['removeReason'],
) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return null;
  }

  const normalizedReason = VALID_REMOVE_REASONS.has(reason) ? reason : 'manual';
  const normalizedCodes = Array.from(
    new Set(
      stockCodes
        .map((stockCode) => normalizeStockCode(stockCode))
        .filter((stockCode): stockCode is string => Boolean(stockCode)),
    ),
  );

  const pools = resolvePools();
  const index = pools.findIndex((pool) => pool.id === normalizedPoolId);

  if (index < 0 || !normalizedCodes.length) {
    return index < 0 ? null : clone(pools[index]);
  }

  const pool = pools[index];
  const { remaining, removedStocks } = removeStocksByCode(
    pool.stocks,
    normalizedCodes,
  );
  const updatedRemovedStocks = [
    ...pool.removedStocks,
    ...removedStocks.map((item) => ({
      ...item,
      removeReason: normalizedReason,
    })),
  ];
  const updatedPool: StockPool = {
    ...pool,
    updatedAt: nowIsoString(),
    stocks: remaining,
    removedStocks: updatedRemovedStocks,
  };

  pools[index] = updatedPool;
  persistPools(pools);

  return clone(updatedPool);
}

export function deletePool(poolId: string) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return false;
  }

  const pools = resolvePools();
  const nextPools = pools.filter((pool) => pool.id !== normalizedPoolId);

  if (nextPools.length === pools.length) {
    return false;
  }

  persistPools(nextPools);

  const nextSnapshots = resolveSnapshots().filter(
    (snapshot) => snapshot.poolId !== normalizedPoolId,
  );
  persistSnapshots(nextSnapshots);

  const nextActivePool = nextPools[0] ?? null;
  writeActivePoolId(nextActivePool?.id ?? null);

  return true;
}

export function saveSnapshot(poolId: string) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    return null;
  }

  const pool = resolvePools().find((item) => item.id === normalizedPoolId) ?? null;

  if (!pool) {
    return null;
  }

  const snapshot: PoolSnapshot = {
    snapshotId: createSnapshotId(),
    poolId: pool.id,
    timestamp: nowIsoString(),
    stockCount: pool.stocks.length,
    stocks: clone(pool.stocks),
  };

  persistSnapshots([...resolveSnapshots(), snapshot]);

  return clone(snapshot);
}

export function getSnapshots(poolId?: string) {
  const normalizedPoolId = poolId ? normalizePoolId(poolId) : null;
  const snapshots = resolveSnapshots();

  return clone(
    normalizedPoolId
      ? snapshots.filter((snapshot) => snapshot.poolId === normalizedPoolId)
      : snapshots,
  );
}

export function exportPool(poolId: string) {
  const normalizedPoolId = normalizePoolId(poolId);

  if (!normalizedPoolId) {
    throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池 ID 无效。');
  }

  const pool = resolvePools().find((item) => item.id === normalizedPoolId) ?? null;

  if (!pool) {
    throw new AppError(ERROR_CODES.API_ERROR, 404, '股票池不存在。');
  }

  return JSON.stringify(pool, null, 2);
}

export function importPool(jsonStr: string) {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    const normalized = normalizeStockPool(parsed);

    if (!normalized) {
      throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池 JSON 格式无效。');
    }

    const pools = resolvePools();
    const index = pools.findIndex((pool) => pool.id === normalized.id);

    if (index >= 0) {
      pools[index] = normalized;
    } else {
      pools.push(normalized);
    }

    persistPools(pools);
    writeActivePoolId(normalized.id);

    return clone(normalized);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池 JSON 格式无效。');
  }
}

export function cleanupExpiredData(retentionDays = DEFAULT_RETENTION_DAYS) {
  const snapshots = resolveSnapshots();
  const nextSnapshots = pruneExpiredSnapshots(snapshots, now(), retentionDays);

  if (nextSnapshots.length !== snapshots.length) {
    persistSnapshots(nextSnapshots);
  }
}

export function normalizePoolMutationReason(value: unknown) {
  return VALID_ADD_REASONS.has(value as PoolStock['addReason'])
    ? (value as PoolStock['addReason'])
    : 'manual';
}

export function normalizeBatchDiagnosisProgress(
  value: unknown,
): BatchDiagnosisProgress | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const results = Array.isArray(candidate.results) ? candidate.results : [];

  return {
    total: Number(candidate.total) || 0,
    completed: Number(candidate.completed) || 0,
    failed: Number(candidate.failed) || 0,
    currentStock: normalizeText(candidate.currentStock) || undefined,
    results: results.filter(
      (item): item is BatchDiagnosisProgress['results'][number] =>
        Boolean(item) && typeof item === 'object',
    ) as BatchDiagnosisProgress['results'],
  };
}

export function shouldUseFallbackReason(value: unknown) {
  return !VALID_REMOVE_REASONS.has(value as RemovedStock['removeReason']);
}

export function hasPoolStorage() {
  return hasWindowStorage();
}
