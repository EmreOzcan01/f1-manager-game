import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's team
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    // 3. Parse body
    const body = await request.json();
    const { raceId, driverId, tirePlan, plannedPitStops, fuelLoad, fuelMode, aggression } = body;

    if (!raceId) {
      return NextResponse.json({ error: 'raceId is required' }, { status: 400 });
    }

    if (!driverId) {
      return NextResponse.json({ error: 'driverId is required' }, { status: 400 });
    }

    // 3b. Validate that the driver belongs to the team
    const { data: teamDriver } = await supabase
      .from('team_drivers')
      .select('id')
      .eq('team_id', team.id)
      .eq('driver_id', driverId)
      .single();

    if (!teamDriver) {
      return NextResponse.json({ error: 'Driver not assigned to your team' }, { status: 400 });
    }

    // 4. Validate race exists and is upcoming
    const { data: race } = await supabase
      .from('races')
      .select('id, status, total_laps')
      .eq('id', raceId)
      .single();

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }

    if (race.status !== 'upcoming') {
      return NextResponse.json(
        { error: 'Can only set strategy for upcoming races' },
        { status: 400 }
      );
    }

    // 5. Validate tire plan
    if (!tirePlan || !Array.isArray(tirePlan) || tirePlan.length === 0) {
      return NextResponse.json(
        { error: 'At least one tire stint is required' },
        { status: 400 }
      );
    }

    const validCompounds = ['soft', 'medium', 'hard', 'intermediate', 'wet'];
    for (const stint of tirePlan) {
      if (!validCompounds.includes(stint.compound)) {
        return NextResponse.json(
          { error: `Invalid tire compound: ${stint.compound}` },
          { status: 400 }
        );
      }
      if (!stint.laps || stint.laps < 1) {
        return NextResponse.json(
          { error: 'Each stint must have at least 1 lap' },
          { status: 400 }
        );
      }
    }

    // Validate total laps match race
    const totalStintLaps = tirePlan.reduce(
      (sum: number, s: { laps: number }) => sum + s.laps, 0
    );
    if (totalStintLaps !== race.total_laps) {
      return NextResponse.json(
        { error: `Total stint laps (${totalStintLaps}) must equal race laps (${race.total_laps})` },
        { status: 400 }
      );
    }

    // Validate fuel mode
    const validFuelModes = ['save', 'standard', 'attack'];
    if (fuelMode && !validFuelModes.includes(fuelMode)) {
      return NextResponse.json(
        { error: `Invalid fuel mode: ${fuelMode}` },
        { status: 400 }
      );
    }

    // Validate aggression
    const validAggressions = ['conservative', 'balanced', 'aggressive'];
    if (aggression && !validAggressions.includes(aggression)) {
      return NextResponse.json(
        { error: `Invalid aggression: ${aggression}` },
        { status: 400 }
      );
    }

    // 6. Format tire plan for DB
    const formattedTirePlan = tirePlan.map(
      (s: { compound: string; laps: number }, i: number) => ({
        stint: i + 1,
        compound: s.compound,
        laps: s.laps,
      })
    );

    // Calculate planned pit stop laps from stints
    const computedPitStops: number[] = [];
    let lapCounter = 0;
    for (let i = 0; i < tirePlan.length - 1; i++) {
      lapCounter += tirePlan[i].laps;
      computedPitStops.push(lapCounter);
    }

    // 7. Upsert strategy using service role (bypasses RLS for insert)
    const adminSupabase = createServiceClient();

    const { data: existing } = await adminSupabase
      .from('race_strategies')
      .select('id')
      .eq('driver_id', driverId)
      .eq('race_id', raceId)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await adminSupabase
        .from('race_strategies')
        .update({
          tire_plan: formattedTirePlan,
          planned_pit_stops: computedPitStops,
          fuel_load: fuelLoad ?? 100,
          fuel_mode: fuelMode ?? 'standard',
          aggression: aggression ?? 'balanced',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[STRATEGY UPDATE ERROR]', updateError);
        return NextResponse.json(
          { error: 'Failed to update strategy' },
          { status: 500 }
        );
      }
    } else {
      // Insert new
      const { error: insertError } = await adminSupabase
        .from('race_strategies')
        .insert({
          team_id: team.id,
          driver_id: driverId,
          race_id: raceId,
          tire_plan: formattedTirePlan,
          planned_pit_stops: computedPitStops,
          fuel_load: fuelLoad ?? 100,
          fuel_mode: fuelMode ?? 'standard',
          aggression: aggression ?? 'balanced',
        });

      if (insertError) {
        console.error('[STRATEGY INSERT ERROR]', insertError);
        return NextResponse.json(
          { error: 'Failed to save strategy' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      pitStops: computedPitStops,
      message: existing ? 'Strategy updated' : 'Strategy saved',
    });
  } catch (error) {
    console.error('[STRATEGY API ERROR]', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
