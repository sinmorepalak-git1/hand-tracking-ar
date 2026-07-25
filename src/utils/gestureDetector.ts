import { HandLandmarks } from './handTracker';

export type Gesture = 'Open_Palm' | 'Closed_Fist' | 'Pointing' | 'Peace_Sign' | 'Thumbs_Up' | 'Pinch' | 'Five_Fingers_Spread' | 'Swipe_Left' | 'Swipe_Right' | 'Unknown';

export const detectGesture = (landmarks: HandLandmarks): Gesture => {
  if (!landmarks || landmarks.length === 0) return 'Unknown';

  const isFingerExtended = (tip: number, dip: number, pip: number, mcp: number) => {
    // Basic heuristic: y-coordinate of tip is less than the pip (assuming upward is lower Y in video coordinates)
    return landmarks[tip].y < landmarks[pip].y;
  };

  const thumbExtended = landmarks[4].x < landmarks[3].x; // very naive depending on hand and mirror
  const indexExtended = isFingerExtended(8, 7, 6, 5);
  const middleExtended = isFingerExtended(12, 11, 10, 9);
  const ringExtended = isFingerExtended(16, 15, 14, 13);
  const pinkyExtended = isFingerExtended(20, 19, 18, 17);

  // Pinch detection: Thumb tip and Index tip are very close to each other
  const dx = landmarks[4].x - landmarks[8].x;
  const dy = landmarks[4].y - landmarks[8].y;
  const dz = (landmarks[4].z || 0) - (landmarks[8].z || 0);
  const pinchDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const isPinching = pinchDistance < 0.05;

  if (isPinching && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'Pinch';
  }

  // Five Fingers Spread: all extended, plus distance between thumb and pinky is large
  if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
    const spreadDx = landmarks[4].x - landmarks[20].x;
    const spreadDy = landmarks[4].y - landmarks[20].y;
    const spreadDistance = Math.sqrt(spreadDx*spreadDx + spreadDy*spreadDy);
    if (spreadDistance > 0.3) {
      return 'Five_Fingers_Spread';
    }
    return 'Open_Palm';
  }
  
  if (!thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'Closed_Fist';
  }

  if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'Pointing';
  }

  if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return 'Peace_Sign';
  }

  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'Thumbs_Up';
  }

  // Note: Swipe left/right requires temporal tracking (velocity), which will be handled in useGestureControls hook.
  // detectGesture only handles static poses.

  return 'Unknown';
};
