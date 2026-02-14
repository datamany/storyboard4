import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Asset, Shot, AspectRatio, ImageSize } from '../types';
import { Button } from './Button';
import { generateShotImage } from '../services/gemini';

interface ShotCardProps {
  index: number;
  shot: Shot;
  clothes: Asset[];
  models: Asset[];
  poses: Asset[];
  onUpdate: (id: string, updates: Partial<Shot>) => void;
  onRemove: (id: string) => void;
  onPreview: (imageUrl: string) => void;
  onQuotaExceeded: () => void;
  dragHandleProps?: any;
  isGridView?: boolean;
}

export const ShotCard: React.FC<ShotCardProps> = ({
  index,
  shot,
  clothes,
  models,
  poses,
  onUpdate,
  onRemove,
  onPreview,
  onQuotaExceeded,
  dragHandleProps,
  isGridView
}) => {
  const [promptInput, setPromptInput] = useState(shot.prompt);
  const [previewWidth, setPreviewWidth] = useState(550); // Large default
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPromptInput(shot.prompt);
  }, [shot.prompt]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing && resizerRef.current) {
      const cardRect = resizerRef.current.parentElement?.getBoundingClientRect();
      if (cardRect) {
        // We calculate width of the preview (right side) based on mouse position relative to card right
        const newWidth = cardRect.right - e.clientX;
        // Limit resizing to reasonable bounds
        if (newWidth > 250 && newWidth < cardRect.width * 0.75) {
          setPreviewWidth(newWidth);
        }
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const handleGenerate = async (targetSize: ImageSize = '1K') => {
    onUpdate(shot.id, { isGenerating: true, error: undefined });

    try {
      const selectedModel = models.find(m => m.id === shot.selectedModelId) || null;
      const selectedPose = poses.find(p => p.id === shot.selectedPoseId) || null;
      const selectedClothes = clothes.filter(c => shot.selectedClothesIds.includes(c.id));
      
      const seed = shot.seed || Math.floor(Math.random() * 1000000);

      const generatedImage = await generateShotImage(
        promptInput, 
        selectedModel, 
        selectedClothes, 
        selectedPose,
        shot.aspectRatio, 
        targetSize,
        seed
      );
      
      onUpdate(shot.id, { 
        generatedImage, 
        isGenerating: false, 
        imageSize: targetSize,
        seed: seed
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate image";
      
      // Check for quota errors
      if (
        errorMessage.includes('429') || 
        errorMessage.toLowerCase().includes('quota') || 
        errorMessage.toLowerCase().includes('resource exhausted')
      ) {
        onQuotaExceeded();
        onUpdate(shot.id, { 
          error: "Quota Exceeded. Please update API Key.", 
          isGenerating: false 
        });
      } else {
        onUpdate(shot.id, { 
          error: errorMessage, 
          isGenerating: false 
        });
      }
    }
  };

  const handleUpscale = (size: ImageSize) => {
    if (!shot.generatedImage) return;
    handleGenerate(size);
  };

  const toggleClothes = (clothesId: string) => {
    const current = shot.selectedClothesIds;
    const updated = current.includes(clothesId)
      ? current.filter(id => id !== clothesId)
      : [...current, clothesId];
    onUpdate(shot.id, { selectedClothesIds: updated });
  };

  const insertMention = (name: string) => {
    const newVal = promptInput + ` @${name} `;
    setPromptInput(newVal);
    onUpdate(shot.id, { prompt: newVal });
  };

  const frameLabel = `Frame ${(index + 1).toString().padStart(2, '0')}`;

  if (isGridView) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden group relative aspect-[3/4] flex flex-col transition-all hover:border-indigo-500/50">
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex justify-between items-center">
           <div className="flex items-center gap-2">
             <div {...dragHandleProps} className="cursor-grab p-1 text-white/70 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </div>
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{frameLabel}</span>
           </div>
           <button onClick={() => onRemove(shot.id)} className="p-1 text-white/50 hover:text-red-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
           {shot.generatedImage ? (
             <img 
              src={shot.generatedImage} 
              alt="Generated" 
              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700" 
              onClick={() => onPreview(shot.generatedImage!)}
             />
           ) : (
             <div className="flex flex-col items-center gap-3 text-slate-700 p-4 text-center">
               {shot.isGenerating ? (
                 <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
               ) : (
                 <svg className="w-16 h-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               )}
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Empty Slot</p>
             </div>
           )}
        </div>
        
        <div className="p-3 bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50">
          <p className="text-[10px] text-slate-400 line-clamp-1 italic mb-2">"{shot.prompt || 'Untitled description'}"</p>
          {!shot.generatedImage && !shot.isGenerating && (
             <Button size="sm" onClick={() => handleGenerate()} className="w-full py-1.5 text-[10px] uppercase font-bold tracking-widest">Generate</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in slide-in-from-bottom-6 duration-500 relative group">
      {/* Input Section */}
      <div className="p-8 lg:p-10 flex-1 space-y-8 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-5">
            <div {...dragHandleProps} className="cursor-grab text-slate-600 hover:text-slate-400 transition-all p-2 bg-slate-900/50 rounded-xl border border-slate-700">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
            <div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-1">{frameLabel}</h3>
              <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Shot Configuration</p>
              </div>
            </div>
          </div>
          <button onClick={() => onRemove(shot.id)} className="text-slate-500 hover:text-red-400 transition-colors p-3 hover:bg-red-500/10 rounded-2xl border border-transparent hover:border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* Model Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Subject Reference</label>
              <div className="flex flex-wrap gap-3">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => onUpdate(shot.id, { selectedModelId: m.id === shot.selectedModelId ? null : m.id })}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all w-16 h-16 ${
                      shot.selectedModelId === m.id ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105 shadow-xl' : 'border-slate-700 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <img src={m.base64} alt={m.name} className="w-full h-full object-cover" />
                    {shot.selectedModelId === m.id && (
                       <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       </div>
                    )}
                  </button>
                ))}
                {models.length === 0 && <p className="text-xs text-slate-600 font-medium italic">No models uploaded in sidebar</p>}
              </div>
            </div>

            {/* Pose Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Postural Guide</label>
              <div className="flex flex-wrap gap-3">
                {poses.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onUpdate(shot.id, { selectedPoseId: p.id === shot.selectedPoseId ? null : p.id })}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all w-16 h-16 ${
                      shot.selectedPoseId === p.id ? 'border-orange-500 ring-4 ring-orange-500/20 scale-105 shadow-xl' : 'border-slate-700 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <img src={p.base64} alt={p.name} className="w-full h-full object-cover" />
                    {shot.selectedPoseId === p.id && (
                       <div className="absolute top-1 right-1 bg-orange-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       </div>
                    )}
                  </button>
                ))}
                {poses.length === 0 && <p className="text-xs text-slate-600 font-medium italic">No pose refs uploaded</p>}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Frame Geometry</label>
              <div className="flex gap-3">
                {(['9:16', '16:9'] as AspectRatio[]).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => onUpdate(shot.id, { aspectRatio: ratio })}
                    className={`flex-1 py-4 px-2 text-[11px] font-black rounded-2xl border-2 transition-all uppercase tracking-widest ${
                      shot.aspectRatio === ratio 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30' 
                      : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Clothes Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Garment Inclusions</label>
              <div className="flex flex-wrap gap-3">
                {clothes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleClothes(c.id)}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all w-16 h-16 ${
                      shot.selectedClothesIds.includes(c.id) ? 'border-emerald-500 ring-4 ring-emerald-500/20 scale-105 shadow-xl' : 'border-slate-700 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <img src={c.base64} alt={c.name} className="w-full h-full object-cover" />
                    {shot.selectedClothesIds.includes(c.id) && (
                       <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                       </div>
                    )}
                  </button>
                ))}
                {clothes.length === 0 && <p className="text-xs text-slate-600 font-medium italic">No garments uploaded</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contextual Prompt</label>
          <div className="relative">
            <textarea
              value={promptInput}
              onChange={(e) => {
                setPromptInput(e.target.value);
                onUpdate(shot.id, { prompt: e.target.value });
              }}
              placeholder="Atmosphere, lighting, and environmental details..."
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-slate-200 placeholder-slate-600 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm min-h-[140px] resize-none outline-none transition-all shadow-inner"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 bg-slate-800/80 px-2 py-1 rounded">
               {promptInput.length} chars
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide no-scrollbar">
            {clothes.map(c => (
              <button 
                key={c.id}
                onClick={() => insertMention(c.name)}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-slate-900/50 hover:bg-indigo-600 hover:text-white text-[10px] font-black text-slate-400 border border-slate-700 hover:border-indigo-400 transition-all uppercase tracking-widest"
              >
                @{c.name}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={() => handleGenerate()} 
          isLoading={shot.isGenerating}
          className="w-full py-5 rounded-3xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        >
          {shot.generatedImage ? 'Regenerate Frame' : 'Render Visualization'}
        </Button>
        {shot.error && (
          <div className="animate-in fade-in slide-in-from-top-2 text-[10px] font-bold text-red-400 bg-red-950/20 p-4 rounded-2xl border border-red-900/40 flex items-center gap-3">
             <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             {shot.error}
          </div>
        )}
      </div>

      {/* Resizer Handle (Desktop Only) */}
      {!isMobile && (
        <div 
          ref={resizerRef}
          onMouseDown={startResizing}
          className={`w-2 h-full cursor-col-resize flex items-center justify-center transition-all z-30 ${isResizing ? 'bg-indigo-500' : 'bg-slate-700/30 hover:bg-slate-600/50'}`}
        >
          <div className="w-[1px] h-16 bg-white/20 rounded-full"></div>
        </div>
      )}

      {/* Result Section (Preview) */}
      <div 
        className="bg-slate-900 flex flex-col items-center justify-center p-8 lg:p-10 border-t lg:border-t-0 lg:border-l border-slate-700 shadow-inner overflow-hidden"
        style={{ 
          width: '100%', 
          maxWidth: !isMobile ? `${previewWidth}px` : '100%',
          flexShrink: 0,
          minHeight: '500px'
        }}
      >
        {shot.generatedImage ? (
           <div className="relative group/img w-full h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-700">
             <div 
              className="relative overflow-hidden rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.5)] bg-slate-950 flex items-center justify-center cursor-pointer group/hover transition-all border border-white/5 active:scale-[0.98]" 
              onClick={() => onPreview(shot.generatedImage!)}
             >
               <img 
                src={shot.generatedImage} 
                alt="Output Preview" 
                className={`max-h-[75vh] object-contain transition-transform group-hover/hover:scale-[1.02] duration-1000 ${shot.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`} 
               />
               <div className="absolute inset-0 bg-black/0 group-hover/hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover/hover:opacity-100">
                  <div className="bg-white/10 backdrop-blur-2xl px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white border border-white/20 shadow-2xl">Full Resolution View</div>
               </div>
             </div>
             
             {/* Quality Presets & Download */}
             <div className="flex gap-3 w-full max-w-sm animate-in slide-in-from-bottom-4 duration-500 delay-200">
                {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                  <button 
                    key={size}
                    onClick={() => size === shot.imageSize ? null : handleUpscale(size)}
                    disabled={shot.isGenerating}
                    className={`flex-1 flex flex-col items-center py-4 rounded-2xl border-2 transition-all ${
                      shot.imageSize === size 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter mb-1">{size}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                  </button>
                ))}
                <a 
                  href={shot.generatedImage} 
                  download={`fashion-frame-${index + 1}-${shot.imageSize}.png`}
                  className="px-6 bg-emerald-600/10 border-2 border-emerald-500/30 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-2xl transition-all flex items-center justify-center shadow-lg hover:shadow-emerald-600/20"
                  title="Final Export"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 10l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
             </div>
           </div>
        ) : (
          <div className="text-center text-slate-800 flex flex-col items-center gap-8 py-20">
             {shot.isGenerating ? (
               <div className="flex flex-col items-center gap-6">
                 <div className="relative">
                    <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-10 h-10 border-2 border-emerald-500/20 border-b-emerald-500 rounded-full animate-spin duration-700"></div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Computing Image</p>
                    <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Preserving garment fidelity</p>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-center opacity-20 gap-6 grayscale group-hover:grayscale-0 group-hover:opacity-30 transition-all duration-700">
                 <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <div className="h-px w-20 bg-slate-700"></div>
                 <p className="text-[10px] uppercase tracking-[0.4em] font-black">Waiting for Render</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};