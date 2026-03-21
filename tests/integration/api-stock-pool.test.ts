/** @jest-environment node */

import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/stock-pool/route';
import { resetPoolStorageForTests } from '@/lib/storage/pool-storage';

function createRequest(body: unknown) {
  return {
    json: async () => body,
  } as NextRequest;
}

describe('POST /api/stock-pool', () => {
  beforeEach(() => {
    resetPoolStorageForTests();
  });

  it('creates, reads, mutates, snapshots, and deletes pools through the API', async () => {
    const createResponse = await POST(
      createRequest({
        action: 'create',
        name: ' 核心池 ',
        stocks: [
          {
            stockCode: ' 300750 ',
            stockName: '宁德时代',
            market: 'SH',
            addReason: 'tdx_signal',
            addDate: '2026-03-20',
            tdxSignalType: 'meiYangYang',
          },
        ],
      }),
    );
    const created = await createResponse.json();

    expect(createResponse.status).toBe(200);
    expect(created.action).toBe('create');
    expect(created.pool).toMatchObject({
      name: '核心池',
      stocks: [
        {
          stockCode: '300750',
          stockName: '宁德时代',
          market: 'CYB',
          addReason: 'tdx_signal',
        },
      ],
    });

    const createdPoolId = created.pool.id as string;

    const listResponse = await POST(createRequest({ action: 'list' }));
    const listed = await listResponse.json();

    expect(listed).toMatchObject({
      action: 'list',
      activePoolId: createdPoolId,
    });
    expect(listed.pools).toHaveLength(1);

    const addResponse = await POST(
      createRequest({
        action: 'add',
        poolId: createdPoolId,
        stocks: [
          {
            stockCode: '000625',
            stockName: ' 长安汽车 ',
            market: 'SZ',
            addReason: 'manual',
            addDate: '2026-03-21',
          },
        ],
      }),
    );
    const added = await addResponse.json();

    expect(added.action).toBe('add');
    expect(added.pool.stocks.map((item: { stockCode: string }) => item.stockCode)).toEqual([
      '300750',
      '000625',
    ]);

    const getResponse = await POST(
      createRequest({
        action: 'get',
        poolId: createdPoolId,
      }),
    );
    const fetched = await getResponse.json();

    expect(fetched).toMatchObject({
      action: 'get',
      pool: {
        id: createdPoolId,
        stocks: [
          expect.objectContaining({ stockCode: '300750' }),
          expect.objectContaining({ stockCode: '000625', stockName: '长安汽车' }),
        ],
      },
    });

    const removeResponse = await POST(
      createRequest({
        action: 'remove',
        poolId: createdPoolId,
        stockCodes: ['300750'],
        reason: 'stop_loss',
      }),
    );
    const removed = await removeResponse.json();

    expect(removed.action).toBe('remove');
    expect(removed.pool.stocks.map((item: { stockCode: string }) => item.stockCode)).toEqual([
      '000625',
    ]);
    expect(removed.pool.removedStocks[0]).toMatchObject({
      stockCode: '300750',
      removeReason: 'stop_loss',
    });

    const snapshotResponse = await POST(
      createRequest({
        action: 'snapshot',
        poolId: createdPoolId,
      }),
    );
    const snapshot = await snapshotResponse.json();

    expect(snapshot.action).toBe('snapshot');
    expect(snapshot.snapshot).toMatchObject({
      poolId: createdPoolId,
      stockCount: 1,
    });

    const deleteResponse = await POST(
      createRequest({
        action: 'delete',
        poolId: createdPoolId,
      }),
    );
    const deleted = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deleted).toMatchObject({
      action: 'delete',
      deleted: true,
      activePoolId: null,
    });
  });

  it('imports pools and returns the normalized stored payload', async () => {
    const response = await POST(
      createRequest({
        action: 'import',
        json: JSON.stringify({
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
            },
          ],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      action: 'import',
      pool: {
        id: 'pool_imported',
        name: '导入池',
        stocks: [
          {
            stockCode: '000625',
            stockName: '长安汽车',
            market: 'SZ',
            addReason: 'limit_up',
            addDate: '2026-03-19',
          },
        ],
      },
      activePoolId: 'pool_imported',
    });
  });

  it('rejects unsupported actions', async () => {
    const response = await POST(createRequest({ action: 'unknown' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('API_ERROR');
  });
});
