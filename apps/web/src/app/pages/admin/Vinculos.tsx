import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";
import { apiGet, apiPatch } from "../../core/api/client";
import StateDisplay from "../../components/StateDisplay";

type TabKey = "pendentes" | "confirmados" | "negados";

interface LinkItem {
  id: string;
  aluno: string;
  cpf: string;
  telefone: string;
  tutor: string;
  data: string;
  motivo: string;
}

interface LinksResponse {
  pendentes: LinkItem[];
  confirmados: LinkItem[];
  negados: LinkItem[];
}

const EMPTY_LINKS: LinksResponse = {
  pendentes: [],
  confirmados: [],
  negados: [],
};

export default function Vinculos() {
  const [activeTab, setActiveTab] = useState<TabKey>("pendentes");
  const [links, setLinks] = useState<LinksResponse>(EMPTY_LINKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet("/cadastros/vinculos")) as LinksResponse;
      setLinks(response ?? EMPTY_LINKS);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar vinculos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = links[activeTab] ?? [];
    if (!needle) {
      return list;
    }

    return list.filter((item) =>
      [item.aluno, item.cpf, item.telefone, item.tutor].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [activeTab, links, query]);

  const updateLinkStatus = useCallback(
    async (id: string, status: "confirmado" | "negado") => {
      try {
        setUpdatingId(id);
        await apiPatch(`/cadastros/vinculos/${id}`, {
          status,
        });
        await loadLinks();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Falha ao atualizar vinculo.");
      } finally {
        setUpdatingId("");
      }
    },
    [loadLinks],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T7. Vinculos e Convites</h1>
        <p className="text-sm text-gray-600 mt-1">Gestao de solicitacoes de vinculo aluno-tutor</p>
      </div>

      <div className="flex items-center gap-2 border border-gray-300 bg-white px-4 py-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por CPF, telefone, tutor ou nome..."
          className="flex-1 text-sm focus:outline-none"
        />
      </div>

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
            Pendentes ({links.pendentes.length})
          </button>
          <button
            onClick={() => setActiveTab("confirmados")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "confirmados"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Confirmados ({links.confirmados.length})
          </button>
          <button
            onClick={() => setActiveTab("negados")}
            className={`flex-1 px-4 py-3 text-sm font-bold ${
              activeTab === "negados"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Negados ({links.negados.length})
          </button>
        </div>

        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : filtered.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum vinculo para os filtros aplicados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data</th>
                  {activeTab === "negados" && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Motivo</th>
                  )}
                  {activeTab === "pendentes" && (
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acoes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.cpf || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.telefone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.tutor || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.data || "-"}</td>
                    {activeTab === "negados" && (
                      <td className="px-4 py-3 text-sm text-gray-700">{item.motivo || "-"}</td>
                    )}
                    {activeTab === "pendentes" && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateLinkStatus(item.id, "confirmado")}
                            disabled={updatingId === item.id}
                            className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100 flex items-center gap-1 disabled:opacity-60"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Confirmar
                          </button>
                          <button
                            onClick={() => updateLinkStatus(item.id, "negado")}
                            disabled={updatingId === item.id}
                            className="px-3 py-1 text-xs border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 flex items-center gap-1 disabled:opacity-60"
                          >
                            <XCircle className="w-3 h-3" />
                            Negar
                          </button>
                        </div>
                      </td>
                    )}
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

