import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";
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

export default function MeusAlfabetizandos() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setError("Tutor nao autenticado.");
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await apiGet(
          `/cadastros/alfabetizandos?tutorId=${encodeURIComponent(user.id)}`,
        )) as StudentsResponse;

        if (!active) {
          return;
        }

        setItems(response.items ?? []);
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar alfabetizandos.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [user?.id]);

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
          <p className="text-xs text-gray-500 mb-1">Media de Progresso</p>
          <p className="text-2xl font-bold text-gray-900">{summary.mediaProgresso}%</p>
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ultima atividade</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acoes</th>
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
