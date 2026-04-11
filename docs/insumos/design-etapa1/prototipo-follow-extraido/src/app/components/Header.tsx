import { Bell } from 'lucide-react';

interface HeaderProps {
  notificationCount?: number;
}

export function Header({ notificationCount = 0 }: HeaderProps) {
  return (
    <header className="h-14 px-7 flex items-center justify-between" style={{ backgroundColor: 'var(--le-white)' }}>
      <div className="flex items-center gap-2">
        <div style={{ 
          width: '32px', 
          height: '32px', 
          backgroundColor: 'var(--le-primary)', 
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--le-primary-text)',
          fontSize: '14px',
          fontWeight: 700
        }}>
          LE
        </div>
        <span style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600 }}>
          Letras Educador
        </span>
      </div>
      
      <div className="relative">
        <button 
          className="relative p-1.5 rounded-sm hover:bg-[var(--le-surface-soft)] transition-colors"
          aria-label="Notificações"
        >
          <Bell size={20} style={{ color: 'var(--le-text-primary)' }} />
          {notificationCount > 0 && (
            <span 
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-sm"
              style={{ 
                backgroundColor: 'var(--le-primary)', 
                color: 'var(--le-white)',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
