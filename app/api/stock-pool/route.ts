import { NextRequest, NextResponse } from 'next/server';

import { ERROR_CODES } from '@/lib/contracts/qimen';
import type {
  PoolSnapshot,
  PoolStock,
  StockPool,
} from '@/lib/contracts/strategy';
import { AppError, toErrorResponse } from '@/lib/errors';
import {
  normalizePoolId,
  normalizePoolName,
  normalizePoolSnapshot,
  normalizePoolStocks,
  normalizeRemoveReason,
  normalizeStockCode,
  normalizeStockPool,
} from '@/lib/services/stock-pool';

export const runtime = 'nodejs';

type StockPoolRouteRequest = {
  action?: string;
  poolId?: unknown;
  name?: unknown;
  stocks?: unknown;
  stockCodes?: unknown;
  reason?: unknown;
  json?: unknown;
  retentionDays?: unknown;
};

function normalizeStockCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => normalizeStockCode(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function toValidatedStockPool(body: StockPoolRouteRequest): StockPool {
  let rawValue: unknown = body.json ?? body;

  if (typeof rawValue === 'string') {
    try {
      rawValue = JSON.parse(rawValue) as unknown;
    } catch {
      throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池 JSON 格式无效。');
    }
  }

  const pool = normalizeStockPool(rawValue);

  if (!pool) {
    throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池内容无效。');
  }

  return pool;
}

function toValidatedStocks(value: unknown): PoolStock[] {
  return normalizePoolStocks(value);
}

function toValidatedSnapshot(body: StockPoolRouteRequest): PoolSnapshot {
  const snapshot = normalizePoolSnapshot({
    snapshotId: body.poolId,
    poolId: body.poolId,
    timestamp: new Date().toISOString(),
    stockCount: Array.isArray(body.stocks) ? body.stocks.length : 0,
    stocks: body.stocks,
  });

  if (!snapshot) {
    throw new AppError(ERROR_CODES.API_ERROR, 400, '快照参数无效。');
  }

  return snapshot;
}

function validatePayload(body: StockPoolRouteRequest) {
  switch (body.action) {
    case 'create':
      return {
        action: 'create',
        name: normalizePoolName(body.name),
        stocks: toValidatedStocks(body.stocks),
      };
    case 'add':
      return {
        action: 'add',
        poolId: normalizePoolId(body.poolId),
        stocks: toValidatedStocks(body.stocks),
      };
    case 'remove':
      return {
        action: 'remove',
        poolId: normalizePoolId(body.poolId),
        stockCodes: normalizeStockCodes(body.stockCodes),
        reason: normalizeRemoveReason(body.reason),
      };
    case 'snapshot':
      return {
        action: 'snapshot',
        poolId: normalizePoolId(body.poolId),
      };
    case 'import':
      return {
        action: 'import',
        pool: toValidatedStockPool(body),
      };
    case 'cleanup':
      return {
        action: 'cleanup',
        retentionDays:
          typeof body.retentionDays === 'number' && Number.isFinite(body.retentionDays)
            ? Math.max(0, Math.floor(body.retentionDays))
            : 30,
      };
    case 'set-active':
      return {
        action: 'set-active',
        poolId: normalizePoolId(body.poolId),
      };
    case 'validate-snapshot':
      return {
        action: 'validate-snapshot',
        snapshot: toValidatedSnapshot(body),
      };
    default:
      throw new AppError(ERROR_CODES.API_ERROR, 400, '不支持的股票池操作。');
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: StockPoolRouteRequest = {};

    try {
      payload = (await request.json()) as StockPoolRouteRequest;
    } catch {
      payload = {};
    }

    const normalized = validatePayload(payload);

    return NextResponse.json(normalized);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
