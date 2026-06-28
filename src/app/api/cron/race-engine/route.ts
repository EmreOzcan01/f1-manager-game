import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { runNextOverdueRace } from '@/lib/engine/run-race';

export async function GET(request: NextRequest) {
  // ──────────────────────────────────────
  // 1. Verify Authorization
  // ──────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const isDev = process.env.NODE_ENV === 'development';
  const triggerManual = request.nextUrl.searchParams.get('trigger') === 'true';

  const cronSecret = process.env.CRON_SECRET;
  let isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && querySecret === cronSecret) ||
    (isDev && triggerManual);

  // Allow authenticated users to manually trigger races (works in production too)
  if (!isAuthorized && triggerManual) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await runNextOverdueRace();

    if (!result) {
      return NextResponse.json({
        success: true,
        message: 'No overdue races to simulate.',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RACE ENGINE CRON ERROR]', error);
    return NextResponse.json(
      { error: 'Race simulation execution failed', details: String(error) },
      { status: 500 }
    );
  }
}
