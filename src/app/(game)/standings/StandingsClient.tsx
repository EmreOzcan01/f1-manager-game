'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, getFlag } from '@/lib/utils/helpers';

interface StandingsClientProps {
  activeSeason: {
    id: string;
    number: number;
    is_active: boolean;
  };
  teamStandings: any[];
  driverStandings: any[];
  isSeasonFinished: boolean;
  playerTeamId: string | null;
}

const PAYOUTS = [
  15000000, // 1st: 15M
  12000000, // 2nd: 12M
  10000000, // 3rd: 10M
  8000000,  // 4th: 8M
  7000000,  // 5th: 7M
  6000000,  // 6th: 6M
  5000000,  // 7th: 5M
  4000000,  // 8th: 4M
  3000000,  // 9th: 3M
  2000000,  // 10th: 2M
];

export default function StandingsClient({
  activeSeason,
  teamStandings,
  driverStandings,
  isSeasonFinished,
  playerTeamId,
}: StandingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'constructors' | 'drivers'>('constructors');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advancingError, setAdvancingError] = useState<string | null>(null);

  // Find player team final standing position and prize money payout
  const playerStandingIdx = teamStandings.findIndex((s) => s.team_id === playerTeamId);
  const playerStandingPosition = playerStandingIdx !== -1 ? playerStandingIdx + 1 : null;
  const playerPayout = playerStandingPosition !== null
    ? PAYOUTS[Math.min(playerStandingPosition - 1, PAYOUTS.length - 1)]
    : 0;

  const handleAdvanceSeason = async () => {
    try {
      setIsAdvancing(true);
      setAdvancingError(null);

      const response = await fetch('/api/season/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to advance season');
      }

      // Success: Refresh page and redirect to dashboard
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setAdvancingError(err.message || 'An error occurred while advancing the season.');
      setIsAdvancing(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-24 stagger-children">
      {/* Header */}
      <div className="mb-5">
        <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
          Championship Rankings
        </p>
        <h1 className="text-xl font-bold font-racing text-gradient uppercase">
          Season {activeSeason.number} Standings
        </h1>
      </div>

      {/* Season Finished Banner */}
      {isSeasonFinished && playerStandingPosition !== null && (
        <div className="card p-5 mb-5 bg-gradient-to-br from-[#fbbf24]/15 via-red-500/5 to-[#151522] border-[#fbbf24]/30 shadow-[0_4px_24px_rgba(251,191,36,0.06)] relative overflow-hidden">
          {/* Confetti decoration */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-4 left-10 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <div className="absolute top-12 right-20 w-3 h-3 bg-yellow-400 rounded-full animate-bounce" />
            <div className="absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fbbf24]/20 text-[#fbbf24] text-[10px] font-bold tracking-wider uppercase">
                👑 Campaign Concluded
              </div>
              <h2 className="text-lg font-bold font-racing text-white flex items-center gap-2">
                <span>🏆</span> Final Classification: {playerStandingPosition === 1 ? '1st (Champions!)' : `${playerStandingPosition}th Place`}
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                Congratulations on completing Season {activeSeason.number}! Your team secured {teamStandings[playerStandingIdx]?.total_points || 0} points. 
                You are awarded a seasonal constructor prize money bonus of{' '}
                <span className="font-bold text-[var(--color-success)]">{formatMoney(playerPayout)}</span>.
              </p>
              {advancingError && (
                <p className="text-xs text-[var(--color-danger)] font-medium mt-1">
                  ⚠️ {advancingError}
                </p>
              )}
            </div>

            <button
              disabled={isAdvancing}
              onClick={handleAdvanceSeason}
              className="btn-primary py-3 px-6 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
              id="btn-advance-season"
            >
              {isAdvancing ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Advancing...</span>
                </>
              ) : (
                <>
                  <span>Advance to Season {activeSeason.number + 1}</span>
                  <span className="text-sm">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-[#0f0f15]/80 rounded-2xl p-1 border border-[var(--border-color)] mb-5">
        <button
          onClick={() => setActiveTab('constructors')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'constructors'
              ? 'bg-[var(--accent-primary)] text-white shadow-md'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
          id="btn-tab-constructors"
        >
          Constructors (Teams)
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'drivers'
              ? 'bg-[var(--accent-primary)] text-white shadow-md'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
          id="btn-tab-drivers"
        >
          Drivers
        </button>
      </div>

      {/* Standings Tables */}
      <div className="card p-2 bg-[var(--background-card)]">
        {activeTab === 'constructors' ? (
          <div className="space-y-1">
            {/* Constructor table header */}
            <div className="flex items-center text-[10px] uppercase font-bold text-[var(--foreground-muted)] px-3 py-2 border-b border-[var(--border-color)]">
              <span className="w-8 text-center">Pos</span>
              <span className="flex-1 ml-4">Team</span>
              <span className="w-16 text-center">Wins</span>
              <span className="w-16 text-center">Podiums</span>
              <span className="w-16 text-right pr-2">Points</span>
            </div>

            {/* Constructor standings rows */}
            {teamStandings.map((item, idx) => {
              const teamData = item.teams;
              if (!teamData) return null;
              const isPlayer = teamData.id === playerTeamId;

              return (
                <div
                  key={item.id}
                  className={`flex items-center px-3 py-3 rounded-xl border transition-all ${
                    isPlayer
                      ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30 shadow-[0_0_12px_rgba(220,38,38,0.02)]'
                      : 'border-transparent hover:bg-[var(--background-elevated)]/40'
                  }`}
                >
                  {/* Position */}
                  <span
                    className={`font-racing text-sm w-8 text-center ${
                      idx === 0
                        ? 'text-[#fbbf24] font-bold'
                        : idx === 1
                        ? 'text-[#94a3b8]'
                        : idx === 2
                        ? 'text-[#d97706]'
                        : 'text-[var(--foreground-secondary)]'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  {/* Team Color Badge & Info */}
                  <div
                    className="w-1 h-7 rounded-sm flex-shrink-0 ml-4"
                    style={{ backgroundColor: teamData.primary_color || '#666' }}
                  />

                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold truncate ${isPlayer ? 'text-[var(--foreground)] font-bold' : 'text-[var(--foreground-secondary)]'}`}>
                        {teamData.name}
                      </span>
                      {isPlayer && (
                        <span className="text-[9px] font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-1 rounded-sm">
                          MY TEAM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wins */}
                  <span className="w-16 text-center text-xs font-medium text-[var(--foreground-secondary)]">
                    {item.total_wins || 0}
                  </span>

                  {/* Podiums */}
                  <span className="w-16 text-center text-xs font-medium text-[var(--foreground-secondary)]">
                    {item.total_podiums || 0}
                  </span>

                  {/* Points */}
                  <span className="w-16 text-right pr-2 text-xs font-racing font-bold text-[var(--foreground)]">
                    {item.total_points || 0}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Drivers table header */}
            <div className="flex items-center text-[10px] uppercase font-bold text-[var(--foreground-muted)] px-3 py-2 border-b border-[var(--border-color)]">
              <span className="w-8 text-center">Pos</span>
              <span className="flex-1 ml-4">Driver / Team</span>
              <span className="w-16 text-center">Wins</span>
              <span className="w-16 text-center">Podiums</span>
              <span className="w-16 text-right pr-2">Points</span>
            </div>

            {/* Drivers standings rows */}
            {driverStandings.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--foreground-muted)]">
                No race results recorded for this season yet.
              </div>
            ) : (
              driverStandings.map((item: any, idx: number) => {
                const isPlayerDriver = item.is_player_team;

                return (
                  <div
                    key={item.driver_id}
                    className={`flex items-center px-3 py-3 rounded-xl border transition-all ${
                      isPlayerDriver
                        ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30 shadow-[0_0_12px_rgba(220,38,38,0.02)]'
                        : 'border-transparent hover:bg-[var(--background-elevated)]/40'
                    }`}
                  >
                    {/* Position */}
                    <span
                      className={`font-racing text-sm w-8 text-center ${
                        idx === 0
                          ? 'text-[#fbbf24] font-bold'
                          : idx === 1
                          ? 'text-[#94a3b8]'
                          : idx === 2
                          ? 'text-[#d97706]'
                          : 'text-[var(--foreground-secondary)]'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Team Color Badge & Info */}
                    <div
                      className="w-1 h-7 rounded-sm flex-shrink-0 ml-4"
                      style={{ backgroundColor: item.team_color }}
                    />

                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-semibold truncate ${isPlayerDriver ? 'text-[var(--foreground)] font-bold' : 'text-[var(--foreground-secondary)]'}`}>
                          {item.driver_name}
                        </span>
                        <span className="text-[11px]" title={item.driver_nationality}>
                          {getFlag(item.driver_nationality)}
                        </span>
                        {isPlayerDriver && (
                          <span className="text-[9px] font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-1 rounded-sm">
                            MY DRIVER
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[var(--foreground-muted)] truncate">
                        {item.team_name}
                      </p>
                    </div>

                    {/* Wins */}
                    <span className="w-16 text-center text-xs font-medium text-[var(--foreground-secondary)]">
                      {item.wins || 0}
                    </span>

                    {/* Podiums */}
                    <span className="w-16 text-center text-xs font-medium text-[var(--foreground-secondary)]">
                      {item.podiums || 0}
                    </span>

                    {/* Points */}
                    <span className="w-16 text-right pr-2 text-xs font-racing font-bold text-[var(--foreground)]">
                      {item.total_points || 0}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
