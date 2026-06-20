import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkAndCompleteUpgrades } from '@/lib/engine/garage-resolver';
import GarageClient from './GarageClient';

export default async function GaragePage() {
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

  // Lazy-resolve completed upgrades using admin client (bypasses RLS limits)
  const adminSupabase = createServiceClient();
  await checkAndCompleteUpgrades(adminSupabase, team.id);

  // Fetch latest car parts
  const { data: parts } = await supabase
    .from('car_parts')
    .select('*')
    .eq('team_id', team.id)
    .order('category', { ascending: true });

  return (
    <GarageClient
      team={team}
      initialParts={parts || []}
    />
  );
}
