import { useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { BottomNav } from '../components/BottomNav';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';

const indicadores = [
  {
    icon: CheckCircle2,
    label: 'Concluídas',
    valor: '18',
    bg: 'var(--le-success)',
  },
  {
    icon: Clock,
    label: 'Em andamento',
    valor: '5',
    bg: '#F59E0B',
  },
  {
    icon: Calendar,
    label: 'Último acesso',
    valor: '09/04',
    bg: 'var(--le-blue-support)',
  },
];

const ultimasAtividades = [
  { titulo: 'Sons de A a M', data: '09/04/2026', tipo: 'Áudio' },
  { titulo: 'Fonemas Básicos', data: '08/04/2026', tipo: 'Vídeo' },
  { titulo: 'Prática com Letras', data: '07/04/2026', tipo: 'Leitura' },
  { titulo: 'Exercício de Identificação', data: '07/04/2026', tipo: 'Imagem' },
];

export function Progresso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header notificationCount={3} />
      
      <main className="flex-1 px-7 pt-6 pb-20">
        <div className="mb-6">
          <h1 style={{ color: 'var(--le-text-primary)', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Seu progresso
          </h1>
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px' }}>
            Acompanhe sua evolução
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {indicadores.map((indicador, index) => {
            const Icon = indicador.icon;
            return (
              <div 
                key={index}
                className="p-4 rounded-sm flex flex-col items-center text-center"
                style={{ backgroundColor: 'var(--le-white)', border: '1px solid var(--le-border)' }}
              >
                <div 
                  className="w-10 h-10 rounded-sm flex items-center justify-center mb-2"
                  style={{ backgroundColor: indicador.bg }}
                >
                  <Icon size={20} style={{ color: 'var(--le-white)' }} />
                </div>
                <p style={{ color: 'var(--le-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
                  {indicador.valor}
                </p>
                <p style={{ color: 'var(--le-text-support)', fontSize: '11px' }}>
                  {indicador.label}
                </p>
              </div>
            );
          })}
        </div>

        <h2 style={{ color: 'var(--le-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          Últimas atividades
        </h2>

        <div className="flex flex-col gap-3 mb-6">
          {ultimasAtividades.map((atividade, index) => (
            <div 
              key={index}
              className="p-4 rounded-sm"
              style={{ backgroundColor: 'var(--le-white)', border: '1px solid var(--le-border)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {atividade.titulo}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--le-text-support)', fontSize: '12px' }}>
                      {atividade.tipo}
                    </span>
                    <span style={{ color: 'var(--le-text-subtle)', fontSize: '12px' }}>
                      •
                    </span>
                    <span style={{ color: 'var(--le-text-support)', fontSize: '12px' }}>
                      {atividade.data}
                    </span>
                  </div>
                </div>
                <CheckCircle2 size={20} style={{ color: 'var(--le-success)' }} />
              </div>
            </div>
          ))}
        </div>

        <Button variant="primary" onClick={() => navigate('/')} className="w-full">
          Continuar aprendendo
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
