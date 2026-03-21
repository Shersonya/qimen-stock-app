import { NextRequest, NextResponse } from 'next/server';

import type { TdxScanRequest, TdxScanResponse } from '@/lib/contracts/strategy';
import { toErrorResponse } from '@/lib/errors';
import { scanTdxSignals } from '@/lib/services/tdx-scan';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<TdxScanRequest> = {};

    try {
      payload = (await request.json()) as Partial<TdxScanRequest>;
    } catch {
      payload = {};
    }

    const result = await scanTdxSignals({
      signalType: payload.signalType ?? 'both',
      requireMaUp: payload.requireMaUp,
      requireFiveLinesBull: payload.requireFiveLinesBull,
      maxBiasRate: payload.maxBiasRate,
      minSignalStrength: payload.minSignalStrength,
      page: payload.page,
      pageSize: payload.pageSize,
    });

    return NextResponse.json<TdxScanResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
