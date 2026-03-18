import { useState } from "react";
import { Link } from "react-router";
import { Filter, ChevronDown } from "lucide-react";

export default function Alfabetizandos() {
  const [showFilters, setShowFilters] = useState(true);

  const alunos = [
    { id: 1, nome: "João Silva", grupo: "Turma A", etapa: "Etapa 2", progresso: 65, status: "ativo", ultimaAtividade: "Hoje, 10:30" },
    { id: 2, nome: "Maria Santos", grupo: "Turma B", etapa: "Etapa 1", progresso: 42, status: "inativo", ultimaAtividade: "7 dias atrás" },
    { id: 3, nome: "Pedro Costa", grupo: "Turma A", etapa: "Etapa 3", progresso: 85, status: "ativo", ultimaAtividade: "Hoje, 14:20" },
    { id: 4, nome: "Ana Oliveira", grupo: "Turma C", etapa: "Etapa 2", progresso: 38, status: "travado", ultimaAtividade: "2 dias atrás" },
    { id: 5, nome: "Carlos Mendes", grupo: "Turma B", etapa: "Etapa 1", progresso: 55, status: "ativo", ultimaAtividade: "Hoje, 09:15" },
    { id: 6, nome: "Beatriz Lima", grupo: "Turma A", etapa: "Etapa 2", progresso: 70, status: "ativo", ultimaAtividade: "Hoje, 11:45" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T4. Lista de Alfabetizandos</h1>
        <p className="text-sm text-gray-600 mt-1">Gestão de todos os alunos do sistema</p>
      </div>

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
          <div className="p-4 border-t border-gray-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Tutor</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Tutor A</option>
                <option>Tutor B</option>
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
            <div>
              <label className="block text-xs text-gray-600 mb-1">Etapa</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todas</option>
                <option>Etapa 1</option>
                <option>Etapa 2</option>
                <option>Etapa 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Todos</option>
                <option>Ativo</option>
                <option>Inativo</option>
                <option>Travado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Inatividade</label>
              <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm">
                <option>Qualquer</option>
                <option>&gt;= 3 dias</option>
                <option>&gt;= 7 dias</option>
                <option>&gt;= 15 dias</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa Atual</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">% Progresso</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Última Atividade</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{aluno.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{aluno.grupo}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{aluno.etapa}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 border border-gray-300">
                        <div className="h-full bg-gray-900" style={{ width: `${aluno.progresso}%` }} />
                      </div>
                      <span className="text-xs text-gray-600 w-10">{aluno.progresso}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs border ${
                        aluno.status === "ativo"
                          ? "border-gray-400 bg-white text-gray-700"
                          : aluno.status === "travado"
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-400 bg-gray-200 text-gray-600"
                      }`}
                    >
                      {aluno.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{aluno.ultimaAtividade}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/alfabetizandos/${aluno.id}`}
                      className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100 inline-block"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-300 flex items-center justify-between">
          <p className="text-xs text-gray-600">Mostrando 1-6 de 247 registros</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-100">Anterior</button>
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-900 text-white">1</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">2</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">3</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
