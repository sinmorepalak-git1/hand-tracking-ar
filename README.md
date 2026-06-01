# AR Hand Tracking Experience

A futuristic real-time Augmented Reality hand tracking web application built with React, Three.js, MediaPipe, and Tailwind CSS.

## Features
- Real-time hand detection and 21-landmark tracking via MediaPipe.
- 5 Different AR Holographic Modes (Neon Skeleton, Cyber Hologram, Energy Shield, Magic Circle, Iron-Man UI).
- Interactive Particle Trails for fingertips.
- Futuristic Glassmorphism HUD.
- Screenshot & Video Recording capabilities.
- Live settings panel to tweak glow intensity, particle counts, and rotation speeds.

## Tech Stack
- React 19 + TypeScript
- Vite
- Three.js + React Three Fiber + Drei
- @react-three/postprocessing (Bloom)
- @mediapipe/tasks-vision
- Tailwind CSS v4
- Zustand
- Lucide React
- Framer Motion

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Allow camera access when prompted by the browser to begin the AR experience.

## Architecture

- `src/components/ARCanvas.tsx`: Main 3D Canvas rendering the AR overlay.
- `src/components/Effects/*`: Separate components for different AR hand tracking effects.
- `src/components/UI/*`: HUD, controls, and settings panel.
- `src/utils/handTracker.ts`: MediaPipe Vision Tasks integration for hand landmark detection.
- `src/store/useStore.ts`: Global Zustand state for effect modes and settings.
