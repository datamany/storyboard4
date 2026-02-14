import { GoogleGenAI } from "@google/genai";
import { Asset, AspectRatio, ImageSize } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

/**
 * Strips the data URL prefix to get raw base64 string
 */
const getBase64Data = (dataUrl: string): string | null => {
  if (!dataUrl || !dataUrl.includes(',')) return null;
  return dataUrl.split(',')[1];
};

export const generateShotImage = async (
  prompt: string,
  modelAsset: Asset | null,
  clothesAssets: Asset[],
  poseAsset: Asset | null,
  aspectRatio: AspectRatio = "3:4",
  imageSize: ImageSize = "1K",
  seed?: number
): Promise<string> => {
  
  // Prioritize Local Storage for "Bring Your Own Key", fallback to Environment
  const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Please set your API Key in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [];

  let finalPrompt = `Task: Generate a high-quality fashion photograph. 
  
  Instructions:
  1. Use the "Model Reference" image provided below as the primary subject. Preserve their facial identity, hair, and body type exactly.
  2. Use the "Clothes Reference" images provided below. The subject MUST wear these specific items. Preserve all colors, patterns, and fabric textures.
  3. If a "Pose Reference" image is provided: ONLY use it as a guide for the posture, stance, and body positioning. DO NOT use the identity of the person in the Pose Reference. The final person must be the Target Model.
  4. Scene/Context: ${prompt}
  `;

  // 1. Target Model
  if (modelAsset) {
    const base64 = getBase64Data(modelAsset.base64);
    if (base64) {
      parts.push({
        inlineData: {
          mimeType: modelAsset.mimeType,
          data: base64,
        },
      });
      finalPrompt += `\n[Reference: Target Model Identification]`;
    }
  }

  // 2. Pose Guide
  if (poseAsset) {
    const base64 = getBase64Data(poseAsset.base64);
    if (base64) {
      parts.push({
        inlineData: {
          mimeType: poseAsset.mimeType,
          data: base64,
        },
      });
      finalPrompt += `\n[Reference: Pose and Body Stance Guide Only. Ignore the face of this person.]`;
    }
  }

  // 3. Garments
  clothesAssets.forEach((clothes) => {
    const base64 = getBase64Data(clothes.base64);
    if (base64) {
      parts.push({
        inlineData: {
          mimeType: clothes.mimeType,
          data: base64,
        },
      });
      finalPrompt += `\n[Reference: Required Garment - ${clothes.name}]`;
    }
  });

  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            imageSize: imageSize,
            aspectRatio: aspectRatio
        },
        ...(seed !== undefined ? { seed } : {})
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    const finishReason = candidates?.[0]?.finishReason;
    if (finishReason) {
       throw new Error(`Generation stopped. Reason: ${finishReason}`);
    }
    
    throw new Error("No image generated in response.");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate image.");
  }
};