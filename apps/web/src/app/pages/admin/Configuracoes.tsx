import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type ConfigTab = "perfil" | "sistema" | "papeis";

export default function Configuracoes() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("perfil");
  const [profileForm, setProfileForm] = useState({
    nome: "",
    email: "",
    telefone: "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T13. Configuracoes</h1>
        <p className="text-sm text-gray-600 mt-1">Parametros do perfil e operacao do painel web</p>
      </div>

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
            Perfil
          </button>
          <button
            onClick={() => setActiveTab("sistema")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "sistema"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Sistema
          </button>
          <button
            onClick={() => setActiveTab("papeis")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "papeis"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Papeis
          </button>
        </div>

        <div className="p-6">
          {activeTab === "perfil" && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-4">Dados do Usuario</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nome completo</label>
                    <input
                      type="text"
                      value={profileForm.nome}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, nome: event.target.value }))
                      }
                      placeholder="Seu nome"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="seu-email@dominio.com"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Telefone</label>
                    <input
                      type="tel"
                      value={profileForm.telefone}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, telefone: event.target.value }))
                      }
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-300">
                <h3 className="font-bold text-gray-900 mb-4">Alterar Senha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Senha atual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
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
                    <label className="block text-sm text-gray-700 mb-2">Nova senha</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 bg-gray-50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sistema" && (
            <div className="max-w-2xl space-y-6">
              <div className="border border-gray-300 bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  Esta secao usa valores operacionais da API e do Supabase. A integracao de escrita sera habilitada
                  nas proximas etapas.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Limite de erros para bloqueio</label>
                  <input type="number" defaultValue={3} className="w-full px-3 py-2 border border-gray-300 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Dias para inatividade</label>
                  <input type="number" defaultValue={7} className="w-full px-3 py-2 border border-gray-300 bg-gray-50" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "papeis" && (
            <div className="border border-gray-300 bg-gray-50 p-4">
              <h3 className="font-bold text-gray-900 mb-2">Gestao de Papeis</h3>
              <p className="text-sm text-gray-700">
                Esta secao nao usa dados locais fixos. O gerenciamento de papeis sera conectado ao backend
                administrativo em etapa posterior.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
