import { Search } from 'lucide-react';
import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  icon?: boolean;
}

export function Input({ error = false, errorMessage, icon = false, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {icon && (
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--le-text-support)' }}
          />
        )}
        <input
          className={`w-full ${icon ? 'pl-10' : 'px-3'} ${className}`}
          style={{
            height: '40px',
            backgroundColor: error ? '#FEF2F2' : 'var(--le-surface)',
            color: 'var(--le-text-primary)',
            border: error ? '1px solid var(--le-error)' : '1px solid transparent',
            borderRadius: '2px',
            fontSize: '14px',
            outline: 'none',
          }}
          {...props}
        />
      </div>
      {error && errorMessage && (
        <p style={{ color: 'var(--le-error)', fontSize: '12px', marginTop: '4px' }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
