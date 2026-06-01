import { FilesetResolver, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type HandLandmarks = NormalizedLandmark[];

class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing HandLandmarker:', error);
    }
  }

  detect(video: HTMLVideoElement, timestamp: number): HandLandmarks[] {
    if (!this.handLandmarker || !this.isInitialized) return [];

    const result = this.handLandmarker.detectForVideo(video, timestamp);
    return result.landmarks;
  }
}

export const handTracker = new HandTracker();

export const mapLandmarkTo3D = (
  l: NormalizedLandmark, 
  viewport: { width: number; height: number }, 
  mirrorCamera: boolean
) => {
  // Use exact viewport bounds
  const x = mirrorCamera 
    ? -(l.x - 0.5) * viewport.width 
    : (l.x - 0.5) * viewport.width;
    
  const y = -(l.y - 0.5) * viewport.height;
  const z = -l.z * viewport.width * 0.5;
  
  return { x, y, z };
};
