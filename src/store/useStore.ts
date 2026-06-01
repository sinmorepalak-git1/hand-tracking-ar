import { create } from 'zustand';

export type EffectMode = 'neon' | 'hologram' | 'shield' | 'magic' | 'ironman' | 'airdraw';

interface AppState {
  activeEffect: EffectMode;
  fps: number;
  handsDetected: number;
  trackingQuality: number;
  settings: {
    glowIntensity: number;
    particleCount: number;
    ringSpeed: number;
    mirrorCamera: boolean;
  };
  setActiveEffect: (effect: EffectMode) => void;
  setStats: (stats: { fps?: number; handsDetected?: number; trackingQuality?: number }) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

export const useStore = create<AppState>((set) => ({
  activeEffect: 'neon',
  fps: 0,
  handsDetected: 0,
  trackingQuality: 100,
  settings: {
    glowIntensity: 1.5,
    particleCount: 100,
    ringSpeed: 1,
    mirrorCamera: true,
  },
  setActiveEffect: (effect) => set({ activeEffect: effect }),
  setStats: (stats) => set((state) => ({ ...state, ...stats })),
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),
}));
