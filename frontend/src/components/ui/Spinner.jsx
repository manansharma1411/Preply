import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return <Loader2 className={`animate-spin text-brand-600 ${sizes[size]} ${className}`} />;
};

export const Skeleton = ({ className = '', ...props }) => {
  return <div className={`animate-pulse bg-surface-200 rounded ${className}`} {...props} />;
};
