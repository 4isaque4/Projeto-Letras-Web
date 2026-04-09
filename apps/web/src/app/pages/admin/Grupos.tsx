import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Users, AlertTriangle } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

interface GroupItem {
  id: string;
  nome: string;
  membros: number;
  etapaMedia: string;
  tutor: string;
  status: string;
}

interface GroupsResponse {
  total: number;
  items: GroupItem[];
}

export default function Grupos() {
  const [items, setItems] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const response = (await apiGet("/painel/grupos")) as GroupsResponse;
      setItems(response.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar grupos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const summary = useMemo(() => {
    const totalMembros = items.reduce((acc, item) => acc + item.membros, 0);
    const gruposAvancados = items.filter((item) => item.status === "avancado").length;
    return {
      totalMembros,
      gruposAvancados,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T8. Grupos</h1>
          <p className="text-sm text-gray-600 mt-1">Visao consolidada dos grupos de alfabetizacao</p>
        </div>
        <button
          onClick={loadGroups}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-100 flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total de grupos</p>
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Total de membros</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalMembros}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Grupos avancados</p>
          <p className="text-2xl font-bold text-gray-900">{summary.gruposAvancados}</p>
        </div>
      </div>

      <div className="border border-gray-300 bg-white">
        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : items.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum grupo encontrado." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {items.map((group) => (
              <div key={group.id} className="border border-gray-300 bg-white p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-gray-300 bg-gray-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{group.nome}</h3>
                      <p className="text-xs text-gray-500">{group.membros} membros</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Etapa media</span>
                    <span className="text-gray-900 font-medium">{group.etapaMedia}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">Tutor responsavel</span>
                    <span className="text-gray-900 font-medium">{group.tutor || "Sem tutor"}</span>
                  </div>
                </div>

                {group.status === "avancado" && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-300">
                    <AlertTriangle className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-yellow-900">Grupo avancado</p>
                      <p className="text-xs text-yellow-700">Entrada de novos membros deve ser validada.</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
