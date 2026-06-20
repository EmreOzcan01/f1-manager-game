// ============================================================
// Game Constants — configuration and static data
// ============================================================

/** F1 Points system (top 10) */
export const POINTS_TABLE: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
};

/** Fastest lap bonus point */
export const FASTEST_LAP_BONUS = 1;

/** Prize money by finishing position */
export const PRIZE_MONEY_TABLE: Record<number, number> = {
  1: 2_000_000, 2: 1_500_000, 3: 1_200_000,
  4: 1_000_000, 5: 800_000, 6: 600_000,
  7: 500_000, 8: 400_000, 9: 300_000, 10: 200_000,
};

/** Default starting budget for new teams */
export const STARTING_BUDGET = 10_000_000;

/** Maximum drivers per team */
export const MAX_DRIVERS_PER_TEAM = 2;

/** Number of AI teams to fill the grid */
export const AI_TEAM_COUNT = 9;

/** Total teams per race (1 player + 9 AI = 10 teams × 2 drivers = 20 grid) */
export const TOTAL_TEAMS = 10;
export const TOTAL_GRID_SLOTS = TOTAL_TEAMS * MAX_DRIVERS_PER_TEAM;

/** Part categories */
export const PART_CATEGORIES = [
  'engine', 'aero', 'chassis', 'gearbox',
  'suspension', 'brakes', 'cooling',
] as const;

/** Upgrade time in hours per level */
export const UPGRADE_BASE_HOURS = 4;
export const UPGRADE_HOURS_PER_LEVEL = 2;

/** Upgrade cost multiplier per level */
export const UPGRADE_BASE_COST = 200_000;
export const UPGRADE_COST_MULTIPLIER = 1.5;

/** Pit stop base time (seconds) */
export const PIT_STOP_BASE_TIME = 22;

/** Fuel consumption per lap (kg) — varies by track */
export const FUEL_CONSUMPTION_BASE = 1.8;

/** DRS speed advantage (seconds per lap) */
export const DRS_ADVANTAGE = 0.3;

/** DNF probability per lap (base, modified by reliability) */
export const DNF_BASE_PROBABILITY = 0.001;

/** Season configuration */
export const ROUNDS_PER_SEASON = 20;

/** Navigation tabs */
export const NAV_TABS = [
  { id: 'dashboard', label: 'Home', icon: '🏠', href: '/dashboard' },
  { id: 'garage', label: 'Garage', icon: '🔧', href: '/garage' },
  { id: 'drivers', label: 'Drivers', icon: '🏎️', href: '/drivers' },
  { id: 'strategy', label: 'Strategy', icon: '📋', href: '/strategy' },
  { id: 'race', label: 'Race', icon: '🏁', href: '/race' },
  { id: 'standings', label: 'Standings', icon: '🏆', href: '/standings' },
] as const;
