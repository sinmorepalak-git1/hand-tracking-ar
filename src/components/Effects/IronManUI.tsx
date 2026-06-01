import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const IronManUI = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  const uiRef = useRef<THREE.Group>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ring1.current) ring1.current.rotation.z += delta * settings.ringSpeed * 2;
    if (ring2.current) ring2.current.rotation.z -= delta * settings.ringSpeed * 1.5;
    
    if (uiRef.current) {
      uiRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.01;
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
          <group key={i} position={pos} ref={i === 0 ? uiRef : undefined}>
            <mesh ref={i === 0 ? ring1 : undefined}>
              <ringGeometry args={[1.2, 1.3, 32, 1, 0, Math.PI * 1.5]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={i === 0 ? ring2 : undefined} scale={1.2}>
              <ringGeometry args={[1.4, 1.45, 64, 1, 0, Math.PI * 1.8]} />
              <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.3, 32]} />
              <meshBasicMaterial color="#bae6fd" transparent opacity={0.9} />
            </mesh>
            <mesh scale={1.5}>
              <circleGeometry args={[0.3, 32]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
