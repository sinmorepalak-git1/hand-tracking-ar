import { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore';
import { handTracker, type HandLandmarks } from './utils/handTracker';
import { detectGesture } from './utils/gestureDetector';
import { ARCanvas } from './components/ARCanvas';
import { HUD } from './components/UI/HUD';
import { CaptureControls } from './components/UI/CaptureControls';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const [landmarks, setLandmarks] = useState<HandLandmarks[]>([]);
  const { setStats, settings, setEnvironmentBrightness } = useStore();
  
  const lastTimeRef = useRef(performance.now());
  const brightnessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const brightnessLastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const setupCamera = async () => {
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for the video to be ready before playing
          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            if (video.readyState >= 2) {
              resolve();
            } else {
              video.onloadeddata = () => resolve();
            }
          });

          if (cancelled) return;

          try {
            await videoRef.current.play();
          } catch (playErr) {
            // Ignore AbortError from StrictMode double-mount
            if ((playErr as DOMException).name !== 'AbortError') throw playErr;
            return;
          }

          if (cancelled) return;

          setCameraReady(true);
          await handTracker.initialize();
          
          if (!cancelled) {
            startTracking();
          }
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (!cancelled) {
          setError("Camera access is required. Please allow camera permissions and refresh.");
        }
      }
    };

    const startTracking = () => {
      if (!videoRef.current) return;

      const detect = () => {
        if (cancelled) return;
        
        const video = videoRef.current;
        if (!video || video.readyState !== 4) {
          requestRef.current = requestAnimationFrame(detect);
          return;
        }

        const now = performance.now();
        const results = handTracker.detect(video, now);
        
        setLandmarks(results);
        
        // Gesture recognition to switch effects (DISABLED FOR STABILITY)
        /*
        if (results.length > 0) {
          const gesture = detectGesture(results[0]);
          if (gesture === 'Open_Palm') useStore.getState().setActiveEffect('shield');
          else if (gesture === 'Closed_Fist') useStore.getState().setActiveEffect('magic');
          else if (gesture === 'Pointing') useStore.getState().setActiveEffect('neon');
          else if (gesture === 'Peace_Sign') useStore.getState().setActiveEffect('hologram');
          else if (gesture === 'Thumbs_Up') useStore.getState().setActiveEffect('ironman');
        }
        */

        // Calculate FPS
        frameCountRef.current++;
        if (now - lastTimeRef.current >= 1000) {
          setStats({ 
            fps: frameCountRef.current,
            handsDetected: results.length,
            trackingQuality: results.length > 0 ? 98 : 0
          });
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        } else {
          setStats({ handsDetected: results.length });
        }

        // Lighting Estimation (every 1 second)
        if (now - brightnessLastTimeRef.current >= 1000) {
          if (!brightnessCanvasRef.current) {
            brightnessCanvasRef.current = document.createElement('canvas');
            brightnessCanvasRef.current.width = 16;
            brightnessCanvasRef.current.height = 16;
          }
          const ctx = brightnessCanvasRef.current.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
              // Luminance formula
              sum += (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
            }
            const avgBrightness = (sum / (16 * 16)) / 255;
            // Normalize to a reasonable range for Three.js lights (0.3 to 1.5)
            const lightIntensity = Math.max(0.3, Math.min(1.5, avgBrightness * 2.0));
            setEnvironmentBrightness(lightIntensity);
          }
          brightnessLastTimeRef.current = now;
        }

        requestRef.current = requestAnimationFrame(detect);
      };

      detect();
    };

    setupCamera();

    return () => {
      cancelled = true;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [setStats]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="p-6 rounded-2xl backdrop-blur-xl bg-red-900/40 border border-red-500/50 text-red-200 text-center max-w-md">
            <p className="text-lg font-semibold mb-2">⚠️ Camera Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!cameraReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="p-6 rounded-2xl backdrop-blur-xl bg-black/60 border border-cyan-500/30 text-cyan-300 text-center">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-lg font-semibold">Initializing AR System</p>
            <p className="text-sm text-gray-400 mt-1">Please allow camera access...</p>
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 ${
          settings.mirrorCamera ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* AR Canvas */}
      <ARCanvas landmarks={landmarks} />

      {/* HUD overlay */}
      <HUD />
      
      {/* Capture & Record Controls */}
      <CaptureControls />
    </div>
  );
}

export default App;
