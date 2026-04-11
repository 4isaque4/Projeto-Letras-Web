interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Chip({ label, active = false, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        height: '32px',
        padding: '0 16px',
        borderRadius: '2px',
        backgroundColor: active ? 'var(--le-primary)' : 'var(--le-white)',
        color: active ? 'var(--le-primary-text)' : 'var(--le-text-primary)',
        border: active ? 'none' : '1px solid var(--le-border)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      className="whitespace-nowrap"
    >
      {label}
    </button>
  );
}
