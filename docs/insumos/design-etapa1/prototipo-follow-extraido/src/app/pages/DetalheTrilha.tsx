import { useNavigate, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { ModuloCard } from '../components/ModuloCard';
import { BottomNav } from '../components/BottomNav';

type Modulo = {
  id: number;
  etapa: number;
  nome: string;
  numAtividades: number;
  status: 'nao-iniciado' | 'em-andamento' | 'concluido';
};

const modulosData: Record<number, { trilha: string; progresso: number; modulos: Modulo[] }> = {
  1: {
    trilha: 'Alfabetização Básica',
    progresso: 65,
    modulos: [
      { id: 1, etapa: 1, nome: 'Reconhecimento de Letras', numAtividades: 3, status: 'concluido' },
      { id: 2, etapa: 2, nome: 'Sons das Letras', numAtividades: 4, status: 'em-andamento' },
      { id: 3, etapa: 3, nome: 'Primeiras Sílabas', numAtividades: 3, status: 'nao-iniciado' },
      { id: 4, etapa: 4, nome: 'Combinando Sílabas', numAtividades: 2, status: 'nao-iniciado' },
    ],
  },
  2: {
    trilha: 'Vogais e Sons',
    progresso: 100,
    modulos: [
      { id: 5, etapa: 1, nome: 'As Cinco Vogais', numAtividades: 3, status: 'concluido' },
      { id: 6, etapa: 2, nome: 'Sons das Vogais', numAtividades: 3, status: 'concluido' },
      { id: 7, etapa: 3, nome: 'Exercícios Práticos', numAtividades: 3, status: 'concluido' },
    ],
  },
};

export function DetalheTrilha() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const trilhaId = Number(id);
  const data = modulosData[trilhaId];

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--le-bg-main)' }}>
        <p style={{ color: 'var(--le-text-support)' }}>Trilha não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <header 
        className="h-14 px-7 flex items-center gap-3"
        style={{ backgroundColor: 'var(--le-white)' }}
      >
        <button 
          onClick={() => navigate('/')}
          className="p-1 -ml-1"
        >
          <ChevronLeft size={24} style={{ color: 'var(--le-text-primary)' }} />
        </button>
        <h1 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600 }}>
          {data.trilha}
        </h1>
      </header>

      <main className="flex-1 px-7 pt-6 pb-20">
        <div 
          className="p-4 rounded-sm mb-6"
          style={{
            backgroundColor: 'var(--le-white)',
            border: '1px solid var(--le-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'var(--le-text-support)', fontSize: '13px' }}>
              Progresso geral
            </span>
            <span style={{ color: 'var(--le-text-primary)', fontSize: '13px', fontWeight: 600 }}>
              {data.progresso}%
            </span>
          </div>
          <div 
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--le-surface)' }}
          >
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${data.progresso}%`,
                backgroundColor: 'var(--le-primary)',
              }}
            />
          </div>
        </div>

        <h2 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Módulos
        </h2>

        <div className="flex flex-col gap-3">
          {data.modulos.map((modulo) => (
            <ModuloCard
              key={modulo.id}
              etapa={modulo.etapa}
              nome={modulo.nome}
              numAtividades={modulo.numAtividades}
              status={modulo.status}
              onClick={() => navigate(`/modulo/${modulo.id}`)}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
