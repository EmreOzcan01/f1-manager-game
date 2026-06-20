-- ============================================================
-- F1 Manager Game — Seed Data
-- AI Teams, Drivers, Season 1, and Race Calendar
-- ============================================================

-- ============================================================
-- SEASON 1
-- ============================================================
INSERT INTO seasons (id, number, is_active, started_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 1, TRUE, NOW());

-- ============================================================
-- 9 AI TEAMS
-- ============================================================
INSERT INTO teams (id, name, is_ai, budget, reputation, primary_color, secondary_color) VALUES
('b0000000-0000-0000-0000-000000000001', 'Scuderia Rossa',      TRUE, 15000000, 90, '#dc2626', '#1e1e2e'),
('b0000000-0000-0000-0000-000000000002', 'Silver Arrows Racing', TRUE, 14000000, 88, '#94a3b8', '#0f172a'),
('b0000000-0000-0000-0000-000000000003', 'Blue Bull Racing',     TRUE, 16000000, 95, '#1d4ed8', '#eab308'),
('b0000000-0000-0000-0000-000000000004', 'Papaya Speed',         TRUE, 11000000, 78, '#f97316', '#1e3a5f'),
('b0000000-0000-0000-0000-000000000005', 'British Racing Green', TRUE, 12000000, 82, '#16a34a', '#000000'),
('b0000000-0000-0000-0000-000000000006', 'Alpine Bleu',          TRUE, 10000000, 70, '#2563eb', '#ec4899'),
('b0000000-0000-0000-0000-000000000007', 'Haas Motorsport',      TRUE,  8000000, 55, '#f8fafc', '#dc2626'),
('b0000000-0000-0000-0000-000000000008', 'Kick Sauber',          TRUE,  8500000, 58, '#06b6d4', '#000000'),
('b0000000-0000-0000-0000-000000000009', 'Williams Heritage',    TRUE,  9000000, 62, '#1d4ed8', '#f8fafc');

-- ============================================================
-- 40 DRIVERS (18 for AI teams + 22 free agents)
-- ============================================================
INSERT INTO drivers (id, name, nationality, age, pace, racecraft, awareness, experience, consistency, salary, contract_price, is_free_agent, morale) VALUES
-- Scuderia Rossa drivers
('d0000000-0000-0000-0000-000000000001', 'Marco Benedetti',     'Italian',      28, 88, 82, 85, 75, 84, 3500000, 8000000,  FALSE, 85),
('d0000000-0000-0000-0000-000000000002', 'Carlos Navarro',      'Spanish',      30, 85, 86, 82, 80, 88, 3000000, 7000000,  FALSE, 80),
-- Silver Arrows Racing drivers
('d0000000-0000-0000-0000-000000000003', 'Lewis McGregor',      'British',      38, 90, 95, 90, 98, 92, 5000000, 12000000, FALSE, 82),
('d0000000-0000-0000-0000-000000000004', 'Kimi Räikkönen Jr.',  'Finnish',      24, 82, 75, 78, 55, 76, 1500000, 4000000,  FALSE, 88),
-- Blue Bull Racing drivers
('d0000000-0000-0000-0000-000000000005', 'Max De Vries',        'Dutch',        27, 96, 92, 88, 82, 90, 6000000, 15000000, FALSE, 90),
('d0000000-0000-0000-0000-000000000006', 'Yuki Kobayashi',      'Japanese',     25, 80, 78, 80, 60, 75, 1200000, 3500000,  FALSE, 85),
-- Papaya Speed drivers
('d0000000-0000-0000-0000-000000000007', 'Lando Barrichello',   'British',      26, 87, 84, 83, 68, 82, 2500000, 6000000,  FALSE, 92),
('d0000000-0000-0000-0000-000000000008', 'Oscar Rodriguez',     'Australian',   24, 84, 80, 82, 58, 85, 2000000, 5000000,  FALSE, 88),
-- British Racing Green drivers
('d0000000-0000-0000-0000-000000000009', 'Fernando Silva',      'Spanish',      41, 86, 94, 92, 99, 88, 4000000, 5000000,  FALSE, 75),
('d0000000-0000-0000-0000-000000000010', 'Lance Dubois',        'Canadian',     28, 75, 72, 74, 65, 70, 1800000, 3000000,  FALSE, 78),
-- Alpine Bleu drivers
('d0000000-0000-0000-0000-000000000011', 'Pierre Dupont',       'French',       30, 82, 80, 80, 72, 78, 2200000, 5000000,  FALSE, 80),
('d0000000-0000-0000-0000-000000000012', 'Esteban Morales',     'French',       33, 78, 79, 81, 78, 80, 2000000, 4500000,  FALSE, 76),
-- Haas Motorsport drivers
('d0000000-0000-0000-0000-000000000013', 'Kevin Magnusson',     'Danish',       34, 74, 76, 78, 80, 75, 1500000, 2500000,  FALSE, 72),
('d0000000-0000-0000-0000-000000000014', 'Nico Hartley',        'German',       26, 72, 70, 72, 48, 68, 800000,  2000000,  FALSE, 82),
-- Kick Sauber drivers
('d0000000-0000-0000-0000-000000000015', 'Valtteri Koskinen',   'Finnish',      36, 80, 82, 84, 88, 86, 2500000, 4000000,  FALSE, 74),
('d0000000-0000-0000-0000-000000000016', 'Zhou Wei',            'Chinese',      28, 73, 72, 75, 55, 72, 1000000, 2500000,  FALSE, 80),
-- Williams Heritage drivers
('d0000000-0000-0000-0000-000000000017', 'Alex Thompson',       'Thai-British', 29, 78, 76, 78, 62, 77, 1800000, 3500000,  FALSE, 84),
('d0000000-0000-0000-0000-000000000018', 'Logan Martinez',      'American',     23, 70, 68, 70, 40, 65, 600000,  1500000,  FALSE, 86),

-- Free agents (available for player teams)
('d0000000-0000-0000-0000-000000000019', 'Sebastian Webber',    'German',       37, 84, 90, 88, 96, 90, 3500000, 6000000,  TRUE, 70),
('d0000000-0000-0000-0000-000000000020', 'Daniel Rossi',        'Australian',   35, 82, 88, 85, 85, 84, 2800000, 5000000,  TRUE, 72),
('d0000000-0000-0000-0000-000000000021', 'Charles Martin',      'Monégasque',   28, 90, 85, 82, 70, 80, 3200000, 7500000,  TRUE, 88),
('d0000000-0000-0000-0000-000000000022', 'George Windsor',      'British',      28, 86, 82, 84, 68, 82, 2500000, 6000000,  TRUE, 85),
('d0000000-0000-0000-0000-000000000023', 'Sergio Hernandez',    'Mexican',      35, 80, 84, 86, 85, 82, 2200000, 4000000,  TRUE, 75),
('d0000000-0000-0000-0000-000000000024', 'Mick Schumacher Jr.', 'German',       27, 76, 74, 76, 55, 72, 1200000, 3000000,  TRUE, 78),
('d0000000-0000-0000-0000-000000000025', 'Nyck De Jong',        'Dutch',        30, 78, 76, 80, 60, 78, 1500000, 3500000,  TRUE, 80),
('d0000000-0000-0000-0000-000000000026', 'Felipe Santos',       'Brazilian',    24, 80, 74, 72, 42, 70, 1000000, 2500000,  TRUE, 90),
('d0000000-0000-0000-0000-000000000027', 'Liam O''Connor',      'Irish',        22, 78, 70, 68, 30, 66, 600000,  1500000,  TRUE, 92),
('d0000000-0000-0000-0000-000000000028', 'Theo Pourchaire Jr.', 'French',       23, 82, 76, 74, 38, 74, 900000,  2200000,  TRUE, 90),
('d0000000-0000-0000-0000-000000000029', 'Jack Doohan Jr.',     'Australian',   24, 76, 72, 74, 35, 70, 700000,  1800000,  TRUE, 88),
('d0000000-0000-0000-0000-000000000030', 'Andrea Kimi Antonelli', 'Italian',    21, 86, 78, 76, 32, 72, 800000,  3000000,  TRUE, 92);

-- ============================================================
-- TEAM → DRIVER ASSIGNMENTS (AI Teams)
-- ============================================================
INSERT INTO team_drivers (team_id, driver_id, seat_number, contract_end_season) VALUES
-- Scuderia Rossa
('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1, 3),
('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 2, 2),
-- Silver Arrows Racing
('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 1, 2),
('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004', 2, 3),
-- Blue Bull Racing
('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000005', 1, 4),
('b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000006', 2, 2),
-- Papaya Speed
('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000007', 1, 3),
('b0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000008', 2, 3),
-- British Racing Green
('b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000009', 1, 1),
('b0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000010', 2, 3),
-- Alpine Bleu
('b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000011', 1, 2),
('b0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000012', 2, 2),
-- Haas Motorsport
('b0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000013', 1, 1),
('b0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000014', 2, 2),
-- Kick Sauber
('b0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000015', 1, 1),
('b0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000016', 2, 2),
-- Williams Heritage
('b0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000017', 1, 2),
('b0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000018', 2, 3);

-- ============================================================
-- CAR PARTS for AI Teams (varying performance levels)
-- ============================================================
-- Helper: Insert 7 parts per team with team-specific performance ranges
DO $$
DECLARE
    team_rec RECORD;
    perf_base INTEGER;
    rel_base INTEGER;
    categories TEXT[] := ARRAY['engine', 'aero', 'chassis', 'gearbox', 'suspension', 'brakes', 'cooling'];
    cat TEXT;
    perf_offset INTEGER;
BEGIN
    FOR team_rec IN
        SELECT id, reputation FROM teams WHERE is_ai = TRUE
    LOOP
        -- Performance scales with reputation
        perf_base := (team_rec.reputation * 0.7)::INTEGER + 10;
        rel_base := GREATEST(60, team_rec.reputation - 10);

        FOREACH cat IN ARRAY categories
        LOOP
            -- Add some variance per category
            perf_offset := (RANDOM() * 10 - 5)::INTEGER;

            INSERT INTO car_parts (team_id, category, level, performance, reliability, wear)
            VALUES (
                team_rec.id,
                cat::part_category,
                GREATEST(1, (team_rec.reputation / 15)::INTEGER),
                LEAST(95, GREATEST(15, perf_base + perf_offset)),
                LEAST(95, GREATEST(50, rel_base + (RANDOM() * 10)::INTEGER)),
                (RANDOM() * 15)::NUMERIC(5,2)
            );
        END LOOP;
    END LOOP;
END $$;

-- ============================================================
-- SEASON 1 RACE CALENDAR (20 races, weekly starting from now)
-- ============================================================
DO $$
DECLARE
    season_uuid UUID := 'a0000000-0000-0000-0000-000000000001';
    track_names TEXT[] := ARRAY[
        'Bahrain International Circuit',
        'Jeddah Corniche Circuit',
        'Albert Park Circuit',
        'Suzuka International Racing Course',
        'Shanghai International Circuit',
        'Miami International Autodrome',
        'Autodromo Enzo e Dino Ferrari',
        'Circuit de Monaco',
        'Circuit Gilles Villeneuve',
        'Circuit de Barcelona-Catalunya',
        'Red Bull Ring',
        'Silverstone Circuit',
        'Hungaroring',
        'Circuit de Spa-Francorchamps',
        'Circuit Zandvoort',
        'Autodromo Nazionale Monza',
        'Marina Bay Street Circuit',
        'Circuit of the Americas',
        'Interlagos Circuit',
        'Yas Marina Circuit'
    ];
    track_countries TEXT[] := ARRAY[
        'Bahrain', 'Saudi Arabia', 'Australia', 'Japan', 'China',
        'USA', 'Italy', 'Monaco', 'Canada', 'Spain',
        'Austria', 'Great Britain', 'Hungary', 'Belgium', 'Netherlands',
        'Italy', 'Singapore', 'USA', 'Brazil', 'Abu Dhabi'
    ];
    track_lengths NUMERIC[] := ARRAY[
        5.412, 6.174, 5.278, 5.807, 5.451,
        5.412, 4.909, 3.337, 4.361, 4.657,
        4.318, 5.891, 4.381, 7.004, 4.259,
        5.793, 4.940, 5.513, 4.309, 5.281
    ];
    track_laps INTEGER[] := ARRAY[
        57, 50, 58, 53, 56,
        57, 63, 78, 70, 66,
        71, 52, 70, 44, 72,
        53, 62, 56, 71, 58
    ];
    i INTEGER;
BEGIN
    FOR i IN 1..20 LOOP
        INSERT INTO races (
            season_id, round_number, track_name, track_country,
            track_length_km, total_laps, scheduled_at, status
        ) VALUES (
            season_uuid,
            i,
            track_names[i],
            track_countries[i],
            track_lengths[i],
            track_laps[i],
            -- First race = tomorrow at 17:00 UTC, then every 2 days
            (NOW()::date + 1 + ((i - 1) * 2))::TIMESTAMPTZ + INTERVAL '17 hours',
            CASE WHEN i = 1 THEN 'upcoming'::race_status ELSE 'upcoming'::race_status END
        );
    END LOOP;
END $$;

-- ============================================================
-- SEASON STANDINGS for AI Teams (starting at 0)
-- ============================================================
INSERT INTO season_standings (season_id, team_id, total_points, total_wins, total_podiums)
SELECT 'a0000000-0000-0000-0000-000000000001', id, 0, 0, 0
FROM teams WHERE is_ai = TRUE;

-- ============================================================
-- AI TEAM DEFAULT STRATEGIES (for the first race)
-- Generated randomly — AI will have pre-set strategies
-- ============================================================
-- Note: AI strategies are generated by the race engine at runtime
-- based on team AI level. No need to seed them here.
