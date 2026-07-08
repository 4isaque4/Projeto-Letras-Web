import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPost } from "../../core/api/client";
import { useAuth } from "../../core/auth/AuthProvider";

interface StudentItem {
  id: string;
  nome: string;
  grupo: string;
  etapa: string;
  progresso: number;
  status: string;
  ultimaAtividade: string;
}

interface StudentsResponse {
  total: number;
  items: StudentItem[];
}

interface StudentCreateForm {
  nome: string;
  email: string;
  password: string;
  telefone: string;
  cpf: string;
}

const EMPTY_CREATE_FORM: StudentCreateForm = {
  nome: "",
  email: "",
  password: "",
  telefone: "",
  cpf: "",
};

function applyCpfMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function applyPhoneMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function MeusAlfabetizandos() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createForm, setCreateForm] = useState<StudentCreateForm>(EMPTY_CREATE_FORM);
  const [saving, setSaving] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  const loadStudents = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setError("Tutor não autenticado.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = (await apiGet(
        `/cadastros/alfabetizandos?tutorId=${encodeURIComponent(user.id)}`,
      )) as StudentsResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar alfabetizandos.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const onCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.id) {
      setError("Tutor não autenticado.");
      return;
    }

    const nome = createForm.nome.trim();
    const cpf = createForm.cpf.trim();
    const telefone = createForm.telefone.trim();
    const emailInformado = createForm.email.trim();
    const senhaInformada = createForm.password.trim();

    if (!nome) {
      setError("Informe o nome do alfabetizando.");
      return;
    }

    // CPF identifica o alfabetizando no mobile. Sem CPF não dá pra vincular depois.
    if (!cpf) {
      setError("Informe o CPF do alfabetizando.");
      return;
    }

    // Backend exige email/senha pra criar usuário no Supabase Auth.
    // Pro fluxo do alfabetizando (que usa CPF/telefone), geramos automaticamente
    // se o tutor não informar.
    const cpfDigits = cpf.replace(/[^0-9]/g, "") || `aluno${Date.now()}`;
    const email = emailInformado || `aluno.${cpfDigits}@mobile.letras.local`;
    const password = senhaInformada || `Letras@${cpfDigits}`;

    try {
      setSaving(true);
      setError("");
      setCreateMessage("");

      // O vínculo não é criado aqui: o alfabetizando faz login por CPF/telefone no
      // app mobile (Etapa 2) para solicitar vínculo, e o alfabetizador confirma no
      // próprio app. Evita vínculo "confirmado" sem aceite (RN101).
      await apiPost("/cadastros/alfabetizandos", {
        nome,
        email,
        password,
        phone: telefone || undefined,
        cpf: cpf || undefined,
      });

      setCreateForm(EMPTY_CREATE_FORM);
      setCreateMessage(
        `Alfabetizando "${nome}" cadastrado. O vínculo é confirmado quando ele fizer login pelo app.`,
      );
      await loadStudents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao cadastrar alfabetizando.");
    } finally {
      setSaving(false);
    }
  };

  const statusOptions = useMemo(() => {
    return [...new Set(items.map((item) => item.status).filter(Boolean))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchQuery =
        !needle ||
        [item.nome, item.grupo, item.etapa, item.ultimaAtividade].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(needle),
        );

      const matchStatus = !statusFilter || item.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [items, query, statusFilter]);

  const summary = useMemo(() => {
    const total = items.length;
    const ativos = items.filter((item) => item.status === "ativo").length;
    const travados = items.filter((item) => item.status === "travado").length;
    const mediaProgresso =
      total > 0
        ? Number((items.reduce((acc, item) => acc + Number(item.progresso || 0), 0) / total).toFixed(0))
        : 0;

    return {
      total,
      ativos,
      travados,
      mediaProgresso,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Alfabetizandos</h1>
        <p className="text-sm text-gray-600 mt-1">Lista de alfabetizandos vinculados ao seu perfil</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Ativos</p>
          <p className="text-2xl font-bold text-gray-900">{summary.ativos}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Travados</p>
          <p className="text-2xl font-bold text-gray-900">{summary.travados}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Média de Progresso</p>
          <p className="text-2xl font-bold text-gray-900">{summary.mediaProgresso}%</p>
        </div>
      </div>

      <form onSubmit={onCreateStudent} className="border border-gray-300 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Cadastrar alfabetizando</p>
            <p className="text-xs text-gray-600">
              O vínculo é criado automaticamente com você como alfabetizador responsável.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={createForm.nome}
            onChange={(event) => setCreateForm((current) => ({ ...current, nome: event.target.value }))}
            placeholder="Nome completo *"
            className="border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={createForm.cpf}
            onChange={(event) => setCreateForm((current) => ({ ...current, cpf: applyCpfMask(event.target.value) }))}
            placeholder="CPF * (000.000.000-00)"
            maxLength={14}
            className="border border-gray-300 px-3 py-2 text-sm"
            required
          />
          <input
            value={createForm.telefone}
            onChange={(event) => setCreateForm((current) => ({ ...current, telefone: applyPhoneMask(event.target.value) }))}
            placeholder="(00) 00000-0000"
            maxLength={15}
            className="border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer select-none">Opções avançadas (email e senha de acesso)</summary>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={createForm.email}
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email (deixe em branco para gerar automaticamente)"
              className="border border-gray-300 px-3 py-2 text-sm"
              type="email"
            />
            <input
              value={createForm.password}
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Senha (mínimo 6 caracteres ou gerar automaticamente)"
              className="border border-gray-300 px-3 py-2 text-sm"
              type="text"
            />
          </div>
        </details>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Cadastrando..." : "Cadastrar alfabetizando"}
          </button>
          {createMessage ? (
            <span className="text-xs text-emerald-700">{createMessage}</span>
          ) : null}
        </div>
      </form>

      <div className="border border-gray-300 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Buscar</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, grupo, etapa..."
            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm"
          >
            <option value="">Todos</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-300 bg-white">
        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : filteredItems.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum alfabetizando para os filtros aplicados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">% Progresso</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Última atividade</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.grupo || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.etapa}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 border border-gray-300">
                          <div className="h-full bg-gray-900" style={{ width: `${item.progresso}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-10">{item.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.ultimaAtividade}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tutor/alfabetizandos/${item.id}`}
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
        )}
      </div>
    </div>
  );
}
