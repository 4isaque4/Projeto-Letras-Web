import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, XCircle, Unlock } from "lucide-react";

export default function AlfabetizandoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const aluno = {
    nome: "Ana Oliveira",
    tutor: "Tutora Maria",
    grupo: "Turma C",
    etapa: "Etapa 2",
    status: "travado",
  };

  const progresso = [
    { etapa: "Etapa 1", atividades: 12, concluidas: 12, progresso: 100 },
    { etapa: "Etapa 2", atividades: 15, concluidas: 8, progresso: 53 },
    { etapa: "Etapa 3", atividades: 10, concluidas: 0, progresso: 0 },
  ];

  const tentativas = [
    { id: 1, atividade: "Atividade 2.5", data: "17/02/2026 14:30", acertos: 3, erros: 5, taxa: "37%" },
    { id: 2, atividade: "Atividade 2.4", data: "16/02/2026 10:15", acertos: 8, erros: 2, taxa: "80%" },
    { id: 3, atividade: "Atividade 2.3", data: "15/02/2026 16:45", acertos: 6, erros: 4, taxa: "60%" },
  ];

  const submissoes = [
    { id: 1, tipo: "Foto", atividade: "Atividade 2.5", data: "17/02/2026 14:35", status: "pendente" },
    { id: 2, tipo: "Áudio", atividade: "Atividade 2.4", data: "16/02/2026 10:20", status: "aprovado" },
  ];

  const historico = [
    { id: 1, tipo: "Desbloqueio", data: "15/02/2026 17:00", usuario: "Tutora Maria", obs: "Orientação enviada" },
    { id: 2, tipo: "Pedido de ajuda", data: "15/02/2026 16:50", usuario: "Ana Oliveira", obs: "Dúvida na atividade 2.3" },
    { id: 3, tipo: "Lock", data: "14/02/2026 11:20", usuario: "Sistema", obs: "3 erros consecutivos" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 border border-gray-400 hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">T5. Detalhe do Alfabetizando</h1>
          <p className="text-sm text-gray-600 mt-1">Informações completas e histórico do aluno</p>
        </div>
        {aluno.status === "travado" && (
          <button 
            onClick={() => setShowUnlockModal(true)}
            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Destravar Aluno
          </button>
        )}
      </div>

      {/* Informações do Aluno */}
      <div className="border border-gray-300 bg-white p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nome</p>
            <p className="text-sm font-bold text-gray-900">{aluno.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tutor</p>
            <p className="text-sm text-gray-700">{aluno.tutor}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Grupo</p>
            <p className="text-sm text-gray-700">{aluno.grupo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Etapa Atual</p>
            <p className="text-sm text-gray-700">{aluno.etapa}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className="px-2 py-1 text-xs border border-gray-900 bg-gray-900 text-white inline-block">
              {aluno.status}
            </span>
          </div>
        </div>
      </div>

      {/* Progresso por Etapa */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Painel de Progresso (Timeline)</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {progresso.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32">
                  <p className="text-sm font-bold text-gray-900">{item.etapa}</p>
                  <p className="text-xs text-gray-500">{item.concluidas}/{item.atividades} atividades</p>
                </div>
                <div className="flex-1 h-4 bg-gray-200 border border-gray-300">
                  <div 
                    className="h-full bg-gray-900"
                    style={{ width: `${item.progresso}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-12">{item.progresso}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tentativas e Erros */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Tentativas e Erros</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Atividade</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acertos</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Erros</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {tentativas.map((t) => (
                <tr key={t.id} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-900">{t.atividade}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{t.data}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.acertos}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.erros}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{t.taxa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submissões */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Submissões (Fotos/Áudios)</h3>
        </div>
        <div className="p-4 space-y-3">
          {submissoes.map((sub) => (
            <div key={sub.id} className="flex items-center gap-4 p-4 border border-gray-300 bg-gray-50">
              <div className="w-20 h-20 bg-gray-200 border border-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-500">{sub.tipo}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{sub.atividade}</p>
                <p className="text-xs text-gray-600">{sub.data}</p>
              </div>
              <div>
                <span className={`px-2 py-1 text-xs border ${
                  sub.status === "aprovado" 
                    ? "border-gray-400 bg-white text-gray-700"
                    : "border-gray-900 bg-gray-900 text-white"
                }`}>
                  {sub.status}
                </span>
              </div>
              {sub.status === "pendente" && (
                <div className="flex gap-2">
                  <button className="p-2 border border-gray-400 hover:bg-gray-100">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button className="p-2 border border-gray-400 hover:bg-gray-100">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Histórico de Atendimento */}
      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Histórico de Atendimento</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Observação</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-900">{h.tipo}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{h.data}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{h.usuario}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{h.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Destravar */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-400 p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Destravar Aluno</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Motivo do desbloqueio</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 h-24"
                  placeholder="Descreva o motivo..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setShowUnlockModal(false)}
                  className="px-4 py-2 border border-gray-400 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setShowUnlockModal(false);
                    alert("Aluno destravado!");
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
