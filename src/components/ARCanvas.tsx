import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { HandLandmarks } from '../utils/handTracker';
import { useStore } from '../store/useStore';

import { NeonSkeleton } from './Effects/NeonSkeleton';
import { CyberHologram } from './Effects/CyberHologram';
import { EnergyShield } from './Effects/EnergyShield';
import { MagicCircle } from './Effects/MagicCircle';
import { IronManUI } from './Effects/IronManUI';
import { FingerTrails } from './Effects/FingerTrails';
import { AirDraw } from './Effects/AirDraw';
import { ARDrawMode } from './Effects/ARDrawMode';
import { ElementalEnergy } from './Effects/ElementalEnergy';
import { ARObjectsMode } from './Effects/ARObjectsMode';
import { ARImageOverlayMode } from './Effects/ARImageOverlayMode';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  landmarks: HandLandmarks[];
}

export const ARCanvas: React.FC<Props> = ({ landmarks }) => {
  const { activeEffect, settings, appMode } = useStore();

  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: [0, 0, 5], zoom: 100 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={1} />
      
      {appMode === 'airWriter' && (
        <>
          {activeEffect === 'neon' && <NeonSkeleton landmarks={landmarks} />}
          {activeEffect === 'hologram' && <CyberHologram landmarks={landmarks} />}
          {activeEffect === 'shield' && <EnergyShield landmarks={landmarks} />}
          {activeEffect === 'magic' && <MagicCircle landmarks={landmarks} />}
          {activeEffect === 'ironman' && <IronManUI landmarks={landmarks} />}
          {activeEffect === 'airdraw' && (
            <ErrorBoundary fallbackMessage="Feature unavailable">
              <AirDraw landmarks={landmarks} />
            </ErrorBoundary>
          )}
          <FingerTrails landmarks={landmarks} />
        </>
      )}

      {appMode === 'arDrawing' && (
        <ErrorBoundary fallbackMessage="AR Drawing unavailable">
          <ARDrawMode landmarks={landmarks} />
        </ErrorBoundary>
      )}

      {appMode === 'neonSkeleton' && (
        <ErrorBoundary fallbackMessage="Neon Skeleton unavailable">
          <NeonSkeleton landmarks={landmarks} />
        </ErrorBoundary>
      )}

      {appMode === 'elemental' && (
        <ErrorBoundary fallbackMessage="Elemental Energy unavailable">
          <ElementalEnergy landmarks={landmarks} />
        </ErrorBoundary>
      )}

      {appMode === 'arObjects' && (
        <ErrorBoundary fallbackMessage="3D AR Objects unavailable">
          <ARObjectsMode landmarks={landmarks} />
        </ErrorBoundary>
      )}

      {appMode === 'arImageOverlay' && (
        <ErrorBoundary fallbackMessage="Image Overlay unavailable">
          <ARImageOverlayMode landmarks={landmarks} />
        </ErrorBoundary>
      )}

      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={settings.glowIntensity} 
        />
      </EffectComposer>
    </Canvas>
  );
};
