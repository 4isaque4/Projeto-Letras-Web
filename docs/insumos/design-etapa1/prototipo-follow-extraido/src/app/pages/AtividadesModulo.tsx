import { useNavigate, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { AtividadeCard } from '../components/AtividadeCard';
import { BottomNav } from '../components/BottomNav';

type Atividade = {
  id: number;
  titulo: string;
  tipo: 'video' | 'audio' | 'imagem' | 'leitura';
  duracao?: string;
  concluida: boolean;
};

const atividadesData: Record<number, { modulo: string; atividades: Atividade[] }> = {
  1: {
    modulo: 'Reconhecimento de Letras',
    atividades: [
      { id: 1, titulo: 'Alfabeto Completo', tipo: 'video', duracao: '5 min', concluida: true },
      { id: 2, titulo: 'Exercício de Identificação', tipo: 'imagem', concluida: true },
      { id: 3, titulo: 'Prática com Letras', tipo: 'leitura', concluida: true },
    ],
  },
  2: {
    modulo: 'Sons das Letras',
    atividades: [
      { id: 4, titulo: 'Fonemas Básicos', tipo: 'video', duracao: '8 min', concluida: true },
      { id: 5, titulo: 'Sons de A a M', tipo: 'audio', duracao: '4 min', concluida: true },
      { id: 6, titulo: 'Sons de N a Z', tipo: 'audio', duracao: '4 min', concluida: false },
      { id: 7, titulo: 'Exercícios Práticos', tipo: 'leitura', concluida: false },
    ],
  },
  3: {
    modulo: 'Primeiras Sílabas',
    atividades: [
      { id: 8, titulo: 'O que são Sílabas', tipo: 'video', duracao: '6 min', concluida: false },
      { id: 9, titulo: 'Formando Sílabas Simples', tipo: 'leitura', concluida: false },
      { id: 10, titulo: 'Prática de Formação', tipo: 'imagem', concluida: false },
    ],
  },
};

export function AtividadesModulo() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const moduloId = Number(id);
  const data = atividadesData[moduloId];

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--le-bg-main)' }}>
        <p style={{ color: 'var(--le-text-support)' }}>Módulo não encontrado</p>
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
          onClick={() => navigate(-1)}
          className="p-1 -ml-1"
        >
          <ChevronLeft size={24} style={{ color: 'var(--le-text-primary)' }} />
        </button>
        <h1 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600 }}>
          {data.modulo}
        </h1>
      </header>

      <main className="flex-1 px-7 pt-6 pb-20">
        <h2 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Atividades
        </h2>

        <div className="flex flex-col gap-3">
          {data.atividades.map((atividade) => (
            <AtividadeCard
              key={atividade.id}
              titulo={atividade.titulo}
              tipo={atividade.tipo}
              duracao={atividade.duracao}
              concluida={atividade.concluida}
              onClick={() => navigate(`/atividade/${atividade.id}`)}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
