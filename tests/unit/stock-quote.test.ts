/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import { getStockOpenPrice, normalizeOpenPrice } from '@/lib/services/stock-quote';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('normalizeOpenPrice', () => {
  it.each([
    [146800, '1468.00'],
    [1103, '11.03'],
    [40500, '405.00'],
  ])('normalizes %s to %s', (rawValue, expected) => {
    expect(normalizeOpenPrice(rawValue)).toBe(expected);
  });

  it('returns null for empty and non-positive values', () => {
    expect(normalizeOpenPrice(undefined)).toBeNull();
    expect(normalizeOpenPrice(0)).toBeNull();
    expect(normalizeOpenPrice('')).toBeNull();
  });
});

describe('getStockOpenPrice', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('reads and normalizes the eastmoney open price', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          f46: 146800,
        },
      }),
    );

    await expect(getStockOpenPrice('600519', 'SH')).resolves.toBe('1468.00');
  });

  it('returns null when the open price is unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          f46: 0,
        },
      }),
    );

    await expect(getStockOpenPrice('000001', 'SZ')).resolves.toBeNull();
  });

  it('maps quote transport failures to DATA_SOURCE_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(getStockOpenPrice('600519', 'SH')).rejects.toMatchObject({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      statusCode: 502,
    });
  });
});
