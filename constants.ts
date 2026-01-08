

import { NodeShape } from './types';

// Dimensions
export const NODE_DIMENSIONS = {
  rectangle: { width: 256, height: 64 },
  square: { width: 140, height: 140 },
  circle: { width: 140, height: 140 }
};

export const NODE_BORDER_WIDTH = 2; // px

export const GEMINI_MODELS = [
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
  { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
];

export const DEEPSEEK_MODELS = [
  { value: 'deepseek-coder', label: 'DeepSeek Coder' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' }
];

export const QWEN_MODELS = [
  { value: 'qwen-max', label: 'Qwen Max' },
  { value: 'qwen-plus', label: 'Qwen Plus' },
  { value: 'qwen-turbo', label: 'Qwen Turbo' },
  { value: 'qwen-coder-turbo', label: 'Qwen Coder Turbo' }
];

export const OPENAI_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
];

// Helper to get absolute port coordinates
export const getPortPosition = (
  nodeX: number, 
  nodeY: number, 
  shape: NodeShape = 'rectangle', 
  handle: string = 'right'
) => {
  const dims = NODE_DIMENSIONS[shape] || NODE_DIMENSIONS.rectangle;
  const w = dims.width;
  const h = dims.height; 

  const centerX = nodeX + w / 2;
  const centerY = nodeY + h / 2;

  if (shape === 'circle') {
    switch (handle) {
      case 'top': return { x: centerX, y: nodeY };
      case 'bottom': return { x: centerX, y: nodeY + h };
      case 'left': return { x: nodeX, y: centerY };
      case 'right': return { x: nodeX + w, y: centerY };
      default: return { x: nodeX + w, y: centerY }; 
    }
  }

  switch (handle) {
    case 'top': return { x: centerX, y: nodeY };
    case 'bottom': return { x: centerX, y: nodeY + h };
    case 'left': return { x: nodeX, y: centerY };
    case 'right': return { x: nodeX + w, y: centerY };
    default: return { x: nodeX + w, y: centerY };
  }
};