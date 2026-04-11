import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';

interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header />
      
      <main className="flex-1 px-7 pt-6 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 style={{ color: 'var(--le-text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px' }}>
            Conteúdo em desenvolvimento
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
