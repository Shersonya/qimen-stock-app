export const DEFAULT_LISTING_TIME = '09:30' as const;
export const DEFAULT_TIME_SOURCE = 'default' as const;

export const ERROR_CODES = {
  INVALID_STOCK_CODE: 'INVALID_STOCK_CODE',
  STOCK_NOT_FOUND: 'STOCK_NOT_FOUND',
  UNSUPPORTED_MARKET: 'UNSUPPORTED_MARKET',
  DATA_SOURCE_ERROR: 'DATA_SOURCE_ERROR',
  LISTING_DATE_MISSING: 'LISTING_DATE_MISSING',
  API_ERROR: 'API_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type Market = 'SH' | 'SZ' | 'CYB';
export type TimeSource = 'actual' | 'default';

export type StockListingData = {
  code: string;
  name: string;
  market: Market;
  listingDate: string;
  listingTime: string;
  timeSource: TimeSource;
};

export type QimenPalace = {
  index: number;
  position: number;
  name: string;
  star: string;
  door: string;
  god: string;
};

export type QimenResult = {
  yinYang: '阳' | '阴';
  ju: number;
  valueStar: string;
  valueDoor: string;
  palaces: QimenPalace[];
};

export type QimenApiRequest = {
  stockCode: string;
};

export type ApiError = {
  code: ErrorCode;
  message: string;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export type QimenApiSuccessResponse = {
  stock: StockListingData;
  qimen: QimenResult;
};

export type QimenApiResponse = QimenApiSuccessResponse | ApiErrorResponse;

export function isApiErrorResponse(
  payload: QimenApiResponse | unknown,
): payload is ApiErrorResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null,
  );
}

export function getErrorMessage(code: ErrorCode): string {
  switch (code) {
    case ERROR_CODES.INVALID_STOCK_CODE:
      return '请输入 6 位 A 股股票代码。';
    case ERROR_CODES.STOCK_NOT_FOUND:
      return '未找到对应股票，请确认代码是否正确。';
    case ERROR_CODES.UNSUPPORTED_MARKET:
      return '当前版本仅支持沪市主板、深市主板和创业板。';
    case ERROR_CODES.DATA_SOURCE_ERROR:
      return '股票数据源暂时不可用，请稍后重试。';
    case ERROR_CODES.LISTING_DATE_MISSING:
      return '数据源缺少上市日期，暂时无法排盘。';
    case ERROR_CODES.API_ERROR:
    default:
      return '请求处理失败，请稍后重试。';
  }
}
