import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await request.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    // 3. Retrieve user's team
    const adminSupabase = createServiceClient();
    const { data: team, error: teamErr } = await adminSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 400 });
    }

    // 4. Verify driver ownership
    const { data: teamDriver, error: teamDriverErr } = await adminSupabase
      .from('team_drivers')
      .select('*, drivers(name)')
      .eq('team_id', team.id)
      .eq('driver_id', driverId)
      .single();

    if (teamDriverErr || !teamDriver) {
      return NextResponse.json({ error: 'This driver is not signed to your team.' }, { status: 400 });
    }

    const driverName = (teamDriver.drivers as any)?.name || 'Unknown Driver';

    // 5. DB Transaction (Admin role client)
    // 5a. Remove driver assignment
    const { error: deleteErr } = await adminSupabase
      .from('team_drivers')
      .delete()
      .eq('team_id', team.id)
      .eq('driver_id', driverId);

    if (deleteErr) throw deleteErr;

    // 5b. Reset driver as free agent
    const { error: driverUpdateErr } = await adminSupabase
      .from('drivers')
      .update({ is_free_agent: true })
      .eq('id', driverId);

    if (driverUpdateErr) {
      // Re-insert team_driver if update fails
      await adminSupabase.from('team_drivers').insert({
        team_id: team.id,
        driver_id: driverId,
        seat_number: teamDriver.seat_number,
        contract_end_season: teamDriver.contract_end_season,
      });
      throw driverUpdateErr;
    }

    // 5c. Log transaction in finances
    const { error: financeErr } = await adminSupabase
      .from('finances')
      .insert({
        team_id: team.id,
        type: 'driver_transfer',
        amount: 0,
        description: `Released driver ${driverName} from Seat #${teamDriver.seat_number}`,
      });

    if (financeErr) {
      console.error('Warning: Failed to log finance transaction:', financeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully released ${driverName} from Seat #${teamDriver.seat_number}.`,
    });
  } catch (err: unknown) {
    console.error('Error in driver release API:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
