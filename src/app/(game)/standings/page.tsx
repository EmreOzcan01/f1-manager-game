import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StandingsClient from './StandingsClient';

export default async function StandingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch player team
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  // Fetch active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  let currentSeason = activeSeason;
  if (!currentSeason) {
    const { data: lastSeason } = await supabase
      .from('seasons')
      .select('*')
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();
    currentSeason = lastSeason;
  }

  if (!currentSeason) {
    return (
      <div className="px-4 pt-4 flex flex-col justify-center items-center min-h-[75dvh]">
        <div className="text-center">
          <p className="text-4xl mb-3">🏆</p>
          <h1 className="font-racing text-xl font-bold text-gradient mb-2 uppercase">
            No Standings Found
          </h1>
          <p className="text-xs text-[var(--foreground-muted)]">
            Create your team and activate a season to see championship standings.
          </p>
        </div>
      </div>
    );
  }

  // Fetch team standings
  const { data: teamStandings } = await supabase
    .from('season_standings')
    .select(`
      id,
      total_points,
      total_wins,
      total_podiums,
      best_finish,
      team_id,
      teams (
        id,
        name,
        primary_color,
        secondary_color,
        is_ai
      )
    `)
    .eq('season_id', currentSeason.id)
    .order('total_points', { ascending: false });

  // Fetch race results for the active season to aggregate driver standings dynamically
  const { data: results } = await supabase
    .from('race_results')
    .select(`
      points,
      finish_position,
      driver_id,
      drivers (
        id,
        name,
        nationality
      ),
      team_id,
      teams (
        id,
        name,
        primary_color,
        secondary_color,
        is_ai
      ),
      races!inner (
        season_id
      )
    `)
    .eq('races.season_id', currentSeason.id);

  // Group and sum driver standings
  const driverMap: Record<string, any> = {};
  results?.forEach((r: any) => {
    if (!r.drivers) return;
    const dId = r.driver_id;
    if (!driverMap[dId]) {
      driverMap[dId] = {
        driver_id: dId,
        driver_name: r.drivers.name,
        driver_nationality: r.drivers.nationality,
        team_id: r.team_id,
        team_name: r.teams?.name || 'Free Agent',
        team_color: r.teams?.primary_color || '#666',
        is_player_team: r.teams ? !r.teams.is_ai : false,
        total_points: 0,
        wins: 0,
        podiums: 0,
        best_finish: 99,
      };
    }
    const entry = driverMap[dId];
    entry.total_points += r.points || 0;
    if (r.finish_position === 1) entry.wins += 1;
    if (r.finish_position && r.finish_position <= 3) entry.podiums += 1;
    if (r.finish_position) entry.best_finish = Math.min(entry.best_finish, r.finish_position);
  });

  const driverStandings = Object.values(driverMap).sort((a: any, b: any) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    return a.best_finish - b.best_finish;
  });

  // Check if season is fully complete (all races of the current season are 'completed')
  const { data: races } = await supabase
    .from('races')
    .select('id, status')
    .eq('season_id', currentSeason.id);

  const isSeasonFinished = races && races.length > 0
    ? races.every((r: any) => r.status === 'completed')
    : false;

  return (
    <StandingsClient
      activeSeason={currentSeason}
      teamStandings={teamStandings || []}
      driverStandings={driverStandings}
      isSeasonFinished={isSeasonFinished}
      playerTeamId={team?.id || null}
    />
  );
}
