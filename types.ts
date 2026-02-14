export interface Asset {
  id: string;
  name: string;
  type: 'clothes' | 'model' | 'pose';
  base64: string;
  mimeType: string;
}

export type AspectRatio = '9:16' | '16:9' | '3:4' | '1:1';
export type ImageSize = '1K' | '2K' | '4K';

export interface Shot {
  id: string;
  prompt: string;
  selectedClothesIds: string[];
  selectedModelId: string | null;
  selectedPoseId: string | null;
  generatedImage: string | null;
  isGenerating: boolean;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  seed?: number;
  error?: string;
}

export interface GenerationConfig {
  apiKey: string;
  prompt: string;
  modelAsset?: Asset | null;
  clothesAssets: Asset[];
}

// Global declaration for the AI Studio API key picker
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}