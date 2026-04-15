

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2
      });
      setShow(true);
    }
  };

  return (
    <div className="inline-block leading-none">
      {/* Icon Trigger */}
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] cursor-default opacity-40 hover:opacity-100 transition-opacity"
      >
        ?
      </div>
      
      {/* Tooltip Box via Portal */}
      {show && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: coords.top - 8,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999
          }}
          className="w-56 p-2.5 bg-gray-900/95 text-white text-[10px] font-medium rounded-lg shadow-2xl pointer-events-none backdrop-blur-sm border border-white/10 normal-case tracking-normal whitespace-normal text-center"
        >
          {text}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
        </div>,
        document.body
      )}
    </div>
  );
}
