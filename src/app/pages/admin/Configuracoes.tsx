import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Configuracoes() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"perfil" | "sistema" | "papeis">("perfil");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T13. Configurações</h1>
        <p className="text-sm text-gray-600 mt-1">Gerenciamento de perfil, sistema e permissões</p>
      </div>

      {/* Abas */}
      <div className="border border-gray-300 bg-white">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("perfil")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "perfil"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Perfil do Usuário
          </button>
          <button
            onClick={() => setActiveTab("sistema")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "sistema"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Parâmetros do Sistema
          </button>
          <button
            onClick={() => setActiveTab("papeis")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "papeis"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Papéis (Admin)
          </button>
        </div>

        <div className="p-6">
          {/* Perfil do Usuário */}
          {activeTab === "perfil" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Informações Pessoais</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nome Completo</label>
                    <input
                      type="text"
                      defaultValue="Admin Coordenação"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue="admin@alfabetizador.com"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Telefone</label>
                    <input
                      type="tel"
                      defaultValue="(11) 98765-4321"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-300">
                <h3 className="font-bold text-gray-900 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Senha Atual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nova Senha</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-gray-400 hover:bg-gray-100">
                  Cancelar
                </button>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700">
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {/* Parâmetros do Sistema */}
          {activeTab === "sistema" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Limites e Regras</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Limite de erros para Lock
                    </label>
                    <input
                      type="number"
                      defaultValue="3"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Número de erros consecutivos que bloqueia o aluno
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Janela de Inatividade (dias)
                    </label>
                    <input
                      type="number"
                      defaultValue="7"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dias sem acesso para considerar aluno inativo
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Tempo máximo de resposta do tutor (horas)
                    </label>
                    <input
                      type="number"
                      defaultValue="24"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tempo ideal para responder pedidos de ajuda
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-300">
                <h3 className="font-bold text-gray-900 mb-4">Textos Padrão</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Mensagem de Desbloqueio
                    </label>
                    <textarea
                      defaultValue="Você foi desbloqueado! Continue tentando, estou aqui para ajudar."
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50 h-20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Mensagem de Incentivo
                    </label>
                    <textarea
                      defaultValue="Muito bem! Continue praticando, você está indo muito bem!"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50 h-20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button className="px-4 py-2 border border-gray-400 hover:bg-gray-100">
                  Restaurar Padrões
                </button>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700">
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {/* Papéis (Admin) */}
          {activeTab === "papeis" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Gerenciamento de papéis e permissões (somente Admin)
                </p>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 text-sm">
                  + Novo Papel
                </button>
              </div>

              <div className="border border-gray-300">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Papel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Usuários</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">Admin</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Acesso total ao sistema
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">3</td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">Coordenação</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Gestão de tutores e alunos
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">5</td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-bold">Alfabetizador</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        Acesso aos próprios alunos
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">12</td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border-2 border-gray-400 bg-gray-50 p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Permissões do Papel: Admin</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    "Gerenciar usuários",
                    "Gerenciar conteúdo",
                    "Ver relatórios",
                    "Configurar sistema",
                    "Gerenciar grupos",
                    "Gerenciar vínculos",
                    "Acessar fila",
                    "Exportar dados",
                  ].map((perm, idx) => (
                    <label key={idx} className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="border-gray-300" />
                      <span className="text-sm text-gray-700">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
