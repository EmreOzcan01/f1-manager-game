'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMoney, formatTimeRemaining, getFlag, ordinal } from '@/lib/utils/helpers';
import { useTranslation } from '@/lib/i18n/context';

interface DashboardProps {
  user: { id: string; email: string };
  profile: { username: string } | null;
  team: any | null;
  drivers: any[] | null;
  parts: any[] | null;
  nextRace: any | null;
  standings: any[] | null;
  transactions?: any[];
}

export default function DashboardClient({
  user,
  profile,
  team,
  drivers,
  parts,
  nextRace,
  standings,
  transactions = [],
}: DashboardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'finances'>('overview');

  // If no team yet, show team creation
  if (!team) {
    return <TeamCreation userId={user.id} />;
  }

  // Calculate car overall performance
  const carPerformance = parts
    ? Math.round(
        parts.reduce((sum: number, p: any) => sum + p.performance, 0) / parts.length
      )
    : 0;

  const carReliability = parts
    ? Math.round(
        parts.reduce((sum: number, p: any) => sum + p.reliability, 0) / parts.length
      )
    : 0;

  return (
    <div className="px-4 pt-4 pb-2 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
            {t('dash_welcome')}
          </p>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {profile?.username || 'Manager'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-color)]">
            <p className="text-xs text-[var(--foreground-muted)]">{t('budget')}</p>
            <p className="text-sm font-bold text-[var(--color-success)]">
              {formatMoney(team.budget)}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Overview & Finances */}
      <div className="flex gap-1 p-1 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-xl mb-5">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-[var(--background-elevated)] text-white shadow-sm border border-[var(--border-color)]'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
          id="btn-subtab-overview"
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSubTab('finances')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'finances'
              ? 'bg-[var(--background-elevated)] text-white shadow-sm border border-[var(--border-color)]'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
          id="btn-subtab-finances"
        >
          Finances & Budget
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <>
          {/* Team Card */}
          <div className="card p-4 mb-4 card-glow-red">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold font-racing"
                style={{ background: `${team.primary_color}22`, color: team.primary_color }}
              >
                {team.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold truncate">{team.name}</h2>
                <p className="text-xs text-[var(--foreground-muted)]">
                  HQ Level {team.hq_level} • Rep: {team.reputation}/100
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox label={t('dash_car_perf')} value={`${carPerformance}`} suffix="/100" color="var(--accent-primary)" />
              <StatBox label={t('reliability')} value={`${carReliability}`} suffix="/100" color="var(--accent-secondary)" />
              <StatBox label={t('nav_drivers')} value={`${drivers?.length || 0}`} suffix="/2" color="var(--color-success)" />
            </div>
          </div>

          {/* Next Race Card */}
          {nextRace ? (
            <div className="card p-4 mb-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] uppercase tracking-wider">
                  {t('dash_next_race')}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {t('dash_round')} {nextRace.round_number}
                </span>
              </div>

              <h3 className="text-base font-bold mb-1">
                {getFlag(nextRace.track_country)} {nextRace.track_name}
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                {nextRace.track_country} • {nextRace.track_length_km} km • {nextRace.total_laps} {t('strat_laps')}
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--foreground-muted)]">{t('dash_starts_in')}</p>
                  <p className="font-racing text-lg font-bold text-[var(--accent-primary)]">
                    {formatTimeRemaining(nextRace.scheduled_at)}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/strategy')}
                  className="btn-primary text-xs px-4 py-2"
                  id="btn-set-strategy"
                >
                  {t('dash_set_strategy')}
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-4 mb-4 relative overflow-hidden bg-[var(--background-card)] border-[#fbbf24]/30 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#fbbf24]/10 text-[#fbbf24] uppercase tracking-wider">
                  {t('dash_season_concluded')}
                </span>
              </div>
              <h3 className="text-base font-bold mb-1 font-racing text-[#fbbf24] flex items-center gap-1.5">
                <span>🏆</span> {t('dash_champ_finished')}
              </h3>
              <p className="text-xs text-[var(--foreground-muted)] mb-4 leading-relaxed">
                {t('dash_champ_desc')}
              </p>
              <button
                onClick={() => router.push('/standings')}
                className="btn-primary text-xs px-4 py-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-black border-transparent font-bold flex items-center gap-1 shadow-sm"
              >
                {t('dash_go_standings')}
              </button>
            </div>
          )}
               {/* Drivers */}
          {drivers && drivers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                {t('dash_drivers_title')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {drivers.map((td: any, i: number) => {
                   const d = td.drivers;
                   if (!d) return null;
                   const overall = Math.round(
                     d.pace * 0.35 + d.racecraft * 0.25 + d.awareness * 0.15 +
                     d.experience * 0.10 + d.consistency * 0.15
                   );
                   return (
                     <div key={i} className="card p-3">
                       <div className="flex items-center gap-2 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-[var(--background)] flex items-center justify-center text-sm">
                           {getFlag(d.nationality)}
                         </div>
                         <div className="min-w-0 flex-1">
                           <p className="text-sm font-semibold truncate">{d.name}</p>
                           <p className="text-[10px] text-[var(--foreground-muted)]">
                             {t('dash_seat')} #{td.seat_number} • {t('dash_age')} {d.age}
                           </p>
                         </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-xs text-[var(--foreground-muted)]">{t('overall')}</span>
                         <span className="font-racing text-sm font-bold" style={{
                           color: overall >= 80 ? 'var(--color-success)' :
                                  overall >= 60 ? 'var(--accent-secondary)' :
                                  'var(--color-warning)'
                         }}>
                           {overall}
                         </span>
                       </div>
                       <div className="stat-bar mt-1">
                         <div
                           className={`stat-bar-fill ${
                             overall >= 80 ? 'excellent' :
                             overall >= 60 ? 'good' :
                             overall >= 40 ? 'average' : 'poor'
                           }`}
                           style={{ width: `${overall}%` }}
                         />
                       </div>
                     </div>
                   );
                })}
              </div>
            </div>
          )}

          {/* Standings Preview */}
          {standings && standings.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
                  {t('dash_standings_preview')}
                </h3>
                <button
                  onClick={() => router.push('/standings')}
                  className="text-xs text-[var(--accent-primary)]"
                >
                  {t('dash_view_all')}
                </button>
              </div>
              <div className="card divide-y divide-[var(--border-color)]">
                {standings.slice(0, 5).map((s: any, i: number) => {
                  const tObj = s.teams;
                  const isPlayerTeam = tObj?.id === team.id;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        isPlayerTeam ? 'bg-[var(--accent-primary)]/5' : ''
                      }`}
                    >
                      <span className={`font-racing text-sm w-6 text-center ${
                        i === 0 ? 'text-[#fbbf24]' :
                        i === 1 ? 'text-[#94a3b8]' :
                        i === 2 ? 'text-[#d97706]' :
                        'text-[var(--foreground-muted)]'
                      }`}>
                        {i + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ background: tObj?.primary_color || '#666' }}
                      />
                      <span className={`text-sm flex-1 truncate ${
                        isPlayerTeam ? 'font-bold text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'
                      }`}>
                        {tObj?.name || 'Unknown'}
                        {isPlayerTeam && (
                          <span className="text-[10px] ml-1 text-[var(--accent-primary)]">{t('dash_you')}</span>
                        )}
                      </span>
                      <span className="font-racing text-sm font-bold">
                        {s.total_points} <span className="text-[10px] text-[var(--foreground-muted)] font-normal">{t('dash_pts')}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No drivers hint */}
          {(!drivers || drivers.length === 0) && (
            <div className="card p-6 text-center mb-4">
              <p className="text-3xl mb-2">🏎️</p>
              <p className="text-sm font-semibold mb-1">{t('dash_no_drivers')}</p>
              <p className="text-xs text-[var(--foreground-muted)] mb-3">
                {t('dash_no_drivers_desc')}
              </p>
              <button
                onClick={() => router.push('/drivers')}
                className="btn-primary text-xs px-4 py-2"
                id="btn-sign-drivers"
              >
                {t('dash_browse_drivers')}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Payout & budget stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3.5 bg-[var(--background-card)] border-emerald-500/20">
              <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">{t('dash_total_earnings')}</span>
              <span className="text-sm font-bold text-[#22c55e] font-racing">
                {formatMoney(
                  transactions
                    .filter((t: any) => t.amount > 0)
                    .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                )}
              </span>
            </div>
            <div className="card p-3.5 bg-[var(--background-card)] border-red-500/20">
              <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">{t('dash_total_expenditures')}</span>
              <span className="text-sm font-bold text-[#ef4444] font-racing">
                {formatMoney(
                  Math.abs(
                    transactions
                      .filter((t: any) => t.amount < 0)
                      .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
                  )
                )}
              </span>
            </div>
          </div>

          {/* Budget Statement card */}
          <div className="card p-4 bg-[var(--background-elevated)] border-[var(--border-color)]">
            <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block mb-0.5">{t('dash_available_balance')}</span>
            <span className="text-2xl font-black text-[var(--color-success)] font-racing block">
              {formatMoney(team.budget)}
            </span>
          </div>

          {/* Transactions List */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2.5">
              {t('dash_economy_feed')}
            </h3>
            <div className="card divide-y divide-[var(--border-color)] overflow-hidden">
              {transactions.length > 0 ? (
                transactions.map((tItem: any) => {
                  const isIncome = tItem.amount > 0;
                  const absAmount = Math.abs(tItem.amount);
                  
                  // Get nice icon based on type and translate its typeLabel
                  let icon = '💵';
                  let typeLabel = t('tx_transaction');
                  if (tItem.type === 'prize_money') {
                    icon = '🏆';
                    typeLabel = t('tx_prize_money');
                  } else if (tItem.type === 'driver_transfer') {
                    icon = '👤';
                    typeLabel = t('tx_driver_transfer');
                  } else if (tItem.type === 'part_upgrade') {
                    icon = '🔧';
                    typeLabel = t('tx_part_upgrade');
                  } else if (tItem.type === 'driver_salary') {
                    icon = '💸';
                    typeLabel = t('tx_driver_salary');
                  } else if (tItem.type === 'sponsor') {
                    icon = '👔';
                    typeLabel = t('tx_sponsor');
                  } else if (tItem.type === 'hq_upgrade') {
                    icon = '🏢';
                    typeLabel = t('tx_hq_upgrade');
                  } else if (tItem.type === 'penalty') {
                    icon = '⚠️';
                    typeLabel = t('tx_penalty');
                  }

                  // Determine date format locale based on active language
                  const dateLocale = t('success') === 'Başarılı' ? 'tr-TR' : 'en-US';
                  const dateStr = new Date(tItem.created_at).toLocaleDateString(dateLocale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div key={tItem.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.01] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-color)] flex items-center justify-center text-base flex-shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className="text-xs font-semibold text-[var(--foreground-secondary)] truncate">
                            {typeLabel}
                          </p>
                          <span className={`text-xs font-racing font-bold ${isIncome ? 'text-[#22c55e]' : tItem.amount === 0 ? 'text-[var(--foreground-muted)]' : 'text-[#ef4444]'}`}>
                            {isIncome ? '+' : tItem.amount === 0 ? '' : '-'}{formatMoney(absAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-[var(--foreground-muted)]">
                          <p className="truncate pr-4">{tItem.description}</p>
                          <p className="flex-shrink-0">{dateStr}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-[var(--foreground-muted)] text-xs">
                  {t('dash_no_transactions')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Creation Widget ───

function TeamCreation({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#e11d48');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const PRESET_COLORS = [
    '#e11d48', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          primaryColor,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to create team');
      }

      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create team';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col items-center justify-center min-h-[80dvh]">
      <div className="animate-fade-in-up w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🏁</p>
          <h1 className="font-racing text-2xl font-bold text-gradient mb-2">
            {t('dash_create_title')}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            {t('dash_create_subtitle')}
          </p>
        </div>

        <form onSubmit={handleCreate} className="card p-6 space-y-5">
          {/* Team Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-1.5 uppercase tracking-wider">
              {t('dash_create_team_name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Turbo Racing"
              required
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors text-sm"
              id="input-team-name"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-medium text-[var(--foreground-secondary)] mb-2 uppercase tracking-wider">
              {t('dash_create_team_color')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  className="w-9 h-9 rounded-xl transition-all duration-200 flex-shrink-0"
                  style={{
                    background: color,
                    boxShadow: primaryColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : 'none',
                    transform: primaryColor === color ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-3 border border-[var(--border-color)] bg-[var(--background)]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold font-racing text-lg"
                style={{ background: primaryColor }}
              >
                {name ? name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-bold">{name || (t('success') === 'Başarılı' ? 'Takımınız' : 'Your Team')}</p>
                <p className="text-[10px] text-[var(--foreground-muted)]">{t('dash_round')} 1 • {t('dash_new_team')}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="btn-primary w-full text-sm"
            id="btn-create-team"
          >
            {loading ? t('dash_creating') : t('dash_establish_team')}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stat Box Component ───

function StatBox({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: string;
  suffix: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--background)] p-3 text-center">
      <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="font-racing text-lg font-bold" style={{ color }}>
        {value}
        <span className="text-xs font-normal text-[var(--foreground-muted)]">{suffix}</span>
      </p>
    </div>
  );
}
