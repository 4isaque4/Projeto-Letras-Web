import { useEffect, useState } from "react";
import { AlertCircle, Inbox, UserX, Users } from "lucide-react";
import KPICard from "../../components/KPICard";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";

interface TutorDashboardResponse {
  kpis: {
    meusAlunosTotal: number;
    ativosHoje: number;
    travados: number;
    pedidosAbertos: number;
  };
  pedidosRecentes: Array<{
    id: string;
    aluno: string;
    tipo: string;
    tempo: string;
    prioridade: string;
  }>;
  alunosEvoluindo: Array<{
    id: string;
    aluno: string;
    evolucao: string;
    etapa: string;
  }>;
  resumoSemanal: {
    pedidosAtendidos: number;
    tempoMedioRespostaHoras: number;
    alunosDesbloqueados: number;
    submissoesAprovadas: number;
  };
}

const EMPTY_RESPONSE: TutorDashboardResponse = {
  kpis: {
    meusAlunosTotal: 0,
    ativosHoje: 0,
    travados: 0,
    pedidosAbertos: 0,
  },
  pedidosRecentes: [],
  alunosEvoluindo: [],
  resumoSemanal: {
    pedidosAtendidos: 0,
    tempoMedioRespostaHoras: 0,
    alunosDesbloqueados: 0,
    submissoesAprovadas: 0,
  },
};

export default function TutorDashboard() {
  const { user } = useAuth();
  const [response, setResponse] = useState<TutorDashboardResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setError("Usuario tutor nao autenticado.");
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = (await apiGet(
          `/painel/dashboard/tutor?tutorId=${encodeURIComponent(user.id)}`,
        )) as TutorDashboardResponse;
        if (!active) {
          return;
        }
        setResponse({
          kpis: payload.kpis ?? EMPTY_RESPONSE.kpis,
          pedidosRecentes: payload.pedidosRecentes ?? [],
          alunosEvoluindo: payload.alunosEvoluindo ?? [],
          resumoSemanal: payload.resumoSemanal ?? EMPTY_RESPONSE.resumoSemanal,
        });
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar dashboard do tutor.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T3. Dashboard (Alfabetizador)</h1>
        <p className="text-sm text-gray-600 mt-1">Visao geral dos seus alfabetizandos e atendimentos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Meus Alunos Ativos" value={response.kpis.ativosHoje} icon={Users} subtitle={`de ${response.kpis.meusAlunosTotal} total`} />
        <KPICard title="Travados" value={response.kpis.travados} icon={AlertCircle} subtitle="Requerem atencao" />
        <KPICard title="Pedidos Abertos" value={response.kpis.pedidosAbertos} icon={Inbox} subtitle="Aguardando resposta" />
        <KPICard
          title="Alunos em risco"
          value={Math.max(0, response.kpis.meusAlunosTotal - response.kpis.ativosHoje)}
          icon={UserX}
          subtitle="Sem atividade recente"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-300">
            <h3 className="font-bold text-gray-900">Pedidos Recentes</h3>
            <p className="text-xs text-gray-600 mt-1">Chamados e alertas em aberto</p>
          </div>

          {response.pedidosRecentes.length === 0 ? (
            <StateDisplay type="empty" message="Nenhum pedido recente para este tutor." />
          ) : (
            <div className="p-4 space-y-3">
              {response.pedidosRecentes.map((item) => (
                <div key={item.id} className="border border-gray-300 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{item.aluno}</p>
                      <p className="text-xs text-gray-600">{item.tipo}</p>
                    </div>
                    <span className="px-2 py-1 text-xs border border-gray-400 bg-gray-100 text-gray-700">
                      {item.prioridade}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Aberto ha {item.tempo}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-300">
            <h3 className="font-bold text-gray-900">Alunos que Mais Evoluiram</h3>
            <p className="text-xs text-gray-600 mt-1">Top desempenho por pontuacao acumulada</p>
          </div>

          {response.alunosEvoluindo.length === 0 ? (
            <StateDisplay type="empty" message="Sem dados de evolucao para exibir." />
          ) : (
            <div className="p-4 space-y-3">
              {response.alunosEvoluindo.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 border border-gray-300 p-4">
                  <div className="w-10 h-10 border border-gray-300 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-gray-900">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{item.aluno}</p>
                    <p className="text-xs text-gray-600">{item.etapa}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.evolucao}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-300 bg-white p-6">
        <h3 className="font-bold text-gray-900 mb-4">Resumo da Semana</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Pedidos Atendidos</p>
            <p className="text-2xl font-bold text-gray-900">{response.resumoSemanal.pedidosAtendidos}</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Tempo Medio de Resposta</p>
            <p className="text-2xl font-bold text-gray-900">
              {response.resumoSemanal.tempoMedioRespostaHoras.toFixed(2)}h
            </p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Alunos Desbloqueados</p>
            <p className="text-2xl font-bold text-gray-900">{response.resumoSemanal.alunosDesbloqueados}</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Submissoes Aprovadas</p>
            <p className="text-2xl font-bold text-gray-900">{response.resumoSemanal.submissoesAprovadas}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
