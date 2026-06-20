/**
 * General-purpose helper utilities for the F1 Manager Game
 */

/**
 * Format currency with abbreviations (10M, 1.5K, etc.)
 */
export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

/**
 * Format time in mm:ss.ms format (like F1 lap times)
 */
export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Format gap to leader ("+1.234s" or "LEADER")
 */
export function formatGap(gap: number): string {
  if (gap === 0) return 'LEADER';
  return `+${gap.toFixed(3)}s`;
}

/**
 * Format remaining time as human-readable string
 */
export function formatTimeRemaining(targetDate: string): string {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return 'NOW';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Simple seeded random number generator (mulberry32)
 * Produces deterministic results given the same seed.
 */
export function createSeededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }

  return function () {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Country flag emoji from country name (basic mapping)
 */
const COUNTRY_FLAGS: Record<string, string> = {
  'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺',
  'Japan': '🇯🇵', 'China': '🇨🇳', 'USA': '🇺🇸',
  'Italy': '🇮🇹', 'Monaco': '🇲🇨', 'Canada': '🇨🇦',
  'Spain': '🇪🇸', 'Austria': '🇦🇹', 'Great Britain': '🇬🇧',
  'Hungary': '🇭🇺', 'Belgium': '🇧🇪', 'Netherlands': '🇳🇱',
  'Singapore': '🇸🇬', 'Brazil': '🇧🇷', 'Abu Dhabi': '🇦🇪',
  'Mexican': '🇲🇽', 'German': '🇩🇪', 'Finnish': '🇫🇮',
  'French': '🇫🇷', 'Danish': '🇩🇰', 'Thai-British': '🇹🇭',
  'American': '🇺🇸', 'Irish': '🇮🇪', 'Dutch': '🇳🇱',
  'Brazilian': '🇧🇷', 'British': '🇬🇧', 'Spanish': '🇪🇸',
  'Italian': '🇮🇹', 'Monégasque': '🇲🇨',
};

export function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] ?? '🏁';
}
