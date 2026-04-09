import { useEffect, useState } from "react";
import { Link } from "react-router";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

interface StudentItem {
  id: string;
  nome: string;
  grupo: string;
  etapa: string;
  progresso: number;
  status: string;
  ultimaAtividade: string;
  tutorNome: string;
}

interface StudentsResponse {
  total: number;
  items: StudentItem[];
}

export default function Alfabetizandos() {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await apiGet("/cadastros/alfabetizandos")) as StudentsResponse;
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
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T4. Lista de Alfabetizandos</h1>
        <p className="text-sm text-gray-600 mt-1">Gestao de todos os alunos do sistema</p>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Progresso</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ultima atividade</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((aluno) => (
                  <tr key={aluno.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{aluno.nome}</td>
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
                    <td className="px-4 py-3 text-sm text-gray-600">{aluno.ultimaAtividade}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/alfabetizandos/${aluno.id}`}
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

