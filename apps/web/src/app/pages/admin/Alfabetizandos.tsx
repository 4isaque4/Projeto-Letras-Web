import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useConfirm } from "../../components/ConfirmDialog";
import StateDisplay from "../../components/StateDisplay";
import {
  apiDelete,
  apiDeleteWithBody,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from "../../core/api/client";
import LearnerLinkDialog from "./LearnerLinkDialog";

interface StudentItem {
  id: string;
  nome: string;
  email: string;
  etapa: string;
  progresso: number;
  status: string;
  ultimaAtividade: string;
  tutorNome: string;
  tutorId: string | null;
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
  educatorId: string;
}

interface TutorItem {
  id: string;
  nome: string;
}

interface StudentEditForm {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

function applyCpfMask(value: string): string {
  if (/[a-z]/i.test(value)) {
    return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 20);
  }
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function isValidDocument(document: string): boolean {
  const normalized = document.trim();
  if (/[a-z]/i.test(normalized)) {
    return /^[a-z0-9]{6,20}$/i.test(normalized.replace(/[^a-z0-9]/gi, ""));
  }
  return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(normalized);
}

function applyPhoneMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length === 11;
}

const EMPTY_CREATE_FORM: StudentCreateForm = {
  nome: "",
  email: "",
  password: "",
  telefone: "",
  cpf: "",
  educatorId: "",
};

export default function Alfabetizandos() {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [tutors, setTutors] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState("");
  const [createForm, setCreateForm] =
    useState<StudentCreateForm>(EMPTY_CREATE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StudentEditForm>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
  });
  const [linkEditingId, setLinkEditingId] = useState<string | null>(null);
  const [linkTutorId, setLinkTutorId] = useState("");
  const [linkReason, setLinkReason] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet(
        "/cadastros/alfabetizandos",
      )) as StudentsResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Falha ao carregar alfabetizandos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    void apiGet("/cadastros/alfabetizadores")
      .then((response) => {
        const payload = response as { items?: TutorItem[] };
        setTutors(payload.items ?? []);
      })
      .catch(() => setTutors([]));
  }, [loadStudents]);

  const onCreateStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nome = createForm.nome.trim();
    const emailInformado = createForm.email.trim();
    const senhaInformada = createForm.password.trim();
    const document = createForm.cpf.trim();
    const telefone = createForm.telefone.trim();

    if (!nome || !document || !telefone || !createForm.educatorId) {
      setError("Preencha nome, CPF ou passaporte, celular e alfabetizador responsável.");
      return;
    }
    if (!isValidDocument(document)) {
      setError("Informe um CPF válido ou passaporte com 6 a 20 caracteres.");
      return;
    }
    if (!isValidPhone(telefone)) {
      setError("Informe um celular válido com DDD e 11 dígitos.");
      return;
    }
    if (emailInformado && !emailInformado.includes("@")) {
      setError("Informe um email válido ou deixe o campo em branco.");
      return;
    }
    if (senhaInformada && senhaInformada.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres ou ficar em branco.");
      return;
    }

    const identifier = document.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const email = emailInformado || `aluno.${identifier}@mobile.letras.local`;
    const password = senhaInformada || `Letras@${identifier}`;

    try {
      setSaving(true);
      setError("");
      await apiPost("/cadastros/alfabetizandos", {
        nome,
        email,
        password,
        phone: telefone,
        cpf: document,
        educatorId: createForm.educatorId,
      });

      setCreateForm(EMPTY_CREATE_FORM);
      await loadStudents();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao criar alfabetizando.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveLink = async (studentId: string) => {
    if (!linkTutorId || !linkReason.trim()) {
      setError("Selecione o alfabetizador e informe o motivo da alteração.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await apiPut(`/cadastros/alfabetizandos/${studentId}/vinculo`, {
        tutorId: linkTutorId,
        reason: linkReason.trim(),
      });
      setLinkEditingId(null);
      setLinkReason("");
      await loadStudents();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao alterar vínculo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (student: StudentItem) => {
    const reason = linkReason.trim();
    if (!reason) {
      setError("Informe o motivo para remover o vínculo.");
      return;
    }
    const accepted = await confirm({
      title: "Remover vínculo",
      message: `Remover o vínculo de ${student.nome}? O histórico será preservado.`,
      confirmLabel: "Remover vínculo",
      variant: "danger",
    });
    if (!accepted) return;
    try {
      setSaving(true);
      setError("");
      await apiDeleteWithBody(
        `/cadastros/alfabetizandos/${student.id}/vinculo`,
        { reason },
      );
      setLinkEditingId(null);
      setLinkReason("");
      await loadStudents();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao remover vínculo.",
      );
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
      setError("Nome do alfabetizando e obrigatório.");
      return;
    }
    if (email && !email.includes("@")) {
      setError("Email do alfabetizando invalido.");
      return;
    }
    const cpf = editForm.cpf.trim();
    const telefone = editForm.telefone.trim();
    if (!isValidDocument(cpf)) {
      setError("Informe um CPF válido ou passaporte com 6 a 20 caracteres.");
      return;
    }
    if (!isValidPhone(telefone)) {
      setError("Informe um celular válido com DDD e 11 dígitos.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const payload: Record<string, string | null> = {
        nome,
        phone: telefone,
        cpf,
      };
      if (email) {
        payload.email = email;
      }

      await apiPatch(`/cadastros/alfabetizandos/${itemId}`, payload);
      cancelEdit();
      await loadStudents();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao atualizar alfabetizando.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (item: StudentItem) => {
    const confirmed = await confirm({
      title: "Excluir alfabetizando",
      message: `Excluir "${item.nome}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
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
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao excluir alfabetizando.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alfabetizandos</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gestão de todos os alunos do sistema
        </p>
      </div>

      <form
        onSubmit={onCreateStudent}
        className="border border-gray-300 bg-white p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-900">
          Criar alfabetizando
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={createForm.nome}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                nome: event.target.value,
              }))
            }
            placeholder="Nome"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.email}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="Email (opcional)"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.password}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="Senha (opcional)"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.telefone}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                telefone: applyPhoneMask(event.target.value),
              }))
            }
            placeholder="(00) 00000-0000"
            maxLength={15}
            aria-label="Celular do alfabetizando"
            required
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={createForm.cpf}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                cpf: applyCpfMask(event.target.value),
              }))
            }
            placeholder="CPF ou passaporte"
            maxLength={20}
            aria-label="CPF ou passaporte do alfabetizando"
            required
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={createForm.educatorId}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                educatorId: event.target.value,
              }))
            }
            className="border border-gray-300 bg-white px-3 py-2 text-sm"
            aria-label="Alfabetizador responsável"
          >
            <option value="">Alfabetizador responsável</option>
            {tutors.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.nome}
              </option>
            ))}
          </select>
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
        ) : error && items.length === 0 ? (
          <StateDisplay type="error" message={error} />
        ) : items.length === 0 ? (
          <StateDisplay
            type="empty"
            message="Nenhum alfabetizando cadastrado ainda."
          />
        ) : (
          <div>
            {error ? (
              <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Tutor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Etapa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Progresso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Telefone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      CPF ou passaporte
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Última atividade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((aluno) => (
                    <tr
                      key={aluno.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {editingId === aluno.id ? (
                          <input
                            value={editForm.nome}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                nome: event.target.value,
                              }))
                            }
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
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                            className="w-full border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          aluno.email || "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {aluno.tutorNome || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {aluno.etapa}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 border border-gray-300">
                            <div
                              className="h-full bg-gray-900"
                              style={{ width: `${aluno.progresso}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-10">
                            {aluno.progresso}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {aluno.status}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {editingId === aluno.id ? (
                          <input
                            value={editForm.telefone}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                telefone: applyPhoneMask(event.target.value),
                              }))
                            }
                            placeholder="(00) 00000-0000"
                            maxLength={15}
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
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                cpf: applyCpfMask(event.target.value),
                              }))
                            }
                            placeholder="CPF ou passaporte"
                            maxLength={20}
                            className="w-full border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          aluno.cpf || "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {aluno.ultimaAtividade}
                      </td>
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
                                onClick={() => {
                                  setLinkEditingId(
                                    linkEditingId === aluno.id
                                      ? null
                                      : aluno.id,
                                  );
                                  setLinkTutorId(aluno.tutorId ?? "");
                                  setLinkReason("");
                                }}
                                className="px-3 py-1 text-xs border border-slate-500 text-slate-800 hover:bg-slate-100"
                              >
                                Alterar vínculo
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(aluno)}
                                disabled={deletingId === aluno.id}
                                className="px-3 py-1 text-xs border border-red-300 bg-red-50 text-red-700 disabled:opacity-60"
                              >
                                {deletingId === aluno.id
                                  ? "Excluindo..."
                                  : "Excluir"}
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
          </div>
        )}
      </div>
      {linkEditingId
        ? (() => {
            const learner = items.find((item) => item.id === linkEditingId);
            if (!learner) return null;
            return (
              <LearnerLinkDialog
                learnerName={learner.nome}
                currentTutorName={learner.tutorNome}
                currentTutorId={learner.tutorId}
                tutors={tutors}
                tutorId={linkTutorId}
                reason={linkReason}
                saving={saving}
                onTutorChange={setLinkTutorId}
                onReasonChange={setLinkReason}
                onClose={() => setLinkEditingId(null)}
                onSave={() => void saveLink(learner.id)}
                onRemove={() => void removeLink(learner)}
              />
            );
          })()
        : null}
    </div>
  );
}
