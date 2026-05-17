import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  delay = 600,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0,
              x: position === 'left' ? 5 : position === 'right' ? -5 : 0,
            }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'absolute z-[100] px-2 py-1 bg-neutral-900 border border-dash-border rounded shadow-2xl text-[8px] font-bold uppercase tracking-wider text-dash-accent whitespace-nowrap pointer-events-none backdrop-blur-sm',
              positions[position]
            )}
          >
            {content}
            <div
              className={cn(
                'absolute w-1.5 h-1.5 bg-neutral-900 border-dash-border rotate-45',
                position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b',
                position === 'bottom' && 'top[-4px] left-1/2 -translate-x-1/2 border-l',
                position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t',
                position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
