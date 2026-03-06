import { useState } from "react";
import { Trophy, Filter, ChevronDown } from "lucide-react";

export default function Ranking() {
  const [activeTab, setActiveTab] = useState<"alunos" | "tutores">("alunos");
  const [period, setPeriod] = useState("30");
  const [showFilters, setShowFilters] = useState(false);

  const rankingAlunos = [
    { pos: 1, nome: "Pedro Costa", grupo: "Turma A", pontos: 850, evolucao: "+120" },
    { pos: 2, nome: "Beatriz Lima", grupo: "Turma A", pontos: 780, evolucao: "+95" },
    { pos: 3, nome: "João Silva", grupo: "Turma A", pontos: 720, evolucao: "+88" },
    { pos: 4, nome: "Carlos Mendes", grupo: "Turma B", pontos: 680, evolucao: "+75" },
    { pos: 5, nome: "Mariana Costa", grupo: "Turma C", pontos: 650, evolucao: "+62" },
  ];

  const rankingTutores = [
    { pos: 1, nome: "Clara Mendes", alunos: 14, pontos: 470, taxa: "95%" },
    { pos: 2, nome: "Maria Silva", alunos: 12, pontos: 450, taxa: "98%" },
    { pos: 3, nome: "Ana Costa", alunos: 10, pontos: 420, taxa: "92%" },
    { pos: 4, nome: "João Santos", alunos: 15, pontos: 380, taxa: "85%" },
    { pos: 5, nome: "Pedro Oliveira", alunos: 8, pontos: 310, taxa: "88%" },
  ];

  const extrato = [
    { id: 1, data: "17/02/2026 14:30", descricao: "Completou Atividade 2.5", pontos: "+10", saldo: 720 },
    { id: 2, data: "17/02/2026 10:15", descricao: "Completou Atividade 2.4", pontos: "+10", saldo: 710 },
    { id: 3, data: "16/02/2026 16:20", descricao: "3 erros consecutivos", pontos: "-5", saldo: 700 },
    { id: 4, data: "16/02/2026 15:45", descricao: "Completou Atividade 2.3", pontos: "+10", saldo: 705 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T11. Pontuação & Ranking</h1>
        <p className="text-sm text-gray-600 mt-1">Sistema de pontuação e ranking de desempenho</p>
      </div>

      {/* Filtros de Período */}
      <div className="flex items-center justify-between">
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

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filtros Avançados</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Filtros Avançados */}
      {showFilters && (
        <div className="border border-gray-300 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Grupo</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Turma A</option>
                <option>Turma B</option>
                <option>Turma C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tutor</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Maria Silva</option>
                <option>João Santos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Ordenar por</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Pontuação (maior)</option>
                <option>Evolução (maior)</option>
                <option>Nome (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Layout: Ranking + Regras */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking */}
        <div className="lg:col-span-2">
          <div className="border border-gray-300 bg-white">
            {/* Abas */}
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setActiveTab("alunos")}
                className={`flex-1 px-4 py-3 text-sm font-bold ${
                  activeTab === "alunos"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Ranking de Alunos
              </button>
              <button
                onClick={() => setActiveTab("tutores")}
                className={`flex-1 px-4 py-3 text-sm font-bold ${
                  activeTab === "tutores"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Ranking de Tutores
              </button>
            </div>

            {/* Tabela de Ranking */}
            <div className="overflow-x-auto">
              {activeTab === "alunos" && (
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Evolução</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingAlunos.map((item) => (
                      <tr key={item.pos} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.pos <= 3 && <Trophy className={`w-4 h-4 ${
                              item.pos === 1 ? "text-yellow-600" :
                              item.pos === 2 ? "text-gray-400" :
                              "text-yellow-700"
                            }`} />}
                            <span className="text-sm font-bold text-gray-900">{item.pos}º</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.grupo}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.pontos}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.evolucao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "tutores" && (
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700"># Alunos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Taxa Resp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingTutores.map((item) => (
                      <tr key={item.pos} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {item.pos <= 3 && <Trophy className={`w-4 h-4 ${
                              item.pos === 1 ? "text-yellow-600" :
                              item.pos === 2 ? "text-gray-400" :
                              "text-yellow-700"
                            }`} />}
                            <span className="text-sm font-bold text-gray-900">{item.pos}º</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.alunos}</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.pontos}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.taxa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Card de Regras */}
        <div className="border border-gray-300 bg-white p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Regras de Pontuação
          </h3>
          <div className="space-y-3 text-sm">
            <div className="pb-3 border-b border-gray-200">
              <p className="font-bold text-gray-900 mb-1">O que ganha pontos:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Atividade concluída: +10</li>
                <li>• Etapa completa: +50</li>
                <li>• Acerto 1ª tentativa: +5 bônus</li>
                <li>• Login diário: +2</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-gray-900 mb-1">O que perde pontos:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• 3 erros consecutivos: -5</li>
                <li>• Inatividade &gt; 7 dias: -20</li>
                <li>• Desistência de atividade: -10</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Extrato de Pontos */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Extrato de Pontos (Ledger)</h3>
          <p className="text-xs text-gray-600 mt-1">Histórico detalhado de pontuação - João Silva</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontos</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {extrato.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{item.data}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.descricao}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${
                      item.pontos.startsWith("+") ? "text-gray-900" : "text-gray-600"
                    }`}>
                      {item.pontos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
