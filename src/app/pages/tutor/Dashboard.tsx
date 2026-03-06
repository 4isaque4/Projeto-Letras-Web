import KPICard from "../../components/KPICard";
import { Users, AlertCircle, Inbox, UserX } from "lucide-react";

export default function TutorDashboard() {
  const pedidosRecentes = [
    { id: 1, aluno: "João Silva", tipo: "Pedido de Ajuda", tempo: "15 min", prioridade: "alta" },
    { id: 2, aluno: "Ana Oliveira", tipo: "Lock", tempo: "2h 30min", prioridade: "alta" },
    { id: 3, aluno: "Carlos Mendes", tipo: "Lock", tempo: "1h 20min", prioridade: "alta" },
  ];

  const alunosEvoluindo = [
    { id: 1, aluno: "Pedro Costa", evolucao: "+120 pts", etapa: "Etapa 3" },
    { id: 2, aluno: "Beatriz Lima", evolucao: "+95 pts", etapa: "Etapa 2" },
    { id: 3, aluno: "João Silva", evolucao: "+88 pts", etapa: "Etapa 2" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T3. Dashboard (Alfabetizador)</h1>
        <p className="text-sm text-gray-600 mt-1">Visão geral dos seus alunos e atendimentos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Meus Alunos Ativos"
          value="11"
          icon={Users}
          subtitle="de 12 total"
        />
        <KPICard
          title="Travados"
          value="2"
          icon={AlertCircle}
          subtitle="Requerem atenção"
        />
        <KPICard
          title="Pedidos Abertos"
          value="3"
          icon={Inbox}
          subtitle="Aguardando resposta"
        />
        <KPICard
          title="Alunos em Risco"
          value="1"
          icon={UserX}
          subtitle="Inatividade > 7 dias"
        />
      </div>

      {/* Layout: Pedidos Recentes + Alunos que Mais Evoluíram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos Recentes */}
        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-300">
            <h3 className="font-bold text-gray-900">Pedidos Recentes</h3>
            <p className="text-xs text-gray-600 mt-1">Últimos chamados que necessitam atenção</p>
          </div>
          <div className="p-4 space-y-3">
            {pedidosRecentes.map((pedido) => (
              <div key={pedido.id} className="border border-gray-300 p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{pedido.aluno}</p>
                    <p className="text-xs text-gray-600">{pedido.tipo}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs border ${
                    pedido.prioridade === "alta"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-400 bg-gray-100 text-gray-700"
                  }`}>
                    {pedido.prioridade}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Aberto há {pedido.tempo}</p>
                  <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                    Atender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alunos que Mais Evoluíram */}
        <div className="border border-gray-300 bg-white">
          <div className="p-4 border-b border-gray-300">
            <h3 className="font-bold text-gray-900">Alunos que Mais Evoluíram</h3>
            <p className="text-xs text-gray-600 mt-1">Top 3 da semana em pontuação</p>
          </div>
          <div className="p-4 space-y-3">
            {alunosEvoluindo.map((aluno, idx) => (
              <div key={aluno.id} className="flex items-center gap-4 border border-gray-300 p-4">
                <div className="w-10 h-10 border border-gray-300 bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-gray-900">{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{aluno.aluno}</p>
                  <p className="text-xs text-gray-600">{aluno.etapa}</p>
                </div>
                <span className="text-sm font-bold text-gray-900">{aluno.evolucao}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo Semanal */}
      <div className="border border-gray-300 bg-white p-6">
        <h3 className="font-bold text-gray-900 mb-4">Resumo da Semana</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Pedidos Atendidos</p>
            <p className="text-2xl font-bold text-gray-900">18</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Tempo Médio de Resposta</p>
            <p className="text-2xl font-bold text-gray-900">1.8h</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Alunos Desbloqueados</p>
            <p className="text-2xl font-bold text-gray-900">5</p>
          </div>
          <div className="p-4 border border-gray-300 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Submissões Aprovadas</p>
            <p className="text-2xl font-bold text-gray-900">24</p>
          </div>
        </div>
      </div>
    </div>
  );
}
