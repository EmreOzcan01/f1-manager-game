-- ============================================================
-- F1 Manager Game — Add Location & Locale Fields
-- Migration: 003_add_location.sql
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

-- Allow users to update their own location/locale
CREATE POLICY "Users can update own location" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
