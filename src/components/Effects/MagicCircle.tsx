import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const MagicCircle = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  const innerRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (innerRef.current) innerRef.current.rotation.z += delta * settings.ringSpeed;
    if (outerRef.current) outerRef.current.rotation.z -= delta * settings.ringSpeed * 0.5;
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
            <group ref={i === 0 ? innerRef : undefined}>
              <mesh>
                <ringGeometry args={[1, 1.1, 6]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} side={THREE.DoubleSide} wireframe />
              </mesh>
            </group>
            <group ref={i === 0 ? outerRef : undefined}>
              <mesh>
                <ringGeometry args={[1.5, 1.6, 32]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <ringGeometry args={[1.8, 1.85, 12]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};
