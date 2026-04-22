import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, RefreshCw, Save, Settings2, Shield, UserCog } from "lucide-react";
import { useNavigate } from "react-router";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";

type ConfigTab = "perfil" | "sistema" | "papeis";

interface ProfileResponse {
  id: string;
  full_name: string;
  role: string;
  phone: string;
  cpf: string;
  metadata?: Record<string, unknown>;
}

interface SystemSettings {
  errorBlockLimit: number;
  inactivityDays: number;
}

interface SystemSettingsResponse extends SystemSettings {
  updatedAt?: string | null;
  updatedBy?: string | null;
}

const SYSTEM_SETTINGS_STORAGE_KEY = "letras.web.system-settings";

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  errorBlockLimit: 3,
  inactivityDays: 7,
};

function loadStoredSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SYSTEM_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<SystemSettings>;
    return {
      errorBlockLimit: Number(parsed.errorBlockLimit ?? DEFAULT_SYSTEM_SETTINGS.errorBlockLimit),
      inactivityDays: Number(parsed.inactivityDays ?? DEFAULT_SYSTEM_SETTINGS.inactivityDays),
    };
  } catch {
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

function normalizeSystemSettings(raw?: Partial<SystemSettings> | null): SystemSettings {
  return {
    errorBlockLimit: Math.max(1, Number(raw?.errorBlockLimit ?? DEFAULT_SYSTEM_SETTINGS.errorBlockLimit)),
    inactivityDays: Math.max(1, Number(raw?.inactivityDays ?? DEFAULT_SYSTEM_SETTINGS.inactivityDays)),
  };
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const { user, requestPasswordReset } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("perfil");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
    id: "",
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  const userRoleLabel = useMemo(() => {
    if (user?.role === "admin") {
      return "Admin";
    }
    if (user?.role === "tutor") {
      return "Tutor";
    }
    if (user?.role === "alfabetizando") {
      return "Alfabetizando";
    }
    return "Usuario";
  }, [user?.role]);

  useEffect(() => {
    if (!user?.id) {
      setError("Usuario nao autenticado.");
      setLoading(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccessMessage("");

        const [profile, remoteSettings] = await Promise.all([
          apiGet(`/cadastros/perfis/${user.id}`) as Promise<ProfileResponse>,
          apiGet("/painel/configuracoes/sistema")
            .then((response) => response as SystemSettingsResponse)
            .catch(() => null),
        ]);

        if (!active) {
          return;
        }

        setProfileForm({
          id: profile.id,
          nome: profile.full_name ?? "",
          email: user.email ?? String(profile.metadata?.email ?? ""),
          telefone: profile.phone ?? "",
          cpf: profile.cpf ?? "",
        });

        const localSettings = loadStoredSettings();
        const settingsToUse = normalizeSystemSettings(remoteSettings ?? localSettings);
        setSystemSettings(settingsToUse);
        localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(settingsToUse));
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar configuracoes.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [user?.email, user?.id]);

  const handleSaveProfile = async () => {
    if (!profileForm.id) {
      setError("Perfil nao carregado.");
      return;
    }

    if (!profileForm.nome.trim()) {
      setError("Nome e obrigatorio.");
      return;
    }

    const normalizedEmail = profileForm.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Informe um email valido.");
      return;
    }

    try {
      setSavingProfile(true);
      setError("");
      setSuccessMessage("");

      await apiPatch(`/cadastros/perfis/${profileForm.id}`, {
        nome: profileForm.nome.trim(),
        email: normalizedEmail,
        phone: profileForm.telefone.trim() || null,
        cpf: profileForm.cpf.trim() || null,
        metadata: {
          email: normalizedEmail,
        },
      });

      setSuccessMessage("Perfil atualizado com sucesso.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Falha ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendResetPassword = async () => {
    const email = profileForm.email.trim();
    if (!email) {
      setError("Informe um email valido para recuperar senha.");
      return;
    }

    try {
      setSendingReset(true);
      setError("");
      setSuccessMessage("");
      await requestPasswordReset(email);
      setSuccessMessage("Link de redefinicao de senha enviado para o email informado.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Falha ao enviar link de redefinicao.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleSaveSystem = async () => {
    const nextSettings = normalizeSystemSettings(systemSettings);

    try {
      setSavingSystem(true);
      setError("");
      setSuccessMessage("");

      const response = (await apiPatch("/painel/configuracoes/sistema", {
        ...nextSettings,
        updatedBy: user?.id ?? null,
      })) as SystemSettingsResponse;
      const savedSettings = normalizeSystemSettings(response);

      localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings));
      setSystemSettings(savedSettings);
      setSuccessMessage("Parametros do sistema salvos com sucesso.");
    } catch {
      localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
      setSystemSettings(nextSettings);
      setSuccessMessage("API indisponivel no momento. Parametros salvos localmente neste navegador.");
    } finally {
      setSavingSystem(false);
    }
  };

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (!user?.id) {
    return <StateDisplay type="error" message={error || "Usuario nao autenticado."} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T13. Configuracoes</h1>
        <p className="mt-1 text-sm text-gray-600">Parametros do perfil e operacao do painel web ({userRoleLabel})</p>
      </div>

      {error ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {successMessage ? (
        <div className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
      ) : null}

      <div className="border border-gray-300 bg-white">
        <div className="flex border-b border-gray-300">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
          {activeTab === "perfil" ? (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="mb-4 font-bold text-gray-900">Dados do Usuario</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-gray-700">Nome completo</label>
                    <input
                      type="text"
                      value={profileForm.nome}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, nome: event.target.value }))
                      }
                      placeholder="Seu nome"
                      className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-700">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-700">Telefone</label>
                    <input
                      type="tel"
                      value={profileForm.telefone}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, telefone: event.target.value }))
                      }
                      placeholder="(00) 00000-0000"
                      className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-700">CPF</label>
                    <input
                      type="text"
                      value={profileForm.cpf}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, cpf: event.target.value }))
                      }
                      placeholder="000.000.000-00"
                      className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? "Salvando..." : "Salvar perfil"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h3 className="mb-4 font-bold text-gray-900">Alterar Senha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-gray-700">Senha atual</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(event) =>
                          setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                        }
                        className="w-full border border-gray-300 bg-gray-50 px-3 py-2 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-700">Nova senha</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                      }
                      className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                    />
                  </div>

                  <div className="border border-gray-300 bg-gray-50 p-3 text-xs text-gray-700">
                    A alteracao direta de senha nao esta disponivel neste painel. Use a recuperacao por email.
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendResetPassword}
                      disabled={sendingReset}
                      className="inline-flex items-center gap-2 border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${sendingReset ? "animate-spin" : ""}`} />
                      {sendingReset ? "Enviando..." : "Enviar link de redefinicao"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "sistema" ? (
            <div className="max-w-2xl space-y-6">
              <div className="flex items-start gap-3 border border-gray-300 bg-gray-50 p-4">
                <Settings2 className="mt-0.5 h-5 w-5 text-gray-700" />
                <p className="text-sm text-gray-700">
                  Estes parametros ficam salvos localmente no navegador para operacao do painel web.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">Limite de erros para bloqueio</label>
                  <input
                    type="number"
                    min={1}
                    value={systemSettings.errorBlockLimit}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setSystemSettings((current) => ({
                        ...current,
                        errorBlockLimit: Number.isFinite(nextValue) ? nextValue : current.errorBlockLimit,
                      }));
                    }}
                    className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-700">Dias para inatividade</label>
                  <input
                    type="number"
                    min={1}
                    value={systemSettings.inactivityDays}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      setSystemSettings((current) => ({
                        ...current,
                        inactivityDays: Number.isFinite(nextValue) ? nextValue : current.inactivityDays,
                      }));
                    }}
                    className="w-full border border-gray-300 bg-gray-50 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSystem}
                  disabled={savingSystem}
                  className="inline-flex items-center gap-2 border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSystem ? "Salvando..." : "Salvar parametros"}
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === "papeis" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-gray-300 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-gray-800" />
                    <h3 className="font-bold text-gray-900">Gestao de usuarios</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-700">
                    Cadastro e manutencao de alfabetizadores e alfabetizandos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/alfabetizadores")}
                      className="border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                    >
                      Abrir alfabetizadores
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/admin/alfabetizandos")}
                      className="border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                    >
                      Abrir alfabetizandos
                    </button>
                  </div>
                </div>

                <div className="border border-gray-300 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-800" />
                    <h3 className="font-bold text-gray-900">Governanca de conteudo</h3>
                  </div>
                  <p className="mb-4 text-sm text-gray-700">
                    Acesso rapido para revisar trilhas, temas e midias publicadas.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/conteudo")}
                    className="border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    Abrir biblioteca de conteudo
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
