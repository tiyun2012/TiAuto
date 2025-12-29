export const NODE_WIDTH = 256;
export const NODE_PORT_OFFSET_Y = 56; // 56px from top (CSS value)
export const NODE_BORDER_WIDTH = 2; // px

// Helper to get absolute port coordinates
export const getPortPosition = (nodeX: number, nodeY: number, type: 'source' | 'target') => {
  // Visual Y is the node top + border width + the CSS offset used for the port
  const y = nodeY + NODE_BORDER_WIDTH + NODE_PORT_OFFSET_Y;

  if (type === 'source') {
    // Source (Right) Port
    // CSS: right: 0 (aligns to padding edge: width - border)
    // translate-x-1/2 (shifts right by 50% of 16px = 8px)
    // Center X calculation:
    // Box Right Edge (Outer) = nodeX + NODE_WIDTH
    // Padding Right Edge = Box Right Edge - NODE_BORDER_WIDTH
    // Port Element Center (due to translate) = Padding Right Edge + 8px
    // Wait, let's look at visual alignment:
    // We want the wire to end exactly at the padding edge where the dot sits visually centered on the border line.
    // X = nodeX + NODE_WIDTH - NODE_BORDER_WIDTH;
    return {
      x: nodeX + NODE_WIDTH - NODE_BORDER_WIDTH,
      y
    };
  }
  
  // Target (Left) Port
  // CSS: left: 0 (aligns to padding edge: 0 + border)
  // -translate-x-1/2 (shifts left by 8px)
  // X = nodeX + NODE_BORDER_WIDTH
  return {
    x: nodeX + NODE_BORDER_WIDTH,
    y
  };
};