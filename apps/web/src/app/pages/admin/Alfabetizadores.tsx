import { FormEvent, useCallback, useEffect, useState } from "react";
import StateDisplay from "../../components/StateDisplay";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../core/api/client";

interface TutorItem {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  alunos: number;
  travados: number;
  pontuacao: number;
}

interface TutorsResponse {
  total: number;
  items: TutorItem[];
}

interface TutorCreateForm {
  nome: string;
  email: string;
  password: string;
  telefone: string;
  cpf: string;
}

interface TutorEditForm {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

const EMPTY_CREATE_FORM: TutorCreateForm = {
  nome: "",
  email: "",
  password: "",
  telefone: "",
  cpf: "",
};

export default function Alfabetizadores() {
  const [items, setItems] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [createForm, setCreateForm] = useState<TutorCreateForm>(EMPTY_CREATE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TutorEditForm>({ nome: "", email: "", telefone: "", cpf: "" });

  const loadTutors = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet("/cadastros/alfabetizadores")) as TutorsResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar alfabetizadores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTutors();
  }, [loadTutors]);

  const onCreateTutor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = createForm.nome.trim();
    const email = createForm.email.trim();
    const password = createForm.password.trim();

    if (!nome || !email || !password) {
      setError("Preencha nome, email e senha para criar um alfabetizador.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await apiPost("/cadastros/alfabetizadores", {
        nome,
        email,
        password,
        phone: createForm.telefone.trim() || undefined,
        cpf: createForm.cpf.trim() || undefined,
      });

      setCreateForm(EMPTY_CREATE_FORM);
      await loadTutors();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar alfabetizador.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: TutorItem) => {
    setEditingId(item.id);
    setEditForm({
      nome: item.nome,
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      cpf: item.cpf ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ nome: "", email: "", telefone: "", cpf: "" });
  };

  const onSaveEdit = async (itemId: string) => {
    const nome = editForm.nome.trim();
    const email = editForm.email.trim();
    if (!nome) {
      setError("Nome do alfabetizador e obrigatorio.");
      return;
    }
    if (!email) {
      setError("Email do alfabetizador e obrigatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await apiPatch(`/cadastros/alfabetizadores/${itemId}`, {
        nome,
        email,
        phone: editForm.telefone.trim() || null,
        cpf: editForm.cpf.trim() || null,
      });
      cancelEdit();
      await loadTutors();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar alfabetizador.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: TutorItem) => {
    const confirmed = window.confirm(`Deseja realmente excluir o alfabetizador '${item.nome}'?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      setError("");
      await apiDelete(`/cadastros/alfabetizadores/${item.id}`);
      if (editingId === item.id) {
        cancelEdit();
      }
      await loadTutors();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao excluir alfabetizador.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T6. Alfabetizadores</h1>
        <p className="text-sm text-gray-600 mt-1">Gestao de tutores e desempenho</p>
      </div>

      <form onSubmit={onCreateTutor} className="border border-gray-300 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Criar alfabetizador</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input
            value={createForm.nome}
            onChange={(event) => setCreateForm((current) => ({ ...current, nome: event.target.value }))}
            placeholder="Nome"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.email}
            onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.password}
            onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Senha"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.telefone}
            onChange={(event) => setCreateForm((current) => ({ ...current, telefone: event.target.value }))}
            placeholder="Telefone"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.cpf}
            onChange={(event) => setCreateForm((current) => ({ ...current, cpf: event.target.value }))}
            placeholder="CPF"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Criar alfabetizador"}
        </button>
      </form>

      <div className="border border-gray-300 bg-white">
        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : items.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum alfabetizador cadastrado ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700"># Alunos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Travados</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontuacao</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tutor) => (
                  <tr key={tutor.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {editingId === tutor.id ? (
                        <input
                          value={editForm.nome}
                          onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        tutor.nome
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === tutor.id ? (
                        <input
                          value={editForm.email}
                          onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        tutor.email || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === tutor.id ? (
                        <input
                          value={editForm.telefone}
                          onChange={(event) => setEditForm((current) => ({ ...current, telefone: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        tutor.telefone || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === tutor.id ? (
                        <input
                          value={editForm.cpf}
                          onChange={(event) => setEditForm((current) => ({ ...current, cpf: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        tutor.cpf || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tutor.alunos}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tutor.travados}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {Number(tutor.pontuacao).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {editingId === tutor.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onSaveEdit(tutor.id)}
                              disabled={saving}
                              className="px-3 py-1 text-xs border border-gray-900 bg-gray-900 text-white disabled:opacity-60"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(tutor)}
                              className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(tutor)}
                              disabled={deletingId === tutor.id}
                              className="px-3 py-1 text-xs border border-red-300 bg-red-50 text-red-700 disabled:opacity-60"
                            >
                              {deletingId === tutor.id ? "Excluindo..." : "Excluir"}
                            </button>
                          </>
                        )}
                      </div>
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

