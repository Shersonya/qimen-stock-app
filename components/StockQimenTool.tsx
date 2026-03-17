'use client';

import { startTransition, useState } from 'react';

import {
  ERROR_CODES,
  getErrorMessage,
  isApiErrorResponse,
  type ApiError,
  type QimenApiResponse,
  type QimenApiSuccessResponse,
} from '@/api/qimen';
import { ErrorNotice } from '@/components/ErrorNotice';
import { QimenGrid } from '@/components/QimenGrid';
import { QimenSummary } from '@/components/QimenSummary';
import { StockCodeForm } from '@/components/StockCodeForm';

function createFallbackError(): ApiError {
  return {
    code: ERROR_CODES.API_ERROR,
    message: getErrorMessage(ERROR_CODES.API_ERROR),
  };
}

export function StockQimenTool() {
  const [result, setResult] = useState<QimenApiSuccessResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(stockCode: string) {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/qimen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockCode }),
      });

      let payload: QimenApiResponse | null = null;

      try {
        payload = (await response.json()) as QimenApiResponse;
      } catch {
        payload = null;
      }

      if (!payload || !response.ok || isApiErrorResponse(payload)) {
        startTransition(() => {
          setResult(null);
          setError(payload && isApiErrorResponse(payload) ? payload.error : createFallbackError());
        });

        return;
      }

      startTransition(() => {
        setError(null);
        setResult(payload);
      });
    } catch {
      startTransition(() => {
        setResult(null);
        setError(createFallbackError());
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <StockCodeForm isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      {error ? <ErrorNotice error={error} /> : null}
      {result ? (
        <>
          <QimenSummary result={result} />
          <section className="rounded-[2rem] border border-vermilion/10 bg-white/80 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-gold">
                  九宫格结果
                </p>
                <h2 className="mt-2 font-serif text-3xl text-ink">
                  上市时刻九宫盘
                </h2>
              </div>
              <div className="rounded-full border border-gold/25 px-4 py-2 text-sm text-vermilion">
                {result.qimen.yinYang}遁 {result.qimen.ju} 局
              </div>
            </div>
            <div className="mt-6">
              <QimenGrid palaces={result.qimen.palaces} />
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-gold/30 bg-white/55 p-8 text-ink/75 shadow-glow">
          <p className="text-sm uppercase tracking-[0.28em] text-gold">结果区域</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">等待输入股票代码</h2>
          <p className="mt-4 max-w-2xl text-base leading-7">
            输入沪市主板、深市主板或创业板股票代码后，系统会查询上市日期，
            使用默认上市时辰 09:30 进行时家奇门排盘，并在这里展示九宫结果。
          </p>
        </section>
      )}
    </section>
  );
}
