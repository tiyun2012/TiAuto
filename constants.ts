
import { NodeShape } from './types';

// Dimensions
export const NODE_DIMENSIONS = {
  rectangle: { width: 256, height: 64 }, // Reduced height (Header only style)
  square: { width: 140, height: 140 },    // True square (compact)
  circle: { width: 140, height: 140 }
};

export const NODE_BORDER_WIDTH = 2; // px

// Helper to get absolute port coordinates
// This calculates the geometric point on the border where the wire should attach.
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

  // The CSS positions the ports centered exactly on the boundary lines (0px offset).
  // Therefore, the connection point is exactly on the bounding box edge.

  if (shape === 'circle') {
     // For circle, we approximate the cardinal points.
    switch (handle) {
      case 'top': return { x: centerX, y: nodeY };
      case 'bottom': return { x: centerX, y: nodeY + h };
      case 'left': return { x: nodeX, y: centerY };
      case 'right': return { x: nodeX + w, y: centerY };
      default: return { x: nodeX + w, y: centerY }; 
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
