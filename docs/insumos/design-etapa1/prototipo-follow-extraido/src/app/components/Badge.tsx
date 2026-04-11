interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'neutral';
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const styles: Record<string, { bg: string; color: string }> = {
    success: { bg: 'var(--le-success)', color: 'var(--le-white)' },
    error: { bg: 'var(--le-error)', color: 'var(--le-white)' },
    warning: { bg: '#F59E0B', color: 'var(--le-white)' },
    neutral: { bg: 'var(--le-surface)', color: 'var(--le-text-primary)' },
  };

  const style = styles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '20px',
        padding: '0 8px',
        borderRadius: '2px',
        backgroundColor: style.bg,
        color: style.color,
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}
