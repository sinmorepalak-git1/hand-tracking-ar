import { useRef, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Float, Gltf, Html } from '@react-three/drei';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';
import { ErrorBoundary } from '../ErrorBoundary';

const MODELS = [
  'dragon.glb',
  'butterfly.glb',
  'eagle.glb',
  'phoenix.glb',
  'sword.glb',
  'magic_wand.glb',
  'robot.glb',
  'crown.glb',
  'planet.glb',
  'floating_heart.glb'
];

interface Props {
  landmarks: HandLandmarks[];
}

const ARModel = ({ url, scale }: { url: string; scale: number }) => {
  return (
    <ErrorBoundary fallbackMessage={`Model ${url} missing in /models/`}>
      <Suspense fallback={<Html center><div className="text-white">Loading...</div></Html>}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <Gltf src={url} scale={scale} castShadow receiveShadow />
        </Float>
      </Suspense>
    </ErrorBoundary>
  );
};

export const ARObjectsMode = ({ landmarks }: Props) => {
  const { settings, arObjectSettings } = useStore();
  const { viewport } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  // Use refs for smoothing
  const targetPosition = useRef(new THREE.Vector3());
  const targetQuaternion = useRef(new THREE.Quaternion());

  useFrame((_, delta) => {
    if (!groupRef.current || !landmarks || landmarks.length === 0) return;

    const hand = landmarks[0]; // Use the primary hand
    if (!hand || hand.length < 21) return;

    // 1. Determine Anchor Position
    let anchorLandmark;
    switch (arObjectSettings.anchor) {
      case 'index':
        anchorLandmark = hand[8]; // Index Fingertip
        break;
      case 'wrist':
        anchorLandmark = hand[0]; // Wrist
        break;
      case 'palm':
      default:
        anchorLandmark = hand[9]; // Middle Finger MCP (center of palm)
        break;
    }

    if (!anchorLandmark) return;

    const { x, y, z } = mapLandmarkTo3D(anchorLandmark, viewport, settings.mirrorCamera);
    
    // Apply position offset from settings
    targetPosition.current.set(
      x + arObjectSettings.positionOffset[0],
      y + arObjectSettings.positionOffset[1],
      z + arObjectSettings.positionOffset[2]
    );

    // 2. Determine Hand Rotation
    // We create a coordinate system based on the wrist and MCP joints
    const wrist = mapLandmarkTo3D(hand[0], viewport, settings.mirrorCamera);
    const indexMcp = mapLandmarkTo3D(hand[5], viewport, settings.mirrorCamera);
    const pinkyMcp = mapLandmarkTo3D(hand[17], viewport, settings.mirrorCamera);

    const wristVec = new THREE.Vector3(wrist.x, wrist.y, wrist.z);
    const indexVec = new THREE.Vector3(indexMcp.x, indexMcp.y, indexMcp.z);
    const pinkyVec = new THREE.Vector3(pinkyMcp.x, pinkyMcp.y, pinkyMcp.z);

    // Forward vector (Wrist to Index MCP)
    const forward = new THREE.Vector3().subVectors(indexVec, wristVec).normalize();
    
    // Right vector (Wrist to Pinky MCP)
    const rightTemp = new THREE.Vector3().subVectors(pinkyVec, wristVec).normalize();

    // Up vector (Cross product of Right and Forward gives the Palm Normal)
    // Depends on whether it's left or right hand. For a simple approximation, we cross them.
    const up = new THREE.Vector3().crossVectors(rightTemp, forward).normalize();
    
    // Recalculate true orthogonal right vector
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    // Create rotation matrix
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(right, up, forward);
    
    // Apply user rotation offsets
    const userRot = new THREE.Euler(
      THREE.MathUtils.degToRad(arObjectSettings.rotation[0]),
      THREE.MathUtils.degToRad(arObjectSettings.rotation[1]),
      THREE.MathUtils.degToRad(arObjectSettings.rotation[2])
    );
    const userQuat = new THREE.Quaternion().setFromEuler(userRot);

    targetQuaternion.current.setFromRotationMatrix(matrix).multiply(userQuat);

    // 3. Smooth Interpolation (Damping)
    const dt = Math.min(delta, 0.1); // Cap delta to avoid huge jumps
    
    // Damp position
    groupRef.current.position.lerp(targetPosition.current, 10 * dt);
    
    // Damp rotation
    groupRef.current.quaternion.slerp(targetQuaternion.current, 8 * dt);
  });

  const modelUrl = `/models/${MODELS[arObjectSettings.modelIndex] || MODELS[0]}`;

  return (
    <group>
      {/* Lighting setup for realistic 3D models */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      <spotLight 
        position={[-5, 5, 0]} 
        intensity={1} 
        angle={0.5} 
        penumbra={1} 
        castShadow 
      />
      
      {/* The grouped model container that interpolates position/rotation */}
      <group ref={groupRef}>
        <ARModel url={modelUrl} scale={arObjectSettings.scale} />
      </group>
    </group>
  );
};
