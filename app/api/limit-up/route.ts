import { NextRequest, NextResponse } from 'next/server';

import type {
  LimitUpFilterRequest,
  LimitUpFilterResponse,
} from '@/lib/contracts/strategy';
import { toErrorResponse } from '@/lib/errors';
import { filterLimitUpStocks } from '@/lib/services/limit-up';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<LimitUpFilterRequest> = {};

    try {
      payload = (await request.json()) as Partial<LimitUpFilterRequest>;
    } catch {
      payload = {};
    }

    const result = await filterLimitUpStocks({
      lookbackDays: payload.lookbackDays,
      minLimitUpCount: payload.minLimitUpCount,
      excludeST: payload.excludeST,
      excludeKechuang: payload.excludeKechuang,
      excludeNewStock: payload.excludeNewStock,
      sortBy: payload.sortBy,
      sortOrder: payload.sortOrder,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return NextResponse.json<LimitUpFilterResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
