import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import StrategyClient from './StrategyClient';

export default async function StrategyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch user's team
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (!team) redirect('/dashboard');

  // Fetch next upcoming race
  const { data: nextRace } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'upcoming')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .single();

  // Fetch existing strategies for this race (if any)
  let existingStrategies: any[] = [];
  if (nextRace) {
    const { data: strategies } = await supabase
      .from('race_strategies')
      .select('*')
      .eq('team_id', team.id)
      .eq('race_id', nextRace.id);

    existingStrategies = strategies || [];
  }

  // Fetch user's drivers (to show in strategy info)
  const { data: teamDrivers } = await supabase
    .from('team_drivers')
    .select(`
      seat_number,
      drivers (name, nationality, pace, racecraft)
    `)
    .eq('team_id', team.id)
    .order('seat_number', { ascending: true });

  return (
    <StrategyClient
      team={team}
      nextRace={nextRace}
      existingStrategies={existingStrategies}
      drivers={teamDrivers || []}
    />
  );
}
