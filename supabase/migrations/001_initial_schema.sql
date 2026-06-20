-- ============================================================
-- F1 Manager Game — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'racer_' || LEFT(NEW.id::text, 8))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TEAMS
-- ============================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL for AI teams
    name TEXT NOT NULL,
    logo_url TEXT,
    budget BIGINT DEFAULT 10000000,
    reputation INTEGER DEFAULT 50 CHECK (reputation BETWEEN 0 AND 100),
    hq_level INTEGER DEFAULT 1 CHECK (hq_level BETWEEN 1 AND 10),
    is_ai BOOLEAN DEFAULT FALSE,
    primary_color TEXT DEFAULT '#e11d48',
    secondary_color TEXT DEFAULT '#1e1e2e',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT one_team_per_user UNIQUE (owner_id)
);

CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_teams_ai ON teams(is_ai) WHERE is_ai = TRUE;

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are viewable by everyone"
    ON teams FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create their own team"
    ON teams FOR INSERT WITH CHECK (auth.uid() = owner_id AND is_ai = FALSE);

CREATE POLICY "Users can update own team"
    ON teams FOR UPDATE USING (auth.uid() = owner_id);

-- ============================================================
-- 3. DRIVERS
-- ============================================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    age INTEGER CHECK (age BETWEEN 18 AND 45),

    -- Skills (0-100)
    pace INTEGER DEFAULT 50 CHECK (pace BETWEEN 0 AND 100),
    racecraft INTEGER DEFAULT 50 CHECK (racecraft BETWEEN 0 AND 100),
    awareness INTEGER DEFAULT 50 CHECK (awareness BETWEEN 0 AND 100),
    experience INTEGER DEFAULT 50 CHECK (experience BETWEEN 0 AND 100),
    consistency INTEGER DEFAULT 50 CHECK (consistency BETWEEN 0 AND 100),

    salary BIGINT DEFAULT 500000,
    contract_price BIGINT DEFAULT 2000000,
    is_free_agent BOOLEAN DEFAULT TRUE,
    morale INTEGER DEFAULT 70 CHECK (morale BETWEEN 0 AND 100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_free_agent ON drivers(is_free_agent) WHERE is_free_agent = TRUE;

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers are viewable by everyone"
    ON drivers FOR SELECT USING (true);

-- ============================================================
-- 4. TEAM_DRIVERS (junction table)
-- ============================================================
CREATE TABLE team_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL CHECK (seat_number IN (1, 2)),
    contract_end_season INTEGER NOT NULL DEFAULT 1,
    signed_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_seat UNIQUE (team_id, seat_number),
    CONSTRAINT unique_driver UNIQUE (driver_id)
);

CREATE INDEX idx_team_drivers_team ON team_drivers(team_id);

ALTER TABLE team_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team drivers viewable by everyone"
    ON team_drivers FOR SELECT USING (true);

CREATE POLICY "Team owner can manage drivers"
    ON team_drivers FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

CREATE POLICY "Team owner can update drivers"
    ON team_drivers FOR UPDATE USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

CREATE POLICY "Team owner can release drivers"
    ON team_drivers FOR DELETE USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

-- ============================================================
-- 5. CAR PARTS
-- ============================================================
CREATE TYPE part_category AS ENUM (
    'engine', 'aero', 'chassis', 'gearbox',
    'suspension', 'brakes', 'cooling'
);

CREATE TYPE upgrade_status AS ENUM ('idle', 'researching', 'completed');

CREATE TABLE car_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    category part_category NOT NULL,
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
    performance INTEGER DEFAULT 10 CHECK (performance BETWEEN 0 AND 100),
    reliability INTEGER DEFAULT 80 CHECK (reliability BETWEEN 0 AND 100),
    wear NUMERIC(5,2) DEFAULT 0 CHECK (wear BETWEEN 0 AND 100),

    upgrade_status upgrade_status DEFAULT 'idle',
    upgrade_started_at TIMESTAMPTZ,
    upgrade_duration_hours INTEGER,
    upgrade_cost BIGINT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_part_per_team UNIQUE (team_id, category)
);

CREATE INDEX idx_car_parts_team ON car_parts(team_id);
CREATE INDEX idx_car_parts_upgrading ON car_parts(upgrade_status) WHERE upgrade_status = 'researching';

ALTER TABLE car_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team parts"
    ON car_parts FOR SELECT USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND (owner_id = auth.uid() OR is_ai = TRUE))
    );

CREATE POLICY "Users can update own team parts"
    ON car_parts FOR UPDATE USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

-- ============================================================
-- 6. SEASONS
-- ============================================================
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_active_season ON seasons(is_active) WHERE is_active = TRUE;

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seasons viewable by everyone"
    ON seasons FOR SELECT USING (true);

-- ============================================================
-- 7. RACES
-- ============================================================
CREATE TYPE race_status AS ENUM ('upcoming', 'qualifying', 'race_day', 'completed');

CREATE TABLE races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    track_name TEXT NOT NULL,
    track_country TEXT NOT NULL,
    track_length_km NUMERIC(5,2) NOT NULL,
    total_laps INTEGER NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status race_status DEFAULT 'upcoming',

    weather_condition TEXT,
    temperature INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_round UNIQUE (season_id, round_number)
);

CREATE INDEX idx_races_season ON races(season_id);
CREATE INDEX idx_races_status ON races(status) WHERE status != 'completed';
CREATE INDEX idx_races_scheduled ON races(scheduled_at);

ALTER TABLE races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Races viewable by everyone"
    ON races FOR SELECT USING (true);

-- ============================================================
-- 8. RACE STRATEGIES
-- ============================================================
CREATE TYPE tire_compound AS ENUM ('soft', 'medium', 'hard', 'intermediate', 'wet');

CREATE TABLE race_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,

    tire_plan JSONB NOT NULL DEFAULT '[]',
    planned_pit_stops INTEGER[] DEFAULT '{}',
    fuel_load NUMERIC(5,2) DEFAULT 100,
    fuel_mode TEXT DEFAULT 'standard',
    aggression TEXT DEFAULT 'balanced',

    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_strategy UNIQUE (team_id, race_id)
);

CREATE INDEX idx_strategies_race ON race_strategies(race_id);

ALTER TABLE race_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies"
    ON race_strategies FOR SELECT USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can create strategies for own team"
    ON race_strategies FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can update own strategies"
    ON race_strategies FOR UPDATE USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

-- ============================================================
-- 9. RACE LOGS (simulation data)
-- ============================================================
CREATE TABLE race_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID UNIQUE NOT NULL REFERENCES races(id) ON DELETE CASCADE,

    simulation_data JSONB NOT NULL,
    total_frames INTEGER NOT NULL,
    fastest_lap_time NUMERIC(8,3),
    fastest_lap_team_id UUID REFERENCES teams(id),

    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_race_logs_race ON race_logs(race_id);

ALTER TABLE race_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Race logs viewable by everyone"
    ON race_logs FOR SELECT USING (true);

-- ============================================================
-- 10. RACE RESULTS
-- ============================================================
CREATE TABLE race_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id UUID NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id),

    grid_position INTEGER NOT NULL,
    finish_position INTEGER,
    points INTEGER DEFAULT 0,
    prize_money BIGINT DEFAULT 0,
    fastest_lap BOOLEAN DEFAULT FALSE,
    dnf_reason TEXT,
    total_pit_stops INTEGER DEFAULT 0,
    total_time NUMERIC(10,3),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_result UNIQUE (race_id, team_id)
);

CREATE INDEX idx_results_race ON race_results(race_id);
CREATE INDEX idx_results_team ON race_results(team_id);

ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Results viewable by everyone"
    ON race_results FOR SELECT USING (true);

-- ============================================================
-- 11. SEASON STANDINGS
-- ============================================================
CREATE TABLE season_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_podiums INTEGER DEFAULT 0,
    best_finish INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_standing UNIQUE (season_id, team_id)
);

CREATE INDEX idx_standings_season ON season_standings(season_id, total_points DESC);

ALTER TABLE season_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings viewable by everyone"
    ON season_standings FOR SELECT USING (true);

-- ============================================================
-- 12. FINANCES
-- ============================================================
CREATE TYPE transaction_type AS ENUM (
    'prize_money', 'sponsor', 'driver_salary', 'part_upgrade',
    'driver_transfer', 'hq_upgrade', 'penalty'
);

CREATE TABLE finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finances_team ON finances(team_id);
CREATE INDEX idx_finances_team_date ON finances(team_id, created_at DESC);

ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own finances"
    ON finances FOR SELECT USING (
        EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_parts_updated_at
    BEFORE UPDATE ON car_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standings_updated_at
    BEFORE UPDATE ON season_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
