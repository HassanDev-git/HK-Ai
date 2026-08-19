import React from 'react';
import { cn } from '../lib/utils';

interface LoaderLogoProps {
  size?: number; // scale factor
  className?: string;
}

export const LoaderLogo: React.FC<LoaderLogoProps> = ({ size = 1, className }) => {
  return (
    <div 
      className={cn("loader-container flex items-center justify-center", className)}
      style={{ 
        width: `${100 * size}px`, 
        height: `${100 * size}px`,
        minWidth: `${100 * size}px`,
        minHeight: `${100 * size}px`
      }}
    >
      <div className="loader" style={{ '--size': size } as React.CSSProperties}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <mask id="clipping">
              <polygon points="0,0 100,0 100,100 0,100" fill="black"></polygon>
              <polygon points="25,25 75,25 50,75" fill="white"></polygon>
              <polygon points="50,25 75,75 25,75" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
              <polygon points="35,35 65,35 50,65" fill="white"></polygon>
            </mask>
          </defs>
        </svg>
        <div className="box"></div>
      </div>
    </div>
  );
};
