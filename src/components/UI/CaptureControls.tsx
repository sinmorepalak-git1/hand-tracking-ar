import { useState, useRef } from 'react';
import { Camera, Video, Square } from 'lucide-react';

export const CaptureControls = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingLoopRef = useRef<number>(0);

  const handleScreenshot = () => {
    const video = document.querySelector('video');
    const glCanvas = document.querySelector('canvas');
    if (!video || !glCanvas) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (video.style.transform.includes('scaleX(-1)')) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = `ar-capture-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const startRecording = () => {
    const video = document.querySelector('video');
    const glCanvas = document.querySelector('canvas');
    if (!video || !glCanvas) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stream = canvas.captureStream(30);
    
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ar-recording-${Date.now()}.webm`;
      link.click();
    };

    setIsRecording(true);
    recorder.start();

    const drawFrame = () => {
      ctx.save();
      if (video.style.transform.includes('scaleX(-1)')) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height);
      recordingLoopRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();
  };

  const stopRecording = () => {
    setIsRecording(false);
    cancelAnimationFrame(recordingLoopRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-50">
      <button 
        onClick={handleScreenshot}
        className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-black/40 border border-gray-500/30 hover:bg-white/10 transition-colors text-white text-sm font-medium"
      >
        <Camera size={16} /> Capture
      </button>
      
      {isRecording ? (
        <button 
          onClick={stopRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-red-500/40 border border-red-500 hover:bg-red-500/60 transition-colors text-white text-sm font-medium animate-pulse"
        >
          <Square size={16} /> Stop
        </button>
      ) : (
        <button 
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md bg-black/40 border border-gray-500/30 hover:bg-white/10 transition-colors text-white text-sm font-medium"
        >
          <Video size={16} /> Record
        </button>
      )}
    </div>
  );
};
