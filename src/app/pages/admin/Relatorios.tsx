import { useState } from "react";
import { Download, Filter, ChevronDown } from "lucide-react";

export default function Relatorios() {
  const [showFilters, setShowFilters] = useState(true);

  const relatorios = [
    { tipo: "Inatividade", total: 23, critico: 8 },
    { tipo: "Evolução por Etapa", total: 247, critico: 0 },
    { tipo: "Taxa de Acerto", total: 1250, critico: 45 },
    { tipo: "Tempo de Resposta", total: 89, critico: 12 },
  ];

  const dadosInatividade = [
    { id: 1, aluno: "Maria Santos", tutor: "João Santos", ultimoAcesso: "10/02/2026", diasInativo: 7, etapa: "Etapa 1" },
    { id: 2, aluno: "Lucas Silva", tutor: "Maria Silva", ultimoAcesso: "05/02/2026", diasInativo: 12, etapa: "Etapa 2" },
    { id: 3, aluno: "Fernanda Costa", tutor: "Ana Costa", ultimoAcesso: "08/02/2026", diasInativo: 9, etapa: "Etapa 1" },
    { id: 4, aluno: "Roberto Mendes", tutor: "João Santos", ultimoAcesso: "03/02/2026", diasInativo: 14, etapa: "Etapa 3" },
    { id: 5, aluno: "Juliana Alves", tutor: "Clara Mendes", ultimoAcesso: "12/02/2026", diasInativo: 5, etapa: "Etapa 2" },
    { id: 6, aluno: "Paulo Santos", tutor: "Maria Silva", ultimoAcesso: "01/02/2026", diasInativo: 16, etapa: "Etapa 1" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T12. Relatórios</h1>
          <p className="text-sm text-gray-600 mt-1">Análises e exportação de dados</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-400 hover:bg-gray-100 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {relatorios.map((rel, idx) => (
          <div key={idx} className="border border-gray-300 bg-white p-4">
            <p className="text-xs text-gray-500 mb-2">{rel.tipo}</p>
            <p className="text-2xl font-bold text-gray-900">{rel.total}</p>
            {rel.critico > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                {rel.critico} críticos
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Filtros Avançados */}
      <div className="border border-gray-300 bg-white">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="font-bold text-sm">Filtros Avançados</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>

        {showFilters && (
          <div className="p-4 border-t border-gray-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo de Relatório</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Inatividade</option>
                <option>Evolução por Etapa</option>
                <option>Taxa de Acerto</option>
                <option>Tempo de Resposta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Período</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
                <option>Últimos 90 dias</option>
                <option>Personalizado</option>
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
            <div>
              <label className="block text-xs text-gray-600 mb-1">Grupo</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Turma A</option>
                <option>Turma B</option>
                <option>Turma C</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Dados */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Relatório: Inatividade</h3>
            <p className="text-xs text-gray-600 mt-1">Alunos com mais de 3 dias sem acesso</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Ordenar por:</span>
            <select className="px-3 py-1 border border-gray-300 bg-gray-50 text-xs">
              <option>Dias (maior)</option>
              <option>Nome (A-Z)</option>
              <option>Tutor</option>
              <option>Etapa</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Último Acesso</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Dias Inativo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dadosInatividade.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.aluno}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.tutor}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.ultimoAcesso}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs border ${
                      item.diasInativo >= 10
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-400 bg-gray-100 text-gray-700"
                    }`}>
                      {item.diasInativo} dias
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.etapa}</td>
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

        {/* Paginação */}
        <div className="px-4 py-3 border-t border-gray-300 flex items-center justify-between">
          <p className="text-xs text-gray-600">Mostrando 1-6 de 23 registros</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-100">Anterior</button>
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-900 text-white">1</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">2</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">3</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">4</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
