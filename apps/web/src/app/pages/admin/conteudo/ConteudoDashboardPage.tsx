import { FormEvent, useState } from "react";
import {
  Folder,
  Layers,
  Plus,
  Upload,
  FileImage,
  FileAudio2,
  FileVideo,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { env } from "../../../core/config/env";
import { useConteudoData } from "./useConteudoData";
import {
  assetStatusLabel,
  formatBytes,
  getAssetDisplayName,
  inferAssetKindFromFile,
  resolvePublicAssetUrl,
} from "./cmsUtils";

function iconByKind(kind: string) {
  if (kind === "mp4") return <FileVideo className="w-4 h-4 text-slate-600" />;
  if (kind === "mp3") return <FileAudio2 className="w-4 h-4 text-slate-600" />;
  return <FileImage className="w-4 h-4 text-slate-600" />;
}

export default function ConteudoDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, busy, uploadAsset, cmsThemes, deleteActivity } = useConteudoData();
  const [uploadThemeId, setUploadThemeId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"rascunho" | "publicado" | "arquivado">(
    "publicado",
  );
  const [files, setFiles] = useState<File[]>([]);

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

  const onQuickUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedTheme = cmsThemes.find((theme) => theme.id === uploadThemeId) ?? null;
    if (files.length === 0 || !selectedTheme) {
      return;
    }

    const themeSlug = selectedTheme.slug?.trim() || selectedTheme.id;
    for (const file of files) {
      await uploadAsset({
        file,
        kind: inferAssetKindFromFile(file) ?? "png",
        status: uploadStatus,
        folder: `acervo/${themeSlug}`,
        metadata: {
          source: "dashboard-theme-upload",
          themeId: selectedTheme.id,
          themeTitle: selectedTheme.title,
          themeSlug,
        },
      });
    }

    setFiles([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Aulas e Mídias do App</h1>
          <p className="mt-2 text-sm text-slate-600">
            Monte as aulas que aparecem no aplicativo dos alfabetizandos e gerencie as mídias usadas nelas.
          </p>
        </div>
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

      <form onSubmit={onQuickUpload} className="space-y-3 border border-slate-300 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Upload de arquivos</p>
            <p className="text-sm text-slate-600">
              Envie imagens, audios e videos com deteccao automatica de formato, sempre vinculando ao tema.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy === "asset-upload" || files.length === 0 || !uploadThemeId}
            className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy === "asset-upload" ? "Enviando..." : `Enviar ${files.length || ""}`}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={uploadThemeId}
            onChange={(event) => setUploadThemeId(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecione o tema do upload</option>
            {cmsThemes.map((theme) => (
              <option key={`dashboard-upload-theme-${theme.id}`} value={theme.id}>
                {theme.title}
              </option>
            ))}
          </select>
          <select
            value={uploadStatus}
            onChange={(event) =>
              setUploadStatus(event.target.value as "rascunho" | "publicado" | "arquivado")
            }
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="publicado">Publicado</option>
            <option value="rascunho">Rascunho</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <input
            type="file"
            accept="image/*,audio/*,video/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {!uploadThemeId ? (
          <p className="text-xs text-slate-600">
            Selecione um tema antes de enviar os arquivos.
          </p>
        ) : null}

        {files.length > 0 ? (
          <div className="max-h-28 space-y-1 overflow-auto border border-slate-200 bg-slate-50 p-2">
            {files.map((file) => (
              <p key={`dashboard-file-${file.name}-${file.size}`} className="text-xs text-slate-600">
                {file.name} ({formatBytes(file.size)}) - {inferAssetKindFromFile(file) ?? "automatico"}
              </p>
            ))}
          </div>
        ) : null}
      </form>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="xl:col-span-2 border border-slate-300 bg-white">
          <div className="border-b border-slate-300 px-4 py-3">
            <h2 className="text-xl font-semibold text-slate-900">Aulas recentes</h2>
          </div>
          {recentActivities.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma aula criada ainda." />
          ) : (
            <ul>
              {recentActivities.map((activity) => {
                const isDeleting = busy === `activity-delete-${activity.id}`;
                return (
                  <li
                    key={activity.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{activity.title}</p>
                      <p className="text-sm text-slate-600">{activity.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`border px-2 py-1 text-xs font-medium ${
                          activity.is_published
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {activity.is_published ? "Publicada" : "Rascunho"}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/mobile/modulos#activity-${activity.id}`)}
                        title="Ver aula como no mobile"
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/conteudo/nova-aula?id=${activity.id}`)}
                        title="Editar aula no wizard"
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir a aula "${activity.title}"? Essa acao nao pode ser desfeita.`,
                            )
                          ) {
                            void deleteActivity(activity.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isDeleting ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </li>
                );
              })}
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
              {recentAssets.map((asset) => {
                const isImage = ["png", "jpg"].includes(asset.kind);
                const previewUrl = resolvePublicAssetUrl(asset.storage_path, env.supabaseUrl ?? "");
                const displayName = getAssetDisplayName(asset.storage_path) || asset.storage_path;
                return (
                  <li key={asset.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      {isImage && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={displayName}
                          className="h-12 w-12 shrink-0 rounded border border-slate-200 object-cover"
                          onError={(event) => {
                            event.currentTarget.style.visibility = "hidden";
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50">
                          {iconByKind(asset.kind)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={previewUrl || asset.storage_path}
                          target="_blank"
                          rel="noreferrer"
                          title={asset.storage_path}
                          className="block truncate text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
                        >
                          {displayName}
                        </a>
                        <p className="truncate text-[11px] uppercase text-slate-500">{asset.kind}</p>
                      </div>
                      <span className="text-xs text-slate-500">{assetStatusLabel(asset.status)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="border border-slate-300 bg-white p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-700" />
          <p className="font-semibold text-slate-900">Tudo que é publicado aqui aparece no app</p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Ao publicar uma aula, ela é sincronizada automaticamente com o aplicativo dos alfabetizandos. Use o wizard para vincular telas, orientações e mídias na mesma aula.
        </p>
      </section>
    </div>
  );
}


