import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const CyberHologram = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * settings.ringSpeed;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * settings.ringSpeed * 1.5;
    }
    if (groupRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      groupRef.current.scale.setScalar(scale);
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
          <group key={i} position={pos} ref={i === 0 ? groupRef : undefined}>
            <mesh ref={i === 0 ? ringRef1 : undefined}>
              <torusGeometry args={[1.5, 0.05, 16, 64]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={i === 0 ? ringRef2 : undefined} scale={1.2}>
              <torusGeometry args={[1.5, 0.02, 16, 64]} />
              <meshBasicMaterial color="#ff00ff" transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
