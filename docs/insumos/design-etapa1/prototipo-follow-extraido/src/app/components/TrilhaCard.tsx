import { ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface TrilhaCardProps {
  nome: string;
  progresso: number;
  numModulos: number;
  numAtividades: number;
  onClick?: () => void;
}

export function TrilhaCard({ 
  nome, 
  progresso, 
  numModulos, 
  numAtividades,
  onClick 
}: TrilhaCardProps) {
  return (
    <div
      className="p-4 rounded-sm"
      style={{
        backgroundColor: 'var(--le-white)',
        border: '1px solid var(--le-border)',
      }}
    >
      <h3 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
        {nome}
      </h3>
      
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span style={{ color: 'var(--le-text-support)', fontSize: '12px' }}>
            Progresso
          </span>
          <span style={{ color: 'var(--le-text-primary)', fontSize: '12px', fontWeight: 600 }}>
            {progresso}%
          </span>
        </div>
        <div 
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--le-surface)' }}
        >
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${progresso}%`,
              backgroundColor: 'var(--le-primary)',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--le-text-support)', fontSize: '13px' }}>
            {numModulos} módulos
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span style={{ color: 'var(--le-text-support)', fontSize: '13px' }}>
            {numAtividades} atividades
          </span>
        </div>
      </div>

      <Button variant="primary" onClick={onClick} className="w-full">
        <span>Abrir trilha</span>
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
