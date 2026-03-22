/** @jest-environment node */

import { ERROR_CODES } from '@/lib/contracts/qimen';
import { toApiError } from '@/lib/utils/api-error';

describe('toApiError', () => {
  it('unwraps structured API error responses', () => {
    expect(
      toApiError({
        error: {
          code: ERROR_CODES.DATA_SOURCE_ERROR,
          message: '上游超时',
        },
      }),
    ).toEqual({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      message: '上游超时',
    });
  });

  it('keeps direct api-like errors when shape is valid', () => {
    expect(
      toApiError({
        code: ERROR_CODES.API_ERROR,
        message: '请求失败',
      }),
    ).toEqual({
      code: ERROR_CODES.API_ERROR,
      message: '请求失败',
    });
  });

  it('falls back safely for unknown thrown values', () => {
    expect(toApiError('boom')).toEqual({
      code: ERROR_CODES.API_ERROR,
      message: '请求处理失败，请稍后重试。',
    });
  });

  it('uses custom fallback messages for runtime errors', () => {
    expect(
      toApiError(
        new Error('network timeout'),
        ERROR_CODES.DATA_SOURCE_ERROR,
        '股票数据源暂时不可用，请稍后重试。',
      ),
    ).toEqual({
      code: ERROR_CODES.DATA_SOURCE_ERROR,
      message: 'network timeout',
    });
  });
});
