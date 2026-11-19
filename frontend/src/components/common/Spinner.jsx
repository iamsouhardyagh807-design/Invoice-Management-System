import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 'md', className = '', label }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 gap-3 text-indigo-600 ${className}`}>
      <Loader2 className={`${sizes[size] || sizes.md} animate-spin`} />
      {label && <p className="text-xs font-medium text-slate-500">{label}</p>}
    </div>
  );
}
