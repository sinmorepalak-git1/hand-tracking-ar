import { useEffect, useRef } from 'react';
import { HandLandmarks } from '../utils/handTracker';
import { Gesture, detectGesture } from '../utils/gestureDetector';

interface UseGestureControlsProps {
  landmarks: HandLandmarks[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onCycleNext?: () => void;
  onToggleGallery?: () => void;
  onHideObject?: () => void;
  onShowObject?: () => void;
  onResetPosition?: () => void;
  onPickUp?: () => void;
}

export const useGestureControls = ({
  landmarks,
  onSwipeLeft,
  onSwipeRight,
  onCycleNext,
  onToggleGallery,
  onHideObject,
  onShowObject,
  onResetPosition,
  onPickUp
}: UseGestureControlsProps) => {
  const previousGesture = useRef<Gesture>('Unknown');
  const gestureStartTime = useRef<number>(Date.now());
  
  // Swipe detection state
  const prevPalmX = useRef<number | null>(null);
  const swipeCooldown = useRef<number>(0);
  
  // Fist to Open cycle state
  const wasFistRecently = useRef<boolean>(false);
  const fistTime = useRef<number>(0);

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) return;
    const hand = landmarks[0];
    if (!hand) return;

    const currentGesture = detectGesture(hand);
    const now = Date.now();

    // Swipe detection (using palm center x-velocity)
    const palmX = hand[9].x;
    if (prevPalmX.current !== null && now > swipeCooldown.current) {
      const dx = palmX - prevPalmX.current;
      // Depending on mirror camera, dx might need inversion.
      // A threshold of 0.08 over roughly 1 frame (~16ms) is a fast swipe.
      // But coordinates might be filtered or frame rate varies.
      if (dx > 0.04) { // Fast movement right
        onSwipeRight?.();
        swipeCooldown.current = now + 1000; // 1s cooldown
      } else if (dx < -0.04) { // Fast movement left
        onSwipeLeft?.();
        swipeCooldown.current = now + 1000;
      }
    }
    prevPalmX.current = palmX;

    // Gesture State Machine
    if (currentGesture !== previousGesture.current) {
      previousGesture.current = currentGesture;
      gestureStartTime.current = now;

      // Handle Immediate Transitions
      if (currentGesture === 'Peace_Sign') {
        onToggleGallery?.();
      } else if (currentGesture === 'Five_Fingers_Spread') {
        onResetPosition?.();
      } else if (currentGesture === 'Pinch') {
        onPickUp?.();
      } else if (currentGesture === 'Closed_Fist') {
        onHideObject?.();
        wasFistRecently.current = true;
        fistTime.current = now;
      } else if (currentGesture === 'Open_Palm') {
        onShowObject?.();
        
        // Cycle check: if it was a fist recently (within 2 seconds) and now it's open palm
        if (wasFistRecently.current && now - fistTime.current < 2000) {
          onCycleNext?.();
          wasFistRecently.current = false; // reset
        }
      }
    }

  }, [landmarks, onSwipeLeft, onSwipeRight, onCycleNext, onToggleGallery, onHideObject, onShowObject, onResetPosition, onPickUp]);

  return {};
};
