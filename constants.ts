
import { NodeShape } from './types';

// Dimensions
export const NODE_DIMENSIONS = {
  square: { width: 256, height: 120 }, // Base height, might expand content
  circle: { width: 140, height: 140 }
};

export const NODE_BORDER_WIDTH = 2; // px

// Helper to get absolute port coordinates
export const getPortPosition = (
  nodeX: number, 
  nodeY: number, 
  shape: NodeShape = 'square', 
  handle: string = 'right'
) => {
  const dims = NODE_DIMENSIONS[shape] || NODE_DIMENSIONS.square;
  const w = dims.width;
  // Note: For squares with dynamic height, this is an approximation for the connection lines.
  // In a real DOM scenario, we might need the actual ref height, but fixed anchors are cleaner for now.
  const h = dims.height; 

  const centerX = nodeX + w / 2;
  const centerY = nodeY + h / 2;

  // Circle Logic
  if (shape === 'circle') {
    const radius = w / 2;
    switch (handle) {
      case 'top': return { x: centerX, y: nodeY };
      case 'bottom': return { x: centerX, y: nodeY + h };
      case 'left': return { x: nodeX, y: centerY };
      case 'right': return { x: nodeX + w, y: centerY };
      default: return { x: nodeX + w, y: centerY }; // Default right
    }
  }

  // Square Logic
  switch (handle) {
    case 'top': return { x: centerX, y: nodeY };
    case 'bottom': return { x: centerX, y: nodeY + h }; // If square grows, this might be off unless we use ref.
    case 'left': return { x: nodeX, y: centerY };
    case 'right': return { x: nodeX + w, y: centerY };
    default: return { x: nodeX + w, y: centerY };
  }
};
