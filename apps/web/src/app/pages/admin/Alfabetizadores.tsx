import { useEffect, useState } from "react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

interface TutorItem {
  id: string;
  nome: string;
  telefone: string;
  alunos: number;
  travados: number;
  pontuacao: number;
}

interface TutorsResponse {
  total: number;
  items: TutorItem[];
}

export default function Alfabetizadores() {
  const [items, setItems] = useState<TutorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await apiGet("/cadastros/alfabetizadores")) as TutorsResponse;
        if (!active) {
          return;
        }
        setItems(response.items ?? []);
      } catch (fetchError) {
        if (!active) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar alfabetizadores.");
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
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T6. Alfabetizadores</h1>
        <p className="text-sm text-gray-600 mt-1">Gestao de tutores e desempenho</p>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700"># Alunos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Travados</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontuacao</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tutor) => (
                  <tr key={tutor.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{tutor.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tutor.telefone || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tutor.alunos}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tutor.travados}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {Number(tutor.pontuacao).toFixed(2)}
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

