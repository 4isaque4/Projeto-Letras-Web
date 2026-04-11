import { useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Chip } from '../components/Chip';
import { Badge } from '../components/Badge';
import { TrilhaCard } from '../components/TrilhaCard';
import { ModuloCard } from '../components/ModuloCard';
import { AtividadeCard } from '../components/AtividadeCard';
import { Feedback } from '../components/Feedback';
import { Skeleton, TrilhaSkeleton } from '../components/Skeleton';

export function Componentes() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--le-bg-main)', maxWidth: '390px', margin: '0 auto' }}>
      <Header notificationCount={5} />
      
      <main className="px-7 py-6 space-y-8">
        <div>
          <h1 style={{ color: 'var(--le-text-primary)', fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
            Sistema de Componentes - Letras Educador
          </h1>
          <p style={{ color: 'var(--le-text-support)', fontSize: '14px', marginBottom: '4px' }}>
            Versão mobile - 390x844
          </p>
        </div>

        {/* LT/Header/Main */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Header/Main
          </h2>
          <div style={{ backgroundColor: 'var(--le-white)', padding: '8px', borderRadius: '2px' }}>
            <Header notificationCount={3} />
          </div>
        </section>

        {/* LT/Button */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Button/Primary & Secondary
          </h2>
          <div className="space-y-2">
            <Button variant="primary">Botão Primário</Button>
            <Button variant="secondary">Botão Secundário</Button>
            <Button variant="primary" disabled>Botão Desabilitado</Button>
            <Button variant="primary" loading={loading} onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 2000);
            }}>
              {loading ? 'Carregando...' : 'Botão com Loading'}
            </Button>
          </div>
        </section>

        {/* LT/Input */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Input/Default & Error
          </h2>
          <div className="space-y-2">
            <Input placeholder="Input padrão" />
            <Input icon placeholder="Input com ícone de busca" />
            <Input placeholder="Input preenchido" value="Texto de exemplo" readOnly />
            <Input error errorMessage="Este campo é obrigatório" placeholder="Input com erro" />
          </div>
        </section>

        {/* LT/Chip */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Chip/Filter
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Chip label="Todas" active />
            <Chip label="Em andamento" />
            <Chip label="Concluídas" />
          </div>
        </section>

        {/* LT/Badge */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Badge/Status
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Badge label="Sucesso" variant="success" />
            <Badge label="Alerta" variant="warning" />
            <Badge label="Erro" variant="error" />
            <Badge label="Neutro" variant="neutral" />
          </div>
        </section>

        {/* LT/Card/Trilha */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Card/Trilha
          </h2>
          <TrilhaCard
            nome="Alfabetização Básica"
            progresso={65}
            numModulos={4}
            numAtividades={12}
          />
        </section>

        {/* LT/Card/Modulo */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Card/Modulo (variantes de status)
          </h2>
          <div className="space-y-2">
            <ModuloCard
              etapa={1}
              nome="Reconhecimento de Letras"
              numAtividades={3}
              status="concluido"
            />
            <ModuloCard
              etapa={2}
              nome="Sons das Letras"
              numAtividades={4}
              status="em-andamento"
            />
            <ModuloCard
              etapa={3}
              nome="Primeiras Sílabas"
              numAtividades={3}
              status="nao-iniciado"
            />
          </div>
        </section>

        {/* LT/Card/Atividade */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Card/Atividade (tipos e estados)
          </h2>
          <div className="space-y-2">
            <AtividadeCard
              titulo="Alfabeto Completo"
              tipo="video"
              duracao="5 min"
              concluida={true}
            />
            <AtividadeCard
              titulo="Sons das Letras"
              tipo="audio"
              duracao="4 min"
              concluida={false}
            />
            <AtividadeCard
              titulo="Exercício de Identificação"
              tipo="imagem"
              concluida={false}
            />
            <AtividadeCard
              titulo="Prática com Letras"
              tipo="leitura"
              concluida={false}
            />
          </div>
        </section>

        {/* LT/Feedback */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            LT/Feedback/Success & Error
          </h2>
          <div className="space-y-2">
            <Feedback type="success" message="Atividade concluída com sucesso." />
            <Feedback type="error" message="Não foi possível registrar seu progresso. Tente novamente." />
          </div>
        </section>

        {/* Skeleton */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            Skeleton/Loading States
          </h2>
          <div className="space-y-2">
            <Skeleton style={{ height: '40px', width: '100%' }} />
            <Skeleton style={{ height: '20px', width: '60%' }} />
            <TrilhaSkeleton />
          </div>
        </section>

        {/* Paleta de cores */}
        <section>
          <h2 style={{ color: 'var(--le-text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            Paleta de Cores
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-bg-main)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>BG Main #EDEDED</p>
            </div>
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-surface)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>Surface #E4E4E4</p>
            </div>
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-primary)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>Primary #101010</p>
            </div>
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-success)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>Success #0B6B3A</p>
            </div>
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-error)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>Error #9E1B1B</p>
            </div>
            <div>
              <div className="h-12 rounded-sm mb-1" style={{ backgroundColor: 'var(--le-white)', border: '1px solid var(--le-border)' }} />
              <p style={{ fontSize: '11px', color: 'var(--le-text-support)' }}>White #FFFFFF</p>
            </div>
          </div>
        </section>

        <div className="pb-8">
          <p style={{ color: 'var(--le-text-subtle)', fontSize: '12px', textAlign: 'center' }}>
            Letras Educador - Sistema de Componentes v1.0
          </p>
        </div>
      </main>
    </div>
  );
}
