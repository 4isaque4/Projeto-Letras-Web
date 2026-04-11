import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiPost, apiPostFormData } from "../../../core/api/client";
import { Activity, AssetKind, AssetStatus, Blueprint, ConteudoData, EMPTY_DATA, ModuleItem, Theme } from "./cmsTypes";
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

interface CreateModuleInput {
  themeId: string;
  title: string;
  description?: string;
  stageNumber?: number;
  sortOrder?: number;
}

interface CreateActivityInput {
  moduleId: string;
  title: string;
  type: "video" | "quiz" | "audio" | "letra";
  instructions?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

interface UploadAssetInput {
  activityId: string;
  kind?: AssetKind;
  status?: AssetStatus;
  title?: string;
  metadata?: Record<string, unknown>;
  file: File;
}

interface SaveAssetLinkInput {
  activityId: string;
  kind: AssetKind;
  status?: AssetStatus;
  mimeType?: string;
  storagePath: string;
  metadata?: Record<string, unknown>;
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

function normalizeData(payload: Partial<ConteudoData>): ConteudoData {
  return {
    themes: payload.themes ?? [],
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
      const payload = (await apiGet("/painel/conteudo")) as Partial<ConteudoData>;
      setData(normalizeData(payload));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar CMS.");
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

  const createModule = useCallback(
    async (input: CreateModuleInput) => {
      try {
        setBusy("module");
        setFeedback(null);
        const created = (await apiPost("/painel/conteudo/modulos", {
          themeId: input.themeId,
          title: input.title,
          description: input.description || undefined,
          stageNumber: toInt(input.stageNumber ?? 1, 1),
          sortOrder: toInt(input.sortOrder ?? 0, 0),
          isActive: true,
        })) as ModuleItem;
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
    async (input: UploadAssetInput) => {
      try {
        setBusy("asset-upload");
        setFeedback(null);

        const inferredKind = input.kind ?? inferAssetKindFromFile(input.file) ?? "mp4";

        const body = new FormData();
        body.append("file", input.file);
        body.append("activityId", input.activityId);
        body.append("kind", inferredKind);
        body.append("status", input.status ?? "rascunho");
        body.append("title", input.title?.trim() || input.file.name.replace(/\.[^/.]+$/, ""));
        body.append("metadata", JSON.stringify(input.metadata ?? {}));

        await apiPostFormData("/painel/conteudo/assets/upload", body);
        await loadData();
        setFeedback({ type: "ok", text: "Upload concluido e vinculado na atividade." });
        return true;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : "Falha ao enviar arquivo.";
        setFeedback({ type: "error", text: message });
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
        setFeedback({ type: "ok", text: "Link da midia salvo com sucesso." });
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

  const themesById = useMemo(() => new Map(data.themes.map((item) => [item.id, item])), [data.themes]);
  const modulesById = useMemo(() => new Map(data.modules.map((item) => [item.id, item])), [data.modules]);
  const activitiesById = useMemo(() => new Map(data.activities.map((item) => [item.id, item])), [data.activities]);

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
    createModule,
    createActivity,
    uploadAsset,
    saveAssetLink,
    createBlueprint,
    updateBlueprint,
    importManifest,
    themesById,
    modulesById,
    activitiesById,
    cmsThemes,
    cmsModules,
    cmsActivities,
  };
}
