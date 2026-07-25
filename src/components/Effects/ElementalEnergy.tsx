import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';

interface Props {
  landmarks: HandLandmarks[];
}

const PARTICLE_COUNT_PER_HAND = 200;
const TOTAL_PARTICLES = PARTICLE_COUNT_PER_HAND * 2;

class Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  handType: 'left' | 'right';

  constructor(handType: 'left' | 'right') {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.life = 0; // 0 means dead
    this.maxLife = Math.random() * 1.0 + 0.5;
    this.scale = Math.random() * 0.05 + 0.02;
    this.handType = handType;
  }

  spawn(origin: THREE.Vector3, baseVelocity: THREE.Vector3) {
    this.position.copy(origin);
    
    // Random spread
    this.velocity.set(
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.08
    );
    
    // Add hand movement velocity
    this.velocity.add(baseVelocity);
    
    // Drift behavior based on hand type
    if (this.handType === 'right') {
      // Fire tends to go up
      this.velocity.y += Math.random() * 0.05 + 0.02;
    } else {
      // Ice/Energy tends to swirl and spread more
      this.velocity.x += (Math.random() - 0.5) * 0.05;
      this.velocity.z += (Math.random() - 0.5) * 0.05;
    }

    this.maxLife = Math.random() * 1.0 + 0.5;
    this.life = this.maxLife;
  }
}

export const ElementalEnergy = ({ landmarks }: Props) => {
  const { settings } = useStore();
  const { viewport } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Pre-allocate particles
  const particles = useMemo(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT_PER_HAND; i++) arr.push(new Particle('left'));
    for (let i = 0; i < PARTICLE_COUNT_PER_HAND; i++) arr.push(new Particle('right'));
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const blueColor = useMemo(() => new THREE.Color(0x00ffff), []); // Cyan ice
  const orangeColor = useMemo(() => new THREE.Color(0xff5500), []); // Orange fire

  // Track previous positions to calculate hand velocity
  const prevLeftPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const prevRightPos = useRef<THREE.Vector3>(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let leftHandPos: THREE.Vector3 | null = null;
    let rightHandPos: THREE.Vector3 | null = null;

    if (landmarks && landmarks.length > 0) {
      // Find the center palm (landmark 9) for all detected hands
      const handsWithPos = landmarks.map(hand => {
        if (!hand || hand.length < 21) return null;
        const pos3D = mapLandmarkTo3D(hand[9], viewport, settings.mirrorCamera);
        // We use the raw screen x for sorting (0 is left, 1 is right)
        // If mirrored, the user's right hand is on the left side of the screen
        const screenX = hand[9].x; 
        return { pos: new THREE.Vector3(pos3D.x, pos3D.y, pos3D.z), screenX };
      }).filter(h => h !== null) as { pos: THREE.Vector3, screenX: number }[];

      // Sort by screenX (left to right)
      handsWithPos.sort((a, b) => a.screenX - b.screenX);

      if (handsWithPos.length === 1) {
        // If only 1 hand, just default it to left (blue)
        leftHandPos = handsWithPos[0].pos;
      } else if (handsWithPos.length >= 2) {
        // Assign the leftmost cluster to blue, rightmost to orange
        leftHandPos = handsWithPos[0].pos;
        rightHandPos = handsWithPos[1].pos;
      }
    }

    // Calculate velocities (with delta time protection)
    const dt = Math.min(delta, 0.1);
    const leftVel = new THREE.Vector3();
    const rightVel = new THREE.Vector3();

    if (leftHandPos) {
      leftVel.subVectors(leftHandPos, prevLeftPos.current).divideScalar(dt * 60);
      prevLeftPos.current.copy(leftHandPos);
    }
    if (rightHandPos) {
      rightVel.subVectors(rightHandPos, prevRightPos.current).divideScalar(dt * 60);
      prevRightPos.current.copy(rightHandPos);
    }

    // Clamp velocities to prevent explosion if hand jumps
    leftVel.clampLength(0, 0.1);
    rightVel.clampLength(0, 0.1);

    // Update Particles
    particles.forEach((p, i) => {
      // Decrease life
      p.life -= delta;

      // Respawn logic
      if (p.life <= 0) {
        if (p.handType === 'left' && leftHandPos) {
          p.spawn(leftHandPos, leftVel);
        } else if (p.handType === 'right' && rightHandPos) {
          p.spawn(rightHandPos, rightVel);
        } else {
          // Keep dead if hand not present
          p.position.set(999, 999, 999);
          p.scale = 0;
        }
      }

      // Physics integration
      if (p.life > 0) {
        p.position.add(p.velocity);
        
        // Add some noise/wobble
        p.position.x += Math.sin(state.clock.elapsedTime * 5 + i) * 0.002;
        p.position.z += Math.cos(state.clock.elapsedTime * 5 + i) * 0.002;

        // Fire rises faster over time, ice swirls
        if (p.handType === 'right') {
           p.velocity.y += delta * 0.05; // Fire buoyancy
        } else {
           p.velocity.x *= 0.98; // Friction for ice
           p.velocity.y *= 0.98;
           p.velocity.z *= 0.98;
        }
      }

      // Matrix update
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const currentScale = p.scale * lifeRatio * (2 - lifeRatio); // Pop in, then fade out

      dummy.position.copy(p.position);
      dummy.scale.set(currentScale, currentScale, currentScale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Color update
      if (p.handType === 'left') {
        // Interpolate towards white core
        tempColor.copy(blueColor).lerp(new THREE.Color(0xffffff), lifeRatio * 0.5);
      } else {
        tempColor.copy(orangeColor).lerp(new THREE.Color(0xffff00), lifeRatio * 0.8);
      }
      meshRef.current!.setColorAt(i, tempColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, TOTAL_PARTICLES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
