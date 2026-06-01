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

interface Props {
  landmarks: HandLandmarks[];
}

export const ARCanvas: React.FC<Props> = ({ landmarks }) => {
  const { activeEffect, settings } = useStore();

  return (
    <Canvas
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
      
      {activeEffect === 'neon' && <NeonSkeleton landmarks={landmarks} />}
      {activeEffect === 'hologram' && <CyberHologram landmarks={landmarks} />}
      {activeEffect === 'shield' && <EnergyShield landmarks={landmarks} />}
      {activeEffect === 'magic' && <MagicCircle landmarks={landmarks} />}
      {activeEffect === 'ironman' && <IronManUI landmarks={landmarks} />}
      {activeEffect === 'airdraw' && <AirDraw landmarks={landmarks} />}
      
      <FingerTrails landmarks={landmarks} />

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
