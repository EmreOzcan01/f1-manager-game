'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, getFlag } from '@/lib/utils/helpers';
import type { Team, Driver } from '@/types/database';
import type { DriverWithContract } from '@/types/game';

interface DriversClientProps {
  team: Team;
  initialCurrentDrivers: any[];
  initialFreeAgents: Driver[];
  currentSeason: number;
}

export default function DriversClient({
  team,
  initialCurrentDrivers,
  initialFreeAgents,
  currentSeason,
}: DriversClientProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'market'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pace' | 'salary' | 'age' | 'overall'>('overall');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [signingDriver, setSigningDriver] = useState<Driver | null>(null);
  const [signingSeat, setSigningSeat] = useState<1 | 2>(1);
  const [releasingDriver, setReleasingDriver] = useState<any | null>(null);

  const router = useRouter();

  // Map drivers to have overall rating
  const getOverallRating = (d: Driver) => {
    return Math.round(
      d.pace * 0.35 +
      d.racecraft * 0.25 +
      d.awareness * 0.15 +
      d.experience * 0.10 +
      d.consistency * 0.15
    );
  };

  // Roster checks
  const seat1Driver = initialCurrentDrivers.find(d => d.seat_number === 1);
  const seat2Driver = initialCurrentDrivers.find(d => d.seat_number === 2);

  // Filter and sort free agents
  const filteredFreeAgents = initialFreeAgents
    .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'overall') {
        return getOverallRating(b) - getOverallRating(a);
      }
      if (sortBy === 'pace') {
        return b.pace - a.pace;
      }
      if (sortBy === 'salary') {
        return a.salary - b.salary; // cheaper first
      }
      if (sortBy === 'age') {
        return a.age - b.age; // younger first
      }
      return 0;
    });

  const handleSign = async () => {
    if (!signingDriver) return;
    setLoading('signing');
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/drivers/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: signingDriver.id,
          seatNumber: signingSeat,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign driver');
      }

      setSuccess(`Successfully signed ${signingDriver.name} to Seat #${signingSeat}!`);
      setSigningDriver(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(null);
    }
  };

  const handleRelease = async () => {
    if (!releasingDriver) return;
    setLoading('releasing');
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/drivers/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: releasingDriver.drivers.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to release driver');
      }

      setSuccess(`Successfully released ${releasingDriver.drivers.name}.`);
      setReleasingDriver(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(null);
    }
  };

  const renderStatBar = (label: string, value: number) => {
    return (
      <div>
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-[var(--foreground-muted)]">{label}</span>
          <span className="font-racing font-bold text-[var(--foreground-secondary)]">{value}</span>
        </div>
        <div className="stat-bar">
          <div
            className={`stat-bar-fill ${
              value >= 85 ? 'excellent' :
              value >= 70 ? 'good' :
              value >= 50 ? 'average' : 'poor'
            }`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-4 pb-2 stagger-children relative min-h-[90dvh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
            Management
          </p>
          <h1 className="text-xl font-bold font-racing text-gradient">
            DRIVERS
          </h1>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-color)] text-right">
          <p className="text-[10px] text-[var(--foreground-muted)] uppercase">Budget</p>
          <p className="text-sm font-bold text-[var(--color-success)]">
            {formatMoney(team.budget)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-xl mb-5">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-[var(--background-elevated)] text-white shadow-sm border border-[var(--border-color)]'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
        >
          Your Roster
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === 'market'
              ? 'bg-[var(--background-elevated)] text-white shadow-sm border border-[var(--border-color)]'
              : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
        >
          Driver Market
        </button>
      </div>

      {/* Feedbacks */}
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

      {/* Roster Tab */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Seat 1 */}
          <div className="relative">
            <div className="absolute -top-2 left-4 px-2 py-0.5 rounded bg-[var(--accent-primary)] text-[9px] font-bold text-white uppercase tracking-wider z-10">
              Seat #1
            </div>
            {seat1Driver ? (
              <DriverCard
                driverRecord={seat1Driver}
                getOverallRating={getOverallRating}
                renderStatBar={renderStatBar}
                onRelease={() => setReleasingDriver(seat1Driver)}
              />
            ) : (
              <EmptySeatCard seatNumber={1} onClick={() => setActiveTab('market')} />
            )}
          </div>

          {/* Seat 2 */}
          <div className="relative pt-2">
            <div className="absolute top-0 left-4 px-2 py-0.5 rounded bg-[var(--accent-secondary)] text-[9px] font-bold text-white uppercase tracking-wider z-10">
              Seat #2
            </div>
            {seat2Driver ? (
              <DriverCard
                driverRecord={seat2Driver}
                getOverallRating={getOverallRating}
                renderStatBar={renderStatBar}
                onRelease={() => setReleasingDriver(seat2Driver)}
              />
            ) : (
              <EmptySeatCard seatNumber={2} onClick={() => setActiveTab('market')} />
            )}
          </div>
        </div>
      )}

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--background-secondary)] border border-[var(--border-color)] text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[var(--background-secondary)] border border-[var(--border-color)] text-xs text-[var(--foreground-secondary)] focus:outline-none"
            >
              <option value="overall">Sort: Rating</option>
              <option value="pace">Sort: Pace</option>
              <option value="salary">Sort: Salary</option>
              <option value="age">Sort: Age</option>
            </select>
          </div>

          {/* Market List */}
          <div className="space-y-3">
            {filteredFreeAgents.length > 0 ? (
              filteredFreeAgents.map((d) => {
                const overall = getOverallRating(d);
                const canAfford = team.budget >= d.contract_price;
                return (
                  <div key={d.id} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--background-elevated)] border border-[var(--border-color)] flex items-center justify-center text-lg flex-shrink-0">
                        {getFlag(d.nationality)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm truncate">{d.name}</p>
                          <span className="text-[10px] text-[var(--foreground-muted)]">Age {d.age}</span>
                        </div>
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          Pace: <span className="font-bold text-[var(--foreground-secondary)]">{d.pace}</span> • 
                          Salary: <span className="text-[var(--color-success)]">{formatMoney(d.salary)}/yr</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-racing text-base font-black text-gradient block">
                          {overall}
                        </span>
                        <span className="text-[9px] text-[var(--foreground-muted)] uppercase tracking-wider block">
                          Rating
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSigningDriver(d);
                          // Default seat target is the first free seat, or seat 1
                          if (!seat1Driver) setSigningSeat(1);
                          else if (!seat2Driver) setSigningSeat(2);
                          else setSigningSeat(1);
                        }}
                        className={`text-[10px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                          canAfford 
                            ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white' 
                            : 'bg-white/5 text-[var(--foreground-muted)] cursor-not-allowed'
                        }`}
                      >
                        Sign ({formatMoney(d.contract_price)})
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card p-8 text-center">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-xs text-[var(--foreground-muted)]">No free agent drivers found matching query.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signing Modal */}
      {signingDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-sm p-5 border border-[var(--border-color-hover)] bg-[var(--background-card)] shadow-2xl">
            <h3 className="font-racing text-lg font-bold mb-3 text-gradient uppercase">
              Sign Driver Contract
            </h3>

            <div className="flex gap-3 items-center p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--background-elevated)] flex items-center justify-center text-xl">
                {getFlag(signingDriver.nationality)}
              </div>
              <div>
                <p className="font-bold text-sm">{signingDriver.name}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Overall Rating: <span className="font-racing font-bold text-[var(--accent-primary)]">{getOverallRating(signingDriver)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-xs text-[var(--foreground-secondary)]">
              <div className="flex justify-between">
                <span>Contract Price (Fee)</span>
                <span className="font-bold text-white">{formatMoney(signingDriver.contract_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Salary</span>
                <span className="font-bold text-[var(--color-success)]">{formatMoney(signingDriver.salary)} / season</span>
              </div>
              <hr className="border-[var(--border-color)]" />
              
              {/* Target Seat Selection */}
              <div>
                <label className="block text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider mb-1.5 font-semibold">
                  Select Seat
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSigningSeat(1)}
                    className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      signingSeat === 1
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-white'
                        : 'border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-white'
                    }`}
                  >
                    Seat #1 {seat1Driver ? '(Replaces current)' : '(Empty)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSigningSeat(2)}
                    className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      signingSeat === 2
                        ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10 text-white'
                        : 'border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-white'
                    }`}
                  >
                    Seat #2 {seat2Driver ? '(Replaces current)' : '(Empty)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                disabled={loading !== null}
                onClick={() => setSigningDriver(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all text-center"
              >
                Cancel
              </button>
              <button
                disabled={loading !== null}
                onClick={handleSign}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] text-xs font-semibold cursor-pointer transition-all text-center"
              >
                {loading === 'signing' ? 'Signing...' : 'Sign Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Releasing Modal */}
      {releasingDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-sm p-5 border border-red-500/20 bg-[var(--background-card)] shadow-2xl">
            <h3 className="font-racing text-lg font-bold mb-3 text-red-500 uppercase">
              Release Driver
            </h3>
            
            <p className="text-xs text-[var(--foreground-muted)] mb-4 leading-relaxed">
              Are you sure you want to release <span className="font-bold text-white">{releasingDriver.drivers.name}</span> from Seat #{releasingDriver.seat_number}? 
              This will immediately vacate the seat and make them a free agent.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                disabled={loading !== null}
                onClick={() => setReleasingDriver(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all text-center"
              >
                Cancel
              </button>
              <button
                disabled={loading !== null}
                onClick={handleRelease}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer transition-all text-center"
              >
                {loading === 'releasing' ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Driver Card Child Component ───
function DriverCard({
  driverRecord,
  getOverallRating,
  renderStatBar,
  onRelease,
}: {
  driverRecord: any;
  getOverallRating: (d: Driver) => number;
  renderStatBar: (label: string, value: number) => React.ReactNode;
  onRelease: () => void;
}) {
  const d = driverRecord.drivers;
  if (!d) return null;
  const overall = getOverallRating(d);

  return (
    <div className="card p-4 space-y-4 border border-[var(--border-color-hover)]">
      {/* Bio Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--background-secondary)] border border-[var(--border-color)] flex items-center justify-center text-2xl flex-shrink-0">
            {getFlag(d.nationality)}
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">{d.name}</h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {d.nationality} • Age {d.age}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="font-racing text-2xl font-black text-gradient block">
            {overall}
          </span>
          <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">
            Overall
          </span>
        </div>
      </div>

      {/* Contract & Financial Info */}
      <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border-color)] grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">Salary</span>
          <span className="font-semibold text-white">{formatMoney(d.salary)} / Season</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wider block">Contract Ends</span>
          <span className="font-semibold text-white">Season {driverRecord.contract_end_season}</span>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {renderStatBar('Pace', d.pace)}
        {renderStatBar('Racecraft', d.racecraft)}
        {renderStatBar('Awareness', d.awareness)}
        {renderStatBar('Experience', d.experience)}
        {renderStatBar('Consistency', d.consistency)}
        {renderStatBar('Morale', d.morale)}
      </div>

      {/* Actions */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onRelease}
          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold cursor-pointer"
        >
          Release Driver
        </button>
      </div>
    </div>
  );
}

// ─── Empty Seat Placeholder Component ───
function EmptySeatCard({
  seatNumber,
  onClick,
}: {
  seatNumber: 1 | 2;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-8 rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--border-color-hover)] bg-white/[0.01] hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-full bg-[var(--background-elevated)] flex items-center justify-center text-lg text-[var(--foreground-muted)] group-hover:text-[var(--accent-primary)] group-hover:scale-110 transition-all">
        +
      </div>
      <p className="text-sm font-semibold text-[var(--foreground-secondary)] group-hover:text-white transition-colors">
        Assign Driver to Seat #{seatNumber}
      </p>
      <p className="text-xs text-[var(--foreground-muted)]">
        Click to browse drivers in the transfer market
      </p>
    </button>
  );
}
