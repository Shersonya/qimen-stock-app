import { NextRequest, NextResponse } from 'next/server';

import type { DragonHeadMonitorRequest, DragonHeadMonitorResponse } from '@/lib/contracts/dragon-head';
import { toErrorResponse } from '@/lib/errors';
import { getDragonHeadMonitor } from '@/lib/services/dragon-head';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<DragonHeadMonitorRequest> = {};

    try {
      payload = (await request.json()) as Partial<DragonHeadMonitorRequest>;
    } catch {
      payload = {};
    }

    const result = await getDragonHeadMonitor({
      mode: payload.mode,
      dragonHeadConfigOverride: payload.dragonHeadConfigOverride,
    });

    return NextResponse.json<DragonHeadMonitorResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
