
import React from 'react';

interface Point {
  x: number;
  y: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

interface WireProps {
  id?: string;
  start: Point;
  end: Point;
  isSelected?: boolean;
  isDraft?: boolean; // For drag line
  onSelect?: () => void;
  onDelete?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const Wire: React.FC<WireProps> = ({ 
  id, start, end, isSelected, isDraft, onSelect, onDelete, onContextMenu 
}) => {
  
  // --- Smart Bezier Calculation ---
  // Calculates control points based on the side the wire is coming from/to.
  
  const getControlPoints = (s: Point, e: Point) => {
    const dist = Math.sqrt(Math.pow(e.x - s.x, 2) + Math.pow(e.y - s.y, 2));
    const minCurve = 50;
    const maxCurve = 200;
    // Dynamic curvature based on distance
    const curvature = Math.min(maxCurve, Math.max(minCurve, dist * 0.4)); 

    let c1 = { x: s.x, y: s.y };
    let c2 = { x: e.x, y: e.y };

    // Adjust Control Point 1 (Start)
    switch (s.side) {
      case 'left': c1.x -= curvature; break;
      case 'right': c1.x += curvature; break;
      case 'top': c1.y -= curvature; break;
      case 'bottom': c1.y += curvature; break;
      default: c1.x += curvature; // Default right
    }

    // Adjust Control Point 2 (End)
    switch (e.side) {
      case 'left': c2.x -= curvature; break;
      case 'right': c2.x += curvature; break;
      case 'top': c2.y -= curvature; break;
      case 'bottom': c2.y += curvature; break;
      default: c2.x -= curvature; // Default left
    }

    return { c1, c2 };
  };

  const { c1, c2 } = getControlPoints(start, end);
  const pathData = `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;

  // Interaction handlers
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
        if (e.ctrlKey || e.metaKey) {
            onDelete?.();
        } else {
            onSelect();
        }
    }
  };

  return (
    <g className="group">
      {/* 1. Hitbox (Invisible wide stroke for easier selection) */}
      <path 
        d={pathData} 
        stroke="transparent" 
        strokeWidth="20" 
        fill="none" 
        className={!isDraft ? "cursor-pointer" : ""}
        onClick={!isDraft ? handleClick : undefined}
        onContextMenu={onContextMenu}
      />

      {/* 2. Outer Glow / Selection Highlight */}
      <path 
        d={pathData} 
        stroke={isSelected ? "#FBBF24" : "#3B82F6"} 
        strokeWidth={isSelected ? 6 : 0}
        strokeOpacity={0.4}
        fill="none" 
        strokeLinecap="round"
        className="transition-all duration-300"
      />

      {/* 3. The Wire itself */}
      <path 
        d={pathData} 
        stroke={isSelected ? "#FBBF24" : isDraft ? "#F59E0B" : "#4B5563"} 
        strokeWidth={isDraft ? 3 : 2} 
        strokeDasharray={isDraft ? "6,4" : "none"}
        fill="none" 
        strokeLinecap="round"
        className={`transition-colors duration-200 ${!isDraft && 'group-hover:stroke-gray-300'}`}
      />

      {/* 4. Directional Arrows (Optional decoration) */}
      {!isDraft && isSelected && (
         <circle cx={0} cy={0} r={3} fill="#FBBF24">
            <animateMotion dur="2s" repeatCount="indefinite" path={pathData} />
         </circle>
      )}
    </g>
  );
};
