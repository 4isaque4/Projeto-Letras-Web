import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, Play, Pause, Volume2, ZoomIn } from 'lucide-react';
import { Button } from '../components/Button';
import { Feedback } from '../components/Feedback';
import { BottomNav } from '../components/BottomNav';

type AtividadeDetalhe = {
  id: number;
  titulo: string;
  tipo: 'video' | 'audio' | 'imagem' | 'leitura';
  instrucoes: string;
  conteudo: string;
};

const atividadesDetalheData: Record<number, AtividadeDetalhe> = {
  1: {
    id: 1,
    titulo: 'Alfabeto Completo',
    tipo: 'video',
    instrucoes: 'Assista ao vídeo com atenção e observe cada letra do alfabeto.',
    conteudo: 'video-alfabeto.mp4',
  },
  4: {
    id: 4,
    titulo: 'Fonemas Básicos',
    tipo: 'video',
    instrucoes: 'Aprenda os sons básicos das letras. Repita em voz alta.',
    conteudo: 'video-fonemas.mp4',
  },
  5: {
    id: 5,
    titulo: 'Sons de A a M',
    tipo: 'audio',
    instrucoes: 'Ouça com atenção os sons e tente reproduzi-los.',
    conteudo: 'audio-sons-a-m.mp3',
  },
  2: {
    id: 2,
    titulo: 'Exercício de Identificação',
    tipo: 'imagem',
    instrucoes: 'Observe as letras na imagem e tente identificá-las.',
    conteudo: 'imagem-letras.jpg',
  },
  3: {
    id: 3,
    titulo: 'Prática com Letras',
    tipo: 'leitura',
    instrucoes: 'Leia o texto a seguir com atenção.',
    conteudo: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\n\nEssas são as 26 letras do alfabeto. Cada uma delas tem um som especial. Vamos praticar juntos!',
  },
};

export function ExecucaoAtividade() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [iniciada, setIniciada] = useState(false);
  const [concluida, setConcluida] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  
  const atividadeId = Number(id);
  const atividade = atividadesDetalheData[atividadeId];

  if (!atividade) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--le-bg-main)' }}>
        <p style={{ color: 'var(--le-text-support)' }}>Atividade não encontrada</p>
      </div>
    );
  }

  const handleConcluir = async () => {
    setLoading(true);
    setFeedback(null);
    
    // Simula chamada de API
    setTimeout(() => {
      setLoading(false);
      setConcluida(true);
      setFeedback({
        type: 'success',
        message: 'Atividade concluída com sucesso.',
      });
    }, 1000);
  };

  const renderMedia = () => {
    if (!iniciada) return null;

    switch (atividade.tipo) {
      case 'video':
        return (
          <div 
            className="w-full rounded-sm overflow-hidden relative"
            style={{ 
              backgroundColor: 'var(--le-text-primary)',
              aspectRatio: '16/9',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <button 
                onClick={() => setPlaying(!playing)}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
              >
                {playing ? (
                  <Pause size={28} style={{ color: 'var(--le-text-primary)' }} />
                ) : (
                  <Play size={28} style={{ color: 'var(--le-text-primary)', marginLeft: '4px' }} />
                )}
              </button>
            </div>
            {playing && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
              >
                <div 
                  className="h-full"
                  style={{ backgroundColor: 'var(--le-white)', width: '40%' }}
                />
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div 
            className="w-full p-6 rounded-sm"
            style={{ backgroundColor: 'var(--le-white)', border: '1px solid var(--le-border)' }}
          >
            <div className="flex items-center justify-center mb-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--le-surface)' }}
              >
                <Volume2 size={32} style={{ color: 'var(--le-text-primary)' }} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPlaying(!playing)}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--le-primary)' }}
              >
                {playing ? (
                  <Pause size={20} style={{ color: 'var(--le-white)' }} />
                ) : (
                  <Play size={20} style={{ color: 'var(--le-white)', marginLeft: '2px' }} />
                )}
              </button>
              <div 
                className="flex-1 h-1 rounded-full"
                style={{ backgroundColor: 'var(--le-surface)' }}
              >
                <div 
                  className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--le-primary)', width: '30%' }}
                />
              </div>
            </div>
          </div>
        );

      case 'imagem':
        return (
          <div className="relative">
            <div 
              className="w-full rounded-sm overflow-hidden"
              style={{ 
                backgroundColor: 'var(--le-surface)',
                aspectRatio: '4/3',
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <p style={{ color: 'var(--le-text-support)', fontSize: '14px' }}>
                  [Imagem: {atividade.conteudo}]
                </p>
              </div>
            </div>
            <button 
              className="absolute top-3 right-3 w-10 h-10 rounded-sm flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
            >
              <ZoomIn size={20} style={{ color: 'var(--le-text-primary)' }} />
            </button>
          </div>
        );

      case 'leitura':
        return (
          <div 
            className="p-4 rounded-sm"
            style={{ backgroundColor: 'var(--le-white)', border: '1px solid var(--le-border)' }}
          >
            <p style={{ 
              color: 'var(--le-text-primary)', 
              fontSize: '15px', 
              lineHeight: '1.6',
              whiteSpace: 'pre-line'
            }}>
              {atividade.conteudo}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

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
          {atividade.titulo}
        </h1>
      </header>

      <main className="flex-1 px-7 pt-6 pb-20">
        <div 
          className="p-4 rounded-sm mb-6"
          style={{ backgroundColor: 'var(--le-surface-soft)', border: '1px solid var(--le-border)' }}
        >
          <p style={{ color: 'var(--le-text-secondary)', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Instruções para o aluno
          </p>
          <p style={{ color: 'var(--le-text-primary)', fontSize: '14px', lineHeight: '1.5' }}>
            {atividade.instrucoes}
          </p>
        </div>

        {renderMedia()}

        <div className="mt-6 space-y-3">
          {!iniciada && (
            <Button variant="primary" onClick={() => setIniciada(true)} className="w-full">
              Iniciar
            </Button>
          )}

          {iniciada && !concluida && (
            <Button 
              variant="primary" 
              onClick={handleConcluir} 
              loading={loading}
              className="w-full"
            >
              Concluir atividade
            </Button>
          )}

          {feedback && (
            <Feedback type={feedback.type} message={feedback.message} />
          )}

          {concluida && (
            <Button 
              variant="secondary" 
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Voltar para atividades
            </Button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
