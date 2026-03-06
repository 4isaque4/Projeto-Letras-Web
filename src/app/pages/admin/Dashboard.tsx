import { useState } from "react";
import KPICard from "../../components/KPICard";
import { Users, UserCheck, AlertCircle, Clock, Target, Timer } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const [period, setPeriod] = useState("7");

  const chartData = [
    { dia: "Seg", progresso: 45 },
    { dia: "Ter", progresso: 52 },
    { dia: "Qua", progresso: 48 },
    { dia: "Qui", progresso: 61 },
    { dia: "Sex", progresso: 58 },
    { dia: "Sáb", progresso: 55 },
    { dia: "Dom", progresso: 62 },
  ];

  const alertas = [
    { id: 1, tipo: "Aluno travado há 3 dias", aluno: "João Silva", prioridade: "Alta" },
    { id: 2, tipo: "Inativo há 7 dias", aluno: "Maria Santos", prioridade: "Média" },
    { id: 3, tipo: "Taxa de erro > 80%", aluno: "Pedro Costa", prioridade: "Alta" },
    { id: 4, tipo: "Pedido sem resposta", aluno: "Ana Oliveira", prioridade: "Alta" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T2. Dashboard (Admin)</h1>
          <p className="text-sm text-gray-600 mt-1">Visão geral do sistema de alfabetização</p>
        </div>
        
        {/* Filtro de período */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Alfabetizandos"
          value="247"
          icon={Users}
        />
        <KPICard
          title="Ativos Hoje"
          value="189"
          icon={UserCheck}
          subtitle="76% do total"
        />
        <KPICard
          title="Travados"
          value="12"
          icon={AlertCircle}
          subtitle="Requerem atenção"
        />
        <KPICard
          title="Inativos 7d"
          value="23"
          icon={Clock}
          subtitle="9% do total"
        />
        <KPICard
          title="Média de Acerto"
          value="73%"
          icon={Target}
        />
        <KPICard
          title="Tempo Médio Resposta"
          value="2.4h"
          icon={Timer}
          subtitle="Tutores"
        />
      </div>

      {/* Gráfico de Progresso */}
      <div className="border border-gray-300 bg-white p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Progresso ao Longo do Tempo</h3>
        <div className="h-64 bg-gray-50 border border-gray-200">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="dia" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Line type="monotone" dataKey="progresso" stroke="#000" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas Críticos */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="text-lg font-bold text-gray-900">Alertas Críticos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo de Alerta</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta) => (
                <tr key={alerta.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{alerta.tipo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{alerta.aluno}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs border ${
                      alerta.prioridade === "Alta" 
                        ? "border-gray-900 bg-gray-900 text-white" 
                        : "border-gray-400 bg-gray-100 text-gray-700"
                    }`}>
                      {alerta.prioridade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
