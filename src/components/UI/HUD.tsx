import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Settings, Activity, Zap, Shield, Sparkles, CircleDot, PenTool, Trash2, Flame, Box, Image as ImageIcon, Upload, X, Copy, ChevronUp, ChevronDown, FlipHorizontal, FlipVertical } from 'lucide-react';
import { saveImageToDB, deleteImageFromDB, getImageFromDB } from '../../utils/indexedDB';
import { processAndRemoveBackground } from '../../utils/imageProcessing';

export const HUD = () => {
  const { 
    fps, handsDetected, trackingQuality, 
    activeEffect, setActiveEffect, 
    settings, updateSettings,
    appMode, setAppMode,
    arDrawingSettings, setArDrawingSettings, triggerClearCanvas,
    arObjectSettings, setArObjectSettings,
    imageOverlays, setImageOverlays,
    selectedOverlayId, setSelectedOverlayId,
    isGalleryVisible, setIsGalleryVisible,
    duplicateImage
  } = useStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#22d3ee', '#ffffff'];

  const effects = [
    { id: 'neon' as const, icon: <Activity size={20} />, label: 'Neon Skeleton' },
    { id: 'hologram' as const, icon: <CircleDot size={20} />, label: 'Cyber Hologram' },
    { id: 'shield' as const, icon: <Shield size={20} />, label: 'Energy Shield' },
    { id: 'magic' as const, icon: <Sparkles size={20} />, label: 'Magic Circle' },
    { id: 'ironman' as const, icon: <Zap size={20} />, label: 'Iron-Man UI' },
    { id: 'airdraw' as const, icon: <PenTool size={20} />, label: 'Air Draw' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsProcessing(false);
        return;
      }

      try {
        // Automatic background removal
        const processedDataUrl = await processAndRemoveBackground(dataUrl);

        const id = Date.now().toString();
        const newOverlay = {
          id,
          name: file.name,
          anchor: 'palm' as const,
          positionOffset: [0, 0, 0] as [number, number, number],
          scale: 2.5,
          rotation: [0, 0, 0] as [number, number, number],
          opacity: 1.0,
          flipX: false,
          flipY: false,
          zIndex: imageOverlays.length,
          shadowStrength: 0.5,
          glowIntensity: 0.0,
          animationOn: false
        };

        await saveImageToDB(id, processedDataUrl);
        setImageOverlays((prev) => [...prev, newOverlay]);
        setSelectedOverlayId(id);
      } catch (error) {
        console.error("Failed to save image", error);
        alert("Failed to process and save image.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteOverlay = async (id: string) => {
    try {
      await deleteImageFromDB(id);
      setImageOverlays((prev) => prev.filter(img => img.id !== id));
      if (selectedOverlayId === id) setSelectedOverlayId(null);
    } catch (error) {
      console.error("Failed to delete image", error);
    }
  };

  const handleDuplicate = async (id: string) => {
    const original = imageOverlays.find(img => img.id === id);
    if (!original) return;
    try {
      const dataUrl = await getImageFromDB(id);
      if (dataUrl) {
        const newId = Date.now().toString();
        await saveImageToDB(newId, dataUrl);
        const newOverlay = { ...original, id: newId, name: `${original.name} (Copy)`, zIndex: imageOverlays.length };
        setImageOverlays(prev => [...prev, newOverlay]);
        setSelectedOverlayId(newId);
      }
    } catch (error) {
      console.error("Failed to duplicate image", error);
    }
  };

  const selectedOverlay = imageOverlays.find(img => img.id === selectedOverlayId);

  const updateSelectedOverlay = (updates: Partial<typeof selectedOverlay>) => {
    if (!selectedOverlayId) return;
    setImageOverlays(prev => prev.map(img => 
      img.id === selectedOverlayId ? { ...img, ...updates } as any : img
    ));
  };

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

      {/* Top Right Effect & Quality & Mode Switcher */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-50">
        <div className="flex bg-black/40 backdrop-blur-md rounded-xl p-1 border border-gray-500/30 flex-wrap justify-end max-w-2xl gap-1">
          <button 
            onClick={() => setAppMode('airWriter')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'airWriter' ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-400 hover:text-white'}`}
          >
            <PenTool size={16} /> Air Writer
          </button>
          <button 
            onClick={() => setAppMode('arDrawing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'arDrawing' ? 'bg-purple-500/30 text-purple-300' : 'text-gray-400 hover:text-white'}`}
          >
            <Sparkles size={16} /> AR Drawing
          </button>
          <button 
            onClick={() => setAppMode('neonSkeleton')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'neonSkeleton' ? 'bg-green-500/30 text-green-300' : 'text-gray-400 hover:text-white'}`}
          >
            <Activity size={16} /> Neon Skeleton
          </button>
          <button 
            onClick={() => setAppMode('elemental')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'elemental' ? 'bg-orange-500/30 text-orange-300' : 'text-gray-400 hover:text-white'}`}
          >
            <Flame size={16} /> Elemental Energy
          </button>
          <button 
            onClick={() => setAppMode('arObjects')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'arObjects' ? 'bg-pink-500/30 text-pink-300' : 'text-gray-400 hover:text-white'}`}
          >
            <Box size={16} /> 3D AR
          </button>
          <button 
            onClick={() => setAppMode('arImageOverlay')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${appMode === 'arImageOverlay' ? 'bg-blue-500/30 text-blue-300' : 'text-gray-400 hover:text-white'}`}
          >
            <ImageIcon size={16} /> Image Overlay
          </button>
        </div>
        
        {appMode === 'airWriter' && (
          <div className="p-3 rounded-xl flex flex-col gap-1 items-end backdrop-blur-md bg-black/40 border border-purple-500/30">
            <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              {effects.find(e => e.id === activeEffect)?.label || 'Active Effect'}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              Tracking: <span className={trackingQuality > 80 ? 'text-green-400' : 'text-yellow-400'}>{trackingQuality}%</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-black/40 border border-gray-500/30 hover:bg-black/60 transition-colors backdrop-blur-md"
        >
          <Settings className="text-gray-300" size={20} />
        </button>
      </div>

      {/* Bottom Effect Controls (Air Writer Mode Only) */}
      {appMode === 'airWriter' && (
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
      )}

      {/* AR Image Overlay UI */}
      {appMode === 'arImageOverlay' && (
        <>
          {/* Left Panel: Gallery */}
          {isGalleryVisible && (
            <div className="absolute left-4 top-24 bottom-24 w-52 flex flex-col gap-4 z-50">
              <div className="flex-1 p-4 rounded-2xl backdrop-blur-xl bg-black/60 border border-gray-500/30 flex flex-col gap-3 text-white overflow-hidden">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <h3 className="font-bold text-sm">Image Gallery</h3>
                  <button onClick={() => setIsGalleryVisible(false)} className="text-gray-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                  {imageOverlays.length === 0 ? (
                    <div className="text-xs text-gray-400 italic text-center mt-4">No images uploaded</div>
                  ) : (
                    [...imageOverlays].sort((a, b) => b.zIndex - a.zIndex).map(img => (
                      <div 
                        key={img.id}
                        onClick={() => setSelectedOverlayId(img.id)}
                        className={`p-2 rounded-lg cursor-pointer border transition-colors flex justify-between items-center ${
                          selectedOverlayId === img.id ? 'bg-blue-500/30 border-blue-400' : 'bg-gray-800/50 border-transparent hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-xs truncate w-24" title={img.name}>{img.name}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDuplicate(img.id); }}
                            className="text-gray-400 hover:text-green-400"
                            title="Duplicate"
                          >
                            <Copy size={14} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteOverlay(img.id); }}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="w-full py-2 bg-blue-600/30 text-blue-300 rounded-lg hover:bg-blue-600/50 border border-blue-500/30 transition-colors text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : <><Upload size={14} /> Upload Image</>}
                </button>
              </div>
            </div>
          )}

          {/* Right Panel: Controls for Selected Image */}
          {selectedOverlay && isGalleryVisible && (
            <div className="absolute right-4 top-24 bottom-24 overflow-y-auto custom-scrollbar flex flex-col gap-4 z-50">
              <div className="p-4 rounded-2xl backdrop-blur-xl bg-black/60 border border-gray-500/30 flex flex-col gap-4 w-56 items-center text-white min-h-max">
                <h3 className="font-bold text-sm text-blue-300 truncate w-full text-center border-b border-gray-700 pb-2">
                  {selectedOverlay.name}
                </h3>
                
                {/* Z-Index Controls */}
                <div className="flex w-full justify-between px-2">
                  <button 
                    onClick={() => updateSelectedOverlay({ zIndex: selectedOverlay.zIndex - 1 })}
                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    <ChevronDown size={14}/> Send Back
                  </button>
                  <button 
                    onClick={() => updateSelectedOverlay({ zIndex: selectedOverlay.zIndex + 1 })}
                    className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
                  >
                    <ChevronUp size={14}/> Bring Fwd
                  </button>
                </div>

                {/* Anchor Selector */}
                <div className="flex flex-col w-full text-center gap-1">
                  <span className="text-xs text-gray-400 uppercase">Anchor</span>
                  <select 
                    value={selectedOverlay.anchor}
                    onChange={(e) => updateSelectedOverlay({ anchor: e.target.value as any })}
                    className="bg-gray-800 text-sm p-1 rounded border border-gray-600 outline-none"
                  >
                    <option value="palm">Palm Center</option>
                    <option value="back">Back of Hand</option>
                    <option value="index">Index Fingertip</option>
                    <option value="middle">Middle Fingertip</option>
                    <option value="ring">Ring Fingertip</option>
                    <option value="little">Little Fingertip</option>
                    <option value="thumb">Thumb Tip</option>
                    <option value="wrist">Wrist</option>
                    <option value="fixed">Fixed Position</option>
                  </select>
                </div>

                <div className="w-full h-px bg-gray-700 my-1"></div>

                {/* Scale Slider */}
                <div className="flex flex-col w-full text-center gap-1">
                  <span className="text-xs text-gray-400 uppercase">Scale: {selectedOverlay.scale.toFixed(1)}x</span>
                  <input 
                    type="range" min="0.5" max="5.0" step="0.1" 
                    value={selectedOverlay.scale} 
                    onChange={(e) => updateSelectedOverlay({ scale: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Opacity Slider */}
                <div className="flex flex-col w-full text-center gap-1">
                  <span className="text-xs text-gray-400 uppercase">Opacity: {(selectedOverlay.opacity * 100).toFixed(0)}%</span>
                  <input 
                    type="range" min="0.1" max="1.0" step="0.05" 
                    value={selectedOverlay.opacity} 
                    onChange={(e) => updateSelectedOverlay({ opacity: parseFloat(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="w-full h-px bg-gray-700 my-1"></div>

                {/* Advanced VFX */}
                <div className="flex flex-col w-full text-center gap-1">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-gray-400 uppercase">Idle Anim</span>
                    <input type="checkbox" checked={selectedOverlay.animationOn} onChange={(e) => updateSelectedOverlay({ animationOn: e.target.checked })} className="accent-blue-500" />
                  </div>
                </div>

                <div className="flex flex-col w-full text-center gap-1">
                  <span className="text-xs text-gray-400 uppercase">Shadow: {(selectedOverlay.shadowStrength * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="1.0" step="0.1" value={selectedOverlay.shadowStrength} onChange={(e) => updateSelectedOverlay({ shadowStrength: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                </div>

                <div className="flex flex-col w-full text-center gap-1">
                  <span className="text-xs text-gray-400 uppercase">Glow: {(selectedOverlay.glowIntensity * 100).toFixed(0)}%</span>
                  <input type="range" min="0" max="2.0" step="0.1" value={selectedOverlay.glowIntensity} onChange={(e) => updateSelectedOverlay({ glowIntensity: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
                </div>

                <div className="w-full h-px bg-gray-700 my-1"></div>

                {/* Mirroring Toggles */}
                <div className="flex w-full justify-around mt-1">
                  <button 
                    onClick={() => updateSelectedOverlay({ flipX: !selectedOverlay.flipX })}
                    className={`p-2 rounded ${selectedOverlay.flipX ? 'bg-blue-500/50' : 'bg-gray-700'} hover:bg-blue-400/50`}
                    title="Flip Horizontal"
                  >
                    <FlipHorizontal size={16}/>
                  </button>
                  <button 
                    onClick={() => updateSelectedOverlay({ flipY: !selectedOverlay.flipY })}
                    className={`p-2 rounded ${selectedOverlay.flipY ? 'bg-blue-500/50' : 'bg-gray-700'} hover:bg-blue-400/50`}
                    title="Flip Vertical"
                  >
                    <FlipVertical size={16}/>
                  </button>
                </div>

                <div className="w-full h-px bg-gray-700 my-1"></div>

                {/* Rotations */}
                <div className="flex flex-col w-full text-center gap-2">
                  <span className="text-xs text-gray-400 uppercase font-bold">Rotation (X, Y, Z)</span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">X</span>
                    <input type="range" min="0" max="360" step="1" 
                      value={selectedOverlay.rotation[0]} 
                      onChange={(e) => updateSelectedOverlay({ rotation: [parseFloat(e.target.value), selectedOverlay.rotation[1], selectedOverlay.rotation[2]] })}
                      className="w-full accent-red-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">Y</span>
                    <input type="range" min="0" max="360" step="1" 
                      value={selectedOverlay.rotation[1]} 
                      onChange={(e) => updateSelectedOverlay({ rotation: [selectedOverlay.rotation[0], parseFloat(e.target.value), selectedOverlay.rotation[2]] })}
                      className="w-full accent-green-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">Z</span>
                    <input type="range" min="0" max="360" step="1" 
                      value={selectedOverlay.rotation[2]} 
                      onChange={(e) => updateSelectedOverlay({ rotation: [selectedOverlay.rotation[0], selectedOverlay.rotation[1], parseFloat(e.target.value)] })}
                      className="w-full accent-blue-500" />
                  </div>
                </div>

                <div className="w-full h-px bg-gray-700 my-1"></div>

                {/* Offsets */}
                <div className="flex flex-col w-full text-center gap-2">
                  <span className="text-xs text-gray-400 uppercase font-bold">Position Offset (X, Y, Z)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">X</span>
                    <input type="range" min="-5" max="5" step="0.1" 
                      value={selectedOverlay.positionOffset[0]} 
                      onChange={(e) => updateSelectedOverlay({ positionOffset: [parseFloat(e.target.value), selectedOverlay.positionOffset[1], selectedOverlay.positionOffset[2]] })}
                      className="w-full accent-red-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">Y</span>
                    <input type="range" min="-5" max="5" step="0.1" 
                      value={selectedOverlay.positionOffset[1]} 
                      onChange={(e) => updateSelectedOverlay({ positionOffset: [selectedOverlay.positionOffset[0], parseFloat(e.target.value), selectedOverlay.positionOffset[2]] })}
                      className="w-full accent-green-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-4">Z</span>
                    <input type="range" min="-5" max="5" step="0.1" 
                      value={selectedOverlay.positionOffset[2]} 
                      onChange={(e) => updateSelectedOverlay({ positionOffset: [selectedOverlay.positionOffset[0], selectedOverlay.positionOffset[1], parseFloat(e.target.value)] })}
                      className="w-full accent-blue-500" />
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}

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
