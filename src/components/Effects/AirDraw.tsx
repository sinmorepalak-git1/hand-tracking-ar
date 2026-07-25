import { useRef, useState } from 'react';
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
  
  // Use state to trigger re-renders properly instead of just mutating a ref
  const [strokes, setStrokes] = useState<THREE.Vector3[][]>([]);
  
  const strokesRef = useRef<THREE.Vector3[][]>([]);
  const isDrawingRef = useRef(false);
  const smoothedPosRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    try {
      if (!landmarks || landmarks.length === 0) {
        isDrawingRef.current = false;
        smoothedPosRef.current = null;
        return;
      }

      const hand = landmarks[0];
      if (!hand || hand.length < 21) return; // Safety check

      const wrist = hand[0];
      const indexPip = hand[6];
      const indexTip = hand[8];
      
      if (!wrist || !indexPip || !indexTip) return;

      // Stable Drawing State: Check if index finger is extended
      const d8 = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y, indexTip.z - wrist.z);
      const d6 = Math.hypot(indexPip.x - wrist.x, indexPip.y - wrist.y, indexPip.z - wrist.z);
      const isIndexExtended = d8 > d6;

      const { x, y, z } = mapLandmarkTo3D(indexTip, viewport, settings.mirrorCamera);
      const rawPos = new THREE.Vector3(x, y, z);

      if (!smoothedPosRef.current) {
        smoothedPosRef.current = rawPos.clone();
      } else {
        // Bézier/lerp smoothing for the tracked point
        smoothedPosRef.current.lerp(rawPos, 0.5);
      }

      const currentPoint = smoothedPosRef.current.clone();

      if (isIndexExtended) {
        if (!isDrawingRef.current) {
          // Create ONE stroke when drawing starts
          strokesRef.current.push([currentPoint]);
          isDrawingRef.current = true;
        } else {
          // Append new points while the finger moves
          const currentStroke = strokesRef.current[strokesRef.current.length - 1];
          if (currentStroke) {
            const lastPoint = currentStroke[currentStroke.length - 1];
            if (lastPoint) {
              const dist = lastPoint.distanceTo(currentPoint);
              
              // Ignore movements smaller than 3 pixels (~0.003)
              if (dist > 0.003) {
                // If the fingertip moves quickly: Insert intermediate points automatically
                if (dist > 0.05) {
                  const steps = Math.ceil(dist / 0.01);
                  for (let i = 1; i <= steps; i++) {
                    const interpPoint = new THREE.Vector3().lerpVectors(lastPoint, currentPoint, i / steps);
                    currentStroke.push(interpPoint);
                  }
                } else {
                  currentStroke.push(currentPoint);
                }
              }
            }
          }
        }
      } else {
        // When drawing stops: Finish the stroke.
        isDrawingRef.current = false;
        smoothedPosRef.current = null;
      }
    } catch (error) {
      console.error("AirWriter tracking error:", error);
      isDrawingRef.current = false;
    }
  });

  // Calculate brush position safely
  let brushPos: [number, number, number] = [0, 0, 0];
  let showBrush = false;

  try {
    if (landmarks && landmarks.length > 0 && landmarks[0] && landmarks[0][8]) {
      // The cursor should always stay attached to Landmark 8. No offset. No jumping.
      const pos = mapLandmarkTo3D(landmarks[0][8], viewport, settings.mirrorCamera);
      brushPos = [pos.x, pos.y, pos.z];
      showBrush = true;
    }
  } catch (error) {
    console.error("AirWriter brush error:", error);
  }

  return (
    <group>
      {/* Render the entire stroke continuously */}
      {strokesRef.current.map((stroke, i) => {
        if (!stroke || stroke.length < 2) return null;
        
        let displayPoints = stroke;
        try {
          // Render strokes using Catmull-Rom spline interpolation
          if (stroke.length >= 2) {
            const curve = new THREE.CatmullRomCurve3(stroke, false, 'chordal'); // Chordal prevents looping spikes
            displayPoints = curve.getPoints(Math.max(stroke.length * 2, 10));
          }
        } catch (error) {
          displayPoints = stroke;
        }

        return (
          <Line
            key={`stroke-${i}-${stroke.length}`}
            points={displayPoints}
            color="#22d3ee" 
            lineWidth={8}
            transparent
            opacity={0.9}
            // Use: round line caps, round joins
            linecap="round"
            linejoin="round"
          />
        );
      })}

      {/* Draw a small sphere at the index fingertip */}
      {showBrush && (
        <mesh position={brushPos}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={isDrawingRef.current ? "#fbbf24" : "#22d3ee"} />
        </mesh>
      )}
    </group>
  );
};
