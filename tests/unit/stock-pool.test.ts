import {
  cleanupExpiredData,
  createPool,
  deletePool,
  exportPool,
  getActivePool,
  getAllPools,
  getSnapshots,
  importPool,
  normalizePoolStock,
  removeFromPool,
  saveSnapshot,
  setActivePool,
  addToPool,
} from '@/lib/services/stock-pool';

describe('stock-pool service', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-21T10:00:00+08:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates, activates, adds, removes and snapshots pools in localStorage', () => {
    const stock = normalizePoolStock({
      stockCode: '300750',
      stockName: '宁德时代 ',
      market: 'SH',
      addReason: 'tdx_signal',
      addDate: '2026-03-20',
      addSource: ' 美阳阳 ',
      tdxSignalType: 'meiYangYang',
    });

    expect(stock).toMatchObject({
      stockCode: '300750',
      stockName: '宁德时代',
      market: 'CYB',
      addReason: 'tdx_signal',
      addDate: '2026-03-20',
      addSource: '美阳阳',
      tdxSignalType: 'meiYangYang',
    });

    const pool = createPool(' 核心观察池 ', [stock!]);

    expect(pool.id).toBe('pool_20260321_100000');
    expect(getAllPools()).toHaveLength(1);
    expect(getActivePool()?.id).toBe(pool.id);

    const updatedPool = addToPool(pool.id, [
      {
        stockCode: '002594',
        stockName: '比亚迪',
        market: 'SZ',
        addReason: 'manual',
        addDate: '2026-03-21',
      },
    ]);

    expect(updatedPool?.stocks.map((item) => item.stockCode)).toEqual([
      '300750',
      '002594',
    ]);

    const removedPool = removeFromPool(pool.id, ['300750'], 'stop_loss');

    expect(removedPool?.stocks.map((item) => item.stockCode)).toEqual(['002594']);
    expect(removedPool?.removedStocks).toEqual([
      {
        stockCode: '300750',
        stockName: '宁德时代',
        removeDate: '2026-03-21',
        removeReason: 'stop_loss',
      },
    ]);

    const snapshot = saveSnapshot(pool.id);

    expect(snapshot).toMatchObject({
      poolId: pool.id,
      snapshotId: 'snapshot_20260321_100000',
      stockCount: 1,
    });
    expect(getSnapshots(pool.id)).toHaveLength(1);
    expect(exportPool(pool.id)).toContain('"name": "核心观察池"');
  });

  it('imports, switches and deletes pools while keeping the active id in sync', () => {
    const imported = importPool(
      JSON.stringify({
        id: 'pool_imported',
        name: ' 导入池 ',
        createdAt: '2026-03-19T08:00:00.000Z',
        updatedAt: '2026-03-19T08:30:00.000Z',
        stocks: [
          {
            stockCode: '000625',
            stockName: ' 长安汽车 ',
            market: 'SZ',
            addReason: 'limit_up',
            addDate: '2026-03-19',
            limitUpCount: 2,
          },
        ],
        removedStocks: [
          {
            stockCode: '300418',
            stockName: '昆仑万维',
            removeDate: '2026-03-20',
            removeReason: 'manual',
          },
        ],
      }),
    );

    expect(imported.id).toBe('pool_imported');
    expect(getActivePool()?.id).toBe('pool_imported');

    const nextPool = createPool('第二个池', []);
    expect(setActivePool(nextPool.id)?.id).toBe(nextPool.id);
    expect(deletePool(nextPool.id)).toBe(true);
    expect(getActivePool()?.id).toBe('pool_imported');
  });

  it('cleans up expired snapshots', () => {
    const pool = createPool('快照池', []);

    saveSnapshot(pool.id);

    jest.setSystemTime(new Date('2026-05-25T10:00:00+08:00'));
    cleanupExpiredData();

    expect(getSnapshots(pool.id)).toHaveLength(0);
  });
});

