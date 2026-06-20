import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually to avoid dependency on dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envFile.split('\n').forEach((line) => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    if (key && !key.startsWith('#')) {
      envVars[key] = val;
    }
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const AI_TEAMS = [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Scuderia Rossa',      is_ai: true, budget: 15000000, reputation: 90, primary_color: '#dc2626', secondary_color: '#1e1e2e' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Silver Arrows Racing', is_ai: true, budget: 14000000, reputation: 88, primary_color: '#94a3b8', secondary_color: '#0f172a' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Blue Bull Racing',     is_ai: true, budget: 16000000, reputation: 95, primary_color: '#1d4ed8', secondary_color: '#eab308' },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Papaya Speed',         is_ai: true, budget: 11000000, reputation: 78, primary_color: '#f97316', secondary_color: '#1e3a5f' },
  { id: 'b0000000-0000-0000-0000-000000000005', name: 'British Racing Green', is_ai: true, budget: 12000000, reputation: 82, primary_color: '#16a34a', secondary_color: '#000000' },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Alpine Bleu',          is_ai: true, budget: 10000000, reputation: 70, primary_color: '#2563eb', secondary_color: '#ec4899' },
  { id: 'b0000000-0000-0000-0000-000000000007', name: 'Haas Motorsport',      is_ai: true, budget:  8000000, reputation: 55, primary_color: '#f8fafc', secondary_color: '#dc2626' },
  { id: 'b0000000-0000-0000-0000-000000000008', name: 'Kick Sauber',          is_ai: true, budget:  8500000, reputation: 58, primary_color: '#06b6d4', secondary_color: '#000000' },
  { id: 'b0000000-0000-0000-0000-000000000009', name: 'Williams Heritage',    is_ai: true, budget:  9000000, reputation: 62, primary_color: '#1d4ed8', secondary_color: '#f8fafc' },
];

const DRIVERS = [
  { id: 'd0000000-0000-0000-0000-000000000001', name: 'Marco Benedetti',     nationality: 'Italian',      age: 28, pace: 88, racecraft: 82, awareness: 85, experience: 75, consistency: 84, salary: 3500000, contract_price: 8000000, is_free_agent: false, morale: 85 },
  { id: 'd0000000-0000-0000-0000-000000000002', name: 'Carlos Navarro',      nationality: 'Spanish',      age: 30, pace: 85, racecraft: 86, awareness: 82, experience: 80, consistency: 88, salary: 3000000, contract_price: 7000000, is_free_agent: false, morale: 80 },
  { id: 'd0000000-0000-0000-0000-000000000003', name: 'Lewis McGregor',      nationality: 'British',      age: 38, pace: 90, racecraft: 95, awareness: 90, experience: 98, consistency: 92, salary: 5000000, contract_price: 12000000, is_free_agent: false, morale: 82 },
  { id: 'd0000000-0000-0000-0000-000000000004', name: 'Kimi Räikkönen Jr.',  nationality: 'Finnish',      age: 24, pace: 82, racecraft: 75, awareness: 78, experience: 55, consistency: 76, salary: 1500000, contract_price: 4000000, is_free_agent: false, morale: 88 },
  { id: 'd0000000-0000-0000-0000-000000000005', name: 'Max De Vries',        nationality: 'Dutch',        age: 27, pace: 96, racecraft: 92, awareness: 88, experience: 82, consistency: 90, salary: 6000000, contract_price: 15000000, is_free_agent: false, morale: 90 },
  { id: 'd0000000-0000-0000-0000-000000000006', name: 'Yuki Kobayashi',      nationality: 'Japanese',     age: 25, pace: 80, racecraft: 78, awareness: 80, experience: 60, consistency: 75, salary: 1200000, contract_price: 3500000, is_free_agent: false, morale: 85 },
  { id: 'd0000000-0000-0000-0000-000000000007', name: 'Lando Barrichello',   nationality: 'British',      age: 26, pace: 87, racecraft: 84, awareness: 83, experience: 68, consistency: 82, salary: 2500000, contract_price: 6000000, is_free_agent: false, morale: 92 },
  { id: 'd0000000-0000-0000-0000-000000000008', name: 'Oscar Rodriguez',     nationality: 'Australian',   age: 24, pace: 84, racecraft: 80, awareness: 82, experience: 58, consistency: 85, salary: 2000000, contract_price: 5000000, is_free_agent: false, morale: 88 },
  { id: 'd0000000-0000-0000-0000-000000000009', name: 'Fernando Silva',      nationality: 'Spanish',      age: 41, pace: 86, racecraft: 94, awareness: 92, experience: 99, consistency: 88, salary: 4000000, contract_price: 5000000, is_free_agent: false, morale: 75 },
  { id: 'd0000000-0000-0000-0000-000000000010', name: 'Lance Dubois',        nationality: 'Canadian',     age: 28, pace: 75, racecraft: 72, awareness: 74, experience: 65, consistency: 70, salary: 1800000, contract_price: 3000000, is_free_agent: false, morale: 78 },
  { id: 'd0000000-0000-0000-0000-000000000011', name: 'Pierre Dupont',       nationality: 'French',       age: 30, pace: 82, racecraft: 80, awareness: 80, experience: 72, consistency: 78, salary: 2200000, contract_price: 5000000, is_free_agent: false, morale: 80 },
  { id: 'd0000000-0000-0000-0000-000000000012', name: 'Esteban Morales',     nationality: 'French',       age: 33, pace: 78, racecraft: 79, awareness: 81, experience: 78, consistency: 80, salary: 2000000, contract_price: 4500000, is_free_agent: false, morale: 76 },
  { id: 'd0000000-0000-0000-0000-000000000013', name: 'Kevin Magnusson',     nationality: 'Danish',       age: 34, pace: 74, racecraft: 76, awareness: 78, experience: 80, consistency: 75, salary: 1500000, contract_price: 2500000, is_free_agent: false, morale: 72 },
  { id: 'd0000000-0000-0000-0000-000000000014', name: 'Nico Hartley',        nationality: 'German',       age: 26, pace: 72, racecraft: 70, awareness: 72, experience: 48, consistency: 68, salary: 800000,  contract_price: 2000000, is_free_agent: false, morale: 82 },
  { id: 'd0000000-0000-0000-0000-000000000015', name: 'Valtteri Koskinen',   nationality: 'Finnish',      age: 36, pace: 80, racecraft: 82, awareness: 84, experience: 88, consistency: 86, salary: 2500000, contract_price: 4000000, is_free_agent: false, morale: 74 },
  { id: 'd0000000-0000-0000-0000-000000000016', name: 'Zhou Wei',            nationality: 'Chinese',      age: 28, pace: 73, racecraft: 72, awareness: 75, experience: 55, consistency: 72, salary: 1000000, contract_price: 2500000, is_free_agent: false, morale: 80 },
  { id: 'd0000000-0000-0000-0000-000000000017', name: 'Alex Thompson',       nationality: 'Thai-British', age: 29, pace: 78, racecraft: 76, awareness: 78, experience: 62, consistency: 77, salary: 1800000, contract_price: 3500000, is_free_agent: false, morale: 84 },
  { id: 'd0000000-0000-0000-0000-000000000018', name: 'Logan Martinez',      nationality: 'American',     age: 23, pace: 70, racecraft: 68, awareness: 70, experience: 40, consistency: 65, salary: 600000,  contract_price: 1500000, is_free_agent: false, morale: 86 },
  
  // Free agents
  { id: 'd0000000-0000-0000-0000-000000000019', name: 'Sebastian Webber',    nationality: 'German',       age: 37, pace: 84, racecraft: 90, awareness: 88, experience: 96, consistency: 90, salary: 3500000, contract_price: 6000000, is_free_agent: true, morale: 70 },
  { id: 'd0000000-0000-0000-0000-000000000020', name: 'Daniel Rossi',        nationality: 'Australian',   age: 35, pace: 82, racecraft: 88, awareness: 85, experience: 85, consistency: 84, salary: 2800000, contract_price: 5000000, is_free_agent: true, morale: 72 },
  { id: 'd0000000-0000-0000-0000-000000000021', name: 'Charles Martin',      nationality: 'Monégasque',   age: 28, pace: 90, racecraft: 85, awareness: 82, experience: 70, consistency: 80, salary: 3200000, contract_price: 7500000, is_free_agent: true, morale: 88 },
  { id: 'd0000000-0000-0000-0000-000000000022', name: 'George Windsor',      nationality: 'British',      age: 28, pace: 86, racecraft: 82, awareness: 84, experience: 68, consistency: 82, salary: 2500000, contract_price: 6000000, is_free_agent: true, morale: 85 },
  { id: 'd0000000-0000-0000-0000-000000000023', name: 'Sergio Hernandez',    nationality: 'Mexican',      age: 35, pace: 80, racecraft: 84, awareness: 86, experience: 85, consistency: 82, salary: 2200000, contract_price: 4000000, is_free_agent: true, morale: 75 },
  { id: 'd0000000-0000-0000-0000-000000000024', name: 'Mick Schumacher Jr.', nationality: 'German',       age: 27, pace: 76, racecraft: 74, awareness: 76, experience: 55, consistency: 72, salary: 1200000, contract_price: 3000000, is_free_agent: true, morale: 78 },
  { id: 'd0000000-0000-0000-0000-000000000025', name: 'Nyck De Jong',        nationality: 'Dutch',        age: 30, pace: 78, racecraft: 76, awareness: 80, experience: 60, consistency: 78, salary: 1500000, contract_price: 3500000, is_free_agent: true, morale: 80 },
  { id: 'd0000000-0000-0000-0000-000000000026', name: 'Felipe Santos',       nationality: 'Brazilian',    age: 24, pace: 80, racecraft: 74, awareness: 72, experience: 42, consistency: 70, salary: 1000000, contract_price: 2500000, is_free_agent: true, morale: 90 },
  { id: 'd0000000-0000-0000-0000-000000000027', name: 'Liam O\'Connor',      nationality: 'Irish',        age: 22, pace: 78, racecraft: 70, awareness: 68, experience: 30, consistency: 66, salary: 600000,  contract_price: 1500000, is_free_agent: true, morale: 92 },
  { id: 'd0000000-0000-0000-0000-000000000028', name: 'Theo Pourchaire Jr.', nationality: 'French',       age: 23, pace: 82, racecraft: 76, awareness: 74, experience: 38, consistency: 74, salary: 900000,  contract_price: 2200000, is_free_agent: true, morale: 90 },
  { id: 'd0000000-0000-0000-0000-000000000029', name: 'Jack Doohan Jr.',     nationality: 'Australian',   age: 24, pace: 76, racecraft: 72, awareness: 74, experience: 35, consistency: 70, salary: 700000,  contract_price: 1800000, is_free_agent: true, morale: 88 },
  { id: 'd0000000-0000-0000-0000-000000000030', name: 'Andrea Kimi Antonelli', nationality: 'Italian',    age: 21, pace: 86, racecraft: 78, awareness: 76, experience: 32, consistency: 72, salary: 800000,  contract_price: 3000000, is_free_agent: true, morale: 92 },
];

const AI_TEAM_DRIVERS = [
  { team_id: 'b0000000-0000-0000-0000-000000000001', driver_id: 'd0000000-0000-0000-0000-000000000001', seat_number: 1, contract_end_season: 3 },
  { team_id: 'b0000000-0000-0000-0000-000000000001', driver_id: 'd0000000-0000-0000-0000-000000000002', seat_number: 2, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000002', driver_id: 'd0000000-0000-0000-0000-000000000003', seat_number: 1, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000002', driver_id: 'd0000000-0000-0000-0000-000000000004', seat_number: 2, contract_end_season: 3 },
  { team_id: 'b0000000-0000-0000-0000-000000000003', driver_id: 'd0000000-0000-0000-0000-000000000005', seat_number: 1, contract_end_season: 4 },
  { team_id: 'b0000000-0000-0000-0000-000000000003', driver_id: 'd0000000-0000-0000-0000-000000000006', seat_number: 2, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000004', driver_id: 'd0000000-0000-0000-0000-000000000007', seat_number: 1, contract_end_season: 3 },
  { team_id: 'b0000000-0000-0000-0000-000000000004', driver_id: 'd0000000-0000-0000-0000-000000000008', seat_number: 2, contract_end_season: 3 },
  { team_id: 'b0000000-0000-0000-0000-000000000005', driver_id: 'd0000000-0000-0000-0000-000000000009', seat_number: 1, contract_end_season: 1 },
  { team_id: 'b0000000-0000-0000-0000-000000000005', driver_id: 'd0000000-0000-0000-0000-000000000010', seat_number: 2, contract_end_season: 3 },
  { team_id: 'b0000000-0000-0000-0000-000000000006', driver_id: 'd0000000-0000-0000-0000-000000000011', seat_number: 1, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000006', driver_id: 'd0000000-0000-0000-0000-000000000012', seat_number: 2, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000007', driver_id: 'd0000000-0000-0000-0000-000000000013', seat_number: 1, contract_end_season: 1 },
  { team_id: 'b0000000-0000-0000-0000-000000000007', driver_id: 'd0000000-0000-0000-0000-000000000014', seat_number: 2, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000008', driver_id: 'd0000000-0000-0000-0000-000000000015', seat_number: 1, contract_end_season: 1 },
  { team_id: 'b0000000-0000-0000-0000-000000000008', driver_id: 'd0000000-0000-0000-0000-000000000016', seat_number: 2, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000009', driver_id: 'd0000000-0000-0000-0000-000000000017', seat_number: 1, contract_end_season: 2 },
  { team_id: 'b0000000-0000-0000-0000-000000000009', driver_id: 'd0000000-0000-0000-0000-000000000018', seat_number: 2, contract_end_season: 3 },
];

const TRACKS = [
  { name: 'Bahrain International Circuit', country: 'Bahrain', length: 5.412, laps: 57 },
  { name: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', length: 6.174, laps: 50 },
  { name: 'Albert Park Circuit', country: 'Australia', length: 5.278, laps: 58 },
  { name: 'Suzuka International Racing Course', country: 'Japan', length: 5.807, laps: 53 },
  { name: 'Shanghai International Circuit', country: 'China', length: 5.451, laps: 56 },
  { name: 'Miami International Autodrome', country: 'USA', length: 5.412, laps: 57 },
  { name: 'Autodromo Enzo e Dino Ferrari', country: 'Italy', length: 4.909, laps: 63 },
  { name: 'Circuit de Monaco', country: 'Monaco', length: 3.337, laps: 78 },
  { name: 'Circuit Gilles Villeneuve', country: 'Canada', length: 4.361, laps: 70 },
  { name: 'Circuit de Barcelona-Catalunya', country: 'Spain', length: 4.657, laps: 66 },
  { name: 'Red Bull Ring', country: 'Austria', length: 4.318, laps: 71 },
  { name: 'Silverstone Circuit', country: 'Great Britain', length: 5.891, laps: 52 },
  { name: 'Hungaroring', country: 'Hungary', length: 4.381, laps: 70 },
  { name: 'Circuit de Spa-Francorchamps', country: 'Belgium', length: 7.004, laps: 44 },
  { name: 'Circuit Zandvoort', country: 'Netherlands', length: 4.259, laps: 72 },
  { name: 'Autodromo Nazionale Monza', country: 'Italy', length: 5.793, laps: 53 },
  { name: 'Marina Bay Street Circuit', country: 'Singapore', length: 4.940, laps: 62 },
  { name: 'Circuit of the Americas', country: 'USA', length: 5.513, laps: 56 },
  { name: 'Interlagos Circuit', country: 'Brazil', length: 4.309, laps: 71 },
  { name: 'Yas Marina Circuit', country: 'Abu Dhabi', length: 5.281, laps: 58 },
];

async function reset() {
  console.log('🔄 Starting full database reset...');

  try {
    // 1. Clean tables cascading order
    console.log('🗑️ Cleaning database tables...');
    
    // Explicitly delete dependent rows first
    await supabase.from('race_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('finances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('car_parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('team_drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('season_standings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('races').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete teams (both AI and players)
    await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete drivers
    await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete seasons
    await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Tables cleaned successfully.');

    // 2. Insert Season 1
    console.log('🌱 Inserting Season 1...');
    const seasonId = 'a0000000-0000-0000-0000-000000000001';
    const { error: seasonErr } = await supabase.from('seasons').insert({
      id: seasonId,
      number: 1,
      is_active: true,
      started_at: new Date().toISOString(),
    });
    if (seasonErr) throw seasonErr;

    // 3. Insert AI Teams
    console.log('🌱 Inserting AI Teams...');
    const { error: teamsErr } = await supabase.from('teams').insert(AI_TEAMS);
    if (teamsErr) throw teamsErr;

    // 4. Insert Drivers
    console.log('🌱 Inserting Drivers...');
    const { error: driversErr } = await supabase.from('drivers').insert(DRIVERS);
    if (driversErr) throw driversErr;

    // 5. Insert Team-Driver Assignments
    console.log('🌱 Assigning AI team drivers...');
    const { error: assignsErr } = await supabase.from('team_drivers').insert(AI_TEAM_DRIVERS);
    if (assignsErr) throw assignsErr;

    // 6. Generate Car Parts for AI Teams
    console.log('🌱 Inserting AI car parts...');
    const categories = ['engine', 'aero', 'chassis', 'gearbox', 'suspension', 'brakes', 'cooling'];
    const partsToInsert = [];

    for (const team of AI_TEAMS) {
      const perfBase = Math.round(team.reputation * 0.7) + 10;
      const relBase = Math.max(60, team.reputation - 10);

      for (const cat of categories) {
        const perfOffset = Math.round(Math.random() * 10 - 5);
        partsToInsert.push({
          team_id: team.id,
          category: cat,
          level: Math.max(1, Math.round(team.reputation / 15)),
          performance: Math.min(95, Math.max(15, perfBase + perfOffset)),
          reliability: Math.min(95, Math.max(50, relBase + Math.round(Math.random() * 10))),
          wear: Math.random() * 15,
        });
      }
    }

    const { error: partsErr } = await supabase.from('car_parts').insert(partsToInsert);
    if (partsErr) throw partsErr;

    // 7. Generate daily races calendar (1 GP per day)
    console.log('🌱 Generating daily races calendar...');
    const baseDate = new Date();
    baseDate.setHours(17, 0, 0, 0); // Start races at 17:00 UTC

    const racesToInsert = TRACKS.map((t, idx) => {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setDate(baseDate.getDate() + 1 + idx * 1); // DAILY SPACED (idx * 1)

      return {
        season_id: seasonId,
        round_number: idx + 1,
        track_name: t.name,
        track_country: t.country,
        track_length_km: t.length,
        total_laps: t.laps,
        scheduled_at: scheduledDate.toISOString(),
        status: 'upcoming',
      };
    });

    const { error: calendarErr } = await supabase.from('races').insert(racesToInsert);
    if (calendarErr) throw calendarErr;

    // 8. Initialize Standings for AI Teams
    console.log('🌱 Initializing AI team standings...');
    const standingsToInsert = AI_TEAMS.map((team) => ({
      season_id: seasonId,
      team_id: team.id,
      total_points: 0,
      total_wins: 0,
      total_podiums: 0,
    }));

    const { error: standingsErr } = await supabase.from('season_standings').insert(standingsToInsert);
    if (standingsErr) throw standingsErr;

    console.log('🎉 Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

reset();
