import { useState } from "react";
import { Plus, Users, AlertTriangle, Edit, Trash2 } from "lucide-react";

export default function Grupos() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const grupos = [
    { id: 1, nome: "Turma A", membros: 25, etapaMedia: "Etapa 2", tutor: "Maria Silva", status: "normal" },
    { id: 2, nome: "Turma B", membros: 18, etapaMedia: "Etapa 1", tutor: "João Santos", status: "normal" },
    { id: 3, nome: "Turma C", membros: 12, etapaMedia: "Etapa 2", tutor: "Ana Costa", status: "normal" },
    { id: 4, nome: "Turma Avançada", membros: 8, etapaMedia: "Etapa 3", tutor: "Clara Mendes", status: "avancado" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T8. Grupos</h1>
          <p className="text-sm text-gray-600 mt-1">Gestão de grupos de alfabetizandos</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Criar Grupo
        </button>
      </div>

      {/* Lista de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grupos.map((grupo) => (
          <div key={grupo.id} className="border border-gray-300 bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-gray-300 bg-gray-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{grupo.nome}</h3>
                  <p className="text-xs text-gray-500">{grupo.membros} membros</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 border border-gray-400 hover:bg-gray-100">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 border border-gray-400 hover:bg-gray-100">
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Etapa Média:</span>
                <span className="text-gray-900 font-medium">{grupo.etapaMedia}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tutor Responsável:</span>
                <span className="text-gray-900 font-medium">{grupo.tutor}</span>
              </div>
            </div>

            {grupo.status === "avancado" && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300">
                <AlertTriangle className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-yellow-900">Grupo Avançado</p>
                  <p className="text-xs text-yellow-700">Entrada bloqueada para novos membros</p>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-300 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm border border-gray-400 hover:bg-gray-100">
                Ver Membros
              </button>
              <button className="flex-1 px-3 py-2 text-sm border border-gray-400 hover:bg-gray-100">
                Adicionar Membros
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar Grupo */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-400 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Criar Novo Grupo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Nome do Grupo</label>
                <input
                  type="text"
                  placeholder="Ex: Turma D"
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Tutor Responsável</label>
                <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50">
                  <option>Selecione um tutor...</option>
                  <option>Maria Silva</option>
                  <option>João Santos</option>
                  <option>Ana Costa</option>
                  <option>Clara Mendes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Descrição (opcional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 h-20"
                  placeholder="Descrição do grupo..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="avancado" className="border-gray-300" />
                <label htmlFor="avancado" className="text-sm text-gray-700">
                  Marcar como grupo avançado (bloquear novos membros)
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-400 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    alert("Grupo criado!");
                  }}
                  className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700"
                >
                  Criar Grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
