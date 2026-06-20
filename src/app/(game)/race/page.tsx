import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RaceClient from './RaceClient';
import { getTrack } from '@/lib/utils/tracks';

export default async function RacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch user's team. If no team exists, redirect to dashboard for team creation.
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!team) redirect('/dashboard');

  // Fetch the latest race that is either 'completed' or 'race_day'
  const { data: latestRace } = await supabase
    .from('races')
    .select('*')
    .or('status.eq.completed,status.eq.race_day')
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRace) {
    return <NoRacePlaceholder />;
  }

  // Fetch the simulation log for the latest race
  const { data: raceLog } = await supabase
    .from('race_logs')
    .select('*')
    .eq('race_id', latestRace.id)
    .maybeSingle();

  if (!raceLog || !raceLog.simulation_data) {
    return <NoRacePlaceholder />;
  }

  // Extract track config to get base lap time for physical timing interpolation
  const trackConfig = getTrack(latestRace.track_name);
  const baseLapTime = trackConfig?.baseLapTime || 90.0;

  return (
    <RaceClient
      race={latestRace}
      simulationData={raceLog.simulation_data}
      playerTeamId={team.id}
      baseLapTime={baseLapTime}
    />
  );
}

function NoRacePlaceholder() {
  return (
    <div className="px-4 pt-4 flex flex-col justify-center items-center min-h-[75dvh]">
      <div className="animate-fade-in-up text-center max-w-sm">
        <p className="text-4xl mb-3">🏁</p>
        <h1 className="font-racing text-xl font-bold text-gradient mb-2 uppercase">
          No Race Replays Yet
        </h1>
        <p className="text-xs text-[var(--foreground-muted)] mb-5 leading-relaxed">
          There are no active or completed races in your database. 
          Run a race via the Vercel Cron engine or check back once the race weekend finishes!
        </p>
        <a
          href="/dashboard"
          className="btn-secondary text-xs inline-block"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
