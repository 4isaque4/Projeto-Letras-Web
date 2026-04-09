
import { FormEvent, useEffect, useMemo, useState } from "react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPost, apiPostFormData } from "../../core/api/client";

type TabKey = "estrutura" | "conteudo" | "telas";

type ActivityType = "video" | "quiz" | "audio" | "letra";
type AssetKind = "png" | "mp4" | "mp3" | "jpg";
type AssetStatus = "rascunho" | "publicado" | "arquivado";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Theme {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
}

interface ModuleItem {
  id: string;
  theme_id: string;
  title: string;
  stage_number: number;
}

interface Activity {
  id: string;
  module_id: string;
  title: string;
  type: ActivityType;
  sort_order: number;
}

interface Asset {
  id: string;
  activity_id: string;
  kind: AssetKind;
  status: AssetStatus;
  storage_path: string;
  created_at: string;
}

interface Blueprint {
  id: string;
  title: string;
  slug: string;
  svg_path: string;
  stage_tag: string | null;
}

interface ConteudoData {
  themes: Theme[];
  modules: ModuleItem[];
  activities: Activity[];
  assets: Asset[];
  blueprints: Blueprint[];
  totals: {
    themes: number;
    modules: number;
    activities: number;
    assets: number;
    blueprints: number;
  };
}

const EMPTY_DATA: ConteudoData = {
  themes: [],
  modules: [],
  activities: [],
  assets: [],
  blueprints: [],
  totals: {
    themes: 0,
    modules: 0,
    activities: 0,
    assets: 0,
    blueprints: 0,
  },
};

function toInt(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleString("pt-BR");
}

function assetKindLabel(kind: AssetKind) {
  if (kind === "mp4") return "Video";
  if (kind === "mp3") return "Audio";
  if (kind === "png") return "Imagem (PNG)";
  return "Imagem (JPG)";
}

function assetStatusLabel(status: AssetStatus) {
  if (status === "rascunho") return "Em revisao";
  if (status === "publicado") return "Publicado";
  return "Arquivado";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const kb = value / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function inferAssetKindFromFile(file: File): AssetKind | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith("video/mp4")) return "mp4";
  if (mimeType.startsWith("audio/mpeg") || mimeType.startsWith("audio/mp3")) return "mp3";
  if (mimeType.startsWith("image/png")) return "png";
  if (mimeType.startsWith("image/jpeg")) return "jpg";

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "mp4") return "mp4";
  if (extension === "mp3") return "mp3";
  if (extension === "png") return "png";
  if (extension === "jpg" || extension === "jpeg") return "jpg";
  return null;
}

function isUuid(value: string) {
  return UUID_REGEX.test(value.trim());
}

export default function Conteudo() {
  const [tab, setTab] = useState<TabKey>("estrutura");
  const [data, setData] = useState<ConteudoData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [themeForm, setThemeForm] = useState({ title: "", slug: "", description: "", sortOrder: "0" });
  const [moduleForm, setModuleForm] = useState({
    themeId: "",
    title: "",
    description: "",
    stageNumber: "1",
    sortOrder: "0",
  });
  const [activityForm, setActivityForm] = useState({
    moduleId: "",
    title: "",
    type: "video" as ActivityType,
    instructions: "",
    sortOrder: "0",
    isPublished: false,
  });
  const [assetForm, setAssetForm] = useState({
    activityId: "",
    title: "",
    kind: "mp4" as AssetKind,
    mimeType: "video/mp4",
    storagePath: "",
    status: "rascunho" as AssetStatus,
    metadataText: "",
  });
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [blueprintForm, setBlueprintForm] = useState({
    title: "",
    slug: "",
    svgPath: "",
    stageTag: "",
    moduleCode: "",
  });
  const [manifestPath, setManifestPath] = useState("assets/mobile/etapa-1/manifest.json");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const payload = (await apiGet("/painel/conteudo")) as Partial<ConteudoData>;
      setData({
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
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar CMS.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!moduleForm.themeId) {
      const firstTheme = data.themes.find((item) => isUuid(item.id));
      if (firstTheme) {
        setModuleForm((previous) => ({ ...previous, themeId: firstTheme.id }));
      }
    }
    if (!activityForm.moduleId) {
      const firstModule = data.modules.find((item) => isUuid(item.id));
      if (firstModule) {
        setActivityForm((previous) => ({ ...previous, moduleId: firstModule.id }));
      }
    }
    if (!assetForm.activityId) {
      const firstActivity = data.activities.find((item) => isUuid(item.id));
      if (firstActivity) {
        setAssetForm((previous) => ({ ...previous, activityId: firstActivity.id }));
      }
    }
  }, [activityForm.moduleId, assetForm.activityId, data.activities, data.modules, data.themes, moduleForm.themeId]);

  const themesById = useMemo(() => new Map(data.themes.map((item) => [item.id, item])), [data.themes]);
  const modulesById = useMemo(() => new Map(data.modules.map((item) => [item.id, item])), [data.modules]);
  const activitiesById = useMemo(
    () => new Map(data.activities.map((item) => [item.id, item])),
    [data.activities],
  );
  const cmsThemes = useMemo(() => data.themes.filter((item) => isUuid(item.id)), [data.themes]);
  const cmsModules = useMemo(() => data.modules.filter((item) => isUuid(item.id)), [data.modules]);
  const cmsActivities = useMemo(
    () => data.activities.filter((item) => isUuid(item.id)),
    [data.activities],
  );

  async function postAndRefresh(key: string, path: string, body: unknown, successMessage: string) {
    try {
      setBusy(key);
      setFeedback(null);
      await apiPost(path, body);
      await loadData();
      setFeedback({ type: "ok", text: successMessage });
    } catch (submitError) {
      setFeedback({
        type: "error",
        text: submitError instanceof Error ? submitError.message : "Erro ao salvar.",
      });
    } finally {
      setBusy("");
    }
  }
  async function onCreateTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postAndRefresh(
      "theme",
      "/painel/conteudo/temas",
      {
        title: themeForm.title,
        slug: themeForm.slug || undefined,
        description: themeForm.description || undefined,
        sortOrder: toInt(themeForm.sortOrder, 0),
        isActive: true,
      },
      "Tema criado com sucesso.",
    );
    setThemeForm({ title: "", slug: "", description: "", sortOrder: "0" });
  }

  async function onCreateModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postAndRefresh(
      "module",
      "/painel/conteudo/modulos",
      {
        themeId: moduleForm.themeId,
        title: moduleForm.title,
        description: moduleForm.description || undefined,
        stageNumber: toInt(moduleForm.stageNumber, 1),
        sortOrder: toInt(moduleForm.sortOrder, 0),
        isActive: true,
      },
      "Modulo criado com sucesso.",
    );
    setModuleForm((previous) => ({ ...previous, title: "", description: "", stageNumber: "1", sortOrder: "0" }));
  }

  async function onCreateActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postAndRefresh(
      "activity",
      "/painel/conteudo/atividades",
      {
        moduleId: activityForm.moduleId,
        title: activityForm.title,
        type: activityForm.type,
        instructions: activityForm.instructions || undefined,
        sortOrder: toInt(activityForm.sortOrder, 0),
        isPublished: activityForm.isPublished,
      },
      "Atividade criada com sucesso.",
    );
    setActivityForm((previous) => ({ ...previous, title: "", instructions: "", sortOrder: "0", isPublished: false }));
  }

  async function onCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let metadata: Record<string, unknown> = {};
    const metadataText = assetForm.metadataText.trim();
    if (metadataText.length > 0) {
      try {
        const parsed = JSON.parse(metadataText) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, unknown>;
        } else {
          metadata = { observacoes: metadataText };
        }
      } catch {
        metadata = { observacoes: metadataText };
      }
    }

    if (!assetFile && !assetForm.storagePath.trim()) {
      setFeedback({
        type: "error",
        text: "Selecione um arquivo para upload ou informe o link manual do arquivo.",
      });
      return;
    }

    try {
      setBusy("asset");
      setFeedback(null);

      if (assetFile) {
        const body = new FormData();
        body.append("file", assetFile);
        body.append("activityId", assetForm.activityId);
        body.append("kind", assetForm.kind);
        body.append("status", assetForm.status);
        body.append("title", assetForm.title.trim() || assetFile.name.replace(/\.[^/.]+$/, ""));
        body.append("metadata", JSON.stringify(metadata));

        await apiPostFormData("/painel/conteudo/assets/upload", body);
      } else {
        await apiPost("/painel/conteudo/assets", {
          activityId: assetForm.activityId,
          kind: assetForm.kind,
          storagePath: assetForm.storagePath,
          mimeType: assetForm.mimeType,
          status: assetForm.status,
          metadata,
        });
      }

      await loadData();
      setFeedback({
        type: "ok",
        text: assetFile
          ? "Upload concluido e arquivo vinculado na atividade."
          : "Link do arquivo salvo com sucesso.",
      });
      setAssetFile(null);
      setAssetForm((previous) => ({
        ...previous,
        title: "",
        storagePath: "",
        metadataText: "",
      }));
    } catch (submitError) {
      setFeedback({
        type: "error",
        text: submitError instanceof Error ? submitError.message : "Erro ao enviar arquivo.",
      });
    } finally {
      setBusy("");
    }
  }

  function onAssetFileChange(file: File | null) {
    setAssetFile(file);
    if (!file) {
      return;
    }

    const inferredKind = inferAssetKindFromFile(file);
    if (!inferredKind) {
      return;
    }

    const mimeByKind: Record<AssetKind, string> = {
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      png: "image/png",
      jpg: "image/jpeg",
    };

    setAssetForm((previous) => ({
      ...previous,
      kind: inferredKind,
      mimeType: mimeByKind[inferredKind],
      title: previous.title || file.name.replace(/\.[^/.]+$/, ""),
    }));
  }

  async function onCreateBlueprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await postAndRefresh(
      "blueprint",
      "/painel/conteudo/blueprints",
      {
        title: blueprintForm.title,
        slug: blueprintForm.slug || undefined,
        svgPath: blueprintForm.svgPath,
        stageTag: blueprintForm.stageTag || undefined,
        moduleCode: blueprintForm.moduleCode || undefined,
        isActive: true,
      },
      "Tela base criada com sucesso.",
    );
    setBlueprintForm({ title: "", slug: "", svgPath: "", stageTag: "", moduleCode: "" });
  }

  async function onImportManifest() {
    try {
      setBusy("import");
      setFeedback(null);
      const response = (await apiPost("/painel/conteudo/blueprints/import-manifest", {
        manifestPath: manifestPath.trim() || undefined,
      })) as { imported?: number };
      await loadData();
      setFeedback({
        type: "ok",
        text: `Importacao concluida: ${response.imported ?? 0} telas adicionadas.`,
      });
    } catch (submitError) {
      setFeedback({
        type: "error",
        text: submitError instanceof Error ? submitError.message : "Falha ao importar lista de telas.",
      });
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T10. Conteudo (CMS)</h1>
        <p className="text-sm text-gray-600 mt-1">
          Cadastre trilhas, atividades e midias. Tudo que for publicado aqui deve refletir no web e no mobile.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="border border-gray-300 bg-white p-3"><p className="text-xs text-gray-500">Temas</p><p className="text-xl font-bold">{data.totals.themes}</p></div>
        <div className="border border-gray-300 bg-white p-3"><p className="text-xs text-gray-500">Modulos</p><p className="text-xl font-bold">{data.totals.modules}</p></div>
        <div className="border border-gray-300 bg-white p-3"><p className="text-xs text-gray-500">Atividades</p><p className="text-xl font-bold">{data.totals.activities}</p></div>
        <div className="border border-gray-300 bg-white p-3"><p className="text-xs text-gray-500">Arquivos</p><p className="text-xl font-bold">{data.totals.assets}</p></div>
        <div className="border border-gray-300 bg-white p-3"><p className="text-xs text-gray-500">Telas</p><p className="text-xl font-bold">{data.totals.blueprints}</p></div>
      </div>

      {feedback ? (
        <div className={`border px-4 py-3 text-sm ${feedback.type === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="border border-gray-300 bg-white">
        <div className="grid grid-cols-3 border-b border-gray-300">
          <button type="button" onClick={() => setTab("estrutura")} className={`px-4 py-3 text-sm font-bold ${tab === "estrutura" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Estrutura (tema {">"} modulo {">"} atividade)</button>
          <button type="button" onClick={() => setTab("conteudo")} className={`px-4 py-3 text-sm font-bold ${tab === "conteudo" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Midias da Atividade</button>
          <button type="button" onClick={() => setTab("telas")} className={`px-4 py-3 text-sm font-bold ${tab === "telas" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Telas Base Mobile</button>
        </div>

        <div className="p-6 space-y-6">
          {tab === "estrutura" ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <form onSubmit={onCreateTheme} className="space-y-2 border border-gray-300 p-4">
                <h2 className="font-bold text-gray-900">Novo Tema</h2>
                <p className="text-xs text-gray-600">Tema e o bloco principal da trilha (ex.: Vogais, Consoantes).</p>
                <label className="text-xs font-semibold text-gray-700 block">Titulo do tema</label>
                <input value={themeForm.title} onChange={(event) => setThemeForm((p) => ({ ...p, title: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: Vogais" required />
                <label className="text-xs font-semibold text-gray-700 block">Slug (opcional)</label>
                <input value={themeForm.slug} onChange={(event) => setThemeForm((p) => ({ ...p, slug: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: vogais" />
                <label className="text-xs font-semibold text-gray-700 block">Descricao</label>
                <textarea value={themeForm.description} onChange={(event) => setThemeForm((p) => ({ ...p, description: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm min-h-[90px]" placeholder="Objetivo pedagogico deste tema." />
                <label className="text-xs font-semibold text-gray-700 block">Ordem de exibicao</label>
                <input type="number" value={themeForm.sortOrder} onChange={(event) => setThemeForm((p) => ({ ...p, sortOrder: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="0" />
                <button type="submit" disabled={busy === "theme"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">{busy === "theme" ? "Salvando..." : "Criar Tema"}</button>
              </form>

              <form onSubmit={onCreateModule} className="space-y-2 border border-gray-300 p-4">
                <h2 className="font-bold text-gray-900">Novo Modulo</h2>
                <p className="text-xs text-gray-600">Modulo e uma etapa dentro do tema (ex.: Modulo 1 - Introducao).</p>
                <label className="text-xs font-semibold text-gray-700 block">Tema pai</label>
                <select value={moduleForm.themeId} onChange={(event) => setModuleForm((p) => ({ ...p, themeId: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" required>
                  <option value="">Selecione o tema</option>
                  {cmsThemes.map((theme) => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
                </select>
                <label className="text-xs font-semibold text-gray-700 block">Titulo do modulo</label>
                <input value={moduleForm.title} onChange={(event) => setModuleForm((p) => ({ ...p, title: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: Introducao as vogais" required />
                <label className="text-xs font-semibold text-gray-700 block">Descricao</label>
                <textarea value={moduleForm.description} onChange={(event) => setModuleForm((p) => ({ ...p, description: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm min-h-[90px]" placeholder="Resumo do que o aluno vai aprender neste modulo." />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={moduleForm.stageNumber} onChange={(event) => setModuleForm((p) => ({ ...p, stageNumber: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Numero da etapa (ex.: 1)" />
                  <input type="number" value={moduleForm.sortOrder} onChange={(event) => setModuleForm((p) => ({ ...p, sortOrder: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ordem no tema (ex.: 0)" />
                </div>
                <button type="submit" disabled={busy === "module"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">{busy === "module" ? "Salvando..." : "Criar Modulo"}</button>
              </form>

              <form onSubmit={onCreateActivity} className="space-y-2 border border-gray-300 p-4">
                <h2 className="font-bold text-gray-900">Nova Atividade</h2>
                <p className="text-xs text-gray-600">Atividade e a unidade que o aluno realmente executa no app.</p>
                <label className="text-xs font-semibold text-gray-700 block">Modulo pai</label>
                <select value={activityForm.moduleId} onChange={(event) => setActivityForm((p) => ({ ...p, moduleId: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" required>
                  <option value="">Selecione o modulo</option>
                  {cmsModules.map((module) => <option key={module.id} value={module.id}>Etapa {module.stage_number} - {module.title}</option>)}
                </select>
                <label className="text-xs font-semibold text-gray-700 block">Titulo da atividade</label>
                <input value={activityForm.title} onChange={(event) => setActivityForm((p) => ({ ...p, title: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: Video de boas-vindas" required />
                <div className="grid grid-cols-2 gap-2">
                  <select value={activityForm.type} onChange={(event) => setActivityForm((p) => ({ ...p, type: event.target.value as ActivityType }))} className="w-full border border-gray-300 px-3 py-2 text-sm">
                    <option value="video">video</option>
                    <option value="quiz">quiz</option>
                    <option value="audio">audio</option>
                    <option value="letra">letra</option>
                  </select>
                  <input type="number" value={activityForm.sortOrder} onChange={(event) => setActivityForm((p) => ({ ...p, sortOrder: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ordem no modulo (ex.: 0)" />
                </div>
                <label className="text-xs font-semibold text-gray-700 block">Instrucoes para o aluno</label>
                <textarea value={activityForm.instructions} onChange={(event) => setActivityForm((p) => ({ ...p, instructions: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm min-h-[90px]" placeholder="Ex.: Assista ao video ate o final e repita as letras em voz alta." />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activityForm.isPublished} onChange={(event) => setActivityForm((p) => ({ ...p, isPublished: event.target.checked }))} /> Publicada</label>
                <button type="submit" disabled={busy === "activity"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">{busy === "activity" ? "Salvando..." : "Criar Atividade"}</button>
              </form>

              <div className="xl:col-span-3 border border-gray-300 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Tema</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Modulo</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Atividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activities.map((activity) => {
                      const moduleItem = modulesById.get(activity.module_id);
                      const theme = moduleItem ? themesById.get(moduleItem.theme_id) : null;
                      return (
                        <tr key={activity.id} className="border-b border-gray-200">
                          <td className="px-3 py-2 text-sm">{theme?.title ?? "-"}</td>
                          <td className="px-3 py-2 text-sm">{moduleItem?.title ?? "-"}</td>
                          <td className="px-3 py-2 text-sm">{activity.title} ({activity.type})</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === "conteudo" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <form onSubmit={onCreateAsset} className="space-y-2 border border-gray-300 p-4">
                <h2 className="font-bold text-gray-900">Adicionar Arquivo</h2>
                <p className="text-xs text-gray-600">
                  Forma recomendada: selecione o arquivo para upload direto. Se o arquivo ja estiver hospedado, use o link manual.
                </p>
                <label className="text-xs font-semibold text-gray-700 block">Atividade relacionada</label>
                <select value={assetForm.activityId} onChange={(event) => setAssetForm((p) => ({ ...p, activityId: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" required>
                  <option value="">Selecione a atividade</option>
                  {cmsActivities.map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
                </select>
                <label className="text-xs font-semibold text-gray-700 block">Titulo do arquivo (opcional)</label>
                <input
                  value={assetForm.title}
                  onChange={(event) => setAssetForm((p) => ({ ...p, title: event.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ex.: Video de Boas-vindas - Etapa 1"
                />
                <div className="grid grid-cols-3 gap-2">
                  <label className="sr-only">Tipo de arquivo</label>
                  <select value={assetForm.kind} onChange={(event) => {
                    const nextKind = event.target.value as AssetKind;
                    const mimeByKind: Record<AssetKind, string> = { mp4: "video/mp4", mp3: "audio/mpeg", png: "image/png", jpg: "image/jpeg" };
                    setAssetForm((p) => ({ ...p, kind: nextKind, mimeType: mimeByKind[nextKind] }));
                  }} className="w-full border border-gray-300 px-3 py-2 text-sm">
                    <option value="mp4">Video</option>
                    <option value="mp3">Audio</option>
                    <option value="png">Imagem (PNG)</option>
                    <option value="jpg">Imagem (JPG)</option>
                  </select>
                  <input value={assetForm.mimeType} readOnly className="w-full border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-500" aria-label="Formato interno do arquivo" />
                  <select value={assetForm.status} onChange={(event) => setAssetForm((p) => ({ ...p, status: event.target.value as AssetStatus }))} className="w-full border border-gray-300 px-3 py-2 text-sm">
                    <option value="rascunho">Em revisao</option>
                    <option value="publicado">Publicado</option>
                    <option value="arquivado">Arquivado</option>
                  </select>
                </div>
                <label className="text-xs font-semibold text-gray-700 block">Upload do arquivo</label>
                <input
                  type="file"
                  accept=".mp4,.mp3,.png,.jpg,.jpeg"
                  onChange={(event) => onAssetFileChange(event.target.files?.[0] ?? null)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm bg-white"
                />
                {assetFile ? (
                  <p className="text-xs text-gray-600">
                    Selecionado: <span className="font-semibold">{assetFile.name}</span> ({formatBytes(assetFile.size)})
                  </p>
                ) : null}
                <label className="text-xs font-semibold text-gray-700 block">Link manual (opcional)</label>
                <input
                  value={assetForm.storagePath}
                  onChange={(event) => setAssetForm((p) => ({ ...p, storagePath: event.target.value }))}
                  className="w-full border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Use somente se o arquivo ja estiver hospedado (https://...)"
                />
                <label className="text-xs font-semibold text-gray-700 block">Observacoes (opcional)</label>
                <textarea value={assetForm.metadataText} onChange={(event) => setAssetForm((p) => ({ ...p, metadataText: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm min-h-[100px]" placeholder="Ex.: Video de abertura da Etapa 1" />
                <button type="submit" disabled={busy === "asset"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">
                  {busy === "asset" ? "Enviando..." : assetFile ? "Enviar e Vincular Arquivo" : "Salvar Link do Arquivo"}
                </button>
                <div className="border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-700">Pre-visualizacao</p>
                  <p className="text-xs text-gray-600 mt-1">Atividade: {activitiesById.get(assetForm.activityId)?.title ?? "Nao selecionada"}</p>
                  <p className="text-xs text-gray-600">Tipo: {assetKindLabel(assetForm.kind)}</p>
                  <p className="text-xs text-gray-600">Status: {assetStatusLabel(assetForm.status)}</p>
                  <p className="text-xs text-gray-600 break-all">
                    Origem: {assetFile ? `Upload direto (${assetFile.name})` : assetForm.storagePath || "Nao definida"}
                  </p>
                </div>
              </form>

              <div className="border border-gray-300 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Atividade</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Tipo</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Situacao</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Arquivo</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Cadastrado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assets.map((asset) => (
                      <tr key={asset.id} className="border-b border-gray-200">
                        <td className="px-3 py-2 text-sm">{activitiesById.get(asset.activity_id)?.title ?? "-"}</td>
                        <td className="px-3 py-2 text-sm">{assetKindLabel(asset.kind)}</td>
                        <td className="px-3 py-2 text-sm">{assetStatusLabel(asset.status)}</td>
                        <td className="px-3 py-2 text-xs max-w-[260px]">
                          <a
                            href={asset.storage_path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-700 underline break-all"
                          >
                            Abrir arquivo
                          </a>
                        </td>
                        <td className="px-3 py-2 text-xs">{formatDate(asset.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          {tab === "telas" ? (
            <div className="space-y-4">
              <div className="border border-gray-300 bg-gray-50 p-4">
                <h2 className="font-bold text-gray-900">Importar Lista de Telas</h2>
                <p className="text-sm text-gray-600 mt-1">Se voce ja tiver uma lista pronta de telas, importe tudo de uma vez. Se nao, use o cadastro individual abaixo.</p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mt-3">
                  <input value={manifestPath} onChange={(event) => setManifestPath(event.target.value)} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Arquivo da lista de telas (ja vem preenchido)" />
                  <button type="button" onClick={onImportManifest} disabled={busy === "import"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">{busy === "import" ? "Importando..." : "Importar Lista"}</button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <form onSubmit={onCreateBlueprint} className="space-y-2 border border-gray-300 p-4">
                  <h2 className="font-bold text-gray-900">Nova Tela Mobile</h2>
                  <p className="text-xs text-gray-600">Cadastre as telas de referencia que vao orientar o desenvolvimento do app.</p>
                  <label className="text-xs font-semibold text-gray-700 block">Nome da tela</label>
                  <input value={blueprintForm.title} onChange={(event) => setBlueprintForm((p) => ({ ...p, title: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: Cadastro - Passo 1" required />
                  <label className="text-xs font-semibold text-gray-700 block">Identificador (opcional)</label>
                  <input value={blueprintForm.slug} onChange={(event) => setBlueprintForm((p) => ({ ...p, slug: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Ex.: cadastro-passo-1" />
                  <label className="text-xs font-semibold text-gray-700 block">Arquivo da tela (SVG)</label>
                  <input value={blueprintForm.svgPath} onChange={(event) => setBlueprintForm((p) => ({ ...p, svgPath: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Nome ou caminho do arquivo SVG" required />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={blueprintForm.stageTag} onChange={(event) => setBlueprintForm((p) => ({ ...p, stageTag: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Etapa (opcional)" />
                    <input value={blueprintForm.moduleCode} onChange={(event) => setBlueprintForm((p) => ({ ...p, moduleCode: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 text-sm" placeholder="Modulo relacionado (opcional)" />
                  </div>
                  <button type="submit" disabled={busy === "blueprint"} className="px-4 py-2 bg-gray-900 text-white text-sm disabled:opacity-60">{busy === "blueprint" ? "Salvando..." : "Salvar Tela"}</button>
                </form>

                <div className="border border-gray-300 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Titulo</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">SVG</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Etapa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.blueprints.map((blueprint) => (
                        <tr key={blueprint.id} className="border-b border-gray-200">
                          <td className="px-3 py-2 text-sm">{blueprint.title}</td>
                          <td className="px-3 py-2 text-xs">{blueprint.svg_path}</td>
                          <td className="px-3 py-2 text-sm">{blueprint.stage_tag || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
