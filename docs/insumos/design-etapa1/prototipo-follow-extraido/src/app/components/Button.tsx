import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  loading = false, 
  children, 
  disabled,
  className = '',
  ...props 
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  
  const baseStyles = {
    height: '44px',
    borderRadius: '2px',
    fontSize: '14px',
    fontWeight: 700,
    padding: '0 20px',
    transition: 'all 0.2s',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
  };

  const variantStyles = isPrimary ? {
    backgroundColor: 'var(--le-primary)',
    color: 'var(--le-primary-text)',
    border: 'none',
  } : {
    backgroundColor: 'var(--le-white)',
    color: 'var(--le-text-primary)',
    border: '1px solid var(--le-border)',
  };

  return (
    <button
      style={{ ...baseStyles, ...variantStyles }}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
