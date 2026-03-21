import { NextRequest, NextResponse } from 'next/server';

import type { BatchDiagnosisRequest, PoolStockDiagnosis } from '@/lib/contracts/strategy';
import { toErrorResponse } from '@/lib/errors';
import { batchDiagnose } from '@/lib/services/batch-diagnosis';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<BatchDiagnosisRequest> = {};

    try {
      payload = (await request.json()) as Partial<BatchDiagnosisRequest>;
    } catch {
      payload = {};
    }

    const result = await batchDiagnose({
      stockCodes: payload.stockCodes ?? [],
      poolId: payload.poolId,
    });

    return NextResponse.json<PoolStockDiagnosis[]>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
