export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-sm ${className}`}
      style={{
        backgroundColor: 'var(--le-surface)',
        ...style,
      }}
    />
  );
}

export function TrilhaSkeleton() {
  return (
    <div
      className="p-4 rounded-sm"
      style={{
        backgroundColor: 'var(--le-white)',
        border: '1px solid var(--le-border)',
      }}
    >
      <Skeleton style={{ height: '20px', width: '70%', marginBottom: '12px' }} />
      <Skeleton style={{ height: '12px', width: '40%', marginBottom: '8px' }} />
      <Skeleton style={{ height: '6px', width: '100%', marginBottom: '16px' }} />
      <div className="flex gap-4 mb-4">
        <Skeleton style={{ height: '16px', width: '80px' }} />
        <Skeleton style={{ height: '16px', width: '100px' }} />
      </div>
      <Skeleton style={{ height: '44px', width: '100%' }} />
    </div>
  );
}
