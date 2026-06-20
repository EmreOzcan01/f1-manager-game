-- ============================================================
-- F1 Manager Game — Fix Race Results unique constraint
-- Migration: 004_fix_results_constraint.sql
-- 
-- Changes: Drops unique constraint on (race_id, team_id) so
-- both drivers on a team can record race results.
-- Adds unique constraint on (race_id, driver_id).
-- ============================================================

-- 1. Drop old constraint (which blocked two drivers of the same team having results)
ALTER TABLE race_results 
  DROP CONSTRAINT IF EXISTS unique_result;

-- 2. Add new unique constraint (one result per driver per race)
ALTER TABLE race_results 
  ADD CONSTRAINT unique_result_per_driver UNIQUE (race_id, driver_id);
