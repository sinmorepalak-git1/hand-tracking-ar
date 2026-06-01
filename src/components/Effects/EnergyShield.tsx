import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const EnergyShield = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  const shieldRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.z += delta * settings.ringSpeed;
      shieldRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
      shieldRef.current.rotation.y = Math.cos(state.clock.elapsedTime) * 0.2;
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
    }
  });

  if (!landmarks || landmarks.length === 0) return null;

  return (
    <group>
      {landmarks.map((hand, i) => {
        const palm = hand[9]; 
        const { x, y, z } = mapLandmarkTo3D(palm, viewport, settings.mirrorCamera);
        const pos = new THREE.Vector3(x, y, z);

        return (
          <group key={i} position={pos}>
            <mesh ref={i === 0 ? shieldRef : undefined}>
              <circleGeometry args={[2.5, 32]} />
              <meshBasicMaterial ref={i === 0 ? materialRef : undefined} color="#4ade80" transparent opacity={0.4} side={THREE.DoubleSide} wireframe />
            </mesh>
            <mesh>
              <circleGeometry args={[2.3, 32]} />
              <meshBasicMaterial color="#22c55e" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
