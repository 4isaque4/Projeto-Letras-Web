import { Header } from '../components/Header';
import { TrilhaSkeleton } from '../components/Skeleton';
import { BottomNav } from '../components/BottomNav';

export function EstadoCarregamento() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header />
      
      <main className="flex-1 px-7 pt-6 pb-20">
        <div className="mb-6">
          <div 
            className="h-8 w-48 mb-2 rounded-sm animate-pulse"
            style={{ backgroundColor: 'var(--le-surface)' }}
          />
          <div 
            className="h-5 w-64 rounded-sm animate-pulse"
            style={{ backgroundColor: 'var(--le-surface)' }}
          />
        </div>

        <div 
          className="h-10 w-full mb-4 rounded-sm animate-pulse"
          style={{ backgroundColor: 'var(--le-surface)' }}
        />

        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="h-8 w-24 rounded-sm animate-pulse"
              style={{ backgroundColor: 'var(--le-surface)' }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <TrilhaSkeleton />
          <TrilhaSkeleton />
          <TrilhaSkeleton />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
