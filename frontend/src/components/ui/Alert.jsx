import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export const Alert = ({ children, title, variant = 'info', className = '' }) => {
  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    danger: XCircle,
  };

  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-rose-50 border-rose-200 text-rose-800',
  };

  const Icon = icons[variant];

  return (
    <div className={`p-4 border rounded-xl flex gap-3 text-sm ${styles[variant]} ${className}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div>{children}</div>
      </div>
    </div>
  );
};
