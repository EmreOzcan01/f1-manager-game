import { create } from 'zustand';
import type { CarPart, PartCategory } from '@/types/database';
import type { PartWithProgress } from '@/types/game';

interface GarageState {
  parts: PartWithProgress[];
  isUpgrading: boolean;

  // Actions
  setParts: (parts: PartWithProgress[]) => void;
  updatePart: (category: PartCategory, updates: Partial<PartWithProgress>) => void;
  setUpgrading: (upgrading: boolean) => void;
  clearGarage: () => void;
}

export const useGarageStore = create<GarageState>()((set) => ({
  parts: [],
  isUpgrading: false,

  setParts: (parts) => set({ parts }),
  updatePart: (category, updates) =>
    set((state) => ({
      parts: state.parts.map((p) =>
        p.category === category ? { ...p, ...updates } : p
      ),
    })),
  setUpgrading: (isUpgrading) => set({ isUpgrading }),
  clearGarage: () => set({ parts: [], isUpgrading: false }),
}));
