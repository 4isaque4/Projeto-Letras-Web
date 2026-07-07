import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPostFormData } from "../../../core/api/client";
import { Activity, AssetKind, AssetStatus, Blueprint, ConteudoData, EMPTY_DATA, ModuleItem, Stage, Theme } from "./cmsTypes";
import { inferAssetKindFromFile, isUuid, toFriendlyErrorMessage, toInt } from "./cmsUtils";

interface Feedback {
  type: "ok" | "error";
  text: string;
}

interface CreateThemeInput {
  title: string;
  description?: string;
  slug?: string;
  sortOrder?: number;
}

interface UpdateThemeInput {
  title?: string;
  description?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface CreateStageInput {
  themeId: string;
  stageNumber: number;
  title: string;
  description?: string;
  introVideoId?: string;
  sortOrder?: number;
}

interface CreateModuleInput {
  themeId: string;
  title: string;
  description?: string;
  stageNumber?: number;
  stageId?: string;
  sortOrder?: number;
}

interface UpdateModuleInput {
  moduleId: string;
  themeId?: string;
  title?: string;
  description?: string;
  stageNumber?: number;
  stageId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

interface CreateActivityInput {
  moduleId: string;
  title: string;
  type: "video" | "quiz" | "audio" | "letra";
  instructions?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

interface UpdateActivityInput {
  activityId: string;
  moduleId?: string;
  title?: string;
  type?: "video" | "quiz" | "audio" | "letra";
  instructions?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

interface UploadAssetInput {
  activityId?: string;
  kind?: AssetKind;
  status?: AssetStatus;
  title?: string;
  folder?: string;
  metadata?: Record<string, unknown>;
  file: File;
}

interface UploadedAssetResult {
  id: string;
  kind: AssetKind;
  sourceUrl: string;
  mimeType: string;
  originalFileName: string | null;
  bytes: number;
}

interface SaveAssetLinkInput {
  activityId?: string | null;
  kind: AssetKind;
  status?: AssetStatus;
  mimeType?: string;
  storagePath: string;
  metadata?: Record<string, unknown>;
}

interface UpdateAssetInput {
  assetId: string;
  activityId?: string | null;
  kind?: AssetKind;
  status?: AssetStatus;
  storagePath?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

interface ImportAssetDirectoryInput {
  directoryPath?: string;
  activityId?: string | null;
  status?: AssetStatus;
  folder?: string;
  metadata?: Record<string, unknown>;
}

interface ImportAssetDirectoryItem {
  fileName: string;
  assetId?: string | null;
  storagePath?: string | null;
  linkedToActivity?: boolean;
}

interface ImportAssetDirectoryResult {
  imported?: number;
  skipped?: number;
  directoryPath?: string;
  items?: ImportAssetDirectoryItem[];
  skippedItems?: Array<{ fileName?: string; reason?: string }>;
}

interface CreateBlueprintInput {
  title: string;
  slug?: string;
  svgPath: string;
  stageTag?: string;
  moduleCode?: string;
}

interface UpdateBlueprintInput {
  stageTag?: string;
  moduleCode?: string;
  title?: string;
  slug?: string;
  svgPath?: string;
}

interface ResetCmsContentResponse {
  deleted?: {
    themes?: number;
    modules?: number;
    activities?: number;
    assets?: number;
    blueprints?: number;
  };
}

function normalizeData(payload: Partial<ConteudoData>): ConteudoData {
  return {
    themes: payload.themes ?? [],
    stages: payload.stages ?? [],
    modules: payload.modules ?? [],
    activities: payload.activities ?? [],
    assets: payload.assets ?? [],
    blueprints: payload.blueprints ?? [],
    totals: {
      themes: payload.totals?.themes ?? payload.themes?.length ?? 0,
      modules: payload.totals?.modules ?? payload.modules?.length ?? 0,
      activities: payload.totals?.activities ?? payload.activities?.length ?? 0,
      assets: payload.totals?.assets ?? payload.assets?.length ?? 0,
      blueprints: payload.totals?.blueprints ?? payload.blueprints?.length ?? 0,
    },
  };
}

export function useConteudoData() {
  const [data, setData] = useState<ConteudoData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const payload = (await apiGet("/painel/conteudo?scope=cms")) as Partial<ConteudoData>;
      setData(normalizeData(payload));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Falha ao carregar aulas e mídias.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTheme = useCallback(
    async (input: CreateThemeInput) => {
      try {
        setBusy("theme");
        setFeedback(null);
        const created = (await apiPost("/painel/conteudo/temas", {
          title: input.title,
          slug: input.slug || undefined,
          description: input.description || undefined,
          sortOrder: toInt(input.sortOrder ?? 0, 0),
          isActive: true,
        })) as Theme;

        await loadData();
        setFeedback({ type: "ok", text: "Tema criado com sucesso." });
        return created;
      } catch (submitError) {
        const rawMessage = submitError instanceof Error ? submitError.message : "Erro ao salvar.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(rawMessage) });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const createStage = useCallback(
    async (input: CreateStageInput) => {
      try {
        setBusy("stage");
        setFeedback(null);
        const created = (await apiPost("/painel/conteudo/etapas", {
          themeId: input.themeId,
          stageNumber: toInt(input.stageNumber, 1),
          title: input.title,
          description: input.description || undefined,
          introVideoId: input.introVideoId || undefined,
          sortOrder: input.sortOrder !== undefined ? toInt(input.sortOrder, 0) : undefined,
          isActive: true,
        })) as Stage;

        await loadData();
        setFeedback({ type: "ok", text: "Etapa criada com sucesso." });
        return created;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao criar etapa.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const updateTheme = useCallback(
    async (themeId: string, input: UpdateThemeInput) => {
      try {
        setBusy(`theme-update-${themeId}`);
        setFeedback(null);

        await apiPatch(`/painel/conteudo/temas/${themeId}`, {
          title: input.title,
          description: input.description,
          slug: input.slug,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        });

        await loadData();
        setFeedback({ type: "ok", text: "Tema atualizado com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao atualizar tema.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const deleteTheme = useCallback(
    async (themeId: string) => {
      try {
        setBusy(`theme-delete-${themeId}`);
        setFeedback(null);
        await apiDelete(`/painel/conteudo/temas/${themeId}`);
        await loadData();
        setFeedback({ type: "ok", text: "Tema removido com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao excluir tema.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const createModule = useCallback(
    async (input: CreateModuleInput) => {
      try {
        setBusy("module");
        setFeedback(null);
        const payload: Record<string, unknown> = {
          themeId: input.themeId,
          title: input.title,
          description: input.description || undefined,
          stageNumber: toInt(input.stageNumber ?? 1, 1),
          isActive: true,
        };
        if (input.stageId) {
          payload.stageId = input.stageId;
        }
        if (input.sortOrder !== undefined) {
          payload.sortOrder = toInt(input.sortOrder, 0);
        }
        const created = (await apiPost("/painel/conteudo/modulos", payload)) as ModuleItem;
        await loadData();
        setFeedback({ type: "ok", text: "Modulo criado com sucesso." });
        return created;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao criar modulo.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const updateModule = useCallback(
    async (input: UpdateModuleInput) => {
      try {
        setBusy(`module-update-${input.moduleId}`);
        setFeedback(null);
        await apiPatch(`/painel/conteudo/modulos/${input.moduleId}`, {
          themeId: input.themeId,
          title: input.title,
          description: input.description,
          stageNumber: input.stageNumber,
          stageId: input.stageId,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        });
        await loadData();
        setFeedback({ type: "ok", text: "Modulo atualizado com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao atualizar modulo.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const deleteModule = useCallback(
    async (moduleId: string) => {
      try {
        setBusy(`module-delete-${moduleId}`);
        setFeedback(null);
        await apiDelete(`/painel/conteudo/modulos/${moduleId}`);
        await loadData();
        setFeedback({ type: "ok", text: "Modulo removido com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao excluir modulo.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const createActivity = useCallback(
    async (input: CreateActivityInput) => {
      try {
        setBusy("activity");
        setFeedback(null);
        const created = (await apiPost("/painel/conteudo/atividades", {
          moduleId: input.moduleId,
          title: input.title,
          type: input.type,
          instructions: input.instructions || undefined,
          sortOrder: toInt(input.sortOrder ?? 0, 0),
          isPublished: Boolean(input.isPublished),
        })) as Activity;

        await loadData();
        setFeedback({ type: "ok", text: "Atividade criada com sucesso." });
        return created;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao criar atividade.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const uploadAsset = useCallback(
    async (input: UploadAssetInput): Promise<UploadedAssetResult | null> => {
      try {
        setBusy("asset-upload");
        setFeedback(null);

        const inferredKind = input.kind ?? inferAssetKindFromFile(input.file) ?? "mp4";

        const body = new FormData();
        body.append("file", input.file);
        if (input.activityId) {
          body.append("activityId", input.activityId);
        }
        if (input.folder?.trim()) {
          body.append("folder", input.folder.trim());
        }
        body.append("kind", inferredKind);
        body.append("status", input.status ?? "rascunho");
        body.append("title", input.title?.trim() || input.file.name.replace(/\.[^/.]+$/, ""));
        body.append("metadata", JSON.stringify(input.metadata ?? {}));

        const response = (await apiPostFormData("/painel/conteudo/assets/upload", body)) as {
          asset?: {
            id?: string;
            kind?: AssetKind;
            sourceUrl?: string;
            mimeType?: string;
            originalFileName?: string | null;
            bytes?: number;
          };
          cadastrado?: boolean;
          vinculado?: boolean;
        };
        await loadData();
        if (response?.vinculado) {
          setFeedback({ type: "ok", text: "Upload concluido e vinculado na atividade." });
        } else if (response?.cadastrado) {
          setFeedback({
            type: "ok",
            text: "Upload concluido e salvo no acervo geral. Vincule a uma atividade quando a aula estiver pronta.",
          });
        } else {
          setFeedback({
            type: "ok",
            text: "Upload concluido no storage. Vincule o arquivo a uma atividade para aparecer no fluxo mobile.",
          });
        }
        const uploaded = response?.asset;
        if (
          uploaded &&
          typeof uploaded.id === "string" &&
          typeof uploaded.kind === "string" &&
          typeof uploaded.sourceUrl === "string"
        ) {
          return {
            id: uploaded.id,
            kind: uploaded.kind,
            sourceUrl: uploaded.sourceUrl,
            mimeType: uploaded.mimeType ?? "application/octet-stream",
            originalFileName:
              typeof uploaded.originalFileName === "string" ? uploaded.originalFileName : null,
            bytes: Number(uploaded.bytes ?? input.file.size ?? 0),
          };
        }

        return {
          id: "",
          kind: inferredKind,
          sourceUrl: "",
          mimeType: input.file.type || "application/octet-stream",
          originalFileName: input.file.name,
          bytes: input.file.size,
        };
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao enviar arquivo.";
        setFeedback({ type: "error", text: message });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const updateAsset = useCallback(
    async (input: UpdateAssetInput) => {
      try {
        setBusy(`asset-update-${input.assetId}`);
        setFeedback(null);
        await apiPatch(`/painel/conteudo/assets/${input.assetId}`, {
          activityId: input.activityId,
          kind: input.kind,
          status: input.status,
          storagePath: input.storagePath,
          mimeType: input.mimeType,
          metadata: input.metadata,
        });
        await loadData();
        setFeedback({ type: "ok", text: "Midia atualizada com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao atualizar midia.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const deleteAsset = useCallback(
    async (assetId: string) => {
      try {
        setBusy(`asset-delete-${assetId}`);
        setFeedback(null);
        await apiDelete(`/painel/conteudo/assets/${assetId}`);
        await loadData();
        setFeedback({ type: "ok", text: "Midia removida com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao excluir midia.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const saveAssetLink = useCallback(
    async (input: SaveAssetLinkInput) => {
      try {
        setBusy("asset-link");
        setFeedback(null);

        await apiPost("/painel/conteudo/assets", {
          activityId: input.activityId,
          kind: input.kind,
          storagePath: input.storagePath,
          mimeType: input.mimeType || "application/octet-stream",
          status: input.status ?? "rascunho",
          metadata: input.metadata ?? {},
        });

        await loadData();
        setFeedback({
          type: "ok",
          text: input.activityId
            ? "Link da midia salvo e vinculado com sucesso."
            : "Link da midia salvo no acervo geral com sucesso.",
        });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao salvar link.";
        setFeedback({ type: "error", text: message });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const createBlueprint = useCallback(
    async (input: CreateBlueprintInput) => {
      try {
        setBusy("blueprint");
        setFeedback(null);
        const created = (await apiPost("/painel/conteudo/blueprints", {
          title: input.title,
          slug: input.slug || undefined,
          svgPath: input.svgPath,
          stageTag: input.stageTag || undefined,
          moduleCode: input.moduleCode || undefined,
          isActive: true,
        })) as Blueprint;

        await loadData();
        setFeedback({ type: "ok", text: "Tela base cadastrada com sucesso." });
        return created;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao cadastrar tela.";
        setFeedback({ type: "error", text: message });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const updateBlueprint = useCallback(
    async (id: string, input: UpdateBlueprintInput) => {
      try {
        setBusy(`blueprint-${id}`);
        setFeedback(null);
        await apiPatch(`/painel/conteudo/blueprints/${id}`, {
          title: input.title,
          slug: input.slug,
          svgPath: input.svgPath,
          stageTag: input.stageTag,
          moduleCode: input.moduleCode,
        });
        await loadData();
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao atualizar tela base.";
        setFeedback({ type: "error", text: message });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const importManifest = useCallback(
    async (manifestPath?: string) => {
      try {
        setBusy("import");
        setFeedback(null);
        const response = (await apiPost("/painel/conteudo/blueprints/import-manifest", {
          manifestPath: manifestPath?.trim() || undefined,
        })) as { imported?: number };

        await loadData();
        const count = response.imported ?? 0;
        setFeedback({ type: "ok", text: `Importacao concluida: ${count} tela(s) atualizadas.` });
        return count;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao importar manifest.";
        setFeedback({ type: "error", text: message });
        return 0;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const importAssetDirectory = useCallback(
    async (input: ImportAssetDirectoryInput) => {
      try {
        setBusy("asset-import-directory");
        setFeedback(null);
        const response = (await apiPost("/painel/conteudo/assets/import-directory", {
          directoryPath: input.directoryPath?.trim() || undefined,
          activityId: input.activityId || null,
          status: input.status ?? "rascunho",
          folder: input.folder?.trim() || undefined,
          metadata:
            input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
              ? input.metadata
              : undefined,
        })) as ImportAssetDirectoryResult;

        await loadData();
        setFeedback({
          type: "ok",
          text: `Importacao concluida: ${response.imported ?? 0} arquivo(s) adicionados e ${response.skipped ?? 0} ignorado(s).`,
        });
        return response;
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Falha ao importar pasta de conteudos.";
        setFeedback({ type: "error", text: message });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const themesById = useMemo(() => new Map(data.themes.map((item) => [item.id, item])), [data.themes]);
  const modulesById = useMemo(() => new Map(data.modules.map((item) => [item.id, item])), [data.modules]);
  const activitiesById = useMemo(() => new Map(data.activities.map((item) => [item.id, item])), [data.activities]);

  const updateActivity = useCallback(
    async (input: UpdateActivityInput) => {
      try {
        setBusy(`activity-update-${input.activityId}`);
        setFeedback(null);
        await apiPatch(`/painel/conteudo/atividades/${input.activityId}`, {
          moduleId: input.moduleId,
          title: input.title,
          type: input.type,
          instructions: input.instructions,
          sortOrder: input.sortOrder === undefined ? undefined : toInt(input.sortOrder, 0),
          isPublished: input.isPublished,
        });
        await loadData();
        setFeedback({ type: "ok", text: "Atividade atualizada com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao atualizar atividade.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const deleteActivity = useCallback(
    async (activityId: string) => {
      try {
        setBusy(`activity-delete-${activityId}`);
        setFeedback(null);
        await apiDelete(`/painel/conteudo/atividades/${activityId}`);
        await loadData();
        setFeedback({ type: "ok", text: "Atividade removida com sucesso." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao excluir atividade.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return false;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const resetCmsContent = useCallback(
    async (includeBlueprints = false) => {
      try {
        setBusy("cms-reset");
        setFeedback(null);
        const response = (await apiPost("/painel/conteudo/reset", {
          includeBlueprints,
        })) as ResetCmsContentResponse;
        await loadData();
        const deleted = response.deleted ?? {};
        setFeedback({
          type: "ok",
          text: `Limpeza concluida: ${deleted.themes ?? 0} tema(s), ${deleted.modules ?? 0} modulo(s), ${deleted.activities ?? 0} atividade(s) e ${deleted.assets ?? 0} midia(s).`,
        });
        return response;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao apagar aulas e mídias.";
        setFeedback({ type: "error", text: toFriendlyErrorMessage(message) });
        return null;
      } finally {
        setBusy("");
      }
    },
    [loadData],
  );

  const cmsThemes = useMemo(() => data.themes.filter((item) => isUuid(item.id)), [data.themes]);
  const cmsModules = useMemo(() => data.modules.filter((item) => isUuid(item.id)), [data.modules]);
  const cmsActivities = useMemo(() => data.activities.filter((item) => isUuid(item.id)), [data.activities]);

  return {
    data,
    loading,
    error,
    busy,
    feedback,
    setFeedback,
    loadData,
    createTheme,
    createStage,
    updateTheme,
    deleteTheme,
    createModule,
    updateModule,
    deleteModule,
    createActivity,
    updateActivity,
    deleteActivity,
    uploadAsset,
    importAssetDirectory,
    saveAssetLink,
    updateAsset,
    deleteAsset,
    createBlueprint,
    updateBlueprint,
    importManifest,
    resetCmsContent,
    themesById,
    modulesById,
    activitiesById,
    cmsThemes,
    cmsModules,
    cmsActivities,
  };
}
