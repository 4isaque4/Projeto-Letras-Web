import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { Chip } from '../components/Chip';
import { TrilhaCard } from '../components/TrilhaCard';
import { BottomNav } from '../components/BottomNav';

type Trilha = {
  id: number;
  nome: string;
  progresso: number;
  numModulos: number;
  numAtividades: number;
  status: 'em-andamento' | 'concluida' | 'nao-iniciada';
};

const trilhasData: Trilha[] = [
  {
    id: 1,
    nome: 'Alfabetização Básica',
    progresso: 65,
    numModulos: 4,
    numAtividades: 12,
    status: 'em-andamento',
  },
  {
    id: 2,
    nome: 'Vogais e Sons',
    progresso: 100,
    numModulos: 3,
    numAtividades: 9,
    status: 'concluida',
  },
  {
    id: 3,
    nome: 'Formação de Palavras',
    progresso: 30,
    numModulos: 5,
    numAtividades: 15,
    status: 'em-andamento',
  },
  {
    id: 4,
    nome: 'Leitura e Interpretação',
    progresso: 0,
    numModulos: 4,
    numAtividades: 10,
    status: 'nao-iniciada',
  },
];

const filtros = [
  { id: 'todas', label: 'Todas' },
  { id: 'em-andamento', label: 'Em andamento' },
  { id: 'concluidas', label: 'Concluídas' },
];

export function MinhasTrilhas() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('todas');

  const trilhasFiltradas = trilhasData.filter((trilha) => {
    const matchBusca = trilha.nome.toLowerCase().includes(busca.toLowerCase());
    
    if (filtroAtivo === 'todas') return matchBusca;
    if (filtroAtivo === 'em-andamento') return matchBusca && trilha.status === 'em-andamento';
    if (filtroAtivo === 'concluidas') return matchBusca && trilha.status === 'concluida';
    
    return matchBusca;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header notificationCount={3} />
      
      <main className="flex-1 px-7 pt-6 pb-20">
        <div className="mb-6">
          <h1 style={{ color: 'var(--le-text-primary)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Minhas Trilhas
          </h1>
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px' }}>
            Conteúdos liberados para o aluno
          </p>
        </div>

        <div className="mb-4">
          <Input
            icon
            placeholder="Buscar trilha"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {filtros.map((filtro) => (
            <Chip
              key={filtro.id}
              label={filtro.label}
              active={filtroAtivo === filtro.id}
              onClick={() => setFiltroAtivo(filtro.id)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {trilhasFiltradas.map((trilha) => (
            <TrilhaCard
              key={trilha.id}
              nome={trilha.nome}
              progresso={trilha.progresso}
              numModulos={trilha.numModulos}
              numAtividades={trilha.numAtividades}
              onClick={() => navigate(`/trilha/${trilha.id}`)}
            />
          ))}
          
          {trilhasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: 'var(--le-text-support)', fontSize: '14px' }}>
                Nenhuma trilha encontrada
              </p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
