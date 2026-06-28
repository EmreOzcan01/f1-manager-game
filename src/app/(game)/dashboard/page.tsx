import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { runNextOverdueRace } from '@/lib/engine/run-race';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // ── Auto-resolve overdue races ──
  // When ANY player opens the dashboard, all overdue races get simulated automatically.
  // This is the "lazy evaluation" pattern — no cron dependency needed.
  let autoRacesRun = 0;
  const MAX_AUTO_RACES = 5; // Cap per page load to prevent timeouts

  try {
    for (let i = 0; i < MAX_AUTO_RACES; i++) {
      // Check if there's an overdue upcoming race
      const { data: overdueRace } = await supabase
        .from('races')
        .select('id, scheduled_at')
        .eq('status', 'upcoming')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!overdueRace) break; // No more overdue races

      console.log(`[AUTO-RACE] Running overdue race ${overdueRace.id} (scheduled: ${overdueRace.scheduled_at})`);
      const result = await runNextOverdueRace();
      
      if (!result || !result.success) break;
      autoRacesRun++;
    }
  } catch (e) {
    console.error('[AUTO-RACE] Error during auto race resolution:', e);
  }

  if (autoRacesRun > 0) {
    console.log(`[AUTO-RACE] Completed ${autoRacesRun} overdue race(s)`);
  }

  // ── Fetch user's team ──
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  // ── Fetch next upcoming race ──
  const { data: nextRace } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'upcoming')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  // ── Fetch standings ──
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

  // ── Fetch drivers and parts ──
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

  // ── Fetch transactions ──
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

  // ── Fetch profile ──
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
