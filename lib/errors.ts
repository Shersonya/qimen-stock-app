import {
  ERROR_CODES,
  getErrorMessage,
  type ApiErrorResponse,
  type ErrorCode,
} from '@/api/qimen';

export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;

  constructor(code: ErrorCode, statusCode: number, message?: string) {
    super(message ?? getErrorMessage(code));
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError(ERROR_CODES.API_ERROR, 500);
}

export function toErrorResponse(error: unknown): {
  statusCode: number;
  body: ApiErrorResponse;
} {
  const appError = toAppError(error);

  return {
    statusCode: appError.statusCode,
    body: {
      error: {
        code: appError.code,
        message: appError.message,
      },
    },
  };
}
