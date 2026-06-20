// ============================================================
// Supabase Database Types — manually defined to match our schema
// ============================================================

export type PartCategory =
  | 'engine'
  | 'aero'
  | 'chassis'
  | 'gearbox'
  | 'suspension'
  | 'brakes'
  | 'cooling';

export type UpgradeStatus = 'idle' | 'researching' | 'completed';

export type RaceStatus = 'upcoming' | 'qualifying' | 'race_day' | 'completed';

export type TireCompound = 'soft' | 'medium' | 'hard' | 'intermediate' | 'wet';

export type TransactionType =
  | 'prize_money'
  | 'sponsor'
  | 'driver_salary'
  | 'part_upgrade'
  | 'driver_transfer'
  | 'hq_upgrade'
  | 'penalty';

// -----------------------------------------------------------
// Row types (what you SELECT from Supabase)
// -----------------------------------------------------------

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  budget: number;
  reputation: number;
  hq_level: number;
  is_ai: boolean;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  nationality: string;
  age: number;
  pace: number;
  racecraft: number;
  awareness: number;
  experience: number;
  consistency: number;
  salary: number;
  contract_price: number;
  is_free_agent: boolean;
  morale: number;
  created_at: string;
}

export interface TeamDriver {
  id: string;
  team_id: string;
  driver_id: string;
  seat_number: 1 | 2;
  contract_end_season: number;
  signed_at: string;
}

export interface CarPart {
  id: string;
  team_id: string;
  category: PartCategory;
  level: number;
  performance: number;
  reliability: number;
  wear: number;
  upgrade_status: UpgradeStatus;
  upgrade_started_at: string | null;
  upgrade_duration_hours: number | null;
  upgrade_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  number: number;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
}

export interface Race {
  id: string;
  season_id: string;
  round_number: number;
  track_name: string;
  track_country: string;
  track_length_km: number;
  total_laps: number;
  scheduled_at: string;
  status: RaceStatus;
  weather_condition: string | null;
  temperature: number | null;
  created_at: string;
}

export interface RaceStrategy {
  id: string;
  team_id: string;
  race_id: string;
  tire_plan: TireStint[];
  planned_pit_stops: number[];
  fuel_load: number;
  fuel_mode: 'save' | 'standard' | 'attack';
  aggression: 'conservative' | 'balanced' | 'aggressive';
  submitted_at: string;
}

export interface TireStint {
  stint: number;
  compound: TireCompound;
  laps: number;
}

export interface RaceLog {
  id: string;
  race_id: string;
  simulation_data: SimulationData;
  total_frames: number;
  fastest_lap_time: number | null;
  fastest_lap_team_id: string | null;
  computed_at: string;
}

export interface RaceResult {
  id: string;
  race_id: string;
  team_id: string;
  driver_id: string;
  grid_position: number;
  finish_position: number | null;
  points: number;
  prize_money: number;
  fastest_lap: boolean;
  dnf_reason: string | null;
  total_pit_stops: number;
  total_time: number | null;
  created_at: string;
}

export interface SeasonStanding {
  id: string;
  season_id: string;
  team_id: string;
  total_points: number;
  total_wins: number;
  total_podiums: number;
  best_finish: number | null;
  updated_at: string;
}

export interface Finance {
  id: string;
  team_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  created_at: string;
}

// -----------------------------------------------------------
// Simulation Data (stored as JSONB in race_logs)
// -----------------------------------------------------------

export interface SimulationData {
  meta: {
    track: string;
    laps: number;
    weather: string;
    temperature: number;
  };
  frames: RaceFrame[];
}

export interface RaceFrame {
  lap: number;
  events: string[];
  positions: FramePosition[];
}

export interface FramePosition {
  team_id: string;
  driver_id: string;
  driver_name: string;
  team_name: string;
  team_color: string;
  position: number;
  lap_time: number;
  gap_to_leader: number;
  tire: TireCompound;
  tire_wear: number;
  fuel_remaining: number;
  drs_active: boolean;
  in_pit: boolean;
  status: 'racing' | 'pit_stop' | 'dnf' | 'finished';
}

// -----------------------------------------------------------
// Insert types (what you INSERT into Supabase, omitting defaults)
// -----------------------------------------------------------

export interface TeamInsert {
  owner_id: string;
  name: string;
  logo_url?: string;
  budget?: number;
  is_ai?: boolean;
  primary_color?: string;
  secondary_color?: string;
}

export interface RaceStrategyInsert {
  team_id: string;
  race_id: string;
  tire_plan: TireStint[];
  planned_pit_stops: number[];
  fuel_load?: number;
  fuel_mode?: 'save' | 'standard' | 'attack';
  aggression?: 'conservative' | 'balanced' | 'aggressive';
}
