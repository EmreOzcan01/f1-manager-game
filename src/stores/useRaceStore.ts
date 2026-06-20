import { create } from 'zustand';
import type { RaceFrame, SimulationData } from '@/types/database';

interface RaceState {
  // Simulation data loaded from Supabase
  simulationData: SimulationData | null;
  totalFrames: number;

  // Playback controls
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 4x, 8x

  // Race info
  raceId: string | null;
  isLive: boolean;

  // Actions
  loadRace: (raceId: string, data: SimulationData) => void;
  setFrame: (frame: number) => void;
  nextFrame: () => void;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;

  // Computed (selectors used externally)
  getCurrentFrame: () => RaceFrame | null;
}

export const useRaceStore = create<RaceState>()((set, get) => ({
  simulationData: null,
  totalFrames: 0,
  currentFrame: 0,
  isPlaying: false,
  playbackSpeed: 1,
  raceId: null,
  isLive: false,

  loadRace: (raceId, data) =>
    set({
      raceId,
      simulationData: data,
      totalFrames: data.frames.length,
      currentFrame: 0,
      isPlaying: false,
    }),

  setFrame: (frame) => {
    const { totalFrames } = get();
    set({ currentFrame: Math.max(0, Math.min(frame, totalFrames - 1)) });
  },

  nextFrame: () => {
    const { currentFrame, totalFrames } = get();
    if (currentFrame < totalFrames - 1) {
      set({ currentFrame: currentFrame + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (playbackSpeed) => set({ playbackSpeed }),

  reset: () =>
    set({
      simulationData: null,
      totalFrames: 0,
      currentFrame: 0,
      isPlaying: false,
      playbackSpeed: 1,
      raceId: null,
      isLive: false,
    }),

  getCurrentFrame: () => {
    const { simulationData, currentFrame } = get();
    if (!simulationData) return null;
    return simulationData.frames[currentFrame] ?? null;
  },
}));
