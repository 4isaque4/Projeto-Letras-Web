import { BookOpen } from 'lucide-react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { BottomNav } from '../components/BottomNav';

export function EstadoVazio() {
  const handleAtualizar = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header />
      
      <main className="flex-1 px-7 pt-6 pb-20 flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div 
            className="w-20 h-20 rounded-sm flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--le-surface)' }}
          >
            <BookOpen size={36} style={{ color: 'var(--le-text-support)' }} />
          </div>
          
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Nenhuma trilha disponível no momento
          </h2>
          
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            Não há trilhas liberadas para você ainda. Entre em contato com seu educador.
          </p>
          
          <Button variant="primary" onClick={handleAtualizar}>
            Atualizar
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
