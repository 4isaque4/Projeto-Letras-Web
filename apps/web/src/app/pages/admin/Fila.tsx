import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch } from "../../core/api/client";
import { useRealtimeStatus } from "../../core/realtime/useRealtimeStatus";

interface QueueItem {
  id: string;
  queueType?: "vinculo" | "progresso" | "ajuda" | string;
  tipo: string;
  aluno: string;
  etapa: string;
  atividade: string;
  status: string;
  tempo: string;
  prioridade: string;
  mensagem?: string;
  studentId?: string;
  activityId?: string;
}

interface QueueResponse {
  total: number;
  items: QueueItem[];
}

export default function Fila() {
  const realtime = useRealtimeStatus();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadQueue = useCallback(async (options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
        setError("");
      }
      const response = (await apiGet("/painel/fila")) as QueueResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      if (!options.silent) {
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar fila.");
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!realtime.lastOperationalEventAt) {
      return;
    }

    void loadQueue({ silent: true });
  }, [loadQueue, realtime.lastOperationalEventAt]);

  const typeOptions = useMemo(() => {
    return [...new Set(items.map((item) => item.tipo).filter(Boolean))];
  }, [items]);

  const statusOptions = useMemo(() => {
    return [...new Set(items.map((item) => item.status).filter(Boolean))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchQuery =
        !needle ||
        [item.aluno, item.tipo, item.etapa, item.atividade].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(needle),
        );

      const matchType = !typeFilter || item.tipo === typeFilter;
      const matchStatus = !statusFilter || item.status === statusFilter;

      return matchQuery && matchType && matchStatus;
    });
  }, [items, query, statusFilter, typeFilter]);

  const selectedItem = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return filteredItems.find((item) => item.id === selectedId) ?? null;
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (selectedId && !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    setActionReason("");
  }, [selectedId]);

  const runQueueAction = async (action: "confirmar" | "negar" | "desbloquear" | "resolver") => {
    if (!selectedItem) {
      return;
    }

    const mustProvideReason = action === "negar" || action === "desbloquear" || action === "resolver";
    if (mustProvideReason && actionReason.trim().length < 3) {
      setError("Informe uma observacao/motivo antes de concluir esta acao.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setActionMessage("");

      await apiPatch(`/painel/fila/${selectedItem.id}`, {
        action,
        reason: actionReason.trim() || undefined,
        responseMessage: action === "resolver" ? actionReason.trim() : undefined,
        decidedBy: "painel-web",
      });

      await loadQueue();
      setSelectedId("");
      setActionReason("");
      setActionMessage("Item atualizado com sucesso.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Falha ao atualizar item da fila.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T9. Fila de Atendimento</h1>
          <p className="text-sm text-gray-600 mt-1">Pedidos e bloqueios preventivos em tempo real</p>
        </div>
        <button
          onClick={() => void loadQueue()}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-100 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>
      {actionMessage ? (
        <div className="border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="border border-gray-300 bg-white p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Buscar</label>
          <div className="border border-gray-300 bg-gray-50 px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Aluno, etapa, atividade..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Tipo</label>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm"
          >
            <option value="">Todos</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

      <div className="flex gap-4">
        <div className={`${selectedItem ? "w-2/3" : "w-full"} transition-all`}>
          <div className="border border-gray-300 bg-white">
            {loading ? (
              <StateDisplay type="loading" />
            ) : error ? (
              <StateDisplay type="error" message={error} />
            ) : filteredItems.length === 0 ? (
              <StateDisplay type="empty" message="Nenhum item na fila com os filtros aplicados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa/Atividade</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tempo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                          selectedId === item.id ? "bg-gray-100" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.tipo}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.aluno}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>{item.etapa}</div>
                          <div className="text-xs text-gray-500">{item.atividade}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.tempo}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.prioridade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedItem && (
          <div className="w-1/3 border border-gray-300 bg-white">
            <div className="p-4 border-b border-gray-300 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Detalhe do Item</h3>
              <button onClick={() => setSelectedId("")} className="p-1 hover:bg-gray-100 border border-transparent">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Aluno</p>
                <p className="text-sm font-bold text-gray-900">{selectedItem.aluno}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                <p className="text-sm text-gray-900">{selectedItem.tipo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Etapa</p>
                <p className="text-sm text-gray-900">{selectedItem.etapa}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Atividade</p>
                <p className="text-sm text-gray-900">{selectedItem.atividade}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-sm text-gray-900">{selectedItem.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Prioridade</p>
                <p className="text-sm text-gray-900">{selectedItem.prioridade}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tempo aberto</p>
                <p className="text-sm text-gray-900">{selectedItem.tempo}</p>
              </div>
              {selectedItem.mensagem ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mensagem</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedItem.mensagem}</p>
                </div>
              ) : null}
              {(selectedItem.queueType === "vinculo" ||
                selectedItem.queueType === "progresso" ||
                selectedItem.queueType === "ajuda") ? (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Observacao / motivo
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    rows={3}
                    placeholder="Explique brevemente a acao tomada..."
                    className="w-full border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
              ) : null}
              {selectedItem.queueType === "vinculo" ? (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => void runQueueAction("confirmar")}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 text-sm font-semibold border border-emerald-600 bg-emerald-600 text-white disabled:opacity-60"
                  >
                    {actionLoading ? "Processando..." : "Confirmar vinculo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void runQueueAction("negar")}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 text-sm font-semibold border border-red-600 bg-white text-red-700 disabled:opacity-60"
                  >
                    {actionLoading ? "Processando..." : "Negar vinculo"}
                  </button>
                </div>
              ) : null}
              {selectedItem.queueType === "progresso" ? (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => void runQueueAction("desbloquear")}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 text-sm font-semibold border border-gray-900 bg-gray-900 text-white disabled:opacity-60"
                  >
                    {actionLoading ? "Processando..." : "Desbloquear aluno"}
                  </button>
                </div>
              ) : null}
              {selectedItem.queueType === "ajuda" ? (
                <div className="pt-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => void runQueueAction("resolver")}
                    disabled={actionLoading}
                    className="w-full px-3 py-2 text-sm font-semibold border border-gray-900 bg-gray-900 text-white disabled:opacity-60"
                  >
                    {actionLoading ? "Processando..." : "Marcar ajuda como atendida"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
