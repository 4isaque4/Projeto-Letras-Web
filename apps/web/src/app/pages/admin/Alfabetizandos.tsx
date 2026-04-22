import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import StateDisplay from "../../components/StateDisplay";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../core/api/client";

interface StudentItem {
  id: string;
  nome: string;
  email: string;
  grupo: string;
  etapa: string;
  progresso: number;
  status: string;
  ultimaAtividade: string;
  tutorNome: string;
  telefone: string;
  cpf: string;
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

interface StudentEditForm {
  nome: string;
  email: string;
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

export default function Alfabetizandos() {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [createForm, setCreateForm] = useState<StudentCreateForm>(EMPTY_CREATE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StudentEditForm>({ nome: "", email: "", telefone: "", cpf: "" });

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet("/cadastros/alfabetizandos")) as StudentsResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar alfabetizandos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const onCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = createForm.nome.trim();
    const email = createForm.email.trim();
    const password = createForm.password.trim();

    if (!nome || !email || !password) {
      setError("Preencha nome, email e senha para criar um alfabetizando.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await apiPost("/cadastros/alfabetizandos", {
        nome,
        email,
        password,
        phone: createForm.telefone.trim() || undefined,
        cpf: createForm.cpf.trim() || undefined,
      });

      setCreateForm(EMPTY_CREATE_FORM);
      await loadStudents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar alfabetizando.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: StudentItem) => {
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
      setError("Nome do alfabetizando e obrigatorio.");
      return;
    }
    if (!email) {
      setError("Email do alfabetizando e obrigatorio.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await apiPatch(`/cadastros/alfabetizandos/${itemId}`, {
        nome,
        email,
        phone: editForm.telefone.trim() || null,
        cpf: editForm.cpf.trim() || null,
      });
      cancelEdit();
      await loadStudents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar alfabetizando.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: StudentItem) => {
    const confirmed = window.confirm(`Deseja realmente excluir o alfabetizando '${item.nome}'?`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      setError("");
      await apiDelete(`/cadastros/alfabetizandos/${item.id}`);
      if (editingId === item.id) {
        cancelEdit();
      }
      await loadStudents();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao excluir alfabetizando.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T4. Lista de Alfabetizandos</h1>
        <p className="text-sm text-gray-600 mt-1">Gestao de todos os alunos do sistema</p>
      </div>

      <form onSubmit={onCreateStudent} className="border border-gray-300 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">Criar alfabetizando</p>
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
          {saving ? "Salvando..." : "Criar alfabetizando"}
        </button>
      </form>

      <div className="border border-gray-300 bg-white">
        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : items.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum alfabetizando cadastrado ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Progresso</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ultima atividade</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {editingId === aluno.id ? (
                        <input
                          value={editForm.nome}
                          onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        aluno.nome
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === aluno.id ? (
                        <input
                          value={editForm.email}
                          onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        aluno.email || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{aluno.tutorNome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{aluno.grupo || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{aluno.etapa}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 border border-gray-300">
                          <div className="h-full bg-gray-900" style={{ width: `${aluno.progresso}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 w-10">{aluno.progresso}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{aluno.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === aluno.id ? (
                        <input
                          value={editForm.telefone}
                          onChange={(event) => setEditForm((current) => ({ ...current, telefone: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        aluno.telefone || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {editingId === aluno.id ? (
                        <input
                          value={editForm.cpf}
                          onChange={(event) => setEditForm((current) => ({ ...current, cpf: event.target.value }))}
                          className="w-full border border-gray-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        aluno.cpf || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{aluno.ultimaAtividade}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {editingId === aluno.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onSaveEdit(aluno.id)}
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
                            <Link
                              to={`/admin/alfabetizandos/${aluno.id}`}
                              className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100 inline-block"
                            >
                              Ver detalhes
                            </Link>
                            <button
                              type="button"
                              onClick={() => startEdit(aluno)}
                              className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(aluno)}
                              disabled={deletingId === aluno.id}
                              className="px-3 py-1 text-xs border border-red-300 bg-red-50 text-red-700 disabled:opacity-60"
                            >
                              {deletingId === aluno.id ? "Excluindo..." : "Excluir"}
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

