import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch user's team
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  // Fetch next upcoming race
  const { data: nextRace } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'upcoming')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fetch all teams for standings
  const { data: standings } = await supabase
    .from('season_standings')
    .select(`
      total_points,
      total_wins,
      total_podiums,
      best_finish,
      teams (id, name, primary_color, is_ai)
    `)
    .order('total_points', { ascending: false })
    .limit(10);

  // If user has a team, fetch their drivers and parts
  let drivers = null;
  let parts = null;

  if (team) {
    const { data: teamDrivers } = await supabase
      .from('team_drivers')
      .select(`
        seat_number,
        contract_end_season,
        drivers (*)
      `)
      .eq('team_id', team.id);

    drivers = teamDrivers;

    const { data: carParts } = await supabase
      .from('car_parts')
      .select('*')
      .eq('team_id', team.id);

    parts = carParts;
  }

  // Fetch recent financial transactions
  let transactions = null;
  if (team) {
    const { data: finances } = await supabase
      .from('finances')
      .select('*')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
      .limit(30);
    transactions = finances;
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  return (
    <DashboardClient
      user={{ id: user.id, email: user.email || '' }}
      profile={profile}
      team={team}
      drivers={drivers}
      parts={parts}
      nextRace={nextRace}
      standings={standings}
      transactions={transactions || []}
    />
  );
}
