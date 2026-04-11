import { Video, Headphones, Image as ImageIcon, FileText, CheckCircle2, Circle } from 'lucide-react';
import { Button } from './Button';

interface AtividadeCardProps {
  titulo: string;
  tipo: 'video' | 'audio' | 'imagem' | 'leitura';
  duracao?: string;
  concluida: boolean;
  onClick?: () => void;
}

export function AtividadeCard({ 
  titulo, 
  tipo, 
  duracao,
  concluida,
  onClick 
}: AtividadeCardProps) {
  const tipoConfig = {
    video: { icon: Video, label: 'Vídeo' },
    audio: { icon: Headphones, label: 'Áudio' },
    imagem: { icon: ImageIcon, label: 'Imagem' },
    leitura: { icon: FileText, label: 'Leitura' },
  };

  const { icon: Icon, label } = tipoConfig[tipo];

  return (
    <div
      className="p-4 rounded-sm"
      style={{
        backgroundColor: 'var(--le-white)',
        border: '1px solid var(--le-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="flex items-center justify-center"
              style={{ 
                width: '32px', 
                height: '32px',
                borderRadius: '2px',
                backgroundColor: 'var(--le-surface)',
              }}
            >
              <Icon size={16} style={{ color: 'var(--le-text-primary)' }} />
            </div>
            <div>
              <p style={{ color: 'var(--le-text-support)', fontSize: '12px' }}>
                {label}
              </p>
              {duracao && (
                <p style={{ color: 'var(--le-text-subtle)', fontSize: '11px' }}>
                  {duracao}
                </p>
              )}
            </div>
          </div>
          <h3 style={{ color: 'var(--le-text-primary)', fontSize: '15px', fontWeight: 600 }}>
            {titulo}
          </h3>
        </div>
        <div>
          {concluida ? (
            <CheckCircle2 size={20} style={{ color: 'var(--le-success)' }} />
          ) : (
            <Circle size={20} style={{ color: 'var(--le-border)' }} />
          )}
        </div>
      </div>

      <Button 
        variant={concluida ? 'secondary' : 'primary'} 
        onClick={onClick}
        className="w-full"
      >
        {concluida ? 'Ver novamente' : 'Iniciar atividade'}
      </Button>
    </div>
  );
}
