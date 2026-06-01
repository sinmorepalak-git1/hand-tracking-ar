import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Settings, Activity, Zap, Shield, Sparkles, CircleDot, PenTool } from 'lucide-react';

export const HUD = () => {
  const { fps, handsDetected, trackingQuality, activeEffect, setActiveEffect, settings, updateSettings } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  const effects = [
    { id: 'neon' as const, icon: <Activity size={20} />, label: 'Neon Skeleton' },
    { id: 'hologram' as const, icon: <CircleDot size={20} />, label: 'Cyber Hologram' },
    { id: 'shield' as const, icon: <Shield size={20} />, label: 'Energy Shield' },
    { id: 'magic' as const, icon: <Sparkles size={20} />, label: 'Magic Circle' },
    { id: 'ironman' as const, icon: <Zap size={20} />, label: 'Iron-Man UI' },
    { id: 'airdraw' as const, icon: <PenTool size={20} />, label: 'Air Draw' },
  ];

  return (
    <>
      {/* Top Left Stats */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-50">
        <div className="p-3 rounded-xl flex flex-col gap-1 backdrop-blur-md bg-black/40 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-400 font-mono">
            <span className="text-xs uppercase opacity-70">FPS</span>
            <span className="font-bold">{fps.toFixed(0)}</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400 font-mono">
            <span className="text-xs uppercase opacity-70">Hands</span>
            <span className="font-bold">{handsDetected}</span>
          </div>
        </div>
      </div>

      {/* Top Right Effect & Quality */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-50">
        <div className="p-3 rounded-xl flex flex-col gap-1 items-end backdrop-blur-md bg-black/40 border border-purple-500/30">
          <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            {effects.find(e => e.id === activeEffect)?.label || 'Active Effect'}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            Tracking: <span className={trackingQuality > 80 ? 'text-green-400' : 'text-yellow-400'}>{trackingQuality}%</span>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-black/40 border border-gray-500/30 hover:bg-black/60 transition-colors backdrop-blur-md"
        >
          <Settings className="text-gray-300" size={20} />
        </button>
      </div>

      {/* Bottom Effect Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setActiveEffect(effect.id)}
            className={`p-4 rounded-full transition-all duration-300 backdrop-blur-md border ${
              activeEffect === effect.id 
                ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] text-cyan-300 scale-110' 
                : 'bg-black/40 border-gray-600/50 text-gray-400 hover:bg-white/10 hover:scale-105'
            }`}
            title={effect.label}
          >
            {effect.icon}
          </button>
        ))}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-4 w-72 p-5 rounded-2xl backdrop-blur-xl bg-black/60 border border-gray-500/30 z-50 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white mb-2 border-b border-gray-700 pb-2">Settings</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase">Glow Intensity</label>
            <input 
              type="range" min="0" max="3" step="0.1" 
              value={settings.glowIntensity} 
              onChange={(e) => updateSettings({ glowIntensity: parseFloat(e.target.value) })}
              className="accent-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase">Particle Count</label>
            <input 
              type="range" min="0" max="500" step="10" 
              value={settings.particleCount} 
              onChange={(e) => updateSettings({ particleCount: parseInt(e.target.value) })}
              className="accent-purple-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase">Ring Speed</label>
            <input 
              type="range" min="0" max="5" step="0.1" 
              value={settings.ringSpeed} 
              onChange={(e) => updateSettings({ ringSpeed: parseFloat(e.target.value) })}
              className="accent-pink-500"
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="text-sm text-gray-300">Mirror Camera</label>
            <input 
              type="checkbox" 
              checked={settings.mirrorCamera} 
              onChange={(e) => updateSettings({ mirrorCamera: e.target.checked })}
              className="w-4 h-4 accent-cyan-500"
            />
          </div>
        </div>
      )}
    </>
  );
};
