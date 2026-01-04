
import React from 'react';

interface PortProps {
  id: string;
  nodeId: string;
  type: 'input' | 'output';
  side: 'top' | 'right' | 'bottom' | 'left';
  index: number;
  total: number;
  label?: string;
  styleOverride?: string;
  onMouseDown: (e: React.MouseEvent, nodeId: string, portId: string) => void;
  onMouseUp: (e: React.MouseEvent, nodeId: string, portId: string) => void;
}

export const Port: React.FC<PortProps> = ({ 
  id, nodeId, type, side, index, total, label, styleOverride, onMouseDown, onMouseUp 
}) => {
  
  // Calculate position percentage: (index + 1) / (total + 1) -> Evenly distributed
  const percent = (index + 1) * (100 / (total + 1));
  
  let positionStyle: React.CSSProperties = {};
  let labelClass = "";
  
  // Determine absolute position based on side
  switch (side) {
    case 'left':
      positionStyle = { left: -6, top: `${percent}%`, transform: 'translateY(-50%)' };
      labelClass = "left-full ml-2";
      break;
    case 'right':
      positionStyle = { right: -6, top: `${percent}%`, transform: 'translateY(-50%)' };
      labelClass = "right-full mr-2 text-right";
      break;
    case 'top':
      positionStyle = { top: -6, left: `${percent}%`, transform: 'translateX(-50%)' };
      labelClass = "top-full mt-2";
      break;
    case 'bottom':
      positionStyle = { bottom: -6, left: `${percent}%`, transform: 'translateX(-50%)' };
      labelClass = "bottom-full mb-2";
      break;
  }

  // Base Styles
  const baseColor = styleOverride || (type === 'input' ? 'bg-blue-500' : 'bg-green-500');
  const hoverRing = type === 'input' ? 'group-hover:ring-blue-300' : 'group-hover:ring-green-300';

  return (
    <div 
      className={`absolute w-3 h-3 rounded-full border-2 border-gray-900 z-50 cursor-crosshair transition-transform hover:scale-125 hover:ring-2 hover:ring-white ${baseColor}`}
      style={positionStyle}
      onMouseDown={(e) => onMouseDown(e, nodeId, id)}
      onMouseUp={(e) => onMouseUp(e, nodeId, id)}
      title={label || `${type} ${id}`}
    >
      {/* Hitbox Extender for easier clicking */}
      <div className="absolute inset-[-6px] rounded-full z-[-1]" />

      {/* Label Tooltip */}
      {label && (
        <span 
          className={`absolute ${labelClass} text-[9px] text-gray-400 font-mono whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900/90 px-1.5 py-0.5 rounded border border-gray-800 z-50`}
        >
          {label}
        </span>
      )}
    </div>
  );
};
