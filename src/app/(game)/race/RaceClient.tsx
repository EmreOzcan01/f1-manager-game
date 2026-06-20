'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRaceStore } from '@/stores/useRaceStore';
import RaceCanvas from '@/components/game/RaceCanvas';
import TelemetryPanel from '@/components/game/TelemetryPanel';
import { getFlag, formatLapTime } from '@/lib/utils/helpers';
import type { SimulationData } from '@/types/database';

interface RaceClientProps {
  race: {
    id: string;
    track_name: string;
    track_country: string;
    total_laps: number;
    weather_condition: string | null;
    temperature: number | null;
  };
  simulationData: SimulationData;
  playerTeamId: string | null;
  baseLapTime: number;
}

export default function RaceClient({
  race,
  simulationData,
  playerTeamId,
  baseLapTime,
}: RaceClientProps) {
  const {
    loadRace,
    currentFrame,
    totalFrames,
    isPlaying,
    playbackSpeed,
    play,
    pause,
    setFrame,
    setSpeed,
    reset,
    getCurrentFrame,
  } = useRaceStore();

  // Camera Mode States
  const [cameraMode, setCameraMode] = useState<'map' | 'driver'>('map');
  const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<number>(0);

  // Load simulation data on mount and clean up on unmount
  useEffect(() => {
    loadRace(race.id, simulationData);
    return () => {
      reset();
    };
  }, [race.id, simulationData, loadRace, reset]);

  // Compute fastest lap info on the client side from final frame
  const fastestLapInfo = useMemo(() => {
    const finalFrame = simulationData.frames[simulationData.frames.length - 1];
    if (!finalFrame) return null;
    
    const validPositions = [...finalFrame.positions]
      .filter((p) => p.lap_time > 0)
      .sort((a, b) => a.lap_time - b.lap_time);

    if (validPositions.length === 0) return null;

    return {
      driverName: validPositions[0].driver_name,
      time: validPositions[0].lap_time,
    };
  }, [simulationData]);

  const activeFrame = getCurrentFrame();

  // Initialize focus on player car when frame is loaded
  useEffect(() => {
    if (activeFrame && !focusedDriverId) {
      const myCar = activeFrame.positions.find(p => p.team_id === playerTeamId);
      if (myCar) setFocusedDriverId(myCar.driver_id);
    }
  }, [activeFrame, playerTeamId, focusedDriverId]);

  if (!activeFrame) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--foreground-muted)] font-medium">
            Initializing telemetry feed...
          </p>
        </div>
      </div>
    );
  }

  // Weather Condition Icon
  const getWeatherIcon = (cond: string | null) => {
    const text = (cond || 'dry').toLowerCase();
    if (text.includes('heavy')) return '⛈️';
    if (text.includes('rain') || text.includes('light')) return '🌧️';
    return '☀️';
  };

  return (
    <div className="px-4 pt-4 pb-24 stagger-children">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] uppercase tracking-wider">
              {race.weather_condition ? 'Replay Feed' : 'Simulating Live'}
            </span>
            <span className="text-xs text-[var(--foreground-muted)] font-medium">
              Lap {currentFrame + 1} of {totalFrames}
            </span>
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>{getFlag(race.track_country)}</span>
            <span className="text-gradient font-racing">{race.track_name} GP</span>
          </h1>
        </div>

        {/* Environmental conditions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--background-card)] border border-[var(--border-color)]">
            <span className="text-sm">{getWeatherIcon(race.weather_condition)}</span>
            <span className="text-xs font-semibold text-[var(--foreground-secondary)] capitalize">
              {race.weather_condition || 'Dry'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[var(--background-card)] border border-[var(--border-color)]">
            <p className="text-[10px] text-[var(--foreground-muted)] uppercase font-semibold">Temp</p>
            <p className="text-xs font-bold font-racing text-[var(--foreground)]">
              {race.temperature || 26}°C
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Canvas, Right is Leaderboard Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="h-[360px] md:h-[420px] w-full flex-shrink-0">
            <RaceCanvas
              trackName={race.track_name}
              simulationData={simulationData}
              playerTeamId={playerTeamId}
              baseLapTime={baseLapTime}
              cameraMode={cameraMode}
              focusedDriverId={focusedDriverId}
              onCameraModeChange={setCameraMode}
              onFocusedDriverChange={setFocusedDriverId}
              onProgressTick={setLiveProgress}
            />
          </div>

          {/* Replay Controller Console Card */}
          <div className="card p-4 space-y-4 bg-[var(--background-card)]">
            {/* Scrubber slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-racing font-bold w-12 text-[var(--foreground-muted)]">
                LAP {currentFrame + 1}
              </span>
              <input
                type="range"
                min={0}
                max={totalFrames - 1}
                value={currentFrame}
                onChange={(e) => setFrame(Number(e.target.value))}
                className="range-slider flex-1"
                id="race-scrub-slider"
              />
              <span className="text-xs font-racing font-bold w-12 text-right text-[var(--foreground-muted)]">
                LAP {totalFrames}
              </span>
            </div>

            {/* Playback Buttons Console */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
              <div className="flex items-center flex-wrap gap-3">
                {/* Play / Pause button */}
                <button
                  onClick={isPlaying ? pause : play}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/40 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 shadow-[0_0_12px_var(--accent-primary-glow)]'
                      : 'bg-[var(--background-elevated)] border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--background-card)]'
                  }`}
                  id="btn-play-pause"
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Speed buttons */}
                <div className="flex items-center bg-[var(--background)] p-1 rounded-xl border border-[var(--border-color)]">
                  {[1, 2, 4, 8, 16].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSpeed(speed)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-racing font-bold transition-all ${
                        playbackSpeed === speed
                          ? 'bg-[var(--accent-primary)] text-white shadow-[0_2px_8px_rgba(220,38,38,0.2)]'
                          : 'text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                {/* Focus target dropdown */}
                {cameraMode === 'driver' && (
                  <select
                    value={focusedDriverId || ''}
                    onChange={(e) => setFocusedDriverId(e.target.value || null)}
                    className="px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border-color)] text-xs font-medium text-[var(--foreground)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                  >
                    <option value="">Select Driver...</option>
                    {activeFrame.positions
                      .filter(p => p.status !== 'dnf')
                      .map(p => (
                        <option key={p.driver_id} value={p.driver_id}>
                          {p.driver_name}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Dynamic fastest lap card */}
              {fastestLapInfo && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[var(--background)] border border-[var(--border-color)] max-w-full">
                  <span className="text-sm">💜</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-[var(--foreground-muted)] uppercase font-semibold">
                      Fastest Lap
                    </p>
                    <p className="text-xs font-bold truncate text-[var(--foreground-secondary)]">
                      {fastestLapInfo.driverName}{' '}
                      <span className="font-racing text-[var(--foreground)] text-[10px] ml-1">
                        {formatLapTime(fastestLapInfo.time)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Standings list panel with clicked driver callback */}
        <div className="lg:col-span-1">
          <TelemetryPanel
            activeFrame={activeFrame}
            prevFrame={currentFrame > 0 ? simulationData.frames[currentFrame - 1] : null}
            playerTeamId={playerTeamId}
            focusedDriverId={focusedDriverId}
            onDriverClick={(driverId) => {
              setCameraMode('driver');
              setFocusedDriverId(driverId);
            }}
            progress={liveProgress}
            trackName={race.track_name}
            baseLapTime={baseLapTime}
          />
        </div>
      </div>
    </div>
  );
}
