// ============================================================
// Game Domain Types — UI and business logic types
// ============================================================

import type { Team, Driver, CarPart, Race, RaceStrategy, TireCompound } from './database';

/** Combined team data for the dashboard */
export interface TeamDashboard {
  team: Team;
  drivers: DriverWithContract[];
  parts: CarPart[];
  nextRace: Race | null;
  standing: {
    position: number;
    points: number;
    wins: number;
  };
}

/** Driver with contract info attached */
export interface DriverWithContract extends Driver {
  seat_number: 1 | 2;
  contract_end_season: number;
}

/** Strategy builder UI state */
export interface StrategyDraft {
  raceId: string;
  stints: StintDraft[];
  fuelLoad: number;
  fuelMode: 'save' | 'standard' | 'attack';
  aggression: 'conservative' | 'balanced' | 'aggressive';
}

export interface StintDraft {
  id: string;
  compound: TireCompound;
  laps: number;
}

/** Garage part with upgrade progress */
export interface PartWithProgress extends CarPart {
  upgradeProgress: number; // 0-100 percentage
  upgradeTimeRemaining: string | null; // "2h 15m"
}

/** Leaderboard entry */
export interface LeaderboardEntry {
  position: number;
  team: Pick<Team, 'id' | 'name' | 'primary_color' | 'is_ai'>;
  points: number;
  wins: number;
  podiums: number;
  bestFinish: number | null;
}

/** Bottom navigation tab IDs */
export type TabId = 'dashboard' | 'garage' | 'drivers' | 'strategy' | 'race' | 'standings' | 'market';

/** Notification for in-game events */
export interface GameNotification {
  id: string;
  type: 'race_result' | 'upgrade_complete' | 'contract_expiry' | 'transfer' | 'season_end';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/** Game time state */
export interface GameTime {
  currentSeason: number;
  currentRound: number;
  nextRaceAt: string | null;
  isRaceDay: boolean;
}
