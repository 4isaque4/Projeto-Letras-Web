import { useState } from "react";
import { Filter, ChevronDown, X } from "lucide-react";

export default function Fila() {
  const [showFilters, setShowFilters] = useState(true);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  const chamados = [
    { id: 1, tipo: "Pedido de Ajuda", aluno: "João Silva", etapa: "Etapa 2", atividade: "Atividade 2.5", status: "aberto", tempo: "15 min", prioridade: "alta" },
    { id: 2, tipo: "Lock", aluno: "Ana Oliveira", etapa: "Etapa 2", atividade: "Atividade 2.3", status: "aberto", tempo: "2h 30min", prioridade: "alta" },
    { id: 3, tipo: "Submissão", aluno: "Pedro Costa", etapa: "Etapa 3", atividade: "Atividade 3.1", status: "pendente", tempo: "45 min", prioridade: "media" },
    { id: 4, tipo: "Pedido de Ajuda", aluno: "Maria Santos", etapa: "Etapa 1", atividade: "Atividade 1.8", status: "em_atendimento", tempo: "5 min", prioridade: "media" },
    { id: 5, tipo: "Lock", aluno: "Carlos Mendes", etapa: "Etapa 2", atividade: "Atividade 2.1", status: "aberto", tempo: "1h 20min", prioridade: "alta" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T9. Fila de Atendimento</h1>
        <p className="text-sm text-gray-600 mt-1">Gestão de pedidos, locks e submissões</p>
      </div>

      {/* Filtros */}
      <div className="border border-gray-300 bg-white">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-bold text-sm">Filtros</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div className="p-4 border-t border-gray-300 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Pedido de Ajuda</option>
                <option>Lock</option>
                <option>Submissão</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Aberto</option>
                <option>Em Atendimento</option>
                <option>Pendente</option>
                <option>Resolvido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Prioridade</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todas</option>
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tutor</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Maria Silva</option>
                <option>João Santos</option>
                <option>Ana Costa</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Layout: Tabela + Drawer */}
      <div className="flex gap-4">
        {/* Tabela de Chamados */}
        <div className={`${selectedItem ? "w-2/3" : "w-full"} transition-all`}>
          <div className="border border-gray-300 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa/Atividade</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tempo Aberto</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {chamados.map((chamado) => (
                    <tr
                      key={chamado.id}
                      onClick={() => setSelectedItem(chamado.id)}
                      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        selectedItem === chamado.id ? "bg-gray-100" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{chamado.tipo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{chamado.aluno}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>{chamado.etapa}</div>
                        <div className="text-xs text-gray-500">{chamado.atividade}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs border ${
                          chamado.status === "aberto" ? "border-gray-900 bg-gray-900 text-white" :
                          chamado.status === "em_atendimento" ? "border-gray-400 bg-gray-100 text-gray-700" :
                          "border-gray-400 bg-white text-gray-700"
                        }`}>
                          {chamado.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{chamado.tempo}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs border ${
                          chamado.prioridade === "alta" ? "border-gray-900 bg-gray-900 text-white" :
                          "border-gray-400 bg-gray-100 text-gray-700"
                        }`}>
                          {chamado.prioridade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Drawer Lateral */}
        {selectedItem && (
          <div className="w-1/3 border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Detalhes do Chamado</h3>
              <button onClick={() => setSelectedItem(null)}>
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                <p className="text-sm font-bold text-gray-900">Pedido de Ajuda</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Aluno</p>
                <p className="text-sm text-gray-900">João Silva</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Atividade</p>
                <p className="text-sm text-gray-900">Etapa 2 - Atividade 2.5</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Descrição</p>
                <p className="text-sm text-gray-700">Aluno reportou dificuldade em identificar as sílabas na palavra "cadeira".</p>
              </div>

              <div className="pt-4 border-t border-gray-300 space-y-2">
                <p className="text-xs font-bold text-gray-700 mb-3">Ações Rápidas</p>

                <button className="w-full px-3 py-2 text-sm border border-gray-400 hover:bg-gray-100 text-left">
                  Destravar Aluno
                </button>

                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm h-20 mb-2"
                    placeholder="Enviar orientação ao aluno..."
                  />
                  <button className="w-full px-3 py-2 text-sm bg-gray-900 text-white hover:bg-gray-700">
                    Enviar Orientação
                  </button>
                </div>

                <button className="w-full px-3 py-2 text-sm border border-gray-400 hover:bg-gray-100 text-left">
                  Aprovar Submissão
                </button>

                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm h-16 mb-2"
                    placeholder="Observação final..."
                  />
                  <button className="w-full px-3 py-2 text-sm border border-gray-900 bg-gray-900 text-white hover:bg-gray-700">
                    Encerrar Chamado
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
