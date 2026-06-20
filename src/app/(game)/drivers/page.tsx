import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DriversClient from './DriversClient';

export default async function DriversPage() {
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

  // Fetch user's current drivers
  const { data: currentDrivers } = await supabase
    .from('team_drivers')
    .select(`
      id,
      seat_number,
      contract_end_season,
      signed_at,
      drivers (*)
    `)
    .eq('team_id', team.id)
    .order('seat_number', { ascending: true });

  // Fetch all available free agent drivers
  const { data: freeAgents } = await supabase
    .from('drivers')
    .select('*')
    .eq('is_free_agent', true)
    .order('pace', { ascending: false });

  // Fetch active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('number')
    .eq('is_active', true)
    .maybeSingle();

  const currentSeason = activeSeason ? activeSeason.number : 1;

  return (
    <DriversClient
      team={team}
      initialCurrentDrivers={currentDrivers || []}
      initialFreeAgents={freeAgents || []}
      currentSeason={currentSeason}
    />
  );
}
