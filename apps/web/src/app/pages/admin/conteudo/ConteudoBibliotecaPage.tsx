import { FormEvent, useMemo, useState } from "react";
import {
  ChevronRight,
  FileAudio2,
  FileImage,
  FileVideo,
  FolderPlus,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import StateDisplay from "../../../components/StateDisplay";
import {
  assetKindLabel,
  assetStatusLabel,
  formatDate,
  formatBytes,
  inferAssetKindFromFile,
  inferAssetKindFromPath,
} from "./cmsUtils";
import { ActivityType, AssetKind, AssetStatus, Theme } from "./cmsTypes";
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

const DEFAULT_STAGE_TWO_DIRECTORY = "C:\\Projetos\\letras-mobile-ref\\docs\\Conteudos das telas";

function normalizeThemeSlug(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function resolveThemeUploadContext(themeId: string, themes: Theme[]) {
  const resolvedTheme = themes.find((item) => item.id === themeId) ?? null;
  const themeSlug = resolvedTheme?.slug?.trim() || normalizeThemeSlug(resolvedTheme?.title || "");

  if (!resolvedTheme || !themeSlug) {
    return {
      folder: "acervo",
      metadata: { source: "biblioteca-tema" } as Record<string, unknown>,
    };
  }

  return {
    folder: `acervo/${themeSlug}`,
    metadata: {
      source: "biblioteca-tema",
      themeId: resolvedTheme.id,
      themeTitle: resolvedTheme.title,
      themeSlug,
    } as Record<string, unknown>,
  };
}

export default function ConteudoBibliotecaPage() {
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    setFeedback,
    createTheme,
    createActivity,
    updateTheme,
    deleteTheme,
    updateModule,
    deleteModule,
    updateActivity,
    deleteActivity,
    uploadAsset,
    importAssetDirectory,
    saveAssetLink,
    updateAsset,
    deleteAsset,
    resetCmsContent,
    cmsThemes,
    cmsModules,
    cmsActivities,
    modulesById,
    themesById,
  } = useConteudoData();

  const [filterKind, setFilterKind] = useState<"all" | AssetKind>("all");
  const [newFolder, setNewFolder] = useState("");
  const [uploadThemeId, setUploadThemeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [status, setStatus] = useState<AssetStatus>("rascunho");
  const [importDirectoryPath, setImportDirectoryPath] = useState(DEFAULT_STAGE_TWO_DIRECTORY);
  const [importDirectoryThemeId, setImportDirectoryThemeId] = useState("");
  const [importDirectoryStatus, setImportDirectoryStatus] = useState<AssetStatus>("rascunho");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editAssetActivityId, setEditAssetActivityId] = useState("");
  const [editKind, setEditKind] = useState<AssetKind>("mp4");
  const [editStatus, setEditStatus] = useState<AssetStatus>("rascunho");
  const [editStoragePath, setEditStoragePath] = useState("");
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editThemeTitle, setEditThemeTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editModuleThemeId, setEditModuleThemeId] = useState("");
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editModuleDescription, setEditModuleDescription] = useState("");
  const [editModuleStageNumber, setEditModuleStageNumber] = useState(1);
  const [editModuleSortOrder, setEditModuleSortOrder] = useState(0);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActivityModuleId, setEditActivityModuleId] = useState("");
  const [editActivityTitle, setEditActivityTitle] = useState("");
  const [editActivityType, setEditActivityType] = useState<ActivityType>("video");
  const [editActivityInstructions, setEditActivityInstructions] = useState("");
  const [editActivitySortOrder, setEditActivitySortOrder] = useState(0);
  const [editActivityPublished, setEditActivityPublished] = useState(false);
  const [newActivityModuleId, setNewActivityModuleId] = useState("");
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityType, setNewActivityType] = useState<ActivityType>("video");
  const [newActivityInstructions, setNewActivityInstructions] = useState("");
  const [newActivitySortOrder, setNewActivitySortOrder] = useState(0);
  const [newActivityPublished, setNewActivityPublished] = useState(false);

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
      const metadata =
        asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
          ? (asset.metadata as Record<string, unknown>)
          : null;
      const metadataThemeId =
        metadata && typeof metadata.themeId === "string" ? metadata.themeId.trim() : "";
      const metadataThemeTitle =
        metadata && typeof metadata.themeTitle === "string" ? metadata.themeTitle.trim() : "";
      const key = theme?.id || metadataThemeId || "sem-tema";
      const title = theme?.title || metadataThemeTitle || "Acervo geral";
      const current = map.get(key) ?? { title, count: 0 };
      current.count += 1;
      map.set(key, current);
    }

    return [...map.entries()].map(([id, item]) => ({ id, ...item }));
  }, [data.activities, data.assets, modulesById, themesById]);

  const activityRows = useMemo(() => {
    return cmsActivities.map((activity) => {
      const moduleItem = modulesById.get(activity.module_id);
      const theme = moduleItem ? themesById.get(moduleItem.theme_id) : null;
      const assetsCount = data.assets.filter((asset) => asset.activity_id === activity.id).length;

      return {
        activity,
        moduleTitle: moduleItem?.title ?? "Modulo removido",
        themeTitle: theme?.title ?? "Tema removido",
        assetsCount,
      };
    });
  }, [cmsActivities, data.assets, modulesById, themesById]);

  const moduleRows = useMemo(() => {
    return cmsModules.map((moduleItem) => {
      const theme = themesById.get(moduleItem.theme_id);
      const activitiesCount = cmsActivities.filter((activity) => activity.module_id === moduleItem.id).length;

      return {
        moduleItem,
        themeTitle: theme?.title ?? "Tema removido",
        activitiesCount,
      };
    });
  }, [cmsActivities, cmsModules, themesById]);

  const onCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newFolder.trim();
    if (!title) {
      setFeedback({ type: "error", text: "Dê um nome ao tema antes de salvar (ex.: Animais, Comida, Profissões)." });
      return;
    }
    const created = await createTheme({ title });
    if (created) {
      setNewFolder("");
    }
  };

  const onSendFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const uploadContext = resolveThemeUploadContext(uploadThemeId, cmsThemes);

    if (file) {
      const guessedKind = inferAssetKindFromFile(file) ?? "png";
      const uploaded = await uploadAsset({
        file,
        kind: guessedKind,
        status,
        folder: uploadContext.folder,
        metadata: {
          ...uploadContext.metadata,
          uploadMode: "file",
        },
      });
      if (uploaded) {
        setFile(null);
        setManualUrl("");
      }
      return;
    }

    const url = manualUrl.trim();
    if (!url) {
      setFeedback({ type: "error", text: "Informe um arquivo ou uma URL para enviar." });
      return;
    }

    const inferredKind = inferAssetKindFromPath(url);
    if (!inferredKind) {
      setFeedback({
        type: "error",
        text: "Nao foi possivel detectar o tipo da URL. Use um link terminado em .png, .jpg, .mp3 ou .mp4.",
      });
      return;
    }

    const saved = await saveAssetLink({
      activityId: null,
      kind: inferredKind,
      status,
      storagePath: url,
      mimeType: MIME_BY_KIND[inferredKind],
      metadata: {
        ...uploadContext.metadata,
        source: "manual-link",
        uploadMode: "url",
      },
    });

    if (saved) {
      setManualUrl("");
    }
  };

  const startEditTheme = (themeId: string, title: string) => {
    setEditingThemeId(themeId);
    setEditThemeTitle(title);
  };

  const cancelEditTheme = () => {
    setEditingThemeId(null);
    setEditThemeTitle("");
  };

  const onSaveTheme = async (themeId: string) => {
    const nextTitle = editThemeTitle.trim();
    if (!nextTitle) {
      setFeedback({ type: "error", text: "Informe um nome valido para a pasta/tema." });
      return;
    }

    const saved = await updateTheme(themeId, { title: nextTitle });
    if (saved) {
      cancelEditTheme();
    }
  };

  const onDeleteTheme = async (themeId: string, title: string) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir o tema '${title}'? Essa acao remove tambem modulos, atividades e midias vinculadas.`,
    );
    if (!confirmed) {
      return;
    }

    const deleted = await deleteTheme(themeId);
    if (deleted && editingThemeId === themeId) {
      cancelEditTheme();
    }
  };

  const startEditModule = (moduleId: string) => {
    const moduleItem = cmsModules.find((item) => item.id === moduleId);
    if (!moduleItem) {
      return;
    }

    setEditingModuleId(moduleItem.id);
    setEditModuleThemeId(moduleItem.theme_id);
    setEditModuleTitle(moduleItem.title);
    setEditModuleDescription(moduleItem.description ?? "");
    setEditModuleStageNumber(moduleItem.stage_number ?? 1);
    setEditModuleSortOrder(moduleItem.sort_order ?? 0);
  };

  const cancelEditModule = () => {
    setEditingModuleId(null);
    setEditModuleThemeId("");
    setEditModuleTitle("");
    setEditModuleDescription("");
    setEditModuleStageNumber(1);
    setEditModuleSortOrder(0);
  };

  const onSaveModule = async (moduleId: string) => {
    if (!editModuleThemeId) {
      setFeedback({ type: "error", text: "Selecione um tema para o modulo." });
      return;
    }

    if (!editModuleTitle.trim()) {
      setFeedback({ type: "error", text: "Informe um titulo para o modulo." });
      return;
    }

    const saved = await updateModule({
      moduleId,
      themeId: editModuleThemeId,
      title: editModuleTitle.trim(),
      description: editModuleDescription.trim() || undefined,
      stageNumber: editModuleStageNumber,
      sortOrder: editModuleSortOrder,
    });

    if (saved) {
      cancelEditModule();
    }
  };

  const onDeleteModule = async (moduleId: string, title: string, activitiesCount: number) => {
    const message =
      activitiesCount > 0
        ? `O modulo '${title}' possui ${activitiesCount} atividade(s). Excluir agora remove tambem aulas e midias vinculadas. Deseja continuar?`
        : `Deseja realmente excluir o modulo '${title}'?`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    const deleted = await deleteModule(moduleId);
    if (deleted && editingModuleId === moduleId) {
      cancelEditModule();
    }
  };

  const startEditAsset = (assetId: string) => {
    const asset = data.assets.find((item) => item.id === assetId);
    if (!asset) return;
    setEditingAssetId(asset.id);
    setEditAssetActivityId(asset.activity_id ?? "");
    setEditKind(asset.kind);
    setEditStatus(asset.status);
    setEditStoragePath(asset.storage_path);
  };

  const cancelEditAsset = () => {
    setEditingAssetId(null);
    setEditAssetActivityId("");
    setEditKind("mp4");
    setEditStatus("rascunho");
    setEditStoragePath("");
  };

  const onSaveAsset = async (assetId: string) => {
    const saved = await updateAsset({
      assetId,
      activityId: editAssetActivityId.trim() || null,
      kind: editKind,
      status: editStatus,
      storagePath: editStoragePath.trim(),
      mimeType: MIME_BY_KIND[editKind],
      metadata: { source: "biblioteca-edit" },
    });
    if (saved) {
      cancelEditAsset();
    }
  };

  const onImportDirectory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const importContext = resolveThemeUploadContext(importDirectoryThemeId, cmsThemes);
    const imported = await importAssetDirectory({
      directoryPath: importDirectoryPath,
      activityId: null,
      status: importDirectoryStatus,
      folder: importContext.folder || "conteudo/importados-etapa-2",
      metadata: {
        ...importContext.metadata,
        source: "directory-import-stage2",
        uploadMode: "directory",
      },
    });

    if (imported) {
      setImportDirectoryThemeId("");
    }
  };

  const onDeleteAsset = async (assetId: string) => {
    const confirmed = window.confirm("Deseja realmente excluir esta midia? Essa acao nao pode ser desfeita.");
    if (!confirmed) return;
    await deleteAsset(assetId);
    if (editingAssetId === assetId) {
      cancelEditAsset();
    }
  };

  const startEditActivity = (activityId: string) => {
    const activity = cmsActivities.find((item) => item.id === activityId);
    if (!activity) {
      return;
    }

    setEditingActivityId(activity.id);
    setEditActivityModuleId(activity.module_id);
    setEditActivityTitle(activity.title);
    setEditActivityType(activity.type);
    setEditActivityInstructions(activity.instructions ?? "");
    setEditActivitySortOrder(activity.sort_order ?? 0);
    setEditActivityPublished(Boolean(activity.is_published));
  };

  const cancelEditActivity = () => {
    setEditingActivityId(null);
    setEditActivityModuleId("");
    setEditActivityTitle("");
    setEditActivityType("video");
    setEditActivityInstructions("");
    setEditActivitySortOrder(0);
    setEditActivityPublished(false);
  };

  const onSaveActivity = async (activityId: string) => {
    if (!editActivityModuleId) {
      setFeedback({ type: "error", text: "Selecione um modulo para a atividade." });
      return;
    }

    if (!editActivityTitle.trim()) {
      setFeedback({ type: "error", text: "Informe um titulo para a atividade." });
      return;
    }

    const saved = await updateActivity({
      activityId,
      moduleId: editActivityModuleId,
      title: editActivityTitle.trim(),
      type: editActivityType,
      instructions: editActivityInstructions.trim() || undefined,
      sortOrder: editActivitySortOrder,
      isPublished: editActivityPublished,
    });

    if (saved) {
      cancelEditActivity();
    }
  };

  const onDeleteActivity = async (activityId: string, title: string, assetsCount: number) => {
    const message =
      assetsCount > 0
        ? `A atividade '${title}' possui ${assetsCount} midia(s) vinculada(s). Excluir agora pode ocultar conteudo do mobile. Deseja continuar?`
        : `Deseja realmente excluir a atividade '${title}'?`;
    const confirmed = window.confirm(message);
    if (!confirmed) {
      return;
    }

    const deleted = await deleteActivity(activityId);
    if (deleted && editingActivityId === activityId) {
      cancelEditActivity();
    }
  };

  const onCreateActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newActivityModuleId) {
      setFeedback({ type: "error", text: "Selecione um modulo para criar a nova tela." });
      return;
    }

    if (!newActivityTitle.trim()) {
      setFeedback({ type: "error", text: "Informe um titulo para a nova tela." });
      return;
    }

    const created = await createActivity({
      moduleId: newActivityModuleId,
      title: newActivityTitle.trim(),
      type: newActivityType,
      instructions: newActivityInstructions.trim() || undefined,
      sortOrder: newActivitySortOrder,
      isPublished: newActivityPublished,
    });

    if (!created) {
      return;
    }

    setNewActivityTitle("");
    setNewActivityType("video");
    setNewActivityInstructions("");
    setNewActivitySortOrder(0);
    setNewActivityPublished(false);
  };

  const onResetCms = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja apagar TODAS as aulas, módulos e mídias? Isso é irreversível. As telas-base (blueprints) serão preservadas.",
    );
    if (!confirmed) {
      return;
    }

    const response = await resetCmsContent(false);
    if (!response) {
      return;
    }

    cancelEditTheme();
    cancelEditModule();
    cancelEditActivity();
    cancelEditAsset();
    setUploadThemeId("");
    setImportDirectoryThemeId("");
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
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Biblioteca de Mídias</h1>
          <p className="mt-2 text-sm text-slate-600">
            Crie <strong>temas</strong> com base nos interesses do alfabetizando (animais, comida, profissões) e envie as mídias que serão usadas nas aulas.
          </p>
        </div>
        <div className="flex gap-2">
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

      <section className="border border-slate-300 bg-white p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
              <FolderPlus className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Criar novo tema</p>
              <p className="text-sm text-slate-600">
                Um tema é o <strong>universo de interesse do alfabetizando</strong> — algo que ele goste ou conheça. Ex.: <em>Animais</em>, <em>Comida</em>, <em>Profissões</em>, <em>Zona rural</em>, <em>Esportes</em>.
              </p>
            </div>
          </div>
          <form onSubmit={onCreateFolder} className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <input
              value={newFolder}
              onChange={(event) => setNewFolder(event.target.value)}
              placeholder="Nome do novo tema"
              className="min-w-[240px] border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={busy === "theme"}
              className="inline-flex items-center justify-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <FolderPlus className="h-4 w-4" />
              {busy === "theme" ? "Criando..." : "Criar tema"}
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-3 border border-red-200 bg-red-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-red-900">Apagar todas as aulas e mídias</p>
            <p className="text-sm text-red-800">
              Remove temas, módulos, atividades e mídias do painel. As telas-base (blueprints) permanecem para você montar aulas novamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onResetCms()}
            disabled={busy === "cms-reset"}
            className="inline-flex items-center gap-2 border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {busy === "cms-reset" ? "Apagando..." : "Apagar tudo"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xl font-semibold text-slate-900">Temas</p>
        {folders.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum tema criado ainda. Use o bloco acima para criar o primeiro." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center justify-between border border-slate-300 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-slate-300 bg-slate-100">
                    <FolderPlus className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    {editingThemeId === folder.id ? (
                      <input
                        value={editThemeTitle}
                        onChange={(event) => setEditThemeTitle(event.target.value)}
                        className="border border-slate-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">{folder.title}</p>
                    )}
                    <p className="text-sm text-slate-600">{folder.count} arquivo(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {folder.id !== "sem-tema" ? (
                    editingThemeId === folder.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSaveTheme(folder.id)}
                          className="inline-flex items-center gap-1 border border-slate-900 bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditTheme}
                          className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditTheme(folder.id, folder.title)}
                          className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTheme(folder.id, folder.title)}
                          className="inline-flex items-center gap-1 border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </>
                    )
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-slate-900">Modulos ({moduleRows.length})</p>
        </div>

        {moduleRows.length === 0 ? (
          <StateDisplay type="empty" message="Nenhum modulo cadastrado ainda." />
        ) : (
          <div className="overflow-hidden border border-slate-300 bg-white">
            {moduleRows.map(({ moduleItem, themeTitle, activitiesCount }) => {
              const isEditingModule = editingModuleId === moduleItem.id;
              const busyEditingModule = busy === `module-update-${moduleItem.id}`;

              return (
                <div key={moduleItem.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{moduleItem.title}</p>
                      <p className="text-sm text-slate-600">
                        {themeTitle} • etapa {moduleItem.stage_number} • ordem {moduleItem.sort_order ?? 0}
                      </p>
                      <p className="text-xs text-slate-500">{activitiesCount} atividade(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditModule(moduleItem.id)}
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteModule(moduleItem.id, moduleItem.title, activitiesCount)}
                        className="inline-flex items-center gap-1 border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {isEditingModule ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
                      <select
                        value={editModuleThemeId}
                        onChange={(event) => setEditModuleThemeId(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                      >
                        <option value="">Selecione o tema</option>
                        {cmsThemes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.title}
                          </option>
                        ))}
                      </select>

                      <input
                        value={editModuleTitle}
                        onChange={(event) => setEditModuleTitle(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                        placeholder="Titulo do modulo"
                      />

                      <input
                        type="number"
                        min={1}
                        value={editModuleStageNumber}
                        onChange={(event) => setEditModuleStageNumber(Number(event.target.value) || 1)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                        placeholder="Etapa"
                      />

                      <input
                        type="number"
                        value={editModuleSortOrder}
                        onChange={(event) => setEditModuleSortOrder(Number(event.target.value) || 0)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                        placeholder="Ordem"
                      />

                      <textarea
                        value={editModuleDescription}
                        onChange={(event) => setEditModuleDescription(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs md:col-span-4"
                        placeholder="Descricao do modulo"
                        rows={2}
                      />

                      <div className="md:col-span-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditModule}
                          className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={busyEditingModule}
                          onClick={() => void onSaveModule(moduleItem.id)}
                          className="inline-flex items-center gap-1 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold text-slate-900">Telas e atividades ({activityRows.length})</p>
        </div>

        <form onSubmit={onCreateActivity} className="grid grid-cols-1 gap-2 border border-slate-300 bg-slate-50 p-4 md:grid-cols-5">
          <select
            value={newActivityModuleId}
            onChange={(event) => setNewActivityModuleId(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Selecione o modulo</option>
            {cmsModules.map((moduleItem) => (
              <option key={moduleItem.id} value={moduleItem.id}>
                {moduleItem.title}
              </option>
            ))}
          </select>

          <input
            value={newActivityTitle}
            onChange={(event) => setNewActivityTitle(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="Titulo da nova tela"
          />

          <select
            value={newActivityType}
            onChange={(event) => setNewActivityType(event.target.value as ActivityType)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="quiz">Quiz</option>
            <option value="letra">Letra</option>
          </select>

          <input
            type="number"
            value={newActivitySortOrder}
            onChange={(event) => setNewActivitySortOrder(Number(event.target.value) || 0)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="Ordem"
          />

          <label className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={newActivityPublished}
              onChange={(event) => setNewActivityPublished(event.target.checked)}
            />
            Publicar agora
          </label>

          <textarea
            value={newActivityInstructions}
            onChange={(event) => setNewActivityInstructions(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-xs md:col-span-4"
            placeholder="Texto simples ou JSON do campo instructions. Para RN121/RN123, voce pode colar aqui o payload gerado no wizard Nova Aula."
            rows={3}
          />

          <div className="flex items-end justify-between gap-3 md:col-span-1">
            <p className="text-xs text-slate-500">
              Crie varias telas no mesmo modulo sem recriar a aula inteira.
            </p>
            <button
              type="submit"
              disabled={busy === "activity"}
              className="inline-flex items-center gap-1 border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {busy === "activity" ? "Criando..." : "Nova tela"}
            </button>
          </div>
        </form>

        {activityRows.length === 0 ? (
          <StateDisplay type="empty" message="Nenhuma atividade cadastrada ainda." />
        ) : (
          <div className="overflow-hidden border border-slate-300 bg-white">
            {activityRows.map(({ activity, moduleTitle, themeTitle, assetsCount }) => {
              const isEditingActivity = editingActivityId === activity.id;
              const busyEditingActivity = busy === `activity-update-${activity.id}`;

              return (
                <div key={activity.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{activity.title}</p>
                      <p className="text-sm text-slate-600">
                        {themeTitle} / {moduleTitle} • tipo {activity.type} • ordem {activity.sort_order}
                      </p>
                      <p className="text-xs text-slate-500">{assetsCount} midia(s) vinculada(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`border px-2 py-1 text-xs ${
                          activity.is_published
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {activity.is_published ? "Publicado" : "Rascunho"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditActivity(activity.id)}
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteActivity(activity.id, activity.title, assetsCount)}
                        className="inline-flex items-center gap-1 border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {isEditingActivity ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
                      <select
                        value={editActivityModuleId}
                        onChange={(event) => setEditActivityModuleId(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                      >
                        <option value="">Selecione o modulo</option>
                        {cmsModules.map((moduleItem) => (
                          <option key={moduleItem.id} value={moduleItem.id}>
                            {moduleItem.title}
                          </option>
                        ))}
                      </select>

                      <input
                        value={editActivityTitle}
                        onChange={(event) => setEditActivityTitle(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                        placeholder="Titulo da atividade"
                      />

                      <select
                        value={editActivityType}
                        onChange={(event) => setEditActivityType(event.target.value as ActivityType)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                      >
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="quiz">Quiz</option>
                        <option value="letra">Letra</option>
                      </select>

                      <input
                        type="number"
                        value={editActivitySortOrder}
                        onChange={(event) => setEditActivitySortOrder(Number(event.target.value) || 0)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                        placeholder="Ordem"
                      />

                      <textarea
                        value={editActivityInstructions}
                        onChange={(event) => setEditActivityInstructions(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs md:col-span-3"
                        placeholder="Instrucoes para a tela/atividade"
                        rows={2}
                      />

                      <label className="flex items-center gap-2 border border-slate-300 bg-white px-2 py-2 text-xs">
                        <input
                          type="checkbox"
                          checked={editActivityPublished}
                          onChange={(event) => setEditActivityPublished(event.target.checked)}
                        />
                        Publicada
                      </label>

                      <div className="md:col-span-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditActivity}
                          className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={busyEditingActivity}
                          onClick={() => void onSaveActivity(activity.id)}
                          className="inline-flex items-center gap-1 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <form id="upload-midias-form" onSubmit={onSendFile} className="space-y-3 border border-slate-300 bg-white p-4">
        <p className="text-lg font-semibold text-slate-900">Upload rapido</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={uploadThemeId}
            onChange={(event) => setUploadThemeId(event.target.value)}
            className="border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tema (opcional)</option>
            {cmsThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.title}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as AssetStatus)} className="border border-slate-300 px-3 py-2 text-sm">
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <div className="flex items-center gap-2 border border-slate-300 px-3 py-2">
            <label className="cursor-pointer border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Escolher arquivo
              <input
                type="file"
                accept="image/*,audio/*,video/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
            <span className="max-w-[180px] truncate text-xs text-slate-600">
              {file ? file.name : "Nenhum arquivo"}
            </span>
          </div>
        </div>
        <input
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="Opcional: URL manual para arquivo ja hospedado"
          className="w-full border border-slate-300 px-3 py-2 text-sm"
        />
        {file ? (
          <p className="text-xs text-slate-500">
            Selecionado: {file.name} ({formatBytes(file.size)}) - tipo detectado automaticamente.
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          {busy === "asset-upload" || busy === "asset-link"
            ? "Processando upload..."
            : "As midias podem ser enviadas direto no acervo do tema, sem vincular a quiz/aula."}
        </p>
      </form>

      <form onSubmit={onImportDirectory} className="space-y-3 border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Importar pasta local da etapa 2</p>
            <p className="text-sm text-slate-600">
              Traga em lote os arquivos da pasta `Conteudos das telas` (no PC do admin) direto para o acervo.
            </p>
          </div>
          <button
            type="submit"
            disabled={busy === "asset-import-directory"}
            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {busy === "asset-import-directory" ? "Importando..." : "Importar pasta"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={importDirectoryPath}
            onChange={(event) => setImportDirectoryPath(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
            placeholder={DEFAULT_STAGE_TWO_DIRECTORY}
          />
          <select
            value={importDirectoryThemeId}
            onChange={(event) => setImportDirectoryThemeId(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Acervo geral (sem tema)</option>
            {cmsThemes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[220px_1fr]">
          <select
            value={importDirectoryStatus}
            onChange={(event) => setImportDirectoryStatus(event.target.value as AssetStatus)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="rascunho">Rascunho</option>
            <option value="publicado">Publicado</option>
            <option value="arquivado">Arquivado</option>
          </select>
          <p className="border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            Imports repetidos ignoram arquivos ja cadastrados pela mesma origem local.
          </p>
        </div>
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
            {filteredAssets.map((asset) => {
              const isEditing = editingAssetId === asset.id;
              const linkedActivity = asset.activity_id
                ? cmsActivities.find((item) => item.id === asset.activity_id) ?? null
                : null;
              const linkedModule = linkedActivity ? modulesById.get(linkedActivity.module_id) : null;
              const linkedTheme = linkedModule ? themesById.get(linkedModule.theme_id) : null;
              const metadata =
                asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
                  ? (asset.metadata as Record<string, unknown>)
                  : null;
              const metadataThemeTitle =
                metadata && typeof metadata.themeTitle === "string" ? metadata.themeTitle.trim() : "";
              return (
                <div key={asset.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center border border-slate-300 bg-slate-100">
                        {assetIcon(asset.kind)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{asset.storage_path.split("/").pop() || assetKindLabel(asset.kind)}</p>
                        <p className="text-sm text-slate-600">{assetKindLabel(asset.kind)} • {formatDate(asset.created_at)}</p>
                        <p className="text-xs text-slate-500">
                          {linkedActivity
                            ? `Vinculada em ${linkedTheme?.title ?? "Tema"} / ${linkedModule?.title ?? "Modulo"} / ${linkedActivity.title}`
                            : metadataThemeTitle
                              ? `Acervo geral do tema ${metadataThemeTitle}`
                              : "Acervo geral sem aula vinculada"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`border px-2 py-1 text-xs ${asset.status === "publicado" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : asset.status === "rascunho" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
                        {assetStatusLabel(asset.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditAsset(asset.id)}
                        className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteAsset(asset.id)}
                        className="inline-flex items-center gap-1 border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
                      <select
                        value={editAssetActivityId}
                        onChange={(event) => setEditAssetActivityId(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs"
                      >
                        <option value="">Acervo geral (sem aula)</option>
                        {cmsActivities.map((activity) => (
                          <option key={activity.id} value={activity.id}>
                            {activity.title}
                          </option>
                        ))}
                      </select>
                      <select value={editKind} onChange={(event) => setEditKind(event.target.value as AssetKind)} className="border border-slate-300 px-2 py-2 text-xs">
                        <option value="mp4">Video</option>
                        <option value="mp3">Audio</option>
                        <option value="png">Imagem PNG</option>
                        <option value="jpg">Imagem JPG</option>
                      </select>
                      <select value={editStatus} onChange={(event) => setEditStatus(event.target.value as AssetStatus)} className="border border-slate-300 px-2 py-2 text-xs">
                        <option value="rascunho">Rascunho</option>
                        <option value="publicado">Publicado</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                      <input
                        value={editStoragePath}
                        onChange={(event) => setEditStoragePath(event.target.value)}
                        className="border border-slate-300 px-2 py-2 text-xs md:col-span-2"
                        placeholder="URL da midia"
                      />
                      <div className="md:col-span-5 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditAsset}
                          className="inline-flex items-center gap-1 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={busy.startsWith("asset-update-")}
                          onClick={() => void onSaveAsset(asset.id)}
                          className="inline-flex items-center gap-1 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
