import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

export const AirDraw = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  
  // Array of strokes, each stroke is an array of Vector3 points
  const strokesRef = useRef<THREE.Vector3[][]>([]);
  const isDrawingRef = useRef(false);

  useFrame(() => {
    if (!landmarks || landmarks.length === 0) {
      isDrawingRef.current = false;
      return;
    }

    // We use the first detected hand for drawing
    const hand = landmarks[0];
    const thumb = hand[4];
    const index = hand[8];

    // Calculate distance between thumb tip and index tip in 2D normalized space
    const dx = thumb.x - index.x;
    const dy = thumb.y - index.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If pinched (distance is small), we are drawing
    const isPinched = distance < 0.05;

    const { x, y, z } = mapLandmarkTo3D(index, viewport, settings.mirrorCamera);
    const currentPoint = new THREE.Vector3(x, y, z);

    if (isPinched) {
      if (!isDrawingRef.current) {
        // Start a new stroke
        strokesRef.current.push([currentPoint]);
        isDrawingRef.current = true;
      } else {
        // Continue current stroke
        const currentStroke = strokesRef.current[strokesRef.current.length - 1];
        // Only add point if it moved a bit to avoid too many points
        const lastPoint = currentStroke[currentStroke.length - 1];
        if (lastPoint.distanceTo(currentPoint) > 0.05) {
          currentStroke.push(currentPoint);
        }
      }
    } else {
      isDrawingRef.current = false;
    }
  });

  return (
    <group>
      {/* Draw all saved strokes */}
      {strokesRef.current.map((stroke, i) => {
        if (stroke.length < 2) return null;
        return (
          <Line
            key={`stroke-${i}`}
            points={stroke}
            color="#22d3ee" // Cyan color similar to the reference image
            lineWidth={8}
            transparent
            opacity={0.9}
          />
        );
      })}

      {/* Draw a small sphere at the index fingertip to act as a "brush cursor" */}
      {landmarks.length > 0 && (
        <mesh position={mapLandmarkTo3D(landmarks[0][8], viewport, settings.mirrorCamera) as any}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={isDrawingRef.current ? "#fbbf24" : "#22d3ee"} />
        </mesh>
      )}
    </group>
  );
};
