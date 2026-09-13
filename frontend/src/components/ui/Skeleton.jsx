import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-200 ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
