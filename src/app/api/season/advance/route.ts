import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const CALENDAR_TRACKS = [
  { name: 'Bahrain International Circuit', country: 'Bahrain', length: 5.412, laps: 57 },
  { name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', length: 6.174, laps: 50 },
  { name: 'Albert Park Circuit', country: 'Australia', length: 5.278, laps: 58 },
  { name: 'Suzuka International Racing Course', country: 'Japan', length: 5.807, laps: 53 },
  { name: 'Shanghai International Circuit', country: 'China', length: 5.451, laps: 56 },
  { name: 'Miami International Autodrome', country: 'USA', length: 5.412, laps: 57 },
  { name: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', length: 4.909, laps: 63 },
  { name: 'Circuit de Monaco', country: 'Monaco', length: 3.337, laps: 78 },
  { name: 'Circuit Gilles Villeneuve', country: 'Canada', length: 4.361, laps: 70 },
  { name: 'Circuit de Barcelona-Catalunya', country: 'Spain', length: 4.657, laps: 66 },
  { name: 'Red Bull Ring', country: 'Austria', length: 4.318, laps: 71 },
  { name: 'Silverstone Circuit', country: 'Great Britain', length: 5.891, laps: 52 },
  { name: 'Hungaroring', country: 'Hungary', length: 4.381, laps: 70 },
  { name: 'Circuit de Spa-Francorchamps', country: 'Belgium', length: 7.004, laps: 44 },
  { name: 'Circuit Zandvoort', country: 'Netherlands', length: 4.259, laps: 72 },
  { name: 'Autodromo Nazionale Monza', country: 'Italy', length: 5.793, laps: 53 },
  { name: 'Marina Bay Street Circuit', country: 'Singapore', length: 4.940, laps: 62 },
  { name: 'Circuit of the Americas', country: 'USA', length: 5.513, laps: 56 },
  { name: 'Interlagos Circuit', country: 'Brazil', length: 4.309, laps: 71 },
  { name: 'Yas Marina Circuit', country: 'Abu Dhabi', length: 5.281, laps: 58 },
];

// F1 constructors payout bonuses
const PAYOUTS = [
  15000000, // 1st: 15M
  12000000, // 2nd: 12M
  10000000, // 3rd: 10M
  8000000,  // 4th: 8M
  7000000,  // 5th: 7M
  6000000,  // 6th: 6M
  5000000,  // 7th: 5M
  4000000,  // 8th: 4M
  3000000,  // 9th: 3M
  2000000,  // 10th: 2M
];

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createServiceClient();

    // 2. Fetch user's team
    const { data: userTeam, error: userTeamErr } = await adminSupabase
      .from('teams')
      .select('id, name, budget')
      .eq('owner_id', user.id)
      .single();

    if (userTeamErr || !userTeam) {
      return NextResponse.json({ error: 'User team not found' }, { status: 404 });
    }

    // 3. Fetch current active season
    const { data: activeSeason, error: seasonErr } = await adminSupabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (seasonErr || !activeSeason) {
      return NextResponse.json({ error: 'No active season found to advance' }, { status: 400 });
    }

    // 4. Verify that all races of the current active season are completed
    const { data: races, error: racesErr } = await adminSupabase
      .from('races')
      .select('id, status')
      .eq('season_id', activeSeason.id);

    if (racesErr || !races || races.length === 0) {
      return NextResponse.json({ error: 'No calendar races found for this season' }, { status: 400 });
    }

    const unfinishedRaces = races.filter((r) => r.status !== 'completed');
    if (unfinishedRaces.length > 0) {
      return NextResponse.json({
        error: `Cannot advance season. ${unfinishedRaces.length} races are still pending/unfinished.`,
      }, { status: 400 });
    }

    // 5. Query final standings to distribute season payouts
    const { data: standings, error: standingsErr } = await adminSupabase
      .from('season_standings')
      .select('*')
      .eq('season_id', activeSeason.id)
      .order('total_points', { ascending: false });

    if (standingsErr || !standings) {
      throw new Error(`Failed to query final standings: ${standingsErr?.message}`);
    }

    // Distribute budget payouts based on standings position
    for (let posIdx = 0; posIdx < standings.length; posIdx++) {
      const standing = standings[posIdx];
      const payoutAmount = PAYOUTS[Math.min(posIdx, PAYOUTS.length - 1)];

      // Fetch team current budget
      const { data: teamInfo } = await adminSupabase
        .from('teams')
        .select('id, name, budget, is_ai')
        .eq('id', standing.team_id)
        .single();

      if (teamInfo) {
        const newBudget = teamInfo.budget + payoutAmount;

        // Update team budget
        const { error: updErr } = await adminSupabase
          .from('teams')
          .update({ budget: newBudget })
          .eq('id', teamInfo.id);

        if (updErr) console.error(`Failed to update payout budget for team ${teamInfo.name}`, updErr);

        // For player team, write a transaction log
        if (!teamInfo.is_ai) {
          const { error: finErr } = await adminSupabase
            .from('finances')
            .insert({
              team_id: teamInfo.id,
              type: 'prize_money',
              amount: payoutAmount,
              description: `Championship standing prize payout for position #${posIdx + 1}`,
            });
          if (finErr) console.error('Failed to insert finance record for payout', finErr);
        }
      }
    }

    // 6. Release drivers whose contracts end in this season
    const { data: expiringContracts, error: contractErr } = await adminSupabase
      .from('team_drivers')
      .select('id, driver_id, team_id')
      .lte('contract_end_season', activeSeason.number);

    if (contractErr) {
      console.error('Failed to fetch expiring contracts', contractErr);
    }

    if (expiringContracts && expiringContracts.length > 0) {
      const expiringDriverIds = expiringContracts.map((c) => c.driver_id);

      // Release driver status to free agents
      const { error: driverUpdErr } = await adminSupabase
        .from('drivers')
        .update({ is_free_agent: true })
        .in('id', expiringDriverIds);

      if (driverUpdErr) {
        console.error('Failed to set expired drivers to free agents', driverUpdErr);
      }

      // Delete association from team_drivers
      const expiringRecordIds = expiringContracts.map((c) => c.id);
      const { error: contractDelErr } = await adminSupabase
        .from('team_drivers')
        .delete()
        .in('id', expiringRecordIds);

      if (contractDelErr) {
        console.error('Failed to delete team drivers associations', contractDelErr);
      }
    }

    // 7. Deactivate current season
    const { error: closeSeasonErr } = await adminSupabase
      .from('seasons')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', activeSeason.id);

    if (closeSeasonErr) throw closeSeasonErr;

    // 8. Create new season
    const nextSeasonNum = activeSeason.number + 1;
    const { data: newSeason, error: newSeasonErr } = await adminSupabase
      .from('seasons')
      .insert({
        number: nextSeasonNum,
        is_active: true,
        started_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (newSeasonErr || !newSeason) {
      throw new Error(`Failed to create next season: ${newSeasonErr?.message}`);
    }

    // 9. Generate 20 new race rounds scheduled every 2 days
    const baseDate = new Date();
    baseDate.setHours(17, 0, 0, 0); // Start races at 17:00 UTC

    const racesToInsert = CALENDAR_TRACKS.map((t, idx) => {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setDate(baseDate.getDate() + 1 + idx * 2);

      return {
        season_id: newSeason.id,
        round_number: idx + 1,
        track_name: t.name,
        track_country: t.country,
        track_length_km: t.length,
        total_laps: t.laps,
        scheduled_at: scheduledDate.toISOString(),
        status: 'upcoming',
      };
    });

    const { error: calendarErr } = await adminSupabase
      .from('races')
      .insert(racesToInsert);

    if (calendarErr) throw calendarErr;

    // 10. Initialize Standings at 0 points for ALL teams
    const { data: allTeams } = await adminSupabase
      .from('teams')
      .select('id');

    if (allTeams && allTeams.length > 0) {
      const standingsToInsert = allTeams.map((team) => ({
        season_id: newSeason.id,
        team_id: team.id,
        total_points: 0,
        total_wins: 0,
        total_podiums: 0,
      }));

      const { error: newStandingsErr } = await adminSupabase
        .from('season_standings')
        .insert(standingsToInsert);

      if (newStandingsErr) throw newStandingsErr;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully advanced to Season ${nextSeasonNum}!`,
      newSeasonId: newSeason.id,
      seasonNumber: nextSeasonNum,
    });
  } catch (err: unknown) {
    console.error('Error in season advancement API:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
