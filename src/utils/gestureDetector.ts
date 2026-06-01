import { HandLandmarks } from './handTracker';

export type Gesture = 'Open_Palm' | 'Closed_Fist' | 'Pointing' | 'Peace_Sign' | 'Thumbs_Up' | 'Unknown';

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

  if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
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

  return 'Unknown';
};
