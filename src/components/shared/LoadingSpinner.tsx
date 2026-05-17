import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  color = 'currentColor'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div 
      className={`animate-spin rounded-full border-2 ${sizeClasses[size]} border-gray-200 border-t-blue-600`}
      role="status"
      aria-label="Loading"
      style={{ borderColor: color }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
