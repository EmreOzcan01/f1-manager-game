'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatTimeRemaining, getFlag } from '@/lib/utils/helpers';
import { useTranslation } from '@/lib/i18n/context';
import type { TireCompound } from '@/types/database';

// ─── Types ──────────────────────────────────

interface Stint {
  id: string;
  compound: TireCompound;
  laps: number;
}

interface StrategyClientProps {
  team: any;
  nextRace: any | null;
  existingStrategies: any[];
  drivers: any[];
}

// ─── Component ──────────────────────────────

export default function StrategyClient({
  team,
  nextRace,
  existingStrategies,
  drivers,
}: StrategyClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  // Translated Tire Options
  const TIRE_OPTIONS: { compound: TireCompound; label: string; color: string; icon: string }[] = useMemo(() => [
    { compound: 'soft', label: t('strat_soft'), color: '#ef4444', icon: 'S' },
    { compound: 'medium', label: t('strat_medium'), color: '#eab308', icon: 'M' },
    { compound: 'hard', label: t('strat_hard'), color: '#f8fafc', icon: 'H' },
    { compound: 'intermediate', label: t('strat_intermediate'), color: '#22c55e', icon: 'I' },
    { compound: 'wet', label: t('strat_wet'), color: '#3b82f6', icon: 'W' },
  ], [t]);

  // Translated Fuel Modes
  const FUEL_MODES = useMemo(() => [
    { value: 'save', label: t('success') === 'Başarılı' ? 'Yakıt Tasarrufu' : 'Fuel Save', icon: '🔋', desc: t('strat_fuel_save') },
    { value: 'standard', label: t('success') === 'Başarılı' ? 'Standart' : 'Standard', icon: '⚡', desc: t('strat_fuel_standard') },
    { value: 'attack', label: t('success') === 'Başarılı' ? 'Atak' : 'Attack', icon: '🔥', desc: t('strat_fuel_attack') },
  ] as const, [t]);

  // Translated Aggression Modes
  const AGGRESSION_MODES = useMemo(() => [
    { value: 'conservative', label: t('success') === 'Başarılı' ? 'Korumacı' : 'Conservative', icon: '🛡️', desc: t('strat_agg_conservative') },
    { value: 'balanced', label: t('success') === 'Başarılı' ? 'Dengeli' : 'Balanced', icon: '⚖️', desc: t('strat_agg_balanced') },
    { value: 'aggressive', label: t('success') === 'Başarılı' ? 'Agresif' : 'Aggressive', icon: '⚔️', desc: t('strat_agg_aggressive') },
  ] as const, [t]);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    drivers.length > 0 ? drivers[0]?.drivers?.id : null
  );

  // We will load the state for the currently selected driver
  const currentStrategy = useMemo(() => {
    if (!selectedDriverId) return null;
    return existingStrategies.find(s => s.driver_id === selectedDriverId) || null;
  }, [existingStrategies, selectedDriverId]);

  // Parse existing strategy or set defaults
  const initialStints: Stint[] = useMemo(() => {
    if (currentStrategy?.tire_plan) {
      return currentStrategy.tire_plan.map((s: any, i: number) => ({
        id: `stint-${i}`,
        compound: s.compound as TireCompound,
        laps: s.laps,
      }));
    }
    if (nextRace) {
      return [
        { id: 'stint-0', compound: 'soft' as TireCompound, laps: Math.floor(nextRace.total_laps * 0.35) },
        { id: 'stint-1', compound: 'medium' as TireCompound, laps: Math.ceil(nextRace.total_laps * 0.65) },
      ];
    }
    return [];
  }, [currentStrategy, nextRace]);

  const [stints, setStints] = useState<Stint[]>(initialStints);
  const [fuelMode, setFuelMode] = useState<string>(currentStrategy?.fuel_mode || 'standard');
  const [aggression, setAggression] = useState<string>(currentStrategy?.aggression || 'balanced');
  const [fuelLoad, setFuelLoad] = useState<number>(currentStrategy?.fuel_load ?? 100);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when selected driver changes
  useEffect(() => {
    if (!selectedDriverId) return;

    const strategyForDriver = existingStrategies.find(s => s.driver_id === selectedDriverId) || null;
    const newStints: Stint[] = strategyForDriver?.tire_plan
      ? strategyForDriver.tire_plan.map((s: any, i: number) => ({
          id: `stint-${i}`,
          compound: s.compound as TireCompound,
          laps: s.laps,
        }))
      : nextRace
      ? [
          { id: `stint-0-${Date.now()}`, compound: 'soft' as TireCompound, laps: Math.floor(nextRace.total_laps * 0.35) },
          { id: `stint-1-${Date.now()}`, compound: 'medium' as TireCompound, laps: Math.ceil(nextRace.total_laps * 0.65) },
        ]
      : [];

    setStints(newStints);
    setFuelMode(strategyForDriver?.fuel_mode || 'standard');
    setAggression(strategyForDriver?.aggression || 'balanced');
    setFuelLoad(strategyForDriver?.fuel_load ?? 100);
    setSaveStatus('idle');
    setErrorMessage(null);
  }, [selectedDriverId, existingStrategies, nextRace]);

  // ─── Stint management ─────────────────────

  // Computed values
  const totalLaps = nextRace?.total_laps || 0;
  const stintLaps = useMemo(() => stints.reduce((sum, s) => sum + s.laps, 0), [stints]);
  const lapsRemaining = totalLaps - stintLaps;
  const isValid = lapsRemaining === 0 && stints.length > 0;
  const pitStops = stints.length > 0 ? stints.length - 1 : 0;

  const addStint = useCallback(() => {
    const remaining = totalLaps - stints.reduce((s, st) => s + st.laps, 0);
    if (remaining <= 0) return;
    setStints(prev => [
      ...prev,
      {
        id: `stint-${Date.now()}`,
        compound: 'medium' as TireCompound,
        laps: remaining,
      },
    ]);
    setSaveStatus('idle');
  }, [stints, totalLaps]);

  const removeStint = useCallback((id: string) => {
    if (stints.length <= 1) return;
    setStints(prev => {
      const filtered = prev.filter(s => s.id !== id);
      // Redistribute remaining laps to last stint
      const usedLaps = filtered.reduce((sum, s) => sum + s.laps, 0);
      const diff = totalLaps - usedLaps;
      if (diff !== 0 && filtered.length > 0) {
        const last = filtered[filtered.length - 1];
        filtered[filtered.length - 1] = { ...last, laps: Math.max(1, last.laps + diff) };
      }
      return filtered;
    });
    setSaveStatus('idle');
  }, [stints, totalLaps]);

  const updateStintCompound = useCallback((id: string, compound: TireCompound) => {
    setStints(prev => prev.map(s => s.id === id ? { ...s, compound } : s));
    setSaveStatus('idle');
  }, []);

  const updateStintLaps = useCallback((id: string, laps: number) => {
    setStints(prev => prev.map(s => s.id === id ? { ...s, laps: Math.max(1, laps) } : s));
    setSaveStatus('idle');
  }, []);

  // ─── Save handler ─────────────────────────

  const handleSave = async () => {
    if (!isValid || !nextRace || !selectedDriverId) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceId: nextRace.id,
          driverId: selectedDriverId,
          tirePlan: stints.map(s => ({ compound: s.compound, laps: s.laps })),
          fuelLoad,
          fuelMode,
          aggression,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save strategy');

      setSaveStatus('saved');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setErrorMessage(msg);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // ─── No race state ────────────────────────

  if (!nextRace) {
    return (
      <div className="px-4 pt-4">
        <h1 className="font-racing text-xl font-bold text-gradient mb-4">{t('strat_title')}</h1>
        <div className="card p-8 text-center">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm font-semibold mb-1">{t('strat_no_upcoming_race')}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            {t('success') === 'Başarılı' ? 'Programlanmış yarış bulunmuyor. Daha sonra tekrar kontrol edin!' : 'There are no races scheduled. Check back later!'}
          </p>
        </div>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="px-4 pt-4">
        <h1 className="font-racing text-xl font-bold text-gradient mb-4">{t('strat_title')}</h1>
        <div className="card p-8 text-center border border-red-500/20 bg-red-500/5">
          <p className="text-3xl mb-2">🏎️</p>
          <p className="text-sm font-semibold mb-1 text-red-400">{t('dash_no_drivers')}</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            {t('success') === 'Başarılı'
              ? 'Yarış stratejisi belirlemeden önce pilot pazarından takımınıza pilot transfer etmelisiniz.'
              : 'You must sign drivers to your team from the Drivers market before you can set a race strategy.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-2 stagger-children">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-racing text-xl font-bold text-gradient">{t('strat_title')}</h1>
        {currentStrategy && saveStatus !== 'saved' && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-[var(--accent-secondary)]/20 text-[var(--accent-secondary)] uppercase tracking-wider font-medium">
            {t('success') === 'Başarılı' ? 'Kaydedildi' : 'Saved'}
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-success)]/20 text-[var(--color-success)] uppercase tracking-wider font-medium animate-fade-in-up">
            {t('success') === 'Başarılı' ? '✓ Güncellendi' : '✓ Updated'}
          </span>
        )}
      </div>

      {/* Race Info Card */}
      <div className="card p-4 mb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.03]">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] uppercase tracking-wider">
            {t('dash_round')} {nextRace.round_number}
          </span>
          <span className="text-xs text-[var(--foreground-muted)]">
            {formatTimeRemaining(nextRace.scheduled_at)}
          </span>
        </div>

        <h2 className="text-base font-bold mb-1">
          {getFlag(nextRace.track_country)} {nextRace.track_name}
        </h2>

        <div className="flex items-center gap-4 text-xs text-[var(--foreground-muted)]">
          <span>{nextRace.track_length_km} km</span>
          <span>•</span>
          <span className="font-semibold text-[var(--foreground)]">{nextRace.total_laps} {t('strat_laps')}</span>
          <span>•</span>
          <span>{nextRace.track_country}</span>
        </div>
      </div>

      {/* Driver Tabs */}
      <div className="flex gap-2 mb-4">
        {drivers.map(td => {
          const d = td.drivers;
          if (!d) return null;
          const isSelected = selectedDriverId === d.id;
          const hasStrategy = existingStrategies.some(s => s.driver_id === d.id);
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDriverId(d.id)}
              className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-between transition-colors ${
                isSelected
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'bg-[var(--background-card)] border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-[var(--foreground-secondary)]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">{getFlag(d.nationality)}</span>
                <span className="text-xs font-bold font-racing">{d.name}</span>
              </div>
              {hasStrategy && <span className="text-[10px] text-[var(--color-success)] font-bold">✓</span>}
            </button>
          );
        })}
      </div>

      {/* ─── TIRE STRATEGY ─────────────────── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            {t('strat_tire_strategy')}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${lapsRemaining === 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
              {stintLaps}/{totalLaps} {t('strat_laps')}
            </span>
            <span className="text-[10px] text-[var(--foreground-muted)]">
              {t('success') === 'Başarılı'
                ? `${pitStops} pit stop`
                : `${pitStops} pit stop${pitStops !== 1 ? 's' : ''}`
              }
            </span>
          </div>
        </div>

        {/* Stint Visual Bar */}
        <div className="card p-3 mb-3">
          <div className="flex rounded-lg overflow-hidden h-8 mb-2">
            {stints.map((stint, i) => {
              const tireData = TIRE_OPTIONS.find(t => t.compound === stint.compound);
              const width = totalLaps > 0 ? (stint.laps / totalLaps) * 100 : 0;
              return (
                <div
                  key={stint.id}
                  className="flex items-center justify-center text-[10px] font-bold transition-all duration-300 relative"
                  style={{
                    width: `${width}%`,
                    backgroundColor: tireData?.color || '#666',
                    color: stint.compound === 'hard' ? '#111' : '#fff',
                    minWidth: '24px',
                  }}
                >
                  <span className="drop-shadow-sm">{tireData?.icon}{stint.laps}L</span>
                  {i < stints.length - 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-[var(--background)]" />
                  )}
                </div>
              );
            })}
            {lapsRemaining > 0 && (
              <div
                className="flex items-center justify-center text-[10px] text-[var(--foreground-muted)] bg-[var(--background)] border border-dashed border-[var(--border-color)]"
                style={{ width: `${(lapsRemaining / totalLaps) * 100}%`, minWidth: '24px' }}
              >
                +{lapsRemaining}
              </div>
            )}
          </div>

          {/* Lap markers */}
          <div className="flex justify-between text-[9px] text-[var(--foreground-muted)] px-0.5">
            <span>{t('success') === 'Başarılı' ? 'Tur 1' : 'Lap 1'}</span>
            {stints.length > 1 && (() => {
              let lap = 0;
              return stints.slice(0, -1).map((s, i) => {
                lap += s.laps;
                return <span key={i} className="text-[var(--accent-secondary)]">{t('success') === 'Başarılı' ? 'Pit T' : 'Pit L'}{lap}</span>;
              });
            })()}
            <span>{t('success') === 'Başarılı' ? 'Tur' : 'Lap'} {totalLaps}</span>
          </div>
        </div>

        {/* Stint Cards */}
        <div className="space-y-2 mb-3">
          {stints.map((stint, index) => (
            <StintCard
              key={stint.id}
              stint={stint}
              index={index}
              totalStints={stints.length}
              totalLaps={totalLaps}
              currentTotalLaps={stintLaps}
              onUpdateCompound={(compound) => updateStintCompound(stint.id, compound)}
              onUpdateLaps={(laps) => updateStintLaps(stint.id, laps)}
              onRemove={() => removeStint(stint.id)}
            />
          ))}
        </div>

        {/* Add Stint Button */}
        {lapsRemaining > 0 && (
          <button
            onClick={addStint}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-[var(--border-color)] text-xs text-[var(--foreground-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
            id="btn-add-stint"
          >
            + {t('strat_add_stint')} ({lapsRemaining} {t('strat_laps')} {t('success') === 'Başarılı' ? 'kaldı' : 'remaining'})
          </button>
        )}

        {lapsRemaining < 0 && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            ⚠️ {Math.abs(lapsRemaining)} extra laps assigned! Reduce stint lengths.
          </div>
        )}
      </div>

      {/* ─── FUEL MODE ─────────────────────── */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
          {t('success') === 'Başarılı' ? 'Yakıt Stratejisi' : 'Fuel Strategy'}
        </h3>
        <div className="card p-3">
          {/* Fuel Load Slider */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--foreground-secondary)]">{t('success') === 'Başarılı' ? 'Yakıt Yükü' : 'Fuel Load'}</span>
              <span className="text-xs font-mono font-bold text-[var(--accent-secondary)]">{fuelLoad} kg</span>
            </div>
            <input
              type="range"
              min={80}
              max={110}
              step={1}
              value={fuelLoad}
              onChange={e => { setFuelLoad(Number(e.target.value)); setSaveStatus('idle'); }}
              className="range-slider"
              id="slider-fuel-load"
            />
            <div className="flex justify-between text-[9px] text-[var(--foreground-muted)] mt-1">
              <span>{t('success') === 'Başarılı' ? 'Hafif (80kg)' : 'Light (80kg)'}</span>
              <span>{t('success') === 'Başarılı' ? 'Dolu (110kg)' : 'Full (110kg)'}</span>
            </div>
          </div>

          {/* Fuel Mode Select */}
          <div className="grid grid-cols-3 gap-2">
            {FUEL_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => { setFuelMode(mode.value); setSaveStatus('idle'); }}
                className={`p-2.5 rounded-xl text-center transition-all duration-200 ${
                  fuelMode === mode.value
                    ? 'bg-[var(--accent-primary)]/15 border-2 border-[var(--accent-primary)] shadow-sm'
                    : 'bg-[var(--background)] border-2 border-[var(--border-color)] hover:border-[var(--foreground-muted)]'
                }`}
                id={`btn-fuel-${mode.value}`}
              >
                <div className="text-lg mb-0.5">{mode.icon}</div>
                <div className={`text-[10px] font-semibold ${fuelMode === mode.value ? 'text-[var(--accent-primary)]' : 'text-[var(--foreground)]'}`}>
                  {mode.label}
                </div>
                <div className="text-[8px] text-[var(--foreground-muted)] mt-0.5 leading-tight">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── AGGRESSION MODE ───────────────── */}
      <div className="mb-5">
        <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
          {t('success') === 'Başarılı' ? 'Sürüş Tarzı' : 'Driving Style'}
        </h3>
        <div className="card p-3">
          <div className="grid grid-cols-3 gap-2">
            {AGGRESSION_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => { setAggression(mode.value); setSaveStatus('idle'); }}
                className={`p-2.5 rounded-xl text-center transition-all duration-200 ${
                  aggression === mode.value
                    ? 'bg-[var(--accent-secondary)]/15 border-2 border-[var(--accent-secondary)] shadow-sm'
                    : 'bg-[var(--background)] border-2 border-[var(--border-color)] hover:border-[var(--foreground-muted)]'
                }`}
                id={`btn-aggression-${mode.value}`}
              >
                <div className="text-lg mb-0.5">{mode.icon}</div>
                <div className={`text-[10px] font-semibold ${aggression === mode.value ? 'text-[var(--accent-secondary)]' : 'text-[var(--foreground)]'}`}>
                  {mode.label}
                </div>
                <div className="text-[8px] text-[var(--foreground-muted)] mt-0.5 leading-tight">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── STRATEGY SUMMARY ──────────────── */}
      <div className="card p-4 mb-4">
        <h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
          {t('success') === 'Başarılı' ? 'Strateji Özeti' : 'Strategy Summary'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <SummaryItem label={t('success') === 'Başarılı' ? 'Pit Stoplar' : 'Pit Stops'} value={`${pitStops}`} />
          <SummaryItem label={t('success') === 'Başarılı' ? 'Yakıt Yükü' : 'Fuel Load'} value={`${fuelLoad} kg`} />
          <SummaryItem label={t('success') === 'Başarılı' ? 'Motor Modu' : 'Fuel Mode'} value={t('success') === 'Başarılı' ? (fuelMode === 'save' ? 'Yakıt Tasarrufu' : fuelMode === 'standard' ? 'Standart' : 'Atak') : fuelMode.charAt(0).toUpperCase() + fuelMode.slice(1)} />
          <SummaryItem label={t('success') === 'Başarılı' ? 'Agresiflik' : 'Aggression'} value={t('success') === 'Başarılı' ? (aggression === 'conservative' ? 'Korumacı' : aggression === 'balanced' ? 'Dengeli' : 'Agresif') : aggression.charAt(0).toUpperCase() + aggression.slice(1)} />
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-[var(--foreground-muted)]">{t('success') === 'Başarılı' ? 'Lastik sırası:' : 'Tire order:'}</span>
            {stints.map((s, i) => {
              const tdOptions = TIRE_OPTIONS.find(tOption => tOption.compound === s.compound);
              return (
                <span key={i} className="inline-flex items-center gap-0.5">
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                    style={{
                      backgroundColor: tdOptions?.color || '#666',
                      color: s.compound === 'hard' ? '#111' : '#fff',
                    }}
                  >
                    {tdOptions?.icon}
                  </span>
                  <span className="text-[10px] text-[var(--foreground-secondary)]">{s.laps}L</span>
                  {i < stints.length - 1 && (
                    <span className="text-[10px] text-[var(--foreground-muted)] mx-0.5">→</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 animate-fade-in-up">
          {errorMessage}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        className={`btn-primary w-full text-sm mb-4 ${!isValid ? 'opacity-50 cursor-not-allowed' : ''}`}
        id="btn-save-strategy"
      >
        {saving 
          ? t('loading') 
          : currentStrategy 
            ? (t('success') === 'Başarılı' ? 'Stratejiyi Güncelle 📋' : 'Update Strategy 📋') 
            : (t('success') === 'Başarılı' ? 'Stratejiyi Kaydet 📋' : 'Save Strategy 📋')
        }
      </button>

      {!isValid && stints.length > 0 && (
        <p className="text-center text-[10px] text-[var(--foreground-muted)] -mt-2 mb-4">
          {lapsRemaining > 0
            ? `Assign ${lapsRemaining} more laps to complete strategy`
            : `Remove ${Math.abs(lapsRemaining)} excess laps`
          }
        </p>
      )}
    </div>
  );
}

// ─── Stint Card Component ───────────────────

function StintCard({
  stint,
  index,
  totalStints,
  totalLaps,
  currentTotalLaps,
  onUpdateCompound,
  onUpdateLaps,
  onRemove,
}: {
  stint: Stint;
  index: number;
  totalStints: number;
  totalLaps: number;
  currentTotalLaps: number;
  onUpdateCompound: (compound: TireCompound) => void;
  onUpdateLaps: (laps: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [showCompoundPicker, setShowCompoundPicker] = useState(false);

  const TIRE_OPTIONS = useMemo(() => [
    { compound: 'soft' as TireCompound, label: t('strat_soft'), color: '#ef4444', icon: 'S' },
    { compound: 'medium' as TireCompound, label: t('strat_medium'), color: '#eab308', icon: 'M' },
    { compound: 'hard' as TireCompound, label: t('strat_hard'), color: '#f8fafc', icon: 'H' },
    { compound: 'intermediate' as TireCompound, label: t('strat_intermediate'), color: '#22c55e', icon: 'I' },
    { compound: 'wet' as TireCompound, label: t('strat_wet'), color: '#3b82f6', icon: 'W' },
  ], [t]);

  const tireData = TIRE_OPTIONS.find(tOption => tOption.compound === stint.compound);

  return (
    <div className="card p-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[var(--foreground-muted)] uppercase tracking-wider">
            {t('success') === 'Başarılı' ? 'Stint' : 'Stint'}
          </span>
          <span className="font-racing text-sm font-bold">{index + 1}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowCompoundPicker(!showCompoundPicker)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-colors"
          id={`btn-tire-stint-${index}`}
        >
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: tireData?.color || '#666',
              color: stint.compound === 'hard' ? '#111' : '#fff',
            }}
          >
            {tireData?.icon}
          </span>
          <span className="text-xs font-medium">{tireData?.label}</span>
          <svg className={`w-3 h-3 text-[var(--foreground-muted)] transition-transform ${showCompoundPicker ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            type="button"
            onClick={() => onUpdateLaps(stint.laps - 1)}
            disabled={stint.laps <= 1}
            className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border-color)] flex items-center justify-center text-sm hover:border-[var(--accent-primary)] transition-colors disabled:opacity-30"
          >
            −
          </button>
          <div className="text-center min-w-[40px]">
            <span className="font-racing text-sm font-bold">{stint.laps}</span>
            <span className="text-[9px] text-[var(--foreground-muted)] block -mt-0.5">{t('strat_laps')}</span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateLaps(stint.laps + 1)}
            className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--border-color)] flex items-center justify-center text-sm hover:border-[var(--accent-primary)] transition-colors"
          >
            +
          </button>
        </div>

        {totalStints > 1 && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            id={`btn-remove-stint-${index}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {showCompoundPicker && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex gap-2 animate-fade-in-up">
          {TIRE_OPTIONS.map(tire => (
            <button
              key={tire.compound}
              type="button"
              onClick={() => { onUpdateCompound(tire.compound); setShowCompoundPicker(false); }}
              className={`flex-1 py-2 rounded-lg text-center transition-all ${
                stint.compound === tire.compound
                  ? 'ring-2 ring-offset-1 ring-offset-[var(--background-card)]'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor: `${tire.color}22`,
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mx-auto mb-0.5"
                style={{ backgroundColor: tire.color, color: tire.compound === 'hard' ? '#111' : '#fff' }}
              >
                {tire.icon}
              </span>
              <span className="text-[9px] text-[var(--foreground-secondary)]">{tire.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Item Component ─────────────────

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--background)] p-2.5 text-center">
      <p className="text-[9px] text-[var(--foreground-muted)] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
