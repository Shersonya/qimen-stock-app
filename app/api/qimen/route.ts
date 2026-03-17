import { NextRequest, NextResponse } from 'next/server';

import type { QimenApiRequest, QimenApiSuccessResponse } from '@/api/qimen';
import { generateQimenChart } from '@/lib/qimen/engine';
import { getStockListingInfo } from '@/lib/services/stock-data';
import { toErrorResponse } from '@/lib/errors';

export const runtime = 'nodejs';

function toChinaDate(listingDate: string, listingTime: string): Date {
  return new Date(`${listingDate}T${listingTime}:00+08:00`);
}

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<QimenApiRequest> = {};

    try {
      payload = (await request.json()) as Partial<QimenApiRequest>;
    } catch {
      payload = {};
    }

    const stock = await getStockListingInfo(payload.stockCode ?? '');
    const qimen = generateQimenChart(
      toChinaDate(stock.listingDate, stock.listingTime),
    );

    return NextResponse.json<QimenApiSuccessResponse>({
      stock,
      qimen,
    });
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
