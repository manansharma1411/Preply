import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-surface-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        aria-invalid={!!error}
        className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-xl transition-all duration-200 placeholder:text-surface-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 ${
          error ? 'border-rose-400 text-rose-900 focus-visible:ring-rose-500' : 'border-surface-300 text-surface-900 hover:border-surface-400'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 font-medium leading-tight">{error}</p>}
      {helperText && !error && <p className="text-xs text-surface-500 leading-tight">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
