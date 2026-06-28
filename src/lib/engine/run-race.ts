import { createServiceClient } from '@/lib/supabase/server';
import { simulateRace, createRandom, calculateCarSpecs } from '@/lib/engine/race-simulator';
import { getTrack } from '@/lib/utils/tracks';
import { POINTS_SYSTEM, PRIZE_MONEY } from '@/types/engine';
import type { RaceEntrant, WeatherCondition } from '@/types/engine';
import type { TireCompound } from '@/types/database';

export interface RaceResult {
  success: boolean;
  message: string;
  raceId?: string;
  weather?: string;
  temperature?: number;
  fastestLap?: string;
}

/**
 * Runs the next overdue race simulation.
 * Returns null if no overdue race exists.
 * This is the core engine — called by both the cron API route and the dashboard auto-trigger.
 */
export async function runNextOverdueRace(): Promise<RaceResult | null> {
  const supabase = createServiceClient();

  // ── Fetch next upcoming race whose scheduled_at has passed ──
  const { data: upcomingRace, error: raceError } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'upcoming')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (raceError) throw raceError;
  if (!upcomingRace) return null; // No overdue race

  // ── Load DB Parameters ──
  const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
  if (teamsError) throw teamsError;

  const { data: teamDrivers, error: tdError } = await supabase
    .from('team_drivers')
    .select('*, drivers(*)');
  if (tdError) throw tdError;

  const { data: carParts, error: partsError } = await supabase.from('car_parts').select('*');
  if (partsError) throw partsError;

  const { data: strategies, error: stratError } = await supabase
    .from('race_strategies')
    .select('*')
    .eq('race_id', upcomingRace.id);
  if (stratError) throw stratError;

  // ── Generate Entrants ──
  const random = createRandom(upcomingRace.id);

  const weatherRoll = random();
  let weather: WeatherCondition = 'dry';
  let temperature = 26;

  if (weatherRoll < 0.1) {
    weather = 'heavy_rain';
    temperature = 14 + Math.floor(random() * 6);
  } else if (weatherRoll < 0.25) {
    weather = 'light_rain';
    temperature = 18 + Math.floor(random() * 6);
  } else {
    weather = 'dry';
    temperature = 24 + Math.floor(random() * 10);
  }

  const trackConfig = getTrack(upcomingRace.track_name);
  const totalLaps = upcomingRace.total_laps;
  const entrants: RaceEntrant[] = [];

  // Group parts by team_id
  const partsByTeam: Record<string, typeof carParts> = {};
  carParts?.forEach((part) => {
    if (!partsByTeam[part.team_id]) partsByTeam[part.team_id] = [];
    partsByTeam[part.team_id].push(part);
  });

  // Group strategies by driver_id
  const stratByDriver: Record<string, (typeof strategies)[0]> = {};
  strategies?.forEach((strat) => {
    if (strat.driver_id) {
      stratByDriver[strat.driver_id] = strat;
    }
  });

  for (const td of teamDrivers || []) {
    const driver = td.drivers;
    if (!driver) continue;

    const team = teams?.find((t) => t.id === td.team_id);
    if (!team) continue;

    const teamParts = partsByTeam[team.id] || [];
    const specs = calculateCarSpecs(teamParts);

    const strategy = stratByDriver[driver.id];

    let tirePlan: { compound: TireCompound; laps: number }[] = [];
    let pitStopsPlan: number[] = [];

    if (strategy && strategy.tire_plan && Array.isArray(strategy.tire_plan) && strategy.tire_plan.length > 0) {
      tirePlan = strategy.tire_plan.map((s: any) => ({
        compound: s.compound as TireCompound,
        laps: s.laps,
      }));
      pitStopsPlan = strategy.planned_pit_stops || [];
    } else {
      if (weather === 'heavy_rain') {
        tirePlan = [{ compound: 'wet', laps: totalLaps }];
      } else if (weather === 'light_rain') {
        tirePlan = [{ compound: 'intermediate', laps: totalLaps }];
      } else {
        const stint1 = Math.floor(totalLaps * 0.4);
        const stint2 = totalLaps - stint1;
        tirePlan = [
          { compound: 'soft', laps: stint1 },
          { compound: 'medium', laps: stint2 },
        ];
        pitStopsPlan = [stint1];
      }
    }

    entrants.push({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.primary_color || '#e11d48',
      driverId: driver.id,
      driverName: driver.name,
      driver: {
        pace: driver.pace,
        racecraft: driver.racecraft,
        awareness: driver.awareness,
        experience: driver.experience,
        consistency: driver.consistency,
        morale: driver.morale,
      },
      carPerformance: specs.performance,
      carReliability: specs.reliability,
      position: 0,
      totalTime: 0,
      currentTire: tirePlan[0]?.compound || 'medium',
      tireAge: 0,
      tireWear: 0,
      fuelRemaining: strategy?.fuel_load ?? 100,
      fuelMode: strategy?.fuel_mode ?? 'standard',
      aggression: strategy?.aggression ?? 'balanced',
      pitStopsPlan,
      tirePlan,
      currentStint: 0,
      pitStopsDone: 0,
      status: 'racing',
      dnfReason: null,
      fastestLap: 9999.0,
      gapToLeader: 0,
      drsActive: false,
    });
  }

  if (entrants.length === 0) {
    return { success: false, message: 'No entrants available (no drivers signed to teams).' };
  }

  // ── Run Simulation ──
  const activeTrack = {
    name: upcomingRace.track_name,
    country: upcomingRace.track_country,
    lengthKm: Number(upcomingRace.track_length_km),
    totalLaps: upcomingRace.total_laps,
    baseLapTime: trackConfig?.baseLapTime || 85.0,
    pitLaneTime: trackConfig?.pitLaneTime || 22.0,
    tireWearMultiplier: trackConfig?.tireWearMultiplier || 1.0,
    overtakeDifficulty: trackConfig?.overtakeDifficulty || 0.4,
    drsZones: trackConfig?.drsZones || 2,
    sectors: 3,
  };

  const simulationResult = simulateRace({
    track: activeTrack,
    weather,
    temperature,
    entrants,
    seed: upcomingRace.id,
  });

  const finalEntrants = simulationResult.entrants;
  const fastestLap = simulationResult.fastestLap;

  const qualifyingGrid: Record<string, number> = {};
  simulationResult.frames[0]?.positions.forEach((pos) => {
    qualifyingGrid[pos.driver_id] = pos.position;
  });

  // ── DB Updates & Financials ──
  let fastestLapDriverId: string | null = null;
  if (fastestLap) {
    const top10Ids = finalEntrants
      .filter((e) => e.status === 'finished' && e.position <= 10)
      .map((e) => e.driverId);
    if (top10Ids.includes(fastestLap.driverId)) {
      fastestLapDriverId = fastestLap.driverId;
    }
  }

  const resultsToInsert = [];
  const financeLogs = [];

  const teamBudgets: Record<string, number> = {};
  teams?.forEach((t) => {
    teamBudgets[t.id] = Number(t.budget);
  });

  const teamPointsGained: Record<string, number> = {};
  const teamWinsGained: Record<string, number> = {};
  const teamPodiumsGained: Record<string, number> = {};
  const teamBestFinish: Record<string, number> = {};

  for (const ent of finalEntrants) {
    const isFinished = ent.status === 'finished';
    const finishPos = isFinished ? ent.position : null;

    let points = 0;
    if (isFinished && POINTS_SYSTEM[ent.position]) {
      points = POINTS_SYSTEM[ent.position];
    }
    if (ent.driverId === fastestLapDriverId) {
      points += 1;
    }

    let prizeMoney = 0;
    if (isFinished && PRIZE_MONEY[ent.position]) {
      prizeMoney = PRIZE_MONEY[ent.position];
    }

    resultsToInsert.push({
      race_id: upcomingRace.id,
      team_id: ent.teamId,
      driver_id: ent.driverId,
      grid_position: qualifyingGrid[ent.driverId] || ent.position,
      finish_position: finishPos,
      points,
      prize_money: prizeMoney,
      fastest_lap: ent.driverId === fastestLapDriverId,
      dnf_reason: ent.dnfReason,
      total_pit_stops: ent.pitStopsDone,
      total_time: isFinished ? ent.totalTime : null,
    });

    teamPointsGained[ent.teamId] = (teamPointsGained[ent.teamId] || 0) + points;
    if (isFinished && ent.position === 1) {
      teamWinsGained[ent.teamId] = (teamWinsGained[ent.teamId] || 0) + 1;
    }
    if (isFinished && ent.position <= 3) {
      teamPodiumsGained[ent.teamId] = (teamPodiumsGained[ent.teamId] || 0) + 1;
    }
    if (isFinished) {
      const currentBest = teamBestFinish[ent.teamId] || 999;
      teamBestFinish[ent.teamId] = Math.min(currentBest, ent.position);
    }

    const teamDetails = teams?.find((t) => t.id === ent.teamId);
    const isPlayerTeam = teamDetails && !teamDetails.is_ai;

    if (isPlayerTeam) {
      if (prizeMoney > 0) {
        teamBudgets[ent.teamId] += prizeMoney;
        financeLogs.push({
          team_id: ent.teamId,
          type: 'prize_money' as const,
          amount: prizeMoney,
          description: `Prize money for P${ent.position} in the ${upcomingRace.track_name} Grand Prix.`,
        });
      }

      const driverDetails = teamDrivers?.find((td) => td.driver_id === ent.driverId)?.drivers;
      if (driverDetails && driverDetails.salary) {
        const raceSalary = Math.round(driverDetails.salary / 20);
        teamBudgets[ent.teamId] -= raceSalary;
        financeLogs.push({
          team_id: ent.teamId,
          type: 'driver_salary' as const,
          amount: -raceSalary,
          description: `Salary payout for driver ${ent.driverName} for the ${upcomingRace.track_name} race.`,
        });
      }
    }
  }

  // Cleanup existing results/logs for idempotency
  await supabase.from('race_results').delete().eq('race_id', upcomingRace.id);
  await supabase.from('race_logs').delete().eq('race_id', upcomingRace.id);

  // Insert results
  const { error: resInsertError } = await supabase.from('race_results').insert(resultsToInsert);
  if (resInsertError) throw resInsertError;

  // Insert finances
  if (financeLogs.length > 0) {
    const { error: finError } = await supabase.from('finances').insert(financeLogs);
    if (finError) throw finError;
  }

  // Update budgets
  for (const [teamId, finalBudget] of Object.entries(teamBudgets)) {
    const originalTeam = teams?.find((t) => t.id === teamId);
    if (originalTeam && !originalTeam.is_ai && originalTeam.budget !== finalBudget) {
      await supabase.from('teams').update({ budget: finalBudget }).eq('id', teamId);
    }
  }

  // ── Update Standings ──
  for (const teamId of Object.keys(teamPointsGained)) {
    const points = teamPointsGained[teamId];
    const wins = teamWinsGained[teamId] || 0;
    const podiums = teamPodiumsGained[teamId] || 0;
    const best = teamBestFinish[teamId] || null;

    const { data: standing } = await supabase
      .from('season_standings')
      .select('*')
      .eq('season_id', upcomingRace.season_id)
      .eq('team_id', teamId)
      .maybeSingle();

    if (standing) {
      await supabase
        .from('season_standings')
        .update({
          total_points: standing.total_points + points,
          total_wins: standing.total_wins + wins,
          total_podiums: standing.total_podiums + podiums,
          best_finish: standing.best_finish ? Math.min(standing.best_finish, best || 99) : best,
          updated_at: new Date().toISOString(),
        })
        .eq('id', standing.id);
    } else {
      await supabase.from('season_standings').insert({
        season_id: upcomingRace.season_id,
        team_id: teamId,
        total_points: points,
        total_wins: wins,
        total_podiums: podiums,
        best_finish: best,
      });
    }
  }

  // ── Save Simulation Log ──
  const simData = {
    meta: {
      track: upcomingRace.track_name,
      laps: totalLaps,
      weather,
      temperature,
    },
    frames: simulationResult.frames,
  };

  await supabase.from('race_logs').insert({
    race_id: upcomingRace.id,
    simulation_data: simData,
    total_frames: simulationResult.frames.length,
    fastest_lap_time: fastestLap?.time || null,
    fastest_lap_team_id: fastestLap?.teamId || null,
  });

  // ── Post-Race Wear ──
  const wearPerCategory: Record<string, number> = {
    engine: 4.5, aero: 2.5, chassis: 2.0, gearbox: 3.5,
    suspension: 3.0, brakes: 5.0, cooling: 3.0,
  };

  for (const part of carParts || []) {
    const team = teams?.find((t) => t.id === part.team_id);
    if (!team || team.is_ai) continue;

    const baseWearIncrease = wearPerCategory[part.category] || 3.0;
    const teamEntrants = finalEntrants.filter((e) => e.teamId === part.team_id);
    const avgAggression = teamEntrants.reduce((sum, e) => {
      return sum + (e.aggression === 'aggressive' ? 1.4 : e.aggression === 'conservative' ? 0.7 : 1.0);
    }, 0) / Math.max(1, teamEntrants.length);

    const newWear = Math.min(100, Number(part.wear || 0) + baseWearIncrease * avgAggression);
    await supabase
      .from('car_parts')
      .update({ wear: Math.round(newWear * 100) / 100 })
      .eq('id', part.id);
  }

  // ── AI Team Progression ──
  const playerMaxLevels: Record<string, number> = {};
  for (const part of carParts || []) {
    const team = teams?.find((t) => t.id === part.team_id);
    if (team && !team.is_ai) {
      playerMaxLevels[part.category] = Math.max(playerMaxLevels[part.category] || 1, part.level);
    }
  }

  for (const part of carParts || []) {
    const team = teams?.find((t) => t.id === part.team_id);
    if (team && team.is_ai) {
      const pMax = playerMaxLevels[part.category] || 1;
      let shouldUpgrade = false;

      if (part.level < pMax - 2) {
        shouldUpgrade = Math.random() < 0.6;
      } else if (part.level < pMax - 1) {
        shouldUpgrade = Math.random() < 0.3;
      } else if (part.level === pMax - 1) {
        shouldUpgrade = Math.random() < 0.1;
      }

      if (shouldUpgrade && part.level < 20) {
        const perfBoost = 3 + Math.floor(Math.random() * 4);
        const relBoost = 2 + Math.floor(Math.random() * 4);
        await supabase
          .from('car_parts')
          .update({
            level: part.level + 1,
            performance: Math.min(100, Number(part.performance) + perfBoost),
            reliability: Math.min(100, Number(part.reliability) + relBoost),
          })
          .eq('id', part.id);
      }
    }
  }

  // ── Mark Race Completed ──
  await supabase
    .from('races')
    .update({
      status: 'completed',
      weather_condition: weather,
      temperature: temperature,
    })
    .eq('id', upcomingRace.id);

  return {
    success: true,
    message: `Race simulated: Round ${upcomingRace.round_number} at ${upcomingRace.track_name}.`,
    raceId: upcomingRace.id,
    weather,
    temperature,
    fastestLap: fastestLap
      ? `${fastestLap.driverName} (${fastestLap.time.toFixed(3)}s)`
      : undefined,
  };
}
