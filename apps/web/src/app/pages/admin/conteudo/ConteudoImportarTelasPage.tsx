import { useMemo, useState } from "react";
import { ArrowLeft, FileText, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { useConteudoData } from "./useConteudoData";

export default function ConteudoImportarTelasPage() {
  const navigate = useNavigate();
  const { data, loading, error, busy, feedback, importManifest } = useConteudoData();
  const [manifestPath, setManifestPath] = useState("assets/mobile/etapa-1/manifest.json");

  const latestBlueprints = useMemo(() => data.blueprints.slice(0, 8), [data.blueprints]);

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Importar Telas Prontas</h1>
          <p className="mt-2 text-sm text-slate-600">Traga telas de aula ja preparadas para dentro do sistema.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/conteudo")}
          className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao painel
        </button>
      </div>

      {feedback ? (
        <div className={`border px-4 py-3 text-sm ${feedback.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {feedback.text}
        </div>
      ) : null}

      <section className="rounded-md border border-slate-300 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
            <HelpCircle className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">O que e isso?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Se a equipe preparou um arquivo com telas prontas, importe o manifest aqui. O sistema le o arquivo e cria ou atualiza as telas automaticamente.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Caso tenha duvidas, use o caminho padrao da pasta `assets/mobile/etapa-1`.
            </p>
          </div>
        </div>
      </section>

      <section className="border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-slate-300 bg-white">
          <FileText className="h-6 w-6 text-slate-600" />
        </div>
        <p className="mt-6 text-xl font-medium text-slate-900">Clique para escolher o arquivo de manifest</p>
        <p className="mt-2 text-sm text-slate-600">Ou informe manualmente o caminho abaixo</p>

        <div className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={manifestPath}
            onChange={(event) => setManifestPath(event.target.value)}
            placeholder="assets/mobile/etapa-1/manifest.json"
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => importManifest(manifestPath)}
            disabled={busy === "import"}
            className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === "import" ? "Importando..." : "Importar agora"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="border border-slate-300 bg-white p-4">
          <p className="inline-flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-semibold text-white">1</p>
          <p className="mt-2 font-semibold text-slate-900">Escolha o arquivo</p>
          <p className="text-sm text-slate-600">Selecione o manifest que recebeu.</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="inline-flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-semibold text-white">2</p>
          <p className="mt-2 font-semibold text-slate-900">Revisao automatica</p>
          <p className="text-sm text-slate-600">O sistema valida titulos, slug e caminhos de SVG.</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="inline-flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-semibold text-white">3</p>
          <p className="mt-2 font-semibold text-slate-900">Telas criadas</p>
          <p className="text-sm text-slate-600">As telas ficam prontas para uso no wizard.</p>
        </div>
      </section>

      <section className="border border-slate-300 bg-white">
        <div className="border-b border-slate-300 px-4 py-3">
          <h2 className="text-xl font-semibold text-slate-900">Ultimas telas importadas</h2>
        </div>
        {latestBlueprints.length === 0 ? (
          <StateDisplay type="empty" message="Nenhuma tela cadastrada ainda." />
        ) : (
          <ul>
            {latestBlueprints.map((blueprint) => (
              <li key={blueprint.id} className="border-b border-slate-200 px-4 py-3 text-sm last:border-b-0">
                <p className="font-semibold text-slate-900">{blueprint.title}</p>
                <p className="text-slate-600">{blueprint.svg_path}</p>
                <p className="text-xs text-slate-500">{blueprint.stage_tag || "Sem etapa"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
