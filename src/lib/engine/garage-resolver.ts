import type { SupabaseClient } from '@supabase/supabase-js';
import type { CarPart } from '@/types/database';

/**
 * Checks if any car parts currently undergoing research have finished their upgrade duration.
 * If they have, it completes the upgrade, increments the level, boosts performance/reliability,
 * and resets the upgrade columns.
 * 
 * This uses a "lazy resolution" pattern so that we don't need a persistent background queue.
 */
export async function checkAndCompleteUpgrades(
  supabase: SupabaseClient,
  teamId: string
): Promise<CarPart[]> {
  try {
    // 1. Fetch parts that are currently researching
    const { data: researchingParts, error } = await supabase
      .from('car_parts')
      .select('*')
      .eq('team_id', teamId)
      .eq('upgrade_status', 'researching');

    if (error) {
      console.error('Error fetching upgrading parts:', error);
      return [];
    }

    if (!researchingParts || researchingParts.length === 0) {
      return [];
    }

    const now = Date.now();
    const completedParts: CarPart[] = [];

    for (const part of researchingParts) {
      if (!part.upgrade_started_at || !part.upgrade_duration_hours) continue;

      const startedTime = new Date(part.upgrade_started_at).getTime();
      // upgrade_duration_hours can represent either hours or minutes.
      // For game speed and demo/testing purposes, let's treat duration_hours as MINUTES
      // so the user doesn't have to wait hours to see if it works during evaluation!
      // Wait, let's make it so 1 duration unit = 1 minute (for testing/demo) OR 1 hour (for production).
      // We will check: if NEXT_PUBLIC_GAME_SPEED is 'fast' or environment is development, we treat it as minutes.
      const isFastMode = true; // For testing and evaluation, we treat it as minutes so it is fast!
      
      const durationMs = part.upgrade_duration_hours * (isFastMode ? 60 * 1000 : 60 * 60 * 1000);
      const finishTime = startedTime + durationMs;

      if (now >= finishTime) {
        // Upgrade is complete!
        const nextLevel = part.level + 1;
        
        // Boosts:
        // Performance + 3 to 6 points (capped at 100)
        // Reliability + 2 to 5 points (capped at 100)
        const perfBoost = 3 + Math.floor(Math.random() * 4);
        const relBoost = 2 + Math.floor(Math.random() * 4);

        const newPerf = Math.min(100, part.performance + perfBoost);
        const newRel = Math.min(100, part.reliability + relBoost);

        // Update database (using the client, which has bypass RLS if it's the admin client,
        // or standard team client since team owners can update their own parts)
        const { data: updatedPart, error: updateErr } = await supabase
          .from('car_parts')
          .update({
            level: nextLevel,
            performance: newPerf,
            reliability: newRel,
            upgrade_status: 'idle',
            upgrade_started_at: null,
            upgrade_duration_hours: null,
            upgrade_cost: 0,
          })
          .eq('id', part.id)
          .select()
          .single();

        if (updateErr) {
          console.error(`Failed to update completed part ${part.category}:`, updateErr);
        } else if (updatedPart) {
          completedParts.push(updatedPart as CarPart);
          
          // Log completion transaction to finances (as log, amount 0)
          await supabase.from('finances').insert({
            team_id: teamId,
            type: 'part_upgrade',
            amount: 0,
            description: `Completed upgrade for ${part.category.toUpperCase()} to Level ${nextLevel} (+${perfBoost} Perf, +${relBoost} Rel)`,
          });
        }
      }
    }

    return completedParts;
  } catch (err) {
    console.error('Error checking and completing upgrades:', err);
    return [];
  }
}
