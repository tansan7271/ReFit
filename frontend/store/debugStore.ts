import { create } from 'zustand';
import type { CharacterState, EnergyLevel, GrowthLevel } from '@/components/PixelCharacter';

interface DebugStore {
  debugMode: boolean;
  charState: CharacterState;
  energyLevel: EnergyLevel;
  growthLevel: GrowthLevel;
  setDebugMode: (v: boolean) => void;
  setCharState: (s: CharacterState) => void;
  setEnergyLevel: (l: EnergyLevel) => void;
  setGrowthLevel: (l: GrowthLevel) => void;
}

export const useDebugStore = create<DebugStore>((set) => ({
  debugMode: false,
  charState: 'neutral',
  energyLevel: 3,
  growthLevel: 1,
  setDebugMode: (v) => set({ debugMode: v }),
  setCharState: (s) => set({ charState: s }),
  setEnergyLevel: (l) => set({ energyLevel: l }),
  setGrowthLevel: (l) => set({ growthLevel: l }),
}));
