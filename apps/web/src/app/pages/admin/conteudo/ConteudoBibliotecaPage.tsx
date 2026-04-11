import { FormEvent, useMemo, useState } from "react";
import { Ellipsis, FileAudio2, FileImage, FileVideo, FolderPlus, Upload, ChevronRight } from "lucide-react";
import StateDisplay from "../../../components/StateDisplay";
import { assetKindLabel, assetStatusLabel, formatDate, formatBytes, inferAssetKindFromFile } from "./cmsUtils";
import { AssetKind, AssetStatus } from "./cmsTypes";
import { useConteudoData } from "./useConteudoData";

function assetIcon(kind: AssetKind) {
  if (kind === "mp4") return <FileVideo className="h-5 w-5 text-slate-600" />;
  if (kind === "mp3") return <FileAudio2 className="h-5 w-5 text-slate-600" />;
  return <FileImage className="h-5 w-5 text-slate-600" />;
}

const MIME_BY_KIND: Record<AssetKind, string> = {
  mp4: "video/mp4",
  mp3: "audio/mpeg",
  png: "image/png",
  jpg: "image/jpeg",
};

export default function ConteudoBibliotecaPage() {
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    createTheme,
    uploadAsset,
    saveAssetLink,
    cmsActivities,
    modulesById,
    themesById,
  } = useConteudoData();

  const [filterKind, setFilterKind] = useState<"all" | AssetKind>("all");
  const [newFolder, setNewFolder] = useState("");
  const [activityId, setActivityId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [manualKind, setManualKind] = useState<AssetKind>("mp4");
  const [status, setStatus] = useState<AssetStatus>("rascunho");

  const filteredAssets = useMemo(() => {
    if (filterKind === "all") {
      return data.assets;
    }
    return data.assets.filter((item) => item.kind === filterKind);
  }, [data.assets, filterKind]);

  const folders = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();

    for (const asset of data.assets) {
      const activity = data.activities.find((item) => item.id === asset.activity_id);
      const moduleItem = activity ? modulesById.get(activity.module_id) : null;
      const theme = moduleItem ? themesById.get(moduleItem.theme_id) : null;
      const key = theme?.id || "sem-tema";
      const title = theme?.title || "Geral";
      const current = map.get(key) ?? { title, count: 0 };
      current.count += 1;
      map.set(key, current);
    }

    return [...map.entries()].map(([id, item]) => ({ id, ...item }));
  }, [data.activities, data.assets, modulesById, themesById]);

  const onCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newFolder.trim();
    if (!title) {
      return;
    }
    const created = await createTheme({ title });
    if (created) {
      setNewFolder("");
    }
  };

  const onSendFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activityId) {
      return;
    }

    if (file) {
      const guessedKind = inferAssetKindFromFile(file) ?? manualKind;
      const uploaded = await uploadAsset({
        activityId,
        file,
        kind: guessedKind,
        status,
      });
      if (uploaded) {
        setFile(null);
        setManualUrl("");
      }
      return;
    }

    const url = manualUrl.trim();
    if (!url) {
      return;
    }

    const saved = await saveAssetLink({
      activityId,
      kind: manualKind,
      status,
      storagePath: url,
      mimeType: MIME_BY_KIND[manualKind],
      metadata: { source: "manual-link" },
    });

    if (saved) {
      setManualUrl("");
    }
  };

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
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Biblioteca de Midias</h1>
          <p className="mt-2 text-sm text-slate-600">Organize seus arquivos em pastas por tema ou assunto.</p>
        </div>
        <div className="flex gap-2">
          <form onSubmit={onCreateFolder} className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2">
            <FolderPlus className="h-4 w-4 text-slate-600" />
            <input
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              placeholder="Nova pasta"
              className="w-36 bg-transparent text-sm outline-none"
            />
            <button type="submit" className="text-xs font-semibold text-slate-800">Salvar</button>
          </form>
          <button
            type="submit"
            form="upload-midias-form"
            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Upload className="h-4 w-4" />
            Enviar arquivo
          </button>
        </div>
      </div>

      {feedback ? (
        <div className={`border px-4 py-3 text-sm ${feedback.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}>
          {feedback.text}
        </div>
      ) : null}

      <section className="space-y-3">
        <p className="text-xl font-semibold text-slate-900">Pastas</p>
        {folders.length === 0 ? (
          <StateDisplay type="empty" message="Sem pastas de midia ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center justify-between border border-slate-300 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
                    <FolderPlus className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{folder.title}</p>
                    <p className="text-sm text-slate-600">{folder.count} arquivo(s)</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </section>

      <form id="upload-midias-form" onSubmit={onSendFile} className="space-y-3 border border-slate-300 bg-white p-4">
        <p className="text-lg font-semibold text-slate-900">Upload rapido</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            value={activityId}
            onChange={(event) => setActivityId(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Selecione a atividade</option>
            {cmsActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.title}
              </option>
            ))}
          </select>
          <select value={manualKind} onChange={(event) => setManualKind(event.target.value as AssetKind)} className="border border-slate-300 px-3 py-2 text-sm">
            <option value="mp4">Video</option>
            <option value="mp3">Audio</option>
            <option value="png">Imagem PNG</option>
            <option value="jpg">Imagem JPG</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="border border-slate-300 px-3 py-2 text-sm">
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <input
            type="file"
            accept=".mp4,.mp3,.png,.jpg,.jpeg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <input
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="Opcional: URL manual para arquivo ja hospedado"
          className="w-full border border-slate-300 px-3 py-2 text-sm"
        />
        {file ? (
          <p className="text-xs text-slate-500">Selecionado: {file.name} ({formatBytes(file.size)})</p>
        ) : null}
        <p className="text-xs text-slate-500">{busy ? "Processando upload..." : ""}</p>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-slate-900">Todos os arquivos ({filteredAssets.length})</p>
          <select value={filterKind} onChange={(event) => setFilterKind(event.target.value as "all" | AssetKind)} className="border border-slate-300 px-3 py-2 text-sm bg-white">
            <option value="all">Todos os tipos</option>
            <option value="mp4">Videos</option>
            <option value="mp3">Audios</option>
            <option value="png">Imagem PNG</option>
            <option value="jpg">Imagem JPG</option>
          </select>
        </div>
        {filteredAssets.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum arquivo para o filtro selecionado." />
        ) : (
          <div className="overflow-hidden border border-slate-300 bg-white">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-slate-300 bg-slate-100">
                    {assetIcon(asset.kind)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{asset.storage_path.split("/").pop() || assetKindLabel(asset.kind)}</p>
                    <p className="text-sm text-slate-600">{assetKindLabel(asset.kind)} • {formatDate(asset.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`border px-2 py-1 text-xs ${asset.status === "publicado" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : asset.status === "rascunho" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
                    {assetStatusLabel(asset.status)}
                  </span>
                  <button type="button" className="p-1 text-slate-600 hover:bg-slate-100">
                    <Ellipsis className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
