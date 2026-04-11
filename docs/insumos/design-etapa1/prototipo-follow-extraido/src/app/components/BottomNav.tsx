import { Home, BookOpen, BarChart3, Award, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';

const navItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: BookOpen, label: 'Tutorial', path: '/tutorial' },
  { icon: BarChart3, label: 'Acompanhar', path: '/progresso' },
  { icon: Award, label: 'Pontuação', path: '/pontuacao' },
  { icon: User, label: 'Perfil', path: '/perfil' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-4"
      style={{ 
        backgroundColor: 'var(--le-white)',
        borderTop: '1px solid var(--le-border)',
        maxWidth: '390px',
        margin: '0 auto',
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1"
            style={{
              color: isActive ? 'var(--le-primary)' : 'var(--le-text-support)',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: '10px', fontWeight: 500 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
