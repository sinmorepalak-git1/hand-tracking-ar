import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17] // Wrist to Pinky
];

interface Props {
  landmarks: HandLandmarks[];
}

export const NeonSkeleton = ({ landmarks }: Props) => {
  const { viewport } = useThree();
  const { settings } = useStore();

  if (!landmarks || landmarks.length === 0) return null;

  const mapPoint = (l: any) => {
    const { x, y, z } = mapLandmarkTo3D(l, viewport, settings.mirrorCamera);
    return new THREE.Vector3(x, y, z);
  };

  return (
    <group>
      {landmarks.map((hand, handIndex) => {
        const points = hand.map(mapPoint);

        const color = handIndex === 0 ? '#00ffff' : '#ff00ff';

        return (
          <group key={`hand-${handIndex}`}>
            {points.map((p, i) => (
              <mesh key={`joint-${i}`} position={p}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color={color} />
              </mesh>
            ))}

            {CONNECTIONS.map(([start, end], i) => (
              <Line
                key={`bone-${i}`}
                points={[points[start], points[end]]}
                color={color}
                lineWidth={3}
                transparent
                opacity={0.8}
              />
            ))}
          </group>
        );
      })}

      {/* Draw Laser Strings Between Two Hands */}
      {landmarks.length >= 2 && (
        <group>
          {[4, 8, 12, 16, 20].map((fingerTipIndex, i) => {
            const p1 = mapPoint(landmarks[0][fingerTipIndex]);
            const p2 = mapPoint(landmarks[1][fingerTipIndex]);
            
            const colors = ['#fbbf24', '#4ade80', '#22d3ee', '#c084fc', '#f472b6'];

            return (
              <Line
                key={`laser-${i}`}
                points={[p1, p2]}
                color={colors[i]}
                lineWidth={5}
                transparent
                opacity={0.9}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};
