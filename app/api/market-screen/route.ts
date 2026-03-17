import { NextRequest, NextResponse } from 'next/server';

import type {
  MarketScreenRequest,
  MarketScreenSuccessResponse,
} from '@/lib/contracts/qimen';
import { toErrorResponse } from '@/lib/errors';
import { screenMarketStocks } from '@/lib/services/market-screen';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<MarketScreenRequest> = {};

    try {
      payload = (await request.json()) as Partial<MarketScreenRequest>;
    } catch {
      payload = {};
    }

    const result = await screenMarketStocks({
      filters: payload.filters,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return NextResponse.json<MarketScreenSuccessResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
