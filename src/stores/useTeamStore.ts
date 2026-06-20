import { create } from 'zustand';
import type { Team, Driver, CarPart } from '@/types/database';
import type { DriverWithContract } from '@/types/game';

interface TeamState {
  // Data
  team: Team | null;
  drivers: DriverWithContract[];
  budget: number;

  // Actions
  setTeam: (team: Team) => void;
  setDrivers: (drivers: DriverWithContract[]) => void;
  updateBudget: (amount: number) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>()((set) => ({
  team: null,
  drivers: [],
  budget: 0,

  setTeam: (team) => set({ team, budget: team.budget }),
  setDrivers: (drivers) => set({ drivers }),
  updateBudget: (amount) =>
    set((state) => ({ budget: state.budget + amount })),
  clearTeam: () => set({ team: null, drivers: [], budget: 0 }),
}));
