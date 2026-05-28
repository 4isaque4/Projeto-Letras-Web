import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet } from "../../core/api/client";

interface InatividadeItem {
  id: string;
  aluno: string;
  tutor: string;
  ultimoAcesso: string;
  diasInativo: number;
  etapa: string;
}

interface InatividadeResponse {
  resumo: {
    inatividade: number;
    evolucaoPorEtapa: number;
    taxaAcerto: number;
    tempoResposta: number;
  };
  items: InatividadeItem[];
}

const EMPTY_RESPONSE: InatividadeResponse = {
  resumo: {
    inatividade: 0,
    evolucaoPorEtapa: 0,
    taxaAcerto: 0,
    tempoResposta: 0,
  },
  items: [],
};

function toCsvValue(value: string | number) {
  const normalized = String(value ?? "").replaceAll('"', '""');
  return `"${normalized}"`;
}

export default function Relatorios() {
  const [response, setResponse] = useState<InatividadeResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [minimumDays, setMinimumDays] = useState<number>(3);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const payload = (await apiGet("/painel/relatorios/inatividade")) as InatividadeResponse;
      setResponse({
        resumo: payload.resumo ?? EMPTY_RESPONSE.resumo,
        items: payload.items ?? [],
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar relatorios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const filteredItems = useMemo(() => {
    return response.items.filter((item) => item.diasInativo >= minimumDays);
  }, [minimumDays, response.items]);

  const exportCsv = () => {
    if (filteredItems.length === 0) {
      return;
    }

    const header = ["Aluno", "Tutor", "UltimoAcesso", "DiasInativo", "Etapa"];
    const rows = filteredItems.map((item) => [
      toCsvValue(item.aluno),
      toCsvValue(item.tutor),
      toCsvValue(item.ultimoAcesso),
      toCsvValue(item.diasInativo),
      toCsvValue(item.etapa),
    ]);

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "relatorio-inatividade.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-600 mt-1">Análise de inatividade para gestão de apoio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadReport}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-100 flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={exportCsv}
            disabled={filteredItems.length === 0}
            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Inatividade</p>
          <p className="text-2xl font-bold text-gray-900">{response.resumo.inatividade}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Evolucao por etapa</p>
          <p className="text-2xl font-bold text-gray-900">{response.resumo.evolucaoPorEtapa}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Registros de taxa de acerto</p>
          <p className="text-2xl font-bold text-gray-900">{response.resumo.taxaAcerto}</p>
        </div>
        <div className="border border-gray-300 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Respostas de vinculo</p>
          <p className="text-2xl font-bold text-gray-900">{response.resumo.tempoResposta}</p>
        </div>
      </div>

      <div className="border border-gray-300 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-900">Filtro de inatividade</p>
          <p className="text-xs text-gray-600">Mostra apenas alfabetizandos com no minimo N dias sem interacao</p>
        </div>
        <select
          value={minimumDays}
          onChange={(event) => setMinimumDays(Number(event.target.value))}
          className="px-3 py-2 border border-gray-300 bg-gray-50 text-sm"
        >
          <option value={3}>3 dias</option>
          <option value={5}>5 dias</option>
          <option value={7}>7 dias</option>
          <option value={10}>10 dias</option>
          <option value={15}>15 dias</option>
        </select>
      </div>

      <div className="border border-gray-300 bg-white">
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-bold text-gray-900">Relatorio de Inatividade</h3>
          <p className="text-xs text-gray-600 mt-1">Alfabetizandos com necessidade de acompanhamento</p>
        </div>

        {loading ? (
          <StateDisplay type="loading" />
        ) : error ? (
          <StateDisplay type="error" message={error} />
        ) : filteredItems.length === 0 ? (
          <StateDisplay type="empty" message="Sem registros para o filtro selecionado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ultimo acesso</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Dias inativo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Etapa</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.aluno}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.tutor}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.ultimoAcesso}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.diasInativo} dias</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.etapa}</td>
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
