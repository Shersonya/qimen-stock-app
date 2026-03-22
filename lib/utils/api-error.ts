import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type ErrorCode,
} from '@/lib/contracts/qimen';

type ApiErrorLike = {
  code: unknown;
  message: unknown;
};

function isApiErrorLike(value: unknown): value is ApiErrorLike {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'code' in value &&
      'message' in value,
  );
}

export function toApiError(
  error: unknown,
  fallbackCode: ErrorCode = ERROR_CODES.API_ERROR,
  fallbackMessage = getErrorMessage(fallbackCode),
): ApiError {
  if (isApiErrorResponse(error)) {
    return error.error;
  }

  if (isApiErrorLike(error)) {
    const code = typeof error.code === 'string' ? error.code : fallbackCode;
    const message =
      typeof error.message === 'string' && error.message.trim()
        ? error.message
        : fallbackMessage;

    return {
      code: code as ErrorCode,
      message,
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: fallbackCode,
      message: error.message,
    };
  }

  return {
    code: fallbackCode,
    message: fallbackMessage,
  };
}
