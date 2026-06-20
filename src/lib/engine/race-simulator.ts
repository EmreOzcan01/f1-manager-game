import type {
  SimulationConfig,
  RaceEntrant,
  TrackConfig,
  WeatherCondition,
} from '@/types/engine';
import {
  WEATHER_FACTORS,
  TIRE_DATA,
  PART_WEIGHTS,
  DRIVER_SKILL_WEIGHTS,
} from '@/types/engine';
import type { RaceFrame, FramePosition, TireCompound } from '@/types/database';

// ─── Deterministic Seeded PRNG (Mulberry32) ──────────────────────────
export function createRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Entrant Skill and Car Specs Calculators ─────────────────────────
export function calculateDriverOverall(entrantDriver: any): number {
  return Math.round(
    entrantDriver.pace * DRIVER_SKILL_WEIGHTS.pace +
      entrantDriver.racecraft * DRIVER_SKILL_WEIGHTS.racecraft +
      entrantDriver.awareness * DRIVER_SKILL_WEIGHTS.awareness +
      entrantDriver.experience * DRIVER_SKILL_WEIGHTS.experience +
      entrantDriver.consistency * DRIVER_SKILL_WEIGHTS.consistency
  );
}

export function calculateCarSpecs(parts: any[]): { performance: number; reliability: number } {
  if (!parts || parts.length === 0) {
    return { performance: 15, reliability: 80 };
  }

  let totalPerformance = 0;
  let totalReliability = 0;
  let weightSum = 0;

  for (const part of parts) {
    const weight = PART_WEIGHTS[part.category] || 0.1;
    // Wear penalty: wear reduce effectiveness
    const wearPenalty = (part.wear || 0) * 0.3;
    const effectivePerf = Math.max(0, (part.performance || 10) - wearPenalty);

    totalPerformance += effectivePerf * weight;
    totalReliability += (part.reliability || 80) * weight;
    weightSum += weight;
  }

  // Fallback if weights do not equal 1
  const finalPerf = weightSum > 0 ? totalPerformance / weightSum : 15;
  const finalRel = weightSum > 0 ? totalReliability / weightSum : 80;

  return {
    performance: Math.round(finalPerf),
    reliability: Math.round(finalRel),
  };
}

// ─── Qualifying Simulation ──────────────────────────────────────────
export function simulateQualifying(
  entrants: RaceEntrant[],
  track: TrackConfig,
  weather: WeatherCondition,
  random: () => number
): { entrant: RaceEntrant; lapTime: number }[] {
  const results = entrants.map((entrant) => {
    const driverOverall = calculateDriverOverall(entrant.driver);
    const carFactor = 1 - (entrant.carPerformance / 100) * 0.15;
    const driverFactor = 1 - (driverOverall / 100) * 0.08;
    const weatherFactor = WEATHER_FACTORS[weather] || 1.0;
    // Variance: -0.4s to +0.4s
    const randomOffset = (random() - 0.5) * 0.8;

    const lapTime = track.baseLapTime * carFactor * driverFactor * weatherFactor + randomOffset;
    return {
      entrant,
      lapTime,
    };
  });

  // Sort ascending by time (faster lap first)
  results.sort((a, b) => a.lapTime - b.lapTime);
  return results;
}

// ─── Race Simulation ─────────────────────────────────────────────────
export interface SimulationResult {
  entrants: RaceEntrant[];
  frames: RaceFrame[];
  fastestLap: {
    driverId: string;
    driverName: string;
    teamId: string;
    time: number;
  } | null;
}

export function simulateRace(config: SimulationConfig): SimulationResult {
  const { track, weather, temperature, entrants, seed } = config;
  const random = createRandom(seed);

  // Initialize entrants
  const activeEntrants = entrants.map((ent) => ({
    ...ent,
    position: 0,
    totalTime: 0,
    tireAge: 0,
    tireWear: 0,
    currentStint: 0,
    pitStopsDone: 0,
    status: 'racing' as 'racing' | 'pit_stop' | 'dnf' | 'finished',
    dnfReason: null as string | null,
    fastestLap: 9999.9,
    gapToLeader: 0,
    drsActive: false,
  }));

  // Perform qualifying to set grid positions
  const qualyResults = simulateQualifying(activeEntrants, track, weather, random);
  qualyResults.forEach((q, idx) => {
    q.entrant.position = idx + 1;
    // Small stagger start time (e.g. 0.15s per grid slot)
    q.entrant.totalTime = idx * 0.15;
  });

  const frames: RaceFrame[] = [];
  let raceFastestLap: SimulationResult['fastestLap'] = null;

  // Tracking position shifts to trigger overtake events
  let prevPositions: Record<string, number> = {};
  qualyResults.forEach((q, idx) => {
    prevPositions[q.entrant.driverId] = idx + 1;
  });

  const totalLaps = track.totalLaps;
  const baseFuelPerLap = (100 / totalLaps) * (track.lengthKm / 5.0); // Fuel usage based on track length

  // Lap by lap loop
  for (let lap = 1; lap <= totalLaps; lap++) {
    const lapEvents: string[] = [];

    // 1. Calculate lap times and specs update
    activeEntrants.forEach((entrant) => {
      if (entrant.status !== 'racing') return;

      const driverOverall = calculateDriverOverall(entrant.driver);

      // Tyres
      const tireData = TIRE_DATA[entrant.currentTire];
      const tireGrip = tireData.gripMultiplier;

      // Weather match check
      let weatherPenalty = 0;
      if (weather === 'heavy_rain') {
        if (entrant.currentTire !== 'wet') {
          weatherPenalty = 10.0 + random() * 4.0; // Extreme penalty for slicks/inters
        }
      } else if (weather === 'light_rain') {
        if (entrant.currentTire !== 'intermediate' && entrant.currentTire !== 'wet') {
          weatherPenalty = 5.0 + random() * 2.5; // Slick penalty in rain
        } else if (entrant.currentTire === 'wet') {
          weatherPenalty = 1.5; // Wet tyre is slightly slower in light rain
        }
      } else {
        // Dry weather
        if (entrant.currentTire === 'wet') {
          weatherPenalty = 7.0 + random() * 3.0; // Wet tyre overheats in dry
        } else if (entrant.currentTire === 'intermediate') {
          weatherPenalty = 3.5 + random() * 2.0; // Inters overheat in dry
        }
      }

      // Tire wear penalty
      const tireWearPenalty = 1 + (entrant.tireWear / 100) * 0.15;

      // Fuel weight penalty (weight of fuel slows down car: up to 2.5s when full)
      const fuelPenalty = (entrant.fuelRemaining / 110) * 2.5;

      // Aggression mods
      let aggressionSpeedMod = 1.0; // Base multiplier
      let wearMultiplier = 1.0;
      let dnfMultiplier = 1.0;

      if (entrant.aggression === 'aggressive') {
        aggressionSpeedMod = 0.982; // Faster
        wearMultiplier = 1.5;
        dnfMultiplier = 1.6;
      } else if (entrant.aggression === 'conservative') {
        aggressionSpeedMod = 1.018; // Slower
        wearMultiplier = 0.6;
        dnfMultiplier = 0.5;
      }

      // Fuel modes
      let fuelSpeedMod = 1.0;
      let fuelBurnMultiplier = 1.0;

      if (entrant.fuelMode === 'attack') {
        fuelSpeedMod = 0.978;
        fuelBurnMultiplier = 1.45;
        dnfMultiplier *= 1.3;
      } else if (entrant.fuelMode === 'save') {
        fuelSpeedMod = 1.025;
        fuelBurnMultiplier = 0.72;
        dnfMultiplier *= 0.8;
      }

      // Base lap calculation
      const carFactor = 1 - (entrant.carPerformance / 100) * 0.16;
      const driverFactor = 1 - (driverOverall / 100) * 0.08;
      const weatherFactor = WEATHER_FACTORS[weather] || 1.0;

      let lapTime = track.baseLapTime * carFactor * driverFactor * weatherFactor;
      lapTime = lapTime * tireGrip * tireWearPenalty * aggressionSpeedMod * fuelSpeedMod;
      lapTime += fuelPenalty + weatherPenalty;

      // DRS active (reduces drag, speeds up)
      if (entrant.drsActive) {
        lapTime -= 0.45;
      }

      // Traffic/Dirty Air Penalty (slight loss of downforce behind other cars)
      const isCloseBehind = activeEntrants.some(
        (other) =>
          other.driverId !== entrant.driverId &&
          other.status === 'racing' &&
          other.totalTime < entrant.totalTime &&
          entrant.totalTime - other.totalTime < 1.0
      );
      if (isCloseBehind && !entrant.drsActive) {
        lapTime += 0.15;
      }

      // Micro variability
      const variance = (random() - 0.5) * 0.25;
      lapTime += variance;

      // ──────────────────────────────────────
      // Mechanical DNF Risk check
      // ──────────────────────────────────────
      const baseFailRate = (100 - entrant.carReliability) * 0.0002;
      const partWearDnf = (1 - entrant.carReliability / 100) * (lap / totalLaps) * 0.002; // increases as race goes on
      const failChance = (baseFailRate + partWearDnf) * dnfMultiplier;

      if (random() < failChance) {
        entrant.status = 'dnf';
        const failReasons = ['Engine Failure', 'Gearbox Issue', 'Suspension Leak', 'Cooling System Overheat', 'Brake Failure'];
        const rIndex = Math.floor(random() * failReasons.length);
        entrant.dnfReason = failReasons[rIndex];
        lapEvents.push(`${entrant.driverName} has retired with a ${entrant.dnfReason}!`);
        return;
      }

      // ──────────────────────────────────────
      // Driver Collision/Spin DNF check
      // ──────────────────────────────────────
      const avgSafety = (entrant.driver.awareness + entrant.driver.consistency) / 2;
      const baseCrashChance = (100 - avgSafety) * 0.0001;
      const rainCrashChance = weather !== 'dry' ? baseCrashChance * 2.5 : 0;
      const crashChance = (baseCrashChance + rainCrashChance) * (entrant.aggression === 'aggressive' ? 2.0 : 0.4);

      if (random() < crashChance) {
        entrant.status = 'dnf';
        entrant.dnfReason = random() < 0.4 ? 'Collision' : 'Accident';
        lapEvents.push(`${entrant.driverName} crashed out on lap ${lap}!`);
        return;
      }

      // Apply lap time
      entrant.totalTime += lapTime;
      entrant.tireAge += 1;

      if (lapTime < entrant.fastestLap) {
        entrant.fastestLap = lapTime;
      }

      if (!raceFastestLap || lapTime < raceFastestLap.time) {
        raceFastestLap = {
          driverId: entrant.driverId,
          driverName: entrant.driverName,
          teamId: entrant.teamId,
          time: lapTime,
        };
      }

      // Fuel usage
      const fuelUsed = baseFuelPerLap * fuelBurnMultiplier;
      entrant.fuelRemaining = Math.max(0, entrant.fuelRemaining - fuelUsed);

      if (entrant.fuelRemaining <= 0) {
        entrant.status = 'dnf';
        entrant.dnfReason = 'Out of Fuel';
        lapEvents.push(`${entrant.driverName} ran out of fuel and retired!`);
        return;
      }

      // Tire wear
      const baseTireDeg = tireData.degradationRate * track.tireWearMultiplier;
      // High temp accelerated wear
      const tempWear = temperature > 30 && entrant.currentTire === 'soft' ? 1.2 : 1.0;
      entrant.tireWear = Math.min(
        100,
        entrant.tireWear + baseTireDeg * wearMultiplier * tempWear
      );

      // Puncture Check if tire wear is extreme
      if (entrant.tireWear >= 98 && random() < 0.2) {
        entrant.status = 'dnf';
        entrant.dnfReason = 'Puncture';
        lapEvents.push(`${entrant.driverName} suffered a high-speed puncture and retired!`);
      }
    });

    // 2. Resolve Pit Stops
    activeEntrants.forEach((entrant) => {
      if (entrant.status !== 'racing') return;

      // Force pit if tires are dead (puncture risk) or if planned in pitStopsPlan
      const isPlannedPit = entrant.pitStopsPlan.includes(lap);
      const isEmergencyPit = entrant.tireWear > 85.0;

      if (isPlannedPit || isEmergencyPit) {
        // Run pitstop
        entrant.pitStopsDone += 1;
        entrant.tireWear = 0;
        entrant.tireAge = 0;

        // Shift tire compound
        entrant.currentStint = Math.min(entrant.tirePlan.length - 1, entrant.currentStint + 1);
        const nextCompound = entrant.tirePlan[entrant.currentStint]?.compound || 'medium';
        entrant.currentTire = nextCompound;

        // Add pit lane penalty
        entrant.totalTime += track.pitLaneTime;

        // Visual flag
        (entrant as any).inPitThisLap = true;

        const reasonText = isEmergencyPit ? 'emergency stop (worn tyres)' : 'planned stop';
        lapEvents.push(
          `${entrant.driverName} pitted for a new set of ${nextCompound} tires (${reasonText}).`
        );
      } else {
        (entrant as any).inPitThisLap = false;
      }
    });

    // 3. Sorting & Positions Calculations
    const racingEntrants = activeEntrants.filter((e) => e.status === 'racing');
    racingEntrants.sort((a, b) => a.totalTime - b.totalTime);

    // Apply positions
    racingEntrants.forEach((entrant, idx) => {
      const currentPos = idx + 1;
      entrant.position = currentPos;

      // Check Overtake events
      const prevPos = prevPositions[entrant.driverId];
      if (prevPos && currentPos < prevPos) {
        // Entrant moved up
        const positionsGained = prevPos - currentPos;
        if (positionsGained === 1) {
          // Find whom it passed
          const passedEntrant = racingEntrants.find(
            (e) => prevPositions[e.driverId] === currentPos
          );
          if (passedEntrant) {
            lapEvents.push(
              `⚡ ${entrant.driverName} has overtaken ${passedEntrant.driverName} for P${currentPos}!`
            );
          }
        }
      }
    });

    // Handle DNFs position (order by lap completed)
    const finishedOrDnf = activeEntrants.filter((e) => e.status !== 'racing');
    // Keep active entrants positions mapped, other positions are appended
    let classificationIdx = racingEntrants.length + 1;
    finishedOrDnf.forEach((e) => {
      if (e.status === 'dnf') {
        // DNF position is back of grid
        e.position = classificationIdx++;
      }
    });

    // Update historical positions map
    activeEntrants.forEach((e) => {
      prevPositions[e.driverId] = e.position;
    });

    // DRS zones activation check for next lap
    const leader = racingEntrants[0];
    if (leader) {
      leader.gapToLeader = 0;
      leader.drsActive = false;
    }

    for (let i = 1; i < racingEntrants.length; i++) {
      const entrant = racingEntrants[i];
      entrant.gapToLeader = entrant.totalTime - leader.totalTime;

      // DRS threshold: < 1.0s gap to the car directly in front
      const carAhead = racingEntrants[i - 1];
      const gapAhead = entrant.totalTime - carAhead.totalTime;
      entrant.drsActive = gapAhead <= 1.0 && track.drsZones > 0;
    }

    // 4. Capture Frame Snapshot
    const framePositions: FramePosition[] = activeEntrants.map((ent) => ({
      team_id: ent.teamId,
      driver_id: ent.driverId,
      driver_name: ent.driverName,
      team_name: ent.teamName,
      team_color: ent.teamColor,
      position: ent.position,
      lap_time: ent.fastestLap === 9999.9 ? 0 : ent.fastestLap, // Keep fastest lap for display
      gap_to_leader: ent.gapToLeader,
      tire: ent.currentTire as TireCompound,
      tire_wear: Math.round(ent.tireWear),
      fuel_remaining: Math.round(ent.fuelRemaining * 10) / 10,
      drs_active: ent.drsActive,
      in_pit: (ent as any).inPitThisLap || false,
      status: ent.status,
    }));

    // Sort positions by position index for UI consumption
    framePositions.sort((a, b) => a.position - b.position);

    frames.push({
      lap,
      events: lapEvents,
      positions: framePositions,
    });
  }

  // 5. Wrap up race finish
  activeEntrants.forEach((e) => {
    if (e.status === 'racing') {
      e.status = 'finished';
    }
  });

  return {
    entrants: activeEntrants,
    frames,
    fastestLap: raceFastestLap,
  };
}
