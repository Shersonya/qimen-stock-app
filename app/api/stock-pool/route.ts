import { NextRequest, NextResponse } from 'next/server';

import { ERROR_CODES } from '@/lib/contracts/qimen';
import type {
  PoolSnapshot,
  PoolStock,
  StockPool,
} from '@/lib/contracts/strategy';
import { AppError, toErrorResponse } from '@/lib/errors';
import {
  addToPool,
  cleanupExpiredData,
  createPool,
  deletePool,
  getActivePool,
  getAllPools,
  getPoolById,
  getSnapshots,
  importPool,
  normalizePoolId,
  normalizePoolName,
  normalizePoolSnapshot,
  normalizePoolStocks,
  normalizeRemoveReason,
  normalizeStockCode,
  normalizeStockPool,
  removeFromPool,
  saveSnapshot,
  setActivePool,
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

type ValidatedPayload =
  | {
      action: 'create';
      name: string;
      stocks: PoolStock[];
    }
  | {
      action: 'add';
      poolId: string | null;
      stocks: PoolStock[];
    }
  | {
      action: 'remove';
      poolId: string | null;
      stockCodes: string[];
      reason: ReturnType<typeof normalizeRemoveReason>;
    }
  | {
      action: 'delete';
      poolId: string | null;
    }
  | {
      action: 'list';
    }
  | {
      action: 'get';
      poolId: string | null;
    }
  | {
      action: 'snapshot';
      poolId: string | null;
    }
  | {
      action: 'import';
      pool: StockPool;
    }
  | {
      action: 'cleanup';
      retentionDays: number;
    }
  | {
      action: 'set-active';
      poolId: string | null;
    }
  | {
      action: 'validate-snapshot';
      snapshot: PoolSnapshot;
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

function validatePayload(body: StockPoolRouteRequest): ValidatedPayload {
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
    case 'delete':
      return {
        action: 'delete',
        poolId: normalizePoolId(body.poolId),
      };
    case 'list':
      return {
        action: 'list',
      };
    case 'get':
      return {
        action: 'get',
        poolId: normalizePoolId(body.poolId),
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

function requirePoolId(poolId: string | null) {
  if (!poolId) {
    throw new AppError(ERROR_CODES.API_ERROR, 400, '股票池 ID 无效。');
  }

  return poolId;
}

function requirePool(pool: StockPool | null) {
  if (!pool) {
    throw new AppError(ERROR_CODES.API_ERROR, 404, '股票池不存在。');
  }

  return pool;
}

function requireSnapshot(snapshot: PoolSnapshot | null) {
  if (!snapshot) {
    throw new AppError(ERROR_CODES.API_ERROR, 404, '股票池快照不存在。');
  }

  return snapshot;
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

    switch (normalized.action) {
      case 'create': {
        const pool = createPool(normalized.name, normalized.stocks);

        return NextResponse.json({
          action: 'create',
          pool,
          activePoolId: pool.id,
        });
      }
      case 'add': {
        const pool = requirePool(
          addToPool(requirePoolId(normalized.poolId), normalized.stocks),
        );

        return NextResponse.json({
          action: 'add',
          pool,
          activePoolId: getActivePool()?.id ?? null,
        });
      }
      case 'remove': {
        const pool = requirePool(
          removeFromPool(
            requirePoolId(normalized.poolId),
            normalized.stockCodes,
            normalized.reason,
          ),
        );

        return NextResponse.json({
          action: 'remove',
          pool,
          activePoolId: getActivePool()?.id ?? null,
        });
      }
      case 'delete': {
        const deleted = deletePool(requirePoolId(normalized.poolId));

        if (!deleted) {
          throw new AppError(ERROR_CODES.API_ERROR, 404, '股票池不存在。');
        }

        return NextResponse.json({
          action: 'delete',
          deleted: true,
          pools: getAllPools(),
          activePoolId: getActivePool()?.id ?? null,
        });
      }
      case 'list':
        return NextResponse.json({
          action: 'list',
          pools: getAllPools(),
          activePool: getActivePool(),
          activePoolId: getActivePool()?.id ?? null,
        });
      case 'get': {
        const pool = requirePool(getPoolById(requirePoolId(normalized.poolId)));

        return NextResponse.json({
          action: 'get',
          pool,
          activePoolId: getActivePool()?.id ?? null,
        });
      }
      case 'snapshot': {
        const snapshot = requireSnapshot(saveSnapshot(requirePoolId(normalized.poolId)));

        return NextResponse.json({
          action: 'snapshot',
          snapshot,
        });
      }
      case 'import': {
        const pool = importPool(JSON.stringify(normalized.pool));

        return NextResponse.json({
          action: 'import',
          pool,
          activePoolId: pool.id,
        });
      }
      case 'cleanup': {
        const beforeCount = getSnapshots().length;
        cleanupExpiredData(normalized.retentionDays);
        const snapshots = getSnapshots();

        return NextResponse.json({
          action: 'cleanup',
          removedSnapshotCount: beforeCount - snapshots.length,
          snapshots,
        });
      }
      case 'set-active': {
        const pool = requirePool(setActivePool(requirePoolId(normalized.poolId)));

        return NextResponse.json({
          action: 'set-active',
          pool,
          activePoolId: pool.id,
        });
      }
      case 'validate-snapshot':
        return NextResponse.json({
          action: 'validate-snapshot',
          snapshot: normalized.snapshot,
        });
      default:
        return NextResponse.json(normalized);
    }
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
