'use client';

import { useState } from 'react';
import { isCurrentlyInDrsZone } from '@/lib/canvas/track-geometry';
import { useTranslation } from '@/lib/i18n/context';
import type { RaceFrame, FramePosition } from '@/types/database';

interface TelemetryPanelProps {
  activeFrame: RaceFrame | null;
  prevFrame: RaceFrame | null;
  playerTeamId: string | null;
  focusedDriverId?: string | null;
  onDriverClick?: (driverId: string) => void;
  progress: number;
  trackName: string;
  baseLapTime: number;
}

export default function TelemetryPanel({
  activeFrame,
  prevFrame,
  playerTeamId,
  focusedDriverId,
  onDriverClick,
  progress,
  trackName,
  baseLapTime,
}: TelemetryPanelProps) {
  const [activeTab, setActiveTab] = useState<'standings' | 'events'>('standings');
  const { t } = useTranslation();

  if (!activeFrame) {
    return (
      <div className="card p-8 text-center text-[var(--foreground-muted)] text-sm">
        {t('success') === 'Başarılı' ? 'Telemetri verisi yüklenmedi.' : 'No frame telemetry loaded.'}
      </div>
    );
  }

  // Get tire compound styling
  const getTireBadgeStyle = (compound: string) => {
    switch (compound) {
      case 'soft':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'S' };
      case 'medium':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', label: 'M' };
      case 'hard':
        return { bg: 'rgba(241, 241, 246, 0.15)', text: '#d1d5db', label: 'H' };
      case 'intermediate':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', label: 'I' };
      case 'wet':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', label: 'W' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', label: '?' };
    }
  };

  // Render event icon
  const getEventIcon = (eventText: string) => {
    const text = eventText.toLowerCase();
    if (text.includes('overtaken') || text.includes('overtake') || text.includes('⚡')) return '⚡';
    if (text.includes('pit') || text.includes('pitted')) return '🔧';
    if (text.includes('retired') || text.includes('crash') || text.includes('puncture') || text.includes('accident')) return '⚠️';
    return '🏁';
  };

  // Filter running (non-DNF) cars to calculate interval gaps
  const runningCars = activeFrame.positions.filter((p) => p.status !== 'dnf');

  return (
    <div className="card h-full flex flex-col min-h-[380px] bg-[var(--background-card)]">
      {/* Tabs Header */}
      <div className="flex border-b border-[var(--border-color)]">
        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === 'standings'
              ? 'border-[var(--accent-primary)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
        >
          {t('nav_standings')}
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider relative transition-colors border-b-2 ${
            activeTab === 'events'
              ? 'border-[var(--accent-primary)] text-[var(--foreground)]'
              : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
          }`}
        >
          {t('success') === 'Başarılı' ? 'Tur Olayları' : 'Lap Events'}
          {activeFrame.events.length > 0 && (
            <span className="absolute top-2.5 right-6 w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'standings' ? (
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center text-[10px] uppercase font-bold text-[var(--foreground-muted)] px-3 py-1.5 border-b border-[var(--border-color)]">
              <span className="w-6 text-center">{t('success') === 'Başarılı' ? 'Sıra' : 'Pos'}</span>
              <span className="flex-1 ml-4">{t('success') === 'Başarılı' ? 'Pilot / Takım' : 'Driver / Team'}</span>
              <span className="w-12 text-center">{t('success') === 'Başarılı' ? 'Lastik' : 'Tyre'}</span>
              <span className="w-14 text-center">{t('success') === 'Başarılı' ? 'Yakıt' : 'Fuel'}</span>
              <span className="w-20 text-right">{t('success') === 'Başarılı' ? 'Fark (Ldr/Int)' : 'Gap (Ldr/Int)'}</span>
            </div>

            {/* Standings List */}
            {activeFrame.positions.map((car: FramePosition) => {
              const isPlayer = car.team_id === playerTeamId;
              const isDnf = car.status === 'dnf';
              const isPit = car.in_pit && !isDnf;
              const tireStyle = getTireBadgeStyle(car.tire);
              const isFocused = car.driver_id === focusedDriverId;

              // Calculate interval gap (gap to the car directly in front)
              let intervalGap = 0;
              if (!isDnf) {
                const runningIdx = runningCars.findIndex((p) => p.driver_id === car.driver_id);
                if (runningIdx > 0) {
                  const carAhead = runningCars[runningIdx - 1];
                  intervalGap = car.gap_to_leader - carAhead.gap_to_leader;
                }
              }

              // Dynamic DRS Zone Activation check (based on current track coordinates progress)
              let isDrsActiveInStraight = false;
              if (car.drs_active && !isDnf && !isPit) {
                const pCar = prevFrame?.positions.find((p) => p.driver_id === car.driver_id);
                const prevGap = pCar ? pCar.gap_to_leader : (car.position * 0.15);
                const interpolatedGap = prevGap + progress * (car.gap_to_leader - prevGap);
                let carProgress = progress - (interpolatedGap / baseLapTime);
                carProgress = ((carProgress % 1) + 1) % 1;
                isDrsActiveInStraight = isCurrentlyInDrsZone(trackName, carProgress);
              }

              return (
                <div
                  key={car.driver_id}
                  onClick={() => !isDnf && onDriverClick?.(car.driver_id)}
                  className={`flex items-center px-3 py-2 rounded-xl transition-all border cursor-pointer ${
                    isDnf ? 'opacity-40 bg-black/10 cursor-not-allowed' : ''
                  } ${
                    isFocused
                      ? 'bg-[var(--accent-secondary)]/10 border-[var(--accent-secondary)]/35 shadow-[0_0_12px_rgba(37,99,235,0.06)]'
                      : isPlayer
                      ? 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 shadow-[0_0_12px_rgba(220,38,38,0.02)]'
                      : 'hover:bg-[var(--background-elevated)]/45 border-transparent'
                  }`}
                >
                  {/* Position number */}
                  <span
                    className={`font-racing text-xs w-6 text-center ${
                      isDnf
                        ? 'text-[var(--foreground-muted)]'
                        : car.position === 1
                        ? 'text-[#fbbf24] font-bold'
                        : car.position === 2
                        ? 'text-[#94a3b8]'
                        : car.position === 3
                        ? 'text-[#d97706]'
                        : 'text-[var(--foreground-secondary)]'
                    }`}
                  >
                    {isDnf ? '—' : car.position}
                  </span>

                  {/* Team color badge & Driver name */}
                  <div
                    className="w-1 h-7 rounded-sm flex-shrink-0 ml-1.5"
                    style={{ backgroundColor: car.team_color || '#666' }}
                  />

                  <div className="flex-1 min-w-0 ml-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isPlayer ? 'text-[var(--foreground)] font-bold' : 'text-[var(--foreground-secondary)]'
                        }`}
                      >
                        {car.driver_name}
                      </span>
                      {isPlayer && (
                        <span className="text-[9px] font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-1 rounded-sm">
                          {t('success') === 'Başarılı' ? 'TAKIMIM' : 'MY TEAM'}
                        </span>
                      )}
                      {isPit && (
                        <span className="text-[9px] font-bold text-[#fbbf24] bg-[#fbbf24]/10 px-1 rounded-sm animate-pulse">
                          PIT
                        </span>
                      )}
                      {isDnf && (
                        <span className="text-[9px] font-bold text-[var(--color-danger)] bg-[var(--color-danger)]/10 px-1 rounded-sm">
                          DNF
                        </span>
                      )}
                      {isDrsActiveInStraight && (
                        <span className="text-[9px] font-bold text-[var(--color-success)] bg-[var(--color-success)]/10 px-1 rounded-sm">
                          DRS
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-[var(--foreground-muted)] truncate">
                      {car.team_name}
                    </p>
                  </div>

                  {/* Tyres wear */}
                  <div className="w-12 flex flex-col items-center justify-center flex-shrink-0">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-center w-6 h-5"
                      style={{ backgroundColor: tireStyle.bg, color: tireStyle.text }}
                    >
                      {tireStyle.label}
                    </span>
                    <span className="text-[9px] text-[var(--foreground-muted)] mt-0.5">
                      {car.tire_wear}%
                    </span>
                  </div>

                  {/* Fuel remaining */}
                  <div className="w-14 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-[var(--foreground-secondary)]">
                      {car.fuel_remaining} kg
                    </span>
                    <div className="w-8 h-1 bg-[var(--background-elevated)] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[var(--color-success)]"
                        style={{ width: `${Math.min(100, (car.fuel_remaining / 110) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Dual Gap representation (Ldr/Int) */}
                  <div className="w-20 text-right flex-shrink-0 pr-1 flex flex-col justify-center">
                    {isDnf ? (
                      <span className="text-[10px] text-[var(--color-danger)] font-medium">
                        {t('success') === 'Başarılı' ? 'Yarış Dışı' : 'Retired'}
                      </span>
                    ) : car.gap_to_leader === 0 ? (
                      <>
                        <span className="font-racing text-[10px] text-[#fbbf24] font-semibold">
                          {t('success') === 'Başarılı' ? 'LİDER' : 'LEADER'}
                        </span>
                        <span className="text-[9px] text-[var(--foreground-muted)]">—</span>
                      </>
                    ) : car.gap_to_leader >= 999.0 ? (
                      <span className="text-[10px] text-[var(--foreground-muted)]">OUT</span>
                    ) : (
                      <>
                        <span className="font-racing text-[10px] font-semibold text-[var(--foreground-secondary)]">
                          +{car.gap_to_leader.toFixed(3)}s
                        </span>
                        <span className="font-racing text-[9px] text-[var(--foreground-muted)]">
                          +{intervalGap.toFixed(3)}s
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {activeFrame.events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--foreground-muted)]">
                <span className="text-2xl mb-2">🏁</span>
                <p className="text-xs">
                  {t('success') === 'Başarılı'
                    ? 'Bu turda önemli bir olay veya strateji hamlesi gerçekleşmedi.'
                    : 'No major incidents or strategy moves on this lap.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeFrame.events.map((event, idx) => {
                  const icon = getEventIcon(event);
                  let iconColorClass = 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10';
                  if (icon === '⚡') iconColorClass = 'text-[var(--accent-secondary)] bg-[var(--accent-secondary)]/10';
                  if (icon === '🔧') iconColorClass = 'text-[#fbbf24] bg-[#fbbf24]/10';

                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[var(--background-elevated)]/50 border border-[var(--border-color)] animate-fade-in-up"
                    >
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${iconColorClass}`}
                      >
                        {icon}
                      </span>
                      <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed pt-0.5">
                        {event}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
