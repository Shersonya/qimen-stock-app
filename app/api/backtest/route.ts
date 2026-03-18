import { NextRequest, NextResponse } from 'next/server';

import type {
  BacktestApiSuccessResponse,
  BacktestRequest,
} from '@/lib/contracts/qimen';
import { toErrorResponse } from '@/lib/errors';
import { runMarketScreenBacktest } from '@/lib/services/backtest';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<BacktestRequest> = {};

    try {
      payload = (await request.json()) as Partial<BacktestRequest>;
    } catch {
      payload = {};
    }

    const result = await runMarketScreenBacktest({
      items: payload.items ?? [],
      lookbackDays: payload.lookbackDays,
      strategyLabel: payload.strategyLabel,
    });

    return NextResponse.json<BacktestApiSuccessResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
