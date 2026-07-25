import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';

interface Props {
  landmarks: HandLandmarks[];
  mirrorCamera: boolean;
}

export const HandOccluder = ({ landmarks, mirrorCamera }: Props) => {
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !landmarks || landmarks.length === 0) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    
    groupRef.current.visible = true;
    const hand = landmarks[0];
    if (!hand || hand.length < 21) return;
    
    // Calculate approximate finger thickness based on hand size
    const wrist3D = mapLandmarkTo3D(hand[0], viewport, mirrorCamera);
    const middle3D = mapLandmarkTo3D(hand[9], viewport, mirrorCamera);
    const dx = middle3D.x - wrist3D.x;
    const dy = middle3D.y - wrist3D.y;
    const dz = middle3D.z - wrist3D.z;
    const handSize = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const radius = handSize * 0.25; // Spheres need to be large enough to occlude the finger

    hand.forEach((lm, i) => {
      const pos = mapLandmarkTo3D(lm, viewport, mirrorCamera);
      const child = groupRef.current!.children[i] as THREE.Mesh;
      if (child) {
        child.position.set(pos.x, pos.y, pos.z + (radius * 0.5)); // push slightly forward to ensure occlusion
        child.scale.setScalar(radius);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 21 }).map((_, i) => (
        <mesh key={i} renderOrder={-1}>
          {/* Low poly sphere is fine for occlusion */}
          <sphereGeometry args={[1, 8, 8]} />
          {/* Magic: Invisible material that writes to depth buffer */}
          <meshBasicMaterial colorWrite={false} depthWrite={true} />
        </mesh>
      ))}
    </group>
  );
};
