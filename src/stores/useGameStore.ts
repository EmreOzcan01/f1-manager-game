import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameState {
  // Current game time
  currentSeason: number;
  currentRound: number;
  nextRaceAt: string | null;
  isRaceDay: boolean;

  // UI state
  activeTab: string;
  isLoading: boolean;
  initialized: boolean;

  // Actions
  setGameTime: (season: number, round: number, nextRaceAt: string | null) => void;
  setRaceDay: (isRaceDay: boolean) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Defaults
      currentSeason: 1,
      currentRound: 1,
      nextRaceAt: null,
      isRaceDay: false,
      activeTab: 'dashboard',
      isLoading: false,
      initialized: false,

      // Actions
      setGameTime: (season, round, nextRaceAt) =>
        set({ currentSeason: season, currentRound: round, nextRaceAt }),
      setRaceDay: (isRaceDay) => set({ isRaceDay }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (initialized) => set({ initialized }),
    }),
    {
      name: 'f1-game-store',
      partialize: (state) => ({
        currentSeason: state.currentSeason,
        currentRound: state.currentRound,
        activeTab: state.activeTab,
      }),
    }
  )
);
