import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, Shot, AspectRatio, ImageSize } from './types';
import { AssetUploader } from './components/AssetUploader';
import { ShotCard } from './components/ShotCard';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [clothes, setClothes] = useState<Asset[]>([]);
  const [models, setModels] = useState<Asset[]>([]);
  const [poses, setPoses] = useState<Asset[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  
  // Auth State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);
  const [manualKey, setManualKey] = useState('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuotaErrorOpen, setIsQuotaErrorOpen] = useState(false); 
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const currentActiveKey = useMemo(() => {
    return localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
  }, [hasApiKey, isSettingsOpen, isQuotaErrorOpen]);

  const maskedKey = useMemo(() => {
    if (!currentActiveKey) return 'No Key';
    if (currentActiveKey.length < 8) return '********';
    return `${currentActiveKey.substring(0, 6)}...${currentActiveKey.substring(currentActiveKey.length - 4)}`;
  }, [currentActiveKey]);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const localKey = localStorage.getItem('gemini_api_key');
        if (localKey) { 
          setHasApiKey(true); 
          return; 
        }
        
        if (process.env.API_KEY) { 
          setHasApiKey(true); 
          return; 
        }
        
        if (window.aistudio?.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (hasKey) { 
            setHasApiKey(true); 
            return; 
          }
        } 
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkApiKey();
  }, []);

  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualKey.trim()) {
      localStorage.setItem('gemini_api_key', manualKey.trim());
      setHasApiKey(true);
      setManualKey('');
    }
  };

  const handleSaveSettings = () => {
    if (manualKey.trim()) {
      localStorage.setItem('gemini_api_key', manualKey.trim());
      setHasApiKey(true);
      setManualKey('');
      setIsSettingsOpen(false);
      setIsQuotaErrorOpen(false);
    }
  };

  const openSettings = () => {
    setManualKey(localStorage.getItem('gemini_api_key') || '');
    setIsSettingsOpen(true);
  };

  const addAsset = (setter: React.Dispatch<React.SetStateAction<Asset[]>>) => (asset: Asset) => {
    setter(prev => [...prev, asset]);
  };

  const removeAsset = (setter: React.Dispatch<React.SetStateAction<Asset[]>>, type: 'clothes' | 'model' | 'pose') => (id: string) => {
    setter(prev => prev.filter(a => a.id !== id));
    setShots(prev => prev.map(shot => {
      const updates: Partial<Shot> = {};
      if (type === 'clothes') updates.selectedClothesIds = shot.selectedClothesIds.filter(cid => cid !== id);
      if (type === 'model' && shot.selectedModelId === id) updates.selectedModelId = null;
      if (type === 'pose' && shot.selectedPoseId === id) updates.selectedPoseId = null;
      return { ...shot, ...updates };
    }));
  };

  const addShot = () => {
    const newShot: Shot = {
      id: crypto.randomUUID(),
      prompt: '',
      selectedClothesIds: [],
      selectedModelId: null,
      selectedPoseId: null,
      generatedImage: null,
      isGenerating: false,
      aspectRatio: '9:16',
      imageSize: '1K'
    };
    setShots(prev => [...prev, newShot]);
  };

  const updateShot = (id: string, updates: Partial<Shot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeShot = (id: string) => {
    setShots(prev => prev.filter(s => s.id !== id));
  };

  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _shots = [...shots];
    const draggedItemContent = _shots.splice(dragItem.current, 1)[0];
    _shots.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setShots(_shots);
  };

  const generatedShots = shots.filter(s => s.generatedImage);

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Studio...</p>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
        <div className="max-w-lg w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
           <div className="text-center mb-10">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/30 mb-6 transform hover:scale-105 transition-transform duration-500">
               <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
             </div>
             <h1 className="text-4xl font-black text-white tracking-tight mb-2">FashionBoard AI</h1>
             <p className="text-slate-400 text-sm font-medium">Professional Generative Fashion Studio</p>
           </div>
           <form onSubmit={handleManualKeySubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">Gemini API Key</label>
                <div className="relative group">
                  <input 
                     type="password" 
                     value={manualKey}
                     onChange={(e) => setManualKey(e.target.value)}
                     placeholder="AIzaSy..."
                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 pl-11 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm font-mono shadow-inner"
                     autoFocus
                   />
                   <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                   </svg>
                </div>
              </div>
              <Button type="submit" disabled={!manualKey} className="w-full py-4 text-sm font-bold uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:shadow-indigo-500/40 transition-all">
                Enter Studio
              </Button>
           </form>
           <div className="mt-8 pt-8 border-t border-white/5 flex flex-col gap-4 text-center">
              <p className="text-xs text-slate-500">Need an access token?</p>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors uppercase tracking-wider"
              >
                Get API Key from Google AI Studio
              </a>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative">
      
      {/* Quota Exceeded Modal */}
      {isQuotaErrorOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
           <div className="bg-slate-900 border border-red-500/50 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
             
             <button onClick={() => setIsQuotaErrorOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>

             <div className="flex flex-col items-center text-center gap-4 mb-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Quota Limit Exceeded</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your current API key has reached the free tier limits. To continue generating without interruptions, please switch to a paid plan. Billing is based on official Google API pricing.
                </p>
                <a href="https://ai.google.dev/pricing" target="_blank" rel="noreferrer" className="text-indigo-400 text-sm font-bold hover:underline flex items-center gap-1">
                   View Gemini API Pricing & Documentation <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
             </div>

             <div className="space-y-6 bg-slate-950/50 p-6 rounded-xl border border-slate-800">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update to Paid API Key</label>
                  <input 
                    type="password" 
                    value={manualKey}
                    onChange={(e) => setManualKey(e.target.value)}
                    placeholder="AIzaSy... (Paid Key)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
               </div>
               <div className="flex gap-4">
                 <Button variant="secondary" onClick={() => setIsQuotaErrorOpen(false)} className="flex-1">Close</Button>
                 <Button onClick={handleSaveSettings} disabled={!manualKey.trim()} className="flex-1 bg-red-600 hover:bg-red-500 border-transparent">Update Key</Button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Studio Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update API Key</label>
                <input 
                  type="password" 
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="Paste new key here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setIsSettingsOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveSettings} disabled={!manualKey.trim()} className="flex-1">Save Key</Button>
              </div>
              <button onClick={() => { localStorage.removeItem('gemini_api_key'); setHasApiKey(false); setIsSettingsOpen(false); }} className="w-full text-xs text-red-400 hover:text-red-300 transition-colors py-2 opacity-50 hover:opacity-100 uppercase font-black tracking-widest">Reset Studio Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" alt="Full Preview" />
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors" onClick={() => setPreviewImage(null)}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Story Mode Modal */}
      {isStoryOpen && generatedShots.length > 0 && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col">
          <header className="p-4 flex justify-between items-center border-b border-white/10">
            <h3 className="font-bold text-lg">Story Sequence <span className="text-slate-500 text-sm ml-2">{storyIndex + 1}/{generatedShots.length}</span></h3>
            <button onClick={() => setIsStoryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </header>
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            <button 
              onClick={() => setStoryIndex(prev => (prev > 0 ? prev - 1 : generatedShots.length - 1))}
              className="absolute left-8 z-10 p-4 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="max-w-4xl w-full h-full flex flex-col items-center justify-center gap-6">
               <img 
                key={generatedShots[storyIndex].id}
                src={generatedShots[storyIndex].generatedImage!} 
                className={`max-w-full max-h-[75vh] rounded-xl shadow-2xl animate-in fade-in slide-in-from-right-8 duration-500 ${generatedShots[storyIndex].aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]'}`} 
                alt="Story Frame" 
               />
               <div className="text-center max-w-2xl">
                  <p className="text-slate-300 italic text-lg">"{generatedShots[storyIndex].prompt}"</p>
               </div>
            </div>
            <button 
              onClick={() => setStoryIndex(prev => (prev < generatedShots.length - 1 ? prev + 1 : 0))}
              className="absolute right-8 z-10 p-4 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="p-4 border-t border-white/10 flex justify-center gap-2 overflow-x-auto">
             {generatedShots.map((s, idx) => (
               <button 
                key={s.id} 
                onClick={() => setStoryIndex(idx)}
                className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${idx === storyIndex ? 'border-indigo-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
               >
                 <img src={s.generatedImage!} className="w-full h-full object-cover" />
               </button>
             ))}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex-shrink-0 lg:h-screen lg:sticky lg:top-0 flex flex-col">
        <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">FashionBoard</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Studio v2.5</p>
            </div>
          </div>

          <div className="space-y-6">
            <AssetUploader title="Garments" assets={clothes} type="clothes" maxAssets={12} onAddAsset={addAsset(setClothes)} onRemoveAsset={removeAsset(setClothes, 'clothes')} />
            <AssetUploader title="Poses" assets={poses} type="pose" maxAssets={8} onAddAsset={addAsset(setPoses)} onRemoveAsset={removeAsset(setPoses, 'pose')} />
            <AssetUploader title="Models" assets={models} type="model" maxAssets={4} onAddAsset={addAsset(setModels)} onRemoveAsset={removeAsset(setModels, 'model')} />
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
            <button onClick={openSettings} className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors w-full py-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl uppercase tracking-widest border border-slate-800">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Studio Settings
            </button>
        </div>
      </aside>

      {/* Main Board */}
      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <header className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-10 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl py-4 -mx-4 px-4 lg:-mx-10 lg:px-10 border-b border-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Storyboard</h2>
            <p className="text-xs text-slate-500 font-medium">{shots.length} Shot Frames • {generatedShots.length} Ready</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* API Key Indicator - Right Top Corner Display */}
            <button 
              onClick={openSettings}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all group shadow-inner"
              title="Change API Key"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <div className="flex flex-col items-start leading-none">
                 <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-indigo-400 mb-0.5">Gemini API</span>
                 <span className="text-[10px] font-mono text-slate-400 group-hover:text-white">{maskedKey}</span>
              </div>
            </button>

            <div className="bg-slate-900 rounded-xl p-1 flex border border-slate-800">
               <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
               </button>
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
               </button>
            </div>
            
            <Button 
              variant="secondary" 
              onClick={() => { setStoryIndex(0); setIsStoryOpen(true); }} 
              disabled={generatedShots.length === 0}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            >
              View Story
            </Button>
            
            <Button onClick={addShot} className="px-6" icon={<span className="text-xl">+</span>}>New Shot</Button>
          </div>
        </header>

        <div className={`gap-8 pb-32 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'flex flex-col'}`}>
          {shots.length === 0 ? (
            <div className={`${viewMode === 'grid' ? 'col-span-full' : ''} flex flex-col items-center justify-center py-32 text-slate-700 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20`}>
              <svg className="w-20 h-20 mb-6 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <h3 className="text-xl font-bold text-slate-500">Board is Empty</h3>
              <p className="mb-8 text-slate-600 text-sm">Create your first fashion shot frame to begin.</p>
              <Button onClick={addShot}>Add Frame</Button>
            </div>
          ) : (
            shots.map((shot, index) => (
              <div 
                key={shot.id} 
                className="relative"
                draggable
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
              >
                 <ShotCard
                  index={index}
                  shot={shot}
                  clothes={clothes}
                  models={models}
                  poses={poses}
                  onUpdate={updateShot}
                  onRemove={removeShot}
                  onPreview={(url) => setPreviewImage(url)}
                  onQuotaExceeded={() => setIsQuotaErrorOpen(true)}
                  isGridView={viewMode === 'grid'}
                  dragHandleProps={{ draggable: true }}
                />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default App;