// ============================================================
// Race Engine Types — simulation and physics calculations
// ============================================================

import type { TireCompound, CarPart, Driver } from './database';

/** Weather conditions during a race */
export type WeatherCondition = 'dry' | 'light_rain' | 'heavy_rain';

/** Weather multiplier for lap times */
export const WEATHER_FACTORS: Record<WeatherCondition, number> = {
  dry: 1.0,
  light_rain: 1.08,
  heavy_rain: 1.18,
};

/** Tire performance characteristics */
export interface TireCharacteristics {
  compound: TireCompound;
  gripMultiplier: number;      // Base grip (1.0 = medium baseline)
  degradationRate: number;     // Wear per lap (percentage)
  optimalTemp: number;         // Optimal temperature (°C)
  wetPerformance: number;      // How well it works in rain (0-1)
}

export const TIRE_DATA: Record<TireCompound, TireCharacteristics> = {
  soft: {
    compound: 'soft',
    gripMultiplier: 1.06,
    degradationRate: 2.5,
    optimalTemp: 30,
    wetPerformance: 0.3,
  },
  medium: {
    compound: 'medium',
    gripMultiplier: 1.0,
    degradationRate: 1.5,
    optimalTemp: 28,
    wetPerformance: 0.4,
  },
  hard: {
    compound: 'hard',
    gripMultiplier: 0.95,
    degradationRate: 0.8,
    optimalTemp: 26,
    wetPerformance: 0.5,
  },
  intermediate: {
    compound: 'intermediate',
    gripMultiplier: 0.92,
    degradationRate: 1.2,
    optimalTemp: 22,
    wetPerformance: 0.85,
  },
  wet: {
    compound: 'wet',
    gripMultiplier: 0.88,
    degradationRate: 1.0,
    optimalTemp: 20,
    wetPerformance: 1.0,
  },
};

/** Part category weights for car performance calculation */
export const PART_WEIGHTS: Record<string, number> = {
  engine: 0.30,
  aero: 0.25,
  chassis: 0.15,
  gearbox: 0.10,
  suspension: 0.08,
  brakes: 0.07,
  cooling: 0.05,
};

/** Driver skill weights for overall rating */
export const DRIVER_SKILL_WEIGHTS = {
  pace: 0.35,
  racecraft: 0.25,
  awareness: 0.15,
  experience: 0.10,
  consistency: 0.15,
};

/** A single entrant in the race simulation */
export interface RaceEntrant {
  teamId: string;
  teamName: string;
  teamColor: string;
  driverId: string;
  driverName: string;
  driver: Pick<Driver, 'pace' | 'racecraft' | 'awareness' | 'experience' | 'consistency' | 'morale'>;
  carPerformance: number;    // Computed from parts (0-100)
  carReliability: number;    // Average reliability (0-100)

  // Race state (mutated during simulation)
  position: number;
  totalTime: number;
  currentTire: TireCompound;
  tireAge: number;           // Laps on current tire
  tireWear: number;          // 0-100
  fuelRemaining: number;     // kg
  fuelMode: 'save' | 'standard' | 'attack';
  aggression: 'conservative' | 'balanced' | 'aggressive';
  pitStopsPlan: number[];    // Planned pit stop laps
  tirePlan: { compound: TireCompound; laps: number }[];
  currentStint: number;
  pitStopsDone: number;
  status: 'racing' | 'pit_stop' | 'dnf' | 'finished';
  dnfReason: string | null;
  fastestLap: number;
  gapToLeader: number;
  drsActive: boolean;
}

/** Track data for simulation */
export interface TrackConfig {
  name: string;
  country: string;
  lengthKm: number;
  totalLaps: number;
  baseLapTime: number;       // Seconds — ideal lap time
  pitLaneTime: number;       // Extra time for a pit stop (seconds)
  tireWearMultiplier: number; // Track-specific tire wear factor
  overtakeDifficulty: number; // 0-1 (0 = easy to overtake, 1 = very hard)
  drsZones: number;          // Number of DRS zones
  sectors: number;           // Number of sectors (usually 3)
}

/** Race simulation config */
export interface SimulationConfig {
  track: TrackConfig;
  weather: WeatherCondition;
  temperature: number;
  entrants: RaceEntrant[];
  seed: string;              // Deterministic randomness seed (race_id)
}

/** F1 points system */
export const POINTS_SYSTEM: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

/** Prize money by position (in game currency) */
export const PRIZE_MONEY: Record<number, number> = {
  1: 2000000,
  2: 1500000,
  3: 1200000,
  4: 1000000,
  5: 800000,
  6: 600000,
  7: 500000,
  8: 400000,
  9: 300000,
  10: 200000,
};
