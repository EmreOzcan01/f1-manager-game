-- ============================================================
-- F1 Manager Game — Strategy Per Driver Migration
-- Migration: 003_strategy_per_driver.sql
-- 
-- Changes: Adds driver_id to race_strategies so each driver
-- on the team gets their own individual strategy.
-- ============================================================

-- 1. Add driver_id column (nullable first, then enforce)
ALTER TABLE race_strategies 
  ADD COLUMN driver_id UUID REFERENCES drivers(id);

-- 2. Drop old unique constraint (was: one strategy per team per race)
ALTER TABLE race_strategies 
  DROP CONSTRAINT IF EXISTS unique_strategy;

-- 3. Add new unique constraint (one strategy per driver per race)
ALTER TABLE race_strategies 
  ADD CONSTRAINT unique_strategy_per_driver UNIQUE (driver_id, race_id);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_strategies_driver ON race_strategies(driver_id);
CREATE INDEX IF NOT EXISTS idx_strategies_team_race ON race_strategies(team_id, race_id);
