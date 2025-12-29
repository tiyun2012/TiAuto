
import { NodeShape } from './types';

// Dimensions
export const NODE_DIMENSIONS = {
  rectangle: { width: 256, height: 120 }, // Previously 'square' (card style)
  square: { width: 140, height: 140 },    // True square (compact)
  circle: { width: 140, height: 140 }
};

export const NODE_BORDER_WIDTH = 2; // px

// Helper to get absolute port coordinates
export const getPortPosition = (
  nodeX: number, 
  nodeY: number, 
  shape: NodeShape = 'rectangle', 
  handle: string = 'right'
) => {
  // Default to rectangle if shape is undefined or unknown
  const dims = NODE_DIMENSIONS[shape] || NODE_DIMENSIONS.rectangle;
  const w = dims.width;
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

  // Rectangle & Square Logic (Box based)
  switch (handle) {
    case 'top': return { x: centerX, y: nodeY };
    case 'bottom': return { x: centerX, y: nodeY + h };
    case 'left': return { x: nodeX, y: centerY };
    case 'right': return { x: nodeX + w, y: centerY };
    default: return { x: nodeX + w, y: centerY };
  }
};
