import { useCallback, useEffect, useMemo, useState } from "react";
import KPICard from "../../components/KPICard";
import StateDisplay from "../../components/StateDisplay";
import { Users, UserCheck, AlertCircle, Clock, Target, Timer, CheckCircle2, BookOpenCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../../core/api/client";
import { useRealtimeStatus } from "../../core/realtime/useRealtimeStatus";

interface DashboardKpis {
  // KPIs operacionais primarios (decisao 8 do escopo 2026-05-17)
  ativos7d: number;
  vinculosPendentes: number;
  filaAjudaAgora: number;
  aulasConcluidasHoje: number;
  // KPIs secundarios
  totalAlfabetizandos: number;
  ativosHoje: number;
  travados: number;
  inativos7d: number;
  mediaAcerto: number;
  tempoMedioRespostaHoras: number;
  pedidosAbertos?: number;
  travasAbertas?: number;
  notificacoesNaoLidas?: number;
}

interface DashboardAlert {
  id: string;
  tipo: string;
  aluno: string;
  prioridade: string;
  etapa: string;
}

interface DashboardResponse {
  kpis: DashboardKpis;
  chartData: Array<{ dia: string; progresso: number }>;
  alertas: DashboardAlert[];
}

const EMPTY_KPIS: DashboardKpis = {
  ativos7d: 0,
  vinculosPendentes: 0,
  filaAjudaAgora: 0,
  aulasConcluidasHoje: 0,
  totalAlfabetizandos: 0,
  ativosHoje: 0,
  travados: 0,
  inativos7d: 0,
  mediaAcerto: 0,
  tempoMedioRespostaHoras: 0,
  pedidosAbertos: 0,
  travasAbertas: 0,
  notificacoesNaoLidas: 0,
};

export default function AdminDashboard() {
  const realtime = useRealtimeStatus();
  const [period, setPeriod] = useState("7");
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_KPIS);
  const [chartData, setChartData] = useState<Array<{ dia: string; progresso: number }>>([]);
  const [alertas, setAlertas] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
        setError("");
      }
      const response = (await apiGet("/painel/dashboard/admin")) as DashboardResponse;
      setKpis(response.kpis ?? EMPTY_KPIS);
      setChartData(response.chartData ?? []);
      setAlertas(response.alertas ?? []);
    } catch (fetchError) {
      if (!options.silent) {
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar dashboard.");
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!realtime.lastOperationalEventAt) {
      return;
    }

    void loadDashboard({ silent: true });
  }, [loadDashboard, realtime.lastOperationalEventAt]);

  const chartWindow = useMemo(() => {
    if (period === "30") {
      return chartData.slice(-30);
    }
    if (period === "90") {
      return chartData.slice(-90);
    }
    return chartData.slice(-7);
  }, [chartData, period]);

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Visão geral do sistema de alfabetização</p>
        </div>

        <div className="flex items-center gap-2 border border-gray-300 bg-white">
          <button
            onClick={() => setPeriod("7")}
            className={`px-4 py-2 text-sm ${period === "7" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod("30")}
            className={`px-4 py-2 text-sm ${period === "30" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod("90")}
            className={`px-4 py-2 text-sm ${period === "90" ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
          >
            90 dias
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Operacional do dia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Ativos (7 dias)"
            value={kpis.ativos7d}
            icon={UserCheck}
            subtitle={`${kpis.totalAlfabetizandos > 0 ? Math.round((kpis.ativos7d / kpis.totalAlfabetizandos) * 100) : 0}% da base`}
          />
          <KPICard
            title="Vínculos pendentes"
            value={kpis.vinculosPendentes}
            icon={Users}
            subtitle="Aguardando aprovação"
          />
          <KPICard
            title="Fila de ajuda agora"
            value={kpis.filaAjudaAgora}
            icon={AlertCircle}
            subtitle="Bloqueados + ajuda"
          />
          <KPICard
            title="Aulas concluídas hoje"
            value={kpis.aulasConcluidasHoje}
            icon={CheckCircle2}
            subtitle="Total no dia"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Métricas complementares
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard title="Total alfabetizandos" value={kpis.totalAlfabetizandos} icon={Users} />
          <KPICard title="Ativos hoje" value={kpis.ativosHoje} icon={BookOpenCheck} />
          <KPICard title="Inativos 7d+" value={kpis.inativos7d} icon={Clock} />
          <KPICard title="Notificações não lidas" value={kpis.notificacoesNaoLidas ?? 0} icon={AlertCircle} />
          <KPICard title="Média de acerto" value={`${kpis.mediaAcerto.toFixed(1)}%`} icon={Target} />
          <KPICard
            title="Tempo médio resposta"
            value={`${kpis.tempoMedioRespostaHoras.toFixed(1)}h`}
            icon={Timer}
            subtitle="Tutores"
          />
        </div>
      </div>

      <div className="border border-gray-300 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Progresso ao Longo do Tempo</h3>
        <div className="h-64 bg-gray-50 border border-gray-200">
          {chartWindow.length === 0 ? (
            <StateDisplay type="empty" message="Sem dados de progresso para o periodo." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartWindow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis dataKey="dia" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Line type="monotone" dataKey="progresso" stroke="#000" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900">Alertas Criticos</h3>
        </div>
        {alertas.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum alerta crítico no momento." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((alerta) => (
                  <tr key={alerta.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{alerta.tipo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{alerta.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{alerta.etapa}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{alerta.prioridade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

