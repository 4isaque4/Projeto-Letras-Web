import { useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";

export default function Vinculos() {
  const [activeTab, setActiveTab] = useState<"pendentes" | "confirmados" | "negados">("pendentes");
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<"confirmar" | "negar">("confirmar");

  const vinculos = {
    pendentes: [
      { id: 1, aluno: "Lucas Silva", cpf: "123.456.789-00", telefone: "(11) 98765-4321", data: "15/02/2026" },
      { id: 2, aluno: "Mariana Costa", cpf: "987.654.321-00", telefone: "(11) 91234-5678", data: "16/02/2026" },
      { id: 3, aluno: "Roberto Santos", cpf: "456.789.123-00", telefone: "(11) 99876-5432", data: "17/02/2026" },
    ],
    confirmados: [
      { id: 4, aluno: "João Silva", cpf: "111.222.333-44", tutor: "Maria Silva", data: "10/02/2026" },
      { id: 5, aluno: "Ana Oliveira", cpf: "555.666.777-88", tutor: "João Santos", data: "12/02/2026" },
    ],
    negados: [
      { id: 6, aluno: "Carlos Mendes", cpf: "999.888.777-66", motivo: "Fora da área de atendimento", data: "08/02/2026" },
    ],
  };

  const handleAction = (action: "confirmar" | "negar") => {
    setModalAction(action);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T7. Vínculos e Convites</h1>
        <p className="text-sm text-gray-600 mt-1">Gestão de solicitações de vínculo aluno-tutor</p>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 border border-gray-300 bg-white px-4 py-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por CPF, telefone ou nome..."
          className="flex-1 text-sm focus:outline-none"
        />
      </div>

      {/* Abas */}
      <div className="border border-gray-300 bg-white">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("pendentes")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "pendentes"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pendentes ({vinculos.pendentes.length})
          </button>
          <button
            onClick={() => setActiveTab("confirmados")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "confirmados"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Confirmados ({vinculos.confirmados.length})
          </button>
          <button
            onClick={() => setActiveTab("negados")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "negados"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Negados ({vinculos.negados.length})
          </button>
        </div>

        {/* Conteúdo das abas */}
        <div className="overflow-x-auto">
          {activeTab === "pendentes" && (
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data Solicitação</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.pendentes.map((v) => (
                  <tr key={v.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{v.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.cpf}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.telefone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.data}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction("confirmar")}
                          className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100 flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleAction("negar")}
                          className="px-3 py-1 text-xs border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Negar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "confirmados" && (
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data Confirmação</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.confirmados.map((v) => (
                  <tr key={v.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{v.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.cpf}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.tutor}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "negados" && (
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.negados.map((v) => (
                  <tr key={v.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{v.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.cpf}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.motivo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Confirmar/Negar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-400 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalAction === "confirmar" ? "Confirmar Vínculo" : "Negar Vínculo"}
            </h3>
            <div className="space-y-4">
              {modalAction === "confirmar" && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Tutor Responsável</label>
                  <select className="w-full px-3 py-2 border border-gray-300 bg-gray-50">
                    <option>Selecione um tutor...</option>
                    <option>Maria Silva</option>
                    <option>João Santos</option>
                    <option>Ana Costa</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {modalAction === "confirmar" ? "Observações (opcional)" : "Motivo da negação"}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 h-24"
                  placeholder={modalAction === "confirmar" ? "Observações..." : "Descreva o motivo..."}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-400 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    alert(`Vínculo ${modalAction === "confirmar" ? "confirmado" : "negado"}!`);
                  }}
                  className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
