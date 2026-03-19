import { NextRequest, NextResponse } from 'next/server';

import type {
  MarketDashboardRequest,
  MarketDashboardResponse,
} from '@/lib/contracts/qimen';
import { toErrorResponse } from '@/lib/errors';
import { getMarketDashboard } from '@/lib/services/market-dashboard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<MarketDashboardRequest> = {};

    try {
      payload = (await request.json()) as Partial<MarketDashboardRequest>;
    } catch {
      payload = {};
    }

    const result = await getMarketDashboard(payload);

    return NextResponse.json<MarketDashboardResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
