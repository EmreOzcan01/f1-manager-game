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
    const { driverId, seatNumber } = body;

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    if (seatNumber !== 1 && seatNumber !== 2) {
      return NextResponse.json({ error: 'Seat number must be 1 or 2' }, { status: 400 });
    }

    // 3. Retrieve user's team
    const adminSupabase = createServiceClient();
    const { data: team, error: teamErr } = await adminSupabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Team not found. Create a team first.' }, { status: 400 });
    }

    // 4. Verify seat availability
    const { data: existingSeatDriver } = await adminSupabase
      .from('team_drivers')
      .select('id')
      .eq('team_id', team.id)
      .eq('seat_number', seatNumber)
      .maybeSingle();

    if (existingSeatDriver) {
      return NextResponse.json({ error: `Seat #${seatNumber} is already occupied. Release the current driver first.` }, { status: 400 });
    }

    // 5. Verify driver status and price
    const { data: driver, error: driverErr } = await adminSupabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: 'Driver not found.' }, { status: 404 });
    }

    if (!driver.is_free_agent) {
      return NextResponse.json({ error: 'Driver is not a free agent.' }, { status: 400 });
    }

    // 6. Check budget
    if (team.budget < driver.contract_price) {
      return NextResponse.json({ error: 'Insufficient budget to sign this driver.' }, { status: 400 });
    }

    // 7. Get active season number
    const { data: activeSeason } = await adminSupabase
      .from('seasons')
      .select('number')
      .eq('is_active', true)
      .single();

    const currentSeason = activeSeason ? activeSeason.number : 1;

    // 8. DB Transaction (Admin role client)
    // 8a. Deduct signing price from budget
    const newBudget = team.budget - driver.contract_price;
    const { error: budgetErr } = await adminSupabase
      .from('teams')
      .update({ budget: newBudget })
      .eq('id', team.id);

    if (budgetErr) throw budgetErr;

    // 8b. Add driver assignment to team
    const { error: signErr } = await adminSupabase
      .from('team_drivers')
      .insert({
        team_id: team.id,
        driver_id: driverId,
        seat_number: seatNumber,
        contract_end_season: currentSeason + 1,
      });

    if (signErr) {
      // Rollback budget
      await adminSupabase.from('teams').update({ budget: team.budget }).eq('id', team.id);
      throw signErr;
    }

    // 8c. Mark driver as hired
    const { error: driverUpdateErr } = await adminSupabase
      .from('drivers')
      .update({ is_free_agent: false })
      .eq('id', driverId);

    if (driverUpdateErr) {
      // Rollback team_drivers and budget
      await adminSupabase.from('team_drivers').delete().eq('team_id', team.id).eq('driver_id', driverId);
      await adminSupabase.from('teams').update({ budget: team.budget }).eq('id', team.id);
      throw driverUpdateErr;
    }

    // 8d. Log transaction in finances
    const { error: financeErr } = await adminSupabase
      .from('finances')
      .insert({
        team_id: team.id,
        type: 'driver_transfer',
        amount: -driver.contract_price,
        description: `Signed driver ${driver.name} to Seat #${seatNumber}`,
      });

    if (financeErr) {
      console.error('Warning: Failed to log finance transaction:', financeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully signed ${driver.name} to Seat #${seatNumber}.`,
      budget: newBudget,
    });
  } catch (err: unknown) {
    console.error('Error in driver signing API:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
