import type { PoolSnapshot, StockPool } from '@/lib/contracts/strategy';

export const STOCK_POOL_STORAGE_KEY = 'qimen_stock_pools';
export const STOCK_POOL_SNAPSHOT_STORAGE_KEY = 'qimen_pool_snapshots';
export const ACTIVE_POOL_STORAGE_KEY = 'qimen_active_pool_id';
export const STOCK_POOL_SNAPSHOT_RETENTION_DAYS = 30;

const TIMESTAMP_PAD_LENGTH = 2;
const serverStorageState = new Map<string, string>();

function hasWindowStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function getStorage() {
  if (hasWindowStorage()) {
    return window.localStorage;
  }

  return {
    getItem(key: string) {
      return serverStorageState.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      serverStorageState.set(key, value);
    },
    removeItem(key: string) {
      serverStorageState.delete(key);
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = getStorage().getItem(key);

    if (!rawValue) {
      return clone(fallback);
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return clone(fallback);
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    getStorage().setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence failures so the primary workflow stays usable.
  }
}

function pad(value: number) {
  return String(value).padStart(TIMESTAMP_PAD_LENGTH, '0');
}

function formatTimestamp(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export function createPoolId(date = new Date()) {
  return `pool_${formatTimestamp(date)}`;
}

export function createSnapshotId(date = new Date()) {
  return `snapshot_${formatTimestamp(date)}`;
}

export function readAllPools(): StockPool[] {
  return clone(readJson<StockPool[]>(STOCK_POOL_STORAGE_KEY, []));
}

export function writeAllPools(pools: StockPool[]) {
  writeJson(STOCK_POOL_STORAGE_KEY, pools);
}

export function readAllSnapshots(): PoolSnapshot[] {
  return clone(readJson<PoolSnapshot[]>(STOCK_POOL_SNAPSHOT_STORAGE_KEY, []));
}

export function writeAllSnapshots(snapshots: PoolSnapshot[]) {
  writeJson(STOCK_POOL_SNAPSHOT_STORAGE_KEY, snapshots);
}

export function readActivePoolId(): string | null {
  try {
    const rawValue = getStorage().getItem(ACTIVE_POOL_STORAGE_KEY);

    return rawValue && rawValue.trim() ? rawValue.trim() : null;
  } catch {
    return null;
  }
}

export function writeActivePoolId(poolId: string | null) {
  try {
    if (!poolId) {
      getStorage().removeItem(ACTIVE_POOL_STORAGE_KEY);
      return;
    }

    getStorage().setItem(ACTIVE_POOL_STORAGE_KEY, poolId);
  } catch {
    // Ignore persistence failures so the primary workflow stays usable.
  }
}

export function resetPoolStorageForTests() {
  serverStorageState.clear();

  if (hasWindowStorage()) {
    window.localStorage.removeItem(STOCK_POOL_STORAGE_KEY);
    window.localStorage.removeItem(STOCK_POOL_SNAPSHOT_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_POOL_STORAGE_KEY);
  }
}

export function isSnapshotExpired(
  snapshot: PoolSnapshot,
  now = new Date(),
  retentionDays = STOCK_POOL_SNAPSHOT_RETENTION_DAYS,
) {
  const timestamp = Date.parse(snapshot.timestamp);

  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return now.getTime() - timestamp > retentionDays * 24 * 60 * 60 * 1000;
}

export function pruneExpiredSnapshots(
  snapshots: PoolSnapshot[],
  now = new Date(),
  retentionDays = STOCK_POOL_SNAPSHOT_RETENTION_DAYS,
) {
  return snapshots.filter(
    (snapshot) => !isSnapshotExpired(snapshot, now, retentionDays),
  );
}
