import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

interface Stroke {
  points: THREE.Vector3[];
  color: string;
  size: number;
}

export const ARDrawMode = ({ landmarks }: Props) => {
  const { settings, arDrawingSettings, clearCanvasTrigger } = useStore();
  const { viewport } = useThree();
  
  // Array of strokes, each stroke is an object with points, color, and size
  const strokesRef = useRef<Stroke[]>([]);
  const isDrawingRef = useRef(false);

  // Clear canvas when trigger changes
  useEffect(() => {
    strokesRef.current = [];
  }, [clearCanvasTrigger]);

  useFrame(() => {
    if (!landmarks || landmarks.length === 0) {
      isDrawingRef.current = false;
      return;
    }

    const hand = landmarks[0];
    if (!hand || hand.length < 21) return; // Safety check

    const thumb = hand[4];
    const index = hand[8];
    if (!thumb || !index) return; // Safety check

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
        strokesRef.current.push({
          points: [currentPoint],
          color: arDrawingSettings.color,
          size: arDrawingSettings.brushSize
        });
        isDrawingRef.current = true;
      } else {
        // Continue current stroke
        const currentStroke = strokesRef.current[strokesRef.current.length - 1];
        if (currentStroke) {
          const lastPoint = currentStroke.points[currentStroke.points.length - 1];
          if (lastPoint && lastPoint.distanceTo(currentPoint) > 0.02) {
            currentStroke.points.push(currentPoint);
          }
        }
      }
    } else {
      isDrawingRef.current = false;
    }
  });

  // Calculate brush position safely
  let brushPos: [number, number, number] = [0, 0, 0];
  let showBrush = false;
  if (landmarks && landmarks.length > 0 && landmarks[0] && landmarks[0][8]) {
    const pos = mapLandmarkTo3D(landmarks[0][8], viewport, settings.mirrorCamera);
    brushPos = [pos.x, pos.y, pos.z];
    showBrush = true;
  }

  return (
    <group>
      {/* Draw all saved strokes */}
      {strokesRef.current.map((stroke, i) => {
        if (!stroke || stroke.points.length < 2) return null;
        return (
          <Line
            key={`stroke-${i}-${stroke.points.length}`}
            points={[...stroke.points]} // Clone to prevent geometry update crashes
            color={stroke.color}
            lineWidth={stroke.size}
            transparent
            opacity={0.9}
          />
        );
      })}

      {/* Draw a small sphere at the index fingertip to act as a "brush cursor" */}
      {showBrush && (
        <mesh position={brushPos}>
          <sphereGeometry args={[arDrawingSettings.brushSize / 100, 16, 16]} />
          <meshBasicMaterial color={isDrawingRef.current ? "#ffffff" : arDrawingSettings.color} />
        </mesh>
      )}
    </group>
  );
};
