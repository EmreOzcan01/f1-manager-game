import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { PartCategory } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input
    const body = await request.json();
    const { category } = body;

    const VALID_CATEGORIES: PartCategory[] = [
      'engine', 'aero', 'chassis', 'gearbox', 'suspension', 'brakes', 'cooling'
    ];

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid part category' }, { status: 400 });
    }

    // 3. Retrieve user's team
    const adminSupabase = createServiceClient();
    const { data: team, error: teamErr } = await adminSupabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 400 });
    }

    // 4. Check if any part is currently upgrading (Only 1 upgrade at a time)
    const { data: activeUpgrades } = await adminSupabase
      .from('car_parts')
      .select('id, category')
      .eq('team_id', team.id)
      .eq('upgrade_status', 'researching');

    if (activeUpgrades && activeUpgrades.length > 0) {
      return NextResponse.json({ 
        error: `Already upgrading the ${activeUpgrades[0].category}. Wait for it to complete or buy a new slot.` 
      }, { status: 400 });
    }

    // 5. Retrieve target part details
    const { data: part, error: partErr } = await adminSupabase
      .from('car_parts')
      .select('*')
      .eq('team_id', team.id)
      .eq('category', category)
      .single();

    if (partErr || !part) {
      return NextResponse.json({ error: 'Part not found.' }, { status: 404 });
    }

    // 6. Calculate cost and duration
    // Formula: level * 1,500,000
    // Duration: level * 1.5 (units represents minutes in fast mode, hours in production)
    const upgradeCost = part.level * 1_200_000;
    const upgradeDuration = Math.round(part.level * 1.5); // e.g. 1.5 units, level 1 -> 2 mins, level 2 -> 3 mins

    // 7. Check budget
    if (team.budget < upgradeCost) {
      return NextResponse.json({ error: 'Insufficient budget to upgrade this part.' }, { status: 400 });
    }

    // 8. DB Transaction (Admin role client)
    // 8a. Deduct cost from budget
    const newBudget = team.budget - upgradeCost;
    const { error: budgetErr } = await adminSupabase
      .from('teams')
      .update({ budget: newBudget })
      .eq('id', team.id);

    if (budgetErr) throw budgetErr;

    // 8b. Set part to researching status
    const { error: partUpdateErr } = await adminSupabase
      .from('car_parts')
      .update({
        upgrade_status: 'researching',
        upgrade_started_at: new Date().toISOString(),
        upgrade_duration_hours: upgradeDuration,
        upgrade_cost: upgradeCost,
      })
      .eq('id', part.id);

    if (partUpdateErr) {
      // Rollback budget
      await adminSupabase.from('teams').update({ budget: team.budget }).eq('id', team.id);
      throw partUpdateErr;
    }

    // 8c. Log transaction in finances
    const { error: financeErr } = await adminSupabase
      .from('finances')
      .insert({
        team_id: team.id,
        type: 'part_upgrade',
        amount: -upgradeCost,
        description: `Started research on ${category.toUpperCase()} to Level ${part.level + 1}`,
      });

    if (financeErr) {
      console.error('Warning: Failed to log finance transaction:', financeErr);
    }

    return NextResponse.json({
      success: true,
      message: `Started researching upgrade for ${category}. Ready in ${upgradeDuration}m.`,
      budget: newBudget,
    });
  } catch (err: unknown) {
    console.error('Error in part upgrade API:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
