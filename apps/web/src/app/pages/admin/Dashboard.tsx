import { useEffect, useMemo, useState } from "react";
import KPICard from "../../components/KPICard";
import StateDisplay from "../../components/StateDisplay";
import { Users, UserCheck, AlertCircle, Clock, Target, Timer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiGet } from "../../core/api/client";

interface DashboardKpis {
  totalAlfabetizandos: number;
  ativosHoje: number;
  travados: number;
  inativos7d: number;
  mediaAcerto: number;
  tempoMedioRespostaHoras: number;
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
  totalAlfabetizandos: 0,
  ativosHoje: 0,
  travados: 0,
  inativos7d: 0,
  mediaAcerto: 0,
  tempoMedioRespostaHoras: 0,
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState("7");
  const [kpis, setKpis] = useState<DashboardKpis>(EMPTY_KPIS);
  const [chartData, setChartData] = useState<Array<{ dia: string; progresso: number }>>([]);
  const [alertas, setAlertas] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await apiGet("/painel/dashboard/admin")) as DashboardResponse;
        if (!active) {
          return;
        }
        setKpis(response.kpis ?? EMPTY_KPIS);
        setChartData(response.chartData ?? []);
        setAlertas(response.alertas ?? []);
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar dashboard.");
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
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">T2. Dashboard (Admin)</h1>
          <p className="text-sm text-gray-600 mt-1">Visao geral do sistema de alfabetizacao</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Alfabetizandos" value={kpis.totalAlfabetizandos} icon={Users} />
        <KPICard
          title="Ativos Hoje"
          value={kpis.ativosHoje}
          icon={UserCheck}
          subtitle={`${kpis.totalAlfabetizandos > 0 ? Math.round((kpis.ativosHoje / kpis.totalAlfabetizandos) * 100) : 0}% do total`}
        />
        <KPICard title="Travados" value={kpis.travados} icon={AlertCircle} subtitle="Requerem atencao" />
        <KPICard title="Inativos 7d" value={kpis.inativos7d} icon={Clock} />
        <KPICard title="Media de Acerto" value={`${kpis.mediaAcerto.toFixed(2)}%`} icon={Target} />
        <KPICard
          title="Tempo Medio Resposta"
          value={`${kpis.tempoMedioRespostaHoras.toFixed(2)}h`}
          icon={Timer}
          subtitle="Tutores"
        />
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
          <StateDisplay type="empty" message="Nenhum alerta critico no momento." />
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

