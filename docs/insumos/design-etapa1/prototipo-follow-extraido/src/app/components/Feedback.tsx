import { CheckCircle2, XCircle } from 'lucide-react';

interface FeedbackProps {
  type: 'success' | 'error';
  message: string;
}

export function Feedback({ type, message }: FeedbackProps) {
  const isSuccess = type === 'success';
  
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-sm"
      style={{
        backgroundColor: isSuccess ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${isSuccess ? 'var(--le-success)' : 'var(--le-error)'}`,
      }}
    >
      {isSuccess ? (
        <CheckCircle2 size={20} style={{ color: 'var(--le-success)', flexShrink: 0 }} />
      ) : (
        <XCircle size={20} style={{ color: 'var(--le-error)', flexShrink: 0 }} />
      )}
      <p style={{ 
        color: isSuccess ? 'var(--le-success)' : 'var(--le-error)', 
        fontSize: '14px',
        fontWeight: 500
      }}>
        {message}
      </p>
    </div>
  );
}
