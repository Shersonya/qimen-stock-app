/** @jest-environment node */

import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/stock-pool/route';

function createMemoryStorage() {
  const state = new Map<string, string>();

  return {
    get length() {
      return state.size;
    },
    clear() {
      state.clear();
    },
    getItem(key: string) {
      return state.has(key) ? (state.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
    removeItem(key: string) {
      state.delete(key);
    },
  };
}

const memoryStorage = createMemoryStorage();

function createRequest(body: unknown) {
  return {
    json: async () => body,
  } as NextRequest;
}

describe('POST /api/stock-pool', () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it('normalizes create payloads without mutating browser storage', async () => {
    const response = await POST(
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
          {
            stockCode: 'invalid',
            stockName: 'should skip',
          },
        ],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      action: 'create',
      name: '核心池',
      stocks: [
        {
          stockCode: '300750',
          stockName: '宁德时代',
          market: 'CYB',
          addReason: 'tdx_signal',
          addDate: '2026-03-20',
          tdxSignalType: 'meiYangYang',
        },
      ],
    });
    expect(memoryStorage.length).toBe(0);
  });

  it('accepts import payloads and returns a normalized pool', async () => {
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
    expect(body.action).toBe('import');
    expect(body.pool).toMatchObject({
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
    });
    expect(memoryStorage.length).toBe(0);
  });

  it('rejects unsupported actions', async () => {
    const response = await POST(createRequest({ action: 'unknown' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('API_ERROR');
  });
});
