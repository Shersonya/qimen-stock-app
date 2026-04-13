import { NextRequest, NextResponse } from 'next/server';

import type {
  DragonHeadCandidatesRequest,
  DragonHeadCandidatesResponse,
} from '@/lib/contracts/dragon-head';
import { toErrorResponse } from '@/lib/errors';
import { getDragonHeadCandidates } from '@/lib/services/dragon-head';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    let payload: Partial<DragonHeadCandidatesRequest> = {};

    try {
      payload = (await request.json()) as Partial<DragonHeadCandidatesRequest>;
    } catch {
      payload = {};
    }

    const result = await getDragonHeadCandidates({
      mode: payload.mode,
      dragonHeadConfigOverride: payload.dragonHeadConfigOverride,
    });

    return NextResponse.json<DragonHeadCandidatesResponse>(result);
  } catch (error) {
    const { statusCode, body } = toErrorResponse(error);

    return NextResponse.json(body, { status: statusCode });
  }
}
