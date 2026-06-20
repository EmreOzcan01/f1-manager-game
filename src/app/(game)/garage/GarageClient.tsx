'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/utils/helpers';
import type { Team, CarPart, PartCategory } from '@/types/database';

interface GarageClientProps {
  team: Team;
  initialParts: CarPart[];
}

export default function GarageClient({
  team,
  initialParts,
}: GarageClientProps) {
  const [parts, setParts] = useState<CarPart[]>(initialParts);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Upgrade confirm modal
  const [upgradingPart, setUpgradingPart] = useState<CarPart | null>(null);

  const router = useRouter();

  // Sync state with props
  useEffect(() => {
    setParts(initialParts);
  }, [initialParts]);

  // Check if any part is currently upgrading
  const activeUpgrade = parts.find(p => p.upgrade_status === 'researching');

  const handleUpgrade = async (part: CarPart) => {
    setLoading(part.category);
    setError(null);
    setSuccess(null);
    setUpgradingPart(null);

    try {
      const res = await fetch('/api/garage/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: part.category }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start upgrade');
      }

      setSuccess(`Started research on ${part.category.toUpperCase()} upgrade!`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(null);
    }
  };

  const getPartName = (cat: PartCategory) => {
    const names: Record<PartCategory, string> = {
      engine: 'Power Unit (Engine)',
      aero: 'Aerodynamics (Aero)',
      chassis: 'Chassis Frame',
      gearbox: 'Gearbox / Transmission',
      suspension: 'Suspension System',
      brakes: 'Braking System',
      cooling: 'Cooling Unit',
    };
    return names[cat];
  };

  return (
    <div className="px-4 pt-4 pb-2 stagger-children relative min-h-[90dvh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
            Development
          </p>
          <h1 className="text-xl font-bold font-racing text-gradient">
            GARAGE
          </h1>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-color)] text-right">
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase">Budget</p>
          <p className="text-sm font-bold text-[var(--color-success)]">
            {formatMoney(team.budget)}
          </p>
        </div>
      </div>

      {/* Overview stats */}
      <div className="card p-3 mb-5 grid grid-cols-2 gap-4 divide-x divide-[var(--border-color)]">
        <div className="text-center">
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
            Avg Performance
          </p>
          <p className="font-racing text-lg font-bold text-[var(--accent-primary)]">
            {Math.round(parts.reduce((sum, p) => sum + p.performance, 0) / parts.length)}
            <span className="text-xs text-[var(--foreground-muted)] font-normal">/100</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mb-1">
            Avg Reliability
          </p>
          <p className="font-racing text-lg font-bold text-[var(--accent-secondary)]">
            {Math.round(parts.reduce((sum, p) => sum + p.reliability, 0) / parts.length)}
            <span className="text-xs text-[var(--foreground-muted)] font-normal">/100</span>
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {success && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Active Research Notification */}
      {activeUpgrade && (
        <div className="card p-3 mb-4 border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 flex items-center justify-between gap-3 animate-pulse-glow">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent-primary)]"></span>
            </span>
            <span className="text-xs font-semibold text-[var(--foreground-secondary)]">
              Researching {activeUpgrade.category.toUpperCase()} upgrade
            </span>
          </div>
          <CountdownTimer part={activeUpgrade} onComplete={() => router.refresh()} />
        </div>
      )}

      {/* Parts List */}
      <div className="space-y-4">
        {parts.map((part) => {
          const cost = part.level * 1_200_000;
          const isUpgrading = part.upgrade_status === 'researching';
          const canAfford = team.budget >= cost;
          
          return (
            <div key={part.id} className={`card p-4 border transition-all ${
              isUpgrading ? 'border-[var(--accent-primary)]/30 bg-[var(--background-elevated)]/30' : 'border-[var(--border-color)]'
            }`}>
              {/* Part Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--background-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-primary)]">
                    <PartIcon category={part.category} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">
                      {getPartName(part.category)}
                    </h3>
                    <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider font-racing font-bold">
                      Level {part.level}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">
                    Wear
                  </span>
                  <span className={`text-xs font-bold font-racing ${
                    part.wear > 50 ? 'text-[var(--color-danger)]' :
                    part.wear > 25 ? 'text-[var(--color-warning)]' :
                    'text-[var(--foreground-secondary)]'
                  }`}>
                    {part.wear.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Stats & Progress Bars */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Performance */}
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[var(--foreground-muted)]">Performance</span>
                    <span className="font-bold text-[var(--foreground-secondary)] font-racing">{part.performance}</span>
                  </div>
                  <div className="stat-bar">
                    <div
                      className={`stat-bar-fill ${
                        part.performance >= 85 ? 'excellent' :
                        part.performance >= 65 ? 'good' :
                        part.performance >= 40 ? 'average' : 'poor'
                      }`}
                      style={{ width: `${part.performance}%` }}
                    />
                  </div>
                </div>

                {/* Reliability */}
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-[var(--foreground-muted)]">Reliability</span>
                    <span className="font-bold text-[var(--foreground-secondary)] font-racing">{part.reliability}</span>
                  </div>
                  <div className="stat-bar">
                    <div
                      className={`stat-bar-fill ${
                        part.reliability >= 85 ? 'excellent' :
                        part.reliability >= 65 ? 'good' :
                        part.reliability >= 40 ? 'average' : 'poor'
                      }`}
                      style={{ width: `${part.reliability}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-color)]">
                {isUpgrading ? (
                  <div className="w-full flex items-center justify-between text-xs py-1.5 text-[var(--accent-primary)] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5 text-[var(--accent-primary)]" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Research ongoing...
                    </span>
                    <CountdownTimer part={part} onComplete={() => router.refresh()} />
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] text-[var(--foreground-muted)]">
                      Next: Level {part.level + 1} ({Math.round(part.level * 1.5)}m duration)
                    </span>
                    <button
                      disabled={loading !== null || !!activeUpgrade || !canAfford}
                      onClick={() => setUpgradingPart(part)}
                      className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                        loading === part.category ? 'bg-white/5 text-[var(--foreground-muted)] cursor-wait' :
                        activeUpgrade ? 'bg-white/5 text-[var(--foreground-muted)] cursor-not-allowed' :
                        canAfford ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white' :
                        'bg-white/5 text-[var(--foreground-muted)] cursor-not-allowed'
                      }`}
                    >
                      {activeUpgrade ? 'Queue Busy' : `Upgrade (${formatMoney(cost)})`}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade Confirm Modal */}
      {upgradingPart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-sm p-5 border border-[var(--border-color-hover)] bg-[var(--background-card)] shadow-2xl">
            <h3 className="font-racing text-lg font-bold mb-3 text-gradient uppercase">
              Upgrade Component
            </h3>
            
            <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed mb-4">
              Do you want to start researching upgrade for <span className="font-bold text-white">{getPartName(upgradingPart.category)}</span> to <span className="font-bold text-[var(--accent-primary)]">Level {upgradingPart.level + 1}</span>?
            </p>

            <div className="space-y-2 mb-5 text-xs text-[var(--foreground-secondary)] bg-[var(--background)] border border-[var(--border-color)] p-3 rounded-xl">
              <div className="flex justify-between">
                <span>Research Cost:</span>
                <span className="font-bold text-white">{formatMoney(upgradingPart.level * 1_200_000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Required:</span>
                <span className="font-bold text-white">{Math.round(upgradingPart.level * 1.5)} minutes</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                disabled={loading !== null}
                onClick={() => setUpgradingPart(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all text-center"
              >
                Cancel
              </button>
              <button
                disabled={loading !== null}
                onClick={() => handleUpgrade(upgradingPart)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] text-xs font-semibold cursor-pointer transition-all text-center"
              >
                {loading ? 'Upgrading...' : 'Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component Specific SVG Icons ───
function PartIcon({ category }: { category: PartCategory }) {
  if (category === 'engine') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  if (category === 'aero') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    );
  }
  if (category === 'chassis') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    );
  }
  if (category === 'gearbox') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  }
  if (category === 'suspension') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M8 6h8M8 11h8M8 16h8" />
      </svg>
    );
  }
  if (category === 'brakes') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6a6 6 0 0 1 6 6" />
      </svg>
    );
  }
  if (category === 'cooling') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }
  return null;
}

// ─── Live Countdown Timer Child Component ───
function CountdownTimer({
  part,
  onComplete,
}: {
  part: CarPart;
  onComplete: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00');

  useEffect(() => {
    if (!part.upgrade_started_at || !part.upgrade_duration_hours) return;

    const startedTime = new Date(part.upgrade_started_at).getTime();
    // Treatment of duration unit as minutes in dev/fast mode
    const durationMs = part.upgrade_duration_hours * 60 * 1000;
    const finishTime = startedTime + durationMs;

    let timerInterval: NodeJS.Timeout | undefined;

    const updateTimer = () => {
      const remainingMs = finishTime - Date.now();
      
      if (remainingMs <= 0) {
        setTimeLeft('Completed!');
        if (timerInterval) clearInterval(timerInterval);
        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer(); // run once immediately
    timerInterval = setInterval(updateTimer, 1000);

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [part, onComplete]);

  return (
    <span className="font-racing text-xs font-bold tabular-nums">
      {timeLeft}
    </span>
  );
}
