import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const FingerTrails = ({ landmarks }: Props) => {
  const { settings, activeEffect } = useStore();
  const { viewport } = useThree();
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  
  const FINGER_TIPS = [4, 8, 12, 16, 20];
  const maxParticles = settings.particleCount;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: maxParticles }, () => ({
      position: new THREE.Vector3(1000, 1000, 1000),
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0,
      maxLife: Math.random() * 0.5 + 0.5,
    }));
  }, [maxParticles]);

  const color = useMemo(() => new THREE.Color(), []);
  const baseColor = useMemo(() => {
    switch (activeEffect) {
      case 'neon': return new THREE.Color('#ff00ff');
      case 'hologram': return new THREE.Color('#00ffff');
      case 'shield': return new THREE.Color('#4ade80');
      case 'magic': return new THREE.Color('#fbbf24');
      case 'ironman': return new THREE.Color('#38bdf8');
      default: return new THREE.Color('#ffffff');
    }
  }, [activeEffect]);

  const particleIndexRef = useRef(0);

  useFrame((_state, delta) => {
    if (!particlesRef.current) return;

    if (landmarks.length > 0) {
      landmarks.forEach((hand) => {
        FINGER_TIPS.forEach((tipIndex) => {
          const tip = hand[tipIndex];
          const { x, y, z } = mapLandmarkTo3D(tip, viewport, settings.mirrorCamera);
          
          for (let i = 0; i < 2; i++) {
            const p = particles[particleIndexRef.current];
            if (!p) continue;
            p.position.set(x, y, z);
            p.velocity.set(
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 2 + 1,
              (Math.random() - 0.5) * 2
            );
            p.life = p.maxLife;
            
            particleIndexRef.current = (particleIndexRef.current + 1) % maxParticles;
          }
        });
      });
    }

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= delta;
        p.position.addScaledVector(p.velocity, delta);
        
        dummy.position.copy(p.position);
        const scale = Math.max(0, p.life / p.maxLife);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        
        particlesRef.current!.setMatrixAt(i, dummy.matrix);
        
        color.copy(baseColor).multiplyScalar(scale);
        particlesRef.current!.setColorAt(i, color);
      } else {
        dummy.position.set(1000, 1000, 1000);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        particlesRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;
    if (particlesRef.current.instanceColor) {
      particlesRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={particlesRef} args={[undefined, undefined, maxParticles]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.8} />
    </instancedMesh>
  );
};
