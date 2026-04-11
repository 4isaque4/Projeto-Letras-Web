import { Folder, Layers, Plus, Upload, FileImage, FileAudio2, FileVideo, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { useConteudoData } from "./useConteudoData";
import { assetStatusLabel } from "./cmsUtils";

function iconByKind(kind: string) {
  if (kind === "mp4") return <FileVideo className="w-4 h-4 text-slate-600" />;
  if (kind === "mp3") return <FileAudio2 className="w-4 h-4 text-slate-600" />;
  return <FileImage className="w-4 h-4 text-slate-600" />;
}

export default function ConteudoDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useConteudoData();

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  const recentActivities = [...data.activities]
    .sort((a, b) => Number(b.sort_order ?? 0) - Number(a.sort_order ?? 0))
    .slice(0, 6);

  const recentAssets = data.assets.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Painel de conteudo</h1>
          <p className="mt-2 text-sm text-slate-600">Crie e organize as aulas do aplicativo Letras Educador.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/conteudo/nova-aula")}
          className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Criar nova aula
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border border-slate-300 bg-white p-4">
          <p className="text-3xl font-semibold text-slate-900">{data.totals.themes}</p>
          <p className="mt-1 text-sm text-slate-600">Temas criados</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="text-3xl font-semibold text-slate-900">{data.totals.modules}</p>
          <p className="mt-1 text-sm text-slate-600">Aulas montadas</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="text-3xl font-semibold text-slate-900">{data.totals.assets}</p>
          <p className="mt-1 text-sm text-slate-600">Midias enviadas</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="text-3xl font-semibold text-slate-900">{data.totals.blueprints}</p>
          <p className="mt-1 text-sm text-slate-600">Telas prontas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link to="/admin/conteudo/nova-aula" className="group flex items-center gap-3 border border-slate-300 bg-white p-4 hover:bg-slate-50">
          <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
            <Plus className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Criar nova aula</p>
            <p className="text-sm text-slate-600">Wizard passo a passo</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
        </Link>

        <Link to="/admin/conteudo/biblioteca" className="group flex items-center gap-3 border border-slate-300 bg-white p-4 hover:bg-slate-50">
          <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
            <Folder className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Biblioteca de midias</p>
            <p className="text-sm text-slate-600">Imagens, audios e videos</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
        </Link>

        <Link to="/admin/conteudo/importar-telas" className="group flex items-center gap-3 border border-slate-300 bg-white p-4 hover:bg-slate-50">
          <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
            <Upload className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Importar telas</p>
            <p className="text-sm text-slate-600">Trazer telas prontas</p>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="xl:col-span-2 border border-slate-300 bg-white">
          <div className="border-b border-slate-300 px-4 py-3">
            <h2 className="text-xl font-semibold text-slate-900">Aulas recentes</h2>
          </div>
          {recentActivities.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma aula criada ainda." />
          ) : (
            <ul>
              {recentActivities.map((activity) => (
                <li key={activity.id} className="flex items-center justify-between border-b border-slate-200 px-4 py-3 last:border-b-0">
                  <div>
                    <p className="font-medium text-slate-900">{activity.title}</p>
                    <p className="text-sm text-slate-600">{activity.type}</p>
                  </div>
                  <span className={`border px-2 py-1 text-xs font-medium ${activity.is_published ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
                    {activity.is_published ? "Publicada" : "Rascunho"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-slate-300 bg-white">
          <div className="border-b border-slate-300 px-4 py-3">
            <h2 className="text-xl font-semibold text-slate-900">Ultimas midias</h2>
          </div>
          {recentAssets.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma midia enviada ainda." />
          ) : (
            <ul>
              {recentAssets.map((asset) => (
                <li key={asset.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {iconByKind(asset.kind)}
                      <a href={asset.storage_path} target="_blank" rel="noreferrer" className="max-w-[180px] truncate text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
                        {asset.storage_path}
                      </a>
                    </div>
                    <span className="text-xs text-slate-500">{assetStatusLabel(asset.status)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="border border-slate-300 bg-white p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Integracao web para mobile</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Tudo que for cadastrado aqui alimenta o fluxo de conteudo do mobile. Use o wizard para vincular telas base, orientacoes e midias na mesma aula.
        </p>
      </section>
    </div>
  );
}
