import React, { useRef } from 'react';
import { Asset } from '../types';
import { Button } from './Button';

interface AssetUploaderProps {
  title: string;
  assets: Asset[];
  type: 'clothes' | 'model' | 'pose';
  maxAssets: number;
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
}

export const AssetUploader: React.FC<AssetUploaderProps> = ({
  title,
  assets,
  type,
  maxAssets,
  onAddAsset,
  onRemoveAsset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (assets.length >= maxAssets) {
      alert(`Maximum ${maxAssets} ${title} allowed.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64 = event.target.result as string;
        const newAsset: Asset = {
          id: crypto.randomUUID(),
          name: file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_'), // Sanitize name for @mention usage
          type,
          base64,
          mimeType: file.type
        };
        onAddAsset(newAsset);
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          {title} <span className="text-slate-500 text-xs ml-2">({assets.length}/{maxAssets})</span>
        </h3>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={assets.length >= maxAssets}
          className="text-xs py-1 px-3"
        >
          + Add
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {assets.map((asset) => (
          <div key={asset.id} className="group relative aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-indigo-500 transition-colors">
            <img 
              src={asset.base64} 
              alt={asset.name} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
              <span className="text-xs font-mono text-white truncate">@{asset.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.id); }}
                className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        
        {assets.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded-lg">
            No {title.toLowerCase()} added yet.
          </div>
        )}
      </div>
    </div>
  );
};