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
    const { name, primaryColor } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanColor = primaryColor || '#e11d48';

    // 3. Check if user already has a team
    const adminSupabase = createServiceClient();
    const { data: existingTeam } = await adminSupabase
      .from('teams')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (existingTeam) {
      return NextResponse.json({ error: 'You already have a team established' }, { status: 400 });
    }

    // 4. Create team (using admin/service role client to bypass RLS restrictions on related tables if needed,
    // though teams can be inserted by the user, inserting car_parts and standings requires admin privileges)
    const { data: team, error: teamErr } = await adminSupabase
      .from('teams')
      .insert({
        owner_id: user.id,
        name: cleanName,
        primary_color: cleanColor,
        is_ai: false,
      })
      .select()
      .single();

    if (teamErr) throw teamErr;

    // 5. Create default car parts for the new team
    const categories = ['engine', 'aero', 'chassis', 'gearbox', 'suspension', 'brakes', 'cooling'];
    const partsToInsert = categories.map((cat) => ({
      team_id: team.id,
      category: cat,
      level: 1,
      performance: 15 + Math.floor(Math.random() * 10),
      reliability: 75 + Math.floor(Math.random() * 10),
      wear: 0,
    }));

    const { error: partsErr } = await adminSupabase
      .from('car_parts')
      .insert(partsToInsert);

    if (partsErr) {
      // Rollback team creation if parts insertion fails
      await adminSupabase.from('teams').delete().eq('id', team.id);
      throw partsErr;
    }

    // 6. Create season standing entry if an active season exists
    const { data: activeSeason } = await adminSupabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();

    if (activeSeason) {
      const { error: standingErr } = await adminSupabase
        .from('season_standings')
        .insert({
          season_id: activeSeason.id,
          team_id: team.id,
          total_points: 0,
          total_wins: 0,
          total_podiums: 0,
        });

      if (standingErr) {
        console.error('Warning: failed to create standing entry:', standingErr);
        // We don't rollback team creation here, as standings can be resolved, but we log the error
      }
    }

    return NextResponse.json({ success: true, team });
  } catch (err: unknown) {
    console.error('Error creating team:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
