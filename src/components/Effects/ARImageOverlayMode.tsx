import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mapLandmarkTo3D, type HandLandmarks } from '../../utils/handTracker';
import { useStore } from '../../store/useStore';
import { ErrorBoundary } from '../ErrorBoundary';
import { getImageFromDB } from '../../utils/indexedDB';
import { Vector3OneEuroFilter } from '../../utils/OneEuroFilter';
import { HandOccluder } from './HandOccluder';
import { useGestureControls } from '../../hooks/useGestureControls';

interface Props {
  landmarks: HandLandmarks[];
}

const OverlayItem = ({ 
  overlay, 
  landmarks, 
  viewport, 
  mirrorCamera 
}: { 
  overlay: any, 
  landmarks: HandLandmarks[],
  viewport: any,
  mirrorCamera: boolean
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Use One Euro Filter for buttery smooth tracking
  const posFilter = useMemo(() => new Vector3OneEuroFilter(0.5, 0.01), []);
  const rotFilter = useMemo(() => new Vector3OneEuroFilter(0.5, 0.01), []); 
  
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let isMounted = true;
    getImageFromDB(overlay.id).then(dataUrl => {
      if (dataUrl && isMounted) {
        new THREE.TextureLoader().load(dataUrl, (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.generateMipmaps = true;
          if (isMounted) {
            setTexture(loadedTexture);
            console.log('Texture Ready');
          }
        }, undefined, (err) => {
          console.error('Texture failed to load', err);
        });
      }
    });
    return () => { isMounted = false; };
  }, [overlay.id]);

  useFrame(() => {
    if (!meshRef.current) return;
    const now = performance.now() / 1000;

    // Update procedural vertex shader time uniform
    if (materialRef.current && materialRef.current.userData.shader) {
      materialRef.current.userData.shader.uniforms.time.value = now;
      materialRef.current.userData.shader.uniforms.animationOn.value = overlay.animationOn ? 1.0 : 0.0;
    }

    let targetPos = new THREE.Vector3();
    let targetQuat = new THREE.Quaternion();
    let targetScale = overlay.scale;

    if (overlay.anchor === 'fixed') {
      targetPos.set(overlay.positionOffset[0], overlay.positionOffset[1], overlay.positionOffset[2] - 2);
      const userRot = new THREE.Euler(
        THREE.MathUtils.degToRad(overlay.rotation[0]),
        THREE.MathUtils.degToRad(overlay.rotation[1]),
        THREE.MathUtils.degToRad(overlay.rotation[2])
      );
      targetQuat.setFromEuler(userRot);
    } else {
      if (!landmarks || landmarks.length === 0) return;
      const hand = landmarks[0];
      if (!hand || hand.length < 21) return;

      const anchorMap: Record<string, number> = {
        'palm': 9,
        'back': 9,
        'wrist': 0,
        'thumb': 4,
        'index': 8,
        'middle': 12,
        'ring': 16,
        'little': 20
      };
      
      const anchorLandmark = hand[anchorMap[overlay.anchor] || 9];
      if (!anchorLandmark) return;

      const { x, y, z } = mapLandmarkTo3D(anchorLandmark, viewport, mirrorCamera);
      
      const wrist3D = mapLandmarkTo3D(hand[0], viewport, mirrorCamera);
      const palm3D = mapLandmarkTo3D(hand[9], viewport, mirrorCamera);
      const dx = palm3D.x - wrist3D.x;
      const dy = palm3D.y - wrist3D.y;
      const dz = palm3D.z - wrist3D.z;
      const handSize = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      targetScale = overlay.scale * handSize * 2.0;

      const indexMcp = mapLandmarkTo3D(hand[5], viewport, mirrorCamera);
      const pinkyMcp = mapLandmarkTo3D(hand[17], viewport, mirrorCamera);

      const wristVec = new THREE.Vector3(wrist3D.x, wrist3D.y, wrist3D.z);
      const indexVec = new THREE.Vector3(indexMcp.x, indexMcp.y, indexMcp.z);
      const pinkyVec = new THREE.Vector3(pinkyMcp.x, pinkyMcp.y, pinkyMcp.z);

      const forward = new THREE.Vector3().subVectors(indexVec, wristVec).normalize();
      const rightTemp = new THREE.Vector3().subVectors(pinkyVec, wristVec).normalize();
      
      let up = new THREE.Vector3().crossVectors(rightTemp, forward).normalize();
      if (overlay.anchor === 'back') {
        up.negate();
      }
      
      const right = new THREE.Vector3().crossVectors(forward, up).normalize();

      const matrix = new THREE.Matrix4();
      matrix.makeBasis(right, up, forward);
      
      const userRot = new THREE.Euler(
        THREE.MathUtils.degToRad(overlay.rotation[0]),
        THREE.MathUtils.degToRad(overlay.rotation[1]),
        THREE.MathUtils.degToRad(overlay.rotation[2])
      );
      const userQuat = new THREE.Quaternion().setFromEuler(userRot);
      targetQuat.setFromRotationMatrix(matrix).multiply(userQuat);

      const offsetVec = new THREE.Vector3(
        overlay.positionOffset[0],
        overlay.positionOffset[1],
        overlay.positionOffset[2]
      ).applyQuaternion(targetQuat);

      targetPos.set(x + offsetVec.x, y + offsetVec.y, z + offsetVec.z);
    }

    const filteredPos = posFilter.filter(targetPos.x, targetPos.y, targetPos.z, now);
    meshRef.current.position.set(filteredPos.x, filteredPos.y, filteredPos.z);
    
    const euler = new THREE.Euler().setFromQuaternion(targetQuat);
    const filteredEuler = rotFilter.filter(euler.x, euler.y, euler.z, now);
    meshRef.current.rotation.set(filteredEuler.x, filteredEuler.y, filteredEuler.z);

    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
  });

  // Shader injection for idle animation
  const onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.time = { value: 0 };
    shader.uniforms.animationOn = { value: overlay.animationOn ? 1.0 : 0.0 };
    
    shader.vertexShader = `
      uniform float time;
      uniform float animationOn;
    ` + shader.vertexShader;
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      if (animationOn > 0.5) {
         // Organic idle flap/breathe
         float flap = sin(time * 3.0) * 0.15;
         transformed.z += abs(transformed.x) * flap;
         float breathe = sin(time * 2.0) * 0.05;
         transformed.y += transformed.y * breathe;
      }
      `
    );
    if (materialRef.current) materialRef.current.userData.shader = shader;
  };

  if (!texture) return null;

  const image = texture.image as HTMLImageElement;
  const aspect = image.width / image.height;
  const flipX = overlay.flipX ? -1 : 1;
  const flipY = overlay.flipY ? -1 : 1;

  // Custom shadow shader to make it look softer and darker near the center
  const shadowShader = useMemo(() => {
    return {
      uniforms: {
        tDiffuse: { value: null },
        opacity: { value: overlay.opacity * overlay.shadowStrength * 0.8 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          // Darken towards the center, soften at edges
          float dist = distance(vUv, vec2(0.5));
          float edgeFade = smoothstep(0.5, 0.2, dist);
          gl_FragColor = vec4(0.0, 0.0, 0.0, texel.a * opacity * edgeFade);
        }
      `
    }
  }, [overlay.opacity, overlay.shadowStrength]);

  return (
    <group ref={meshRef}>
      {/* Dynamic Soft Drop Shadow */}
      {overlay.shadowStrength > 0 && (
        <mesh position={[0, -0.05, -0.15]} scale={[aspect * 1.1 * flipX, 1.1 * flipY, 1]}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial 
            uniforms={{
              tDiffuse: { value: texture },
              opacity: { value: overlay.opacity * overlay.shadowStrength * 0.8 }
            }}
            vertexShader={shadowShader.vertexShader}
            fragmentShader={shadowShader.fragmentShader}
            transparent={true}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Main Object */}
      {/* renderOrder is > 0 so it correctly evaluates depth buffer against the -1 invisible occlusion hand */}
      <mesh scale={[aspect * flipX, 1 * flipY, 1]} renderOrder={1}>
        <planeGeometry args={[1, 1, 16, 16]} /> 
        <meshStandardMaterial 
          ref={materialRef}
          map={texture} 
          transparent={true} 
          opacity={overlay.opacity} 
          side={THREE.DoubleSide} 
          depthWrite={true}
          roughness={0.7}
          metalness={0.1}
          emissive={new THREE.Color(1, 1, 1)}
          emissiveMap={texture}
          emissiveIntensity={overlay.glowIntensity * 5.0} // Triggers Bloom
          onBeforeCompile={onBeforeCompile}
        />
      </mesh>
    </group>
  );
};

export const ARImageOverlayMode = ({ landmarks }: Props) => {
  const { 
    imageOverlays, settings, environmentBrightness,
    selectedOverlayId, setSelectedOverlayId,
    isGalleryVisible, setIsGalleryVisible,
    setImageOverlays
  } = useStore();
  const { viewport } = useThree();
  const [isObjectVisible, setIsObjectVisible] = useState(true);

  useEffect(() => {
    console.log('Image Overlay Mounted');
    console.log('Renderer Initialized');
    console.log('Overlay Ready');
  }, []);

  useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      console.log('MediaPipe Connected');
    }
  }, [landmarks]);

  const cycleImage = (direction: 1 | -1) => {
    if (imageOverlays.length === 0) return;
    const currentIndex = imageOverlays.findIndex(img => img.id === selectedOverlayId);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = imageOverlays.length - 1;
    if (nextIndex >= imageOverlays.length) nextIndex = 0;
    setSelectedOverlayId(imageOverlays[nextIndex].id);
  };

  useGestureControls({
    landmarks,
    onToggleGallery: () => setIsGalleryVisible(!isGalleryVisible),
    onCycleNext: () => cycleImage(1),
    onSwipeLeft: () => cycleImage(1),
    onSwipeRight: () => cycleImage(-1),
    onHideObject: () => setIsObjectVisible(false),
    onShowObject: () => setIsObjectVisible(true),
    onPickUp: () => {
      if (imageOverlays.length === 0 || !selectedOverlayId) return;
      setImageOverlays(prev => prev.map(img => {
        if (img.id === selectedOverlayId) {
          let newScale = img.scale + 0.5;
          if (newScale > 5.0) newScale = 0.5;
          return { ...img, scale: newScale };
        }
        return img;
      }));
    },
    onResetPosition: () => {
      if (imageOverlays.length === 0 || !selectedOverlayId) return;
      setImageOverlays(prev => prev.map(img => 
        img.id === selectedOverlayId ? { ...img, positionOffset: [0, 0, 0], rotation: [0, 0, 0], scale: 2.5 } : img
      ));
    }
  });

  const sortedOverlays = [...imageOverlays].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <group>
      {/* Lighting matched to environment via WebCam sampling */}
      <ambientLight intensity={0.6 * environmentBrightness} />
      <directionalLight position={[0, 5, 5]} intensity={1.2 * environmentBrightness} />
      <spotLight position={[-5, 5, 2]} intensity={0.8 * environmentBrightness} angle={0.5} penumbra={1} />

      {/* Invisible Depth Occlusion Mask for Hand */}
      <HandOccluder landmarks={landmarks} mirrorCamera={settings.mirrorCamera} />

      {isObjectVisible && sortedOverlays.map(overlay => {
        // Only render selected overlay to act like a true AR filter, or render all depending on requirements.
        // Prompt implies a single main object resting on palm, and cycle between them.
        if (overlay.id !== selectedOverlayId) return null;
        return (
          <ErrorBoundary key={overlay.id} fallbackMessage={`Failed to render ${overlay.name}`}>
            <OverlayItem 
              overlay={overlay} 
              landmarks={landmarks} 
              viewport={viewport} 
              mirrorCamera={settings.mirrorCamera} 
            />
          </ErrorBoundary>
        );
      })}
    </group>
  );
};
