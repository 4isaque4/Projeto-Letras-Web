import { WifiOff } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { BottomNav } from '../components/BottomNav';

export function EstadoErro() {
  const handleTentarNovamente = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header />
      
      <main className="flex-1 px-7 pt-6 pb-20 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div 
            className="w-20 h-20 rounded-sm flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid var(--le-error)' }}
          >
            <WifiOff size={36} style={{ color: 'var(--le-error)' }} />
          </div>
          
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Erro ao carregar dados
          </h2>
          
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            Verifique sua conexão e tente novamente.
          </p>
          
          <Button variant="primary" onClick={handleTentarNovamente}>
            Tentar novamente
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
