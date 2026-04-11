import { ChevronRight } from 'lucide-react';
import { Badge } from './Badge';

interface ModuloCardProps {
  etapa: number;
  nome: string;
  numAtividades: number;
  status: 'nao-iniciado' | 'em-andamento' | 'concluido';
  onClick?: () => void;
}

export function ModuloCard({ 
  etapa, 
  nome, 
  numAtividades, 
  status,
  onClick 
}: ModuloCardProps) {
  const statusLabel = {
    'nao-iniciado': 'Não iniciado',
    'em-andamento': 'Em andamento',
    'concluido': 'Concluído',
  };

  const statusVariant = {
    'nao-iniciado': 'neutral' as const,
    'em-andamento': 'warning' as const,
    'concluido': 'success' as const,
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-sm text-left transition-all hover:shadow-sm"
      style={{
        backgroundColor: 'var(--le-white)',
        border: '1px solid var(--le-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ color: 'var(--le-text-support)', fontSize: '12px', fontWeight: 500 }}>
              Etapa {etapa}
            </span>
            <Badge label={statusLabel[status]} variant={statusVariant[status]} />
          </div>
          <h3 style={{ color: 'var(--le-text-primary)', fontSize: '15px', fontWeight: 600 }}>
            {nome}
          </h3>
        </div>
        <ChevronRight size={20} style={{ color: 'var(--le-text-support)', flexShrink: 0 }} />
      </div>

      <p style={{ color: 'var(--le-text-support)', fontSize: '13px' }}>
        {numAtividades} {numAtividades === 1 ? 'atividade' : 'atividades'}
      </p>
    </button>
  );
}
