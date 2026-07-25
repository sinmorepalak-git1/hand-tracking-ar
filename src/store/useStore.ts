import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  appMode: 'airWriter' | 'arDrawing' | 'neonSkeleton' | 'elemental' | 'arObjects' | 'arImageOverlay';
  arDrawingSettings: {
    color: string;
    brushSize: number;
  };
  arObjectSettings: {
    modelIndex: number;
    anchor: 'palm' | 'index' | 'wrist';
    scale: number;
    rotation: [number, number, number];
    positionOffset: [number, number, number];
  };
  imageOverlays: {
    id: string;
    name: string;
    anchor: 'palm' | 'index' | 'middle' | 'ring' | 'little' | 'thumb' | 'wrist' | 'back' | 'fixed';
    positionOffset: [number, number, number];
    scale: number;
    rotation: [number, number, number];
    opacity: number;
    flipX: boolean;
    flipY: boolean;
    zIndex: number;
    shadowStrength: number;
    glowIntensity: number;
    animationOn: boolean;
  }[];
  selectedOverlayId: string | null;
  isGalleryVisible: boolean;
  environmentBrightness: number;
  clearCanvasTrigger: number;
  setActiveEffect: (effect: EffectMode) => void;
  setStats: (stats: { fps?: number; handsDetected?: number; trackingQuality?: number }) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  setAppMode: (mode: 'airWriter' | 'arDrawing' | 'neonSkeleton' | 'elemental' | 'arObjects' | 'arImageOverlay') => void;
  setArDrawingSettings: (settings: Partial<AppState['arDrawingSettings']>) => void;
  setArObjectSettings: (settings: Partial<AppState['arObjectSettings']>) => void;
  setImageOverlays: (overlays: AppState['imageOverlays'] | ((prev: AppState['imageOverlays']) => AppState['imageOverlays'])) => void;
  setSelectedOverlayId: (id: string | null) => void;
  setIsGalleryVisible: (visible: boolean) => void;
  setEnvironmentBrightness: (brightness: number) => void;
  duplicateImage: (id: string) => void;
  triggerClearCanvas: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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
      appMode: 'airWriter',
      arDrawingSettings: {
        color: '#ef4444',
        brushSize: 5,
      },
      arObjectSettings: {
        modelIndex: 0,
        scale: 1.0,
        rotation: [0, 0, 0],
        positionOffset: [0, 0, 0],
        anchor: 'palm',
      },
      imageOverlays: [],
      selectedOverlayId: null,
      isGalleryVisible: false,
      environmentBrightness: 1.0,
      clearCanvasTrigger: 0,
      setActiveEffect: (effect) => set({ activeEffect: effect }),
      setStats: (stats) => set((state) => ({ ...state, ...stats })),
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      setAppMode: (mode) => set({ appMode: mode }),
      setArDrawingSettings: (newSettings) => set((state) => ({
        arDrawingSettings: { ...state.arDrawingSettings, ...newSettings }
      })),
      setArObjectSettings: (newSettings) => set((state) => ({
        arObjectSettings: { ...state.arObjectSettings, ...newSettings }
      })),
      setImageOverlays: (overlays) => set((state) => ({
        imageOverlays: typeof overlays === 'function' ? overlays(state.imageOverlays) : overlays
      })),
      setSelectedOverlayId: (id) => set({ selectedOverlayId: id }),
      setIsGalleryVisible: (visible) => set({ isGalleryVisible: visible }),
      setEnvironmentBrightness: (brightness) => set({ environmentBrightness: brightness }),
      duplicateImage: (id) => set((state) => {
        const original = state.imageOverlays.find((img) => img.id === id);
        if (!original) return state;
        const newId = Date.now().toString();
        // The duplicate uses the same base64 dataUrl under a new ID.
        // We must also save it to IndexedDB, but since actions in Zustand shouldn't be async if possible,
        // we will handle IndexedDB duplication in the UI layer before calling this action.
        return {
          imageOverlays: [...state.imageOverlays, { ...original, id: newId, name: `${original.name} (Copy)` }]
        };
      }),
      triggerClearCanvas: () => set((state) => ({ clearCanvasTrigger: state.clearCanvasTrigger + 1 })),
    }),
    {
      name: 'ar-storage',
      partialize: (state) => ({ imageOverlays: state.imageOverlays }),
    }
  )
);
