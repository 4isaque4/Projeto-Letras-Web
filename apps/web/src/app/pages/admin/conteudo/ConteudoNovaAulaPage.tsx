import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { ActivityType, AssetKind, AssetStatus, Theme } from "./cmsTypes";
import { formatBytes, inferAssetKindFromFile } from "./cmsUtils";
import { useConteudoData } from "./useConteudoData";

const STEPS = ["Dados da trilha", "Montar tela", "Orientacoes", "Midias", "Revisar"] as const;

export default function ConteudoNovaAulaPage() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    createTheme,
    createModule,
    createActivity,
    uploadAsset,
    saveAssetLink,
    updateBlueprint,
    cmsThemes,
  } = useConteudoData();

  const [step, setStep] = useState(0);
  const [themeId, setThemeId] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [stageNumber, setStageNumber] = useState("1");
  const [lessonTitle, setLessonTitle] = useState("");
  const [previewName, setPreviewName] = useState("Maria Silva");
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState<string[]>([]);
  const [orientationTutor, setOrientationTutor] = useState("");
  const [orientationStudent, setOrientationStudent] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("video");
  const [isPublished, setIsPublished] = useState(false);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetLink, setAssetLink] = useState("");
  const [assetKind, setAssetKind] = useState<AssetKind>("mp4");
  const [assetStatus, setAssetStatus] = useState<AssetStatus>("rascunho");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const [wizardDone, setWizardDone] = useState(false);

  const selectedBlueprints = useMemo(
    () => data.blueprints.filter((item) => selectedBlueprintIds.includes(item.id)),
    [data.blueprints, selectedBlueprintIds],
  );

  if (loading) {
    return <StateDisplay type="loading" />;
  }

  if (error) {
    return <StateDisplay type="error" message={error} />;
  }

  const toggleBlueprint = (blueprintId: string) => {
    setSelectedBlueprintIds((previous) => {
      if (previous.includes(blueprintId)) {
        return previous.filter((item) => item !== blueprintId);
      }
      return [...previous, blueprintId];
    });
  };

  const resolveTheme = async () => {
    if (themeId) {
      return cmsThemes.find((item) => item.id === themeId) ?? null;
    }

    const candidate = newThemeName.trim();
    if (!candidate) {
      return null;
    }

    const created = await createTheme({ title: candidate });
    return created;
  };

  const validateCurrentStep = () => {
    setLocalError("");

    if (step === 0) {
      if (!themeId && !newThemeName.trim()) {
        setLocalError("Selecione um tema existente ou crie um novo tema.");
        return false;
      }
      if (!moduleTitle.trim()) {
        setLocalError("Informe o nome do modulo.");
        return false;
      }
      if (!lessonTitle.trim()) {
        setLocalError("Informe o nome da aula.");
        return false;
      }
    }

    if (step === 2 && !orientationTutor.trim() && !orientationStudent.trim()) {
      setLocalError("Inclua ao menos uma orientacao para registrar a aula.");
      return false;
    }

    return true;
  };

  const goNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setStep((previous) => Math.min(previous + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setLocalError("");
    setStep((previous) => Math.max(previous - 1, 0));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!validateCurrentStep()) {
      return;
    }

    try {
      setSubmitting(true);

      const resolvedTheme = await resolveTheme();
      if (!resolvedTheme) {
        setLocalError("Nao foi possivel definir o tema desta aula.");
        return;
      }

      const createdModule = await createModule({
        themeId: resolvedTheme.id,
        title: moduleTitle.trim(),
        description: moduleDescription.trim() || undefined,
        stageNumber: Number(stageNumber || "1"),
      });

      if (!createdModule) {
        return;
      }

      const instructions = [orientationTutor.trim(), orientationStudent.trim()].filter(Boolean).join("\n\n");

      const createdActivity = await createActivity({
        moduleId: createdModule.id,
        title: lessonTitle.trim(),
        type: activityType,
        instructions: instructions || undefined,
        isPublished,
      });

      if (!createdActivity) {
        return;
      }

      for (const blueprint of selectedBlueprints) {
        await updateBlueprint(blueprint.id, {
          moduleCode: createdModule.id,
          stageTag: blueprint.stage_tag || "etapa-1-aulas",
        });
      }

      if (assetFile) {
        const guessedKind = inferAssetKindFromFile(assetFile) ?? assetKind;
        await uploadAsset({
          activityId: createdActivity.id,
          file: assetFile,
          kind: guessedKind,
          status: assetStatus,
        });
      } else if (assetLink.trim()) {
        await saveAssetLink({
          activityId: createdActivity.id,
          kind: assetKind,
          status: assetStatus,
          storagePath: assetLink.trim(),
          mimeType: assetKind === "mp4" ? "video/mp4" : assetKind === "mp3" ? "audio/mpeg" : assetKind === "png" ? "image/png" : "image/jpeg",
          metadata: { source: "wizard-link" },
        });
      }

      setWizardDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Dados da Trilha</h2>
          <p className="text-sm text-slate-600">Escolha o tema por texto (sem imagem) e organize a aula.</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Tema do conteudo</label>
              <select
                value={themeId}
                onChange={(event) => setThemeId(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecione um tema</option>
                {cmsThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.title}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Plus className="h-4 w-4" />
                <span>Criar novo tema</span>
              </div>
              <input
                value={newThemeName}
                onChange={(event) => setNewThemeName(event.target.value)}
                placeholder="Ex.: Vida na Roca"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Modulo</label>
              <input
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
                placeholder="Ex.: Vogais, Consoante B, Letra M"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={moduleDescription}
                onChange={(event) => setModuleDescription(event.target.value)}
                placeholder="Resumo do modulo"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="block text-sm font-semibold text-slate-700">Etapa</label>
              <input
                type="number"
                value={stageNumber}
                min={1}
                onChange={(event) => setStageNumber(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Nome da aula</label>
              <input
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                placeholder="Ex.: Vogais - Letra A"
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />

              <label className="block text-sm font-semibold text-slate-700">Tipo da atividade</label>
              <select value={activityType} onChange={(event) => setActivityType(event.target.value as ActivityType)} className="w-full border border-slate-300 px-3 py-2 text-sm">
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="quiz">Quiz</option>
                <option value="letra">Letra</option>
              </select>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
                Publicar atividade ao criar
              </label>
            </div>

            <div className="space-y-2 border border-slate-300 bg-white p-4">
              <label className="block text-sm font-semibold text-slate-700">Nome do alfabetizando (preview)</label>
              <input
                value={previewName}
                onChange={(event) => setPreviewName(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500">Aparece no cabecalho da tela do aluno para simular a experiencia real.</p>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                Perfil de tela: <strong>Alfabetizador</strong> (etapa 1)
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Montar Tela</h2>
          <p className="text-sm text-slate-600">Selecione as telas base que serao vinculadas ao modulo criado.</p>

          {data.blueprints.length === 0 ? (
            <StateDisplay type="empty" message="Nenhuma tela base importada. Use 'Importar telas' antes." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.blueprints.map((blueprint) => {
                const selected = selectedBlueprintIds.includes(blueprint.id);
                return (
                  <button
                    key={blueprint.id}
                    type="button"
                    onClick={() => toggleBlueprint(blueprint.id)}
                    className={`border p-4 text-left transition ${selected ? "border-slate-900 bg-slate-100" : "border-slate-300 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{blueprint.title}</p>
                        <p className="text-xs text-slate-600">{blueprint.svg_path}</p>
                        <p className="mt-1 text-xs text-slate-500">{blueprint.stage_tag || "Sem etapa"}</p>
                      </div>
                      {selected ? <Check className="h-4 w-4 text-slate-900" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Orientacoes</h2>
          <p className="text-sm text-slate-600">Defina os textos de apoio para alfabetizador e alfabetizando.</p>

          <div className="space-y-2 border border-slate-300 bg-white p-4">
            <label className="block text-sm font-semibold text-slate-700">Orientacao para o alfabetizador</label>
            <textarea
              value={orientationTutor}
              onChange={(event) => setOrientationTutor(event.target.value)}
              rows={5}
              placeholder="Ex.: Explique o tema com palavras simples e exemplo do dia a dia."
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2 border border-slate-300 bg-white p-4">
            <label className="block text-sm font-semibold text-slate-700">Fala sugerida para o alfabetizando</label>
            <textarea
              value={orientationStudent}
              onChange={(event) => setOrientationStudent(event.target.value)}
              rows={5}
              placeholder="Ex.: Repita comigo: as palavras sao importantes para conversar."
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <h2 className="text-4xl font-semibold text-slate-900">Midias</h2>
          <p className="text-sm text-slate-600">Adicione arquivo local ou link manual para a aula.</p>

          <div className="space-y-3 border border-slate-300 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select value={assetKind} onChange={(event) => setAssetKind(event.target.value as AssetKind)} className="border border-slate-300 px-3 py-2 text-sm">
                <option value="mp4">Video</option>
                <option value="mp3">Audio</option>
                <option value="png">Imagem PNG</option>
                <option value="jpg">Imagem JPG</option>
              </select>
              <select value={assetStatus} onChange={(event) => setAssetStatus(event.target.value as AssetStatus)} className="border border-slate-300 px-3 py-2 text-sm">
                <option value="rascunho">Rascunho</option>
                <option value="publicado">Publicado</option>
                <option value="arquivado">Arquivado</option>
              </select>
              <input type="file" accept=".mp4,.mp3,.png,.jpg,.jpeg" onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} className="border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <input
              value={assetLink}
              onChange={(event) => setAssetLink(event.target.value)}
              placeholder="Link manual (opcional)"
              className="w-full border border-slate-300 px-3 py-2 text-sm"
            />
            {assetFile ? <p className="text-xs text-slate-500">Arquivo: {assetFile.name} ({formatBytes(assetFile.size)})</p> : null}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold text-slate-900">Revisar</h2>
        <p className="text-sm text-slate-600">Confira os dados antes de salvar no CMS.</p>

        <div className="space-y-2 border border-slate-300 bg-white p-4 text-sm text-slate-700">
          <p><strong>Tema:</strong> {themeId ? cmsThemes.find((item) => item.id === themeId)?.title : newThemeName || "-"}</p>
          <p><strong>Modulo:</strong> {moduleTitle || "-"}</p>
          <p><strong>Aula:</strong> {lessonTitle || "-"}</p>
          <p><strong>Tipo:</strong> {activityType}</p>
          <p><strong>Telas selecionadas:</strong> {selectedBlueprintIds.length}</p>
          <p><strong>Orientacao alfabetizador:</strong> {orientationTutor || "-"}</p>
          <p><strong>Orientacao alfabetizando:</strong> {orientationStudent || "-"}</p>
          <p><strong>Midia:</strong> {assetFile ? assetFile.name : assetLink || "Sem midia"}</p>
          <p><strong>Perfil no topo mobile:</strong> Alfabetizador</p>
          <p><strong>Nome de preview:</strong> {previewName}</p>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start justify-between">
        <button type="button" onClick={() => navigate("/admin/conteudo")} className="text-sm text-slate-700 hover:underline">Cancelar</button>
        <div className="text-right text-sm text-slate-600">
          <p>{selectedBlueprintIds.length} bloco(s)</p>
          <p>{assetFile || assetLink ? 1 : 0} midia(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6 border border-slate-300 bg-slate-50 p-6">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            {STEPS.map((label, index) => {
              const active = step === index;
              const done = step > index;
              return (
                <div key={label} className="flex min-w-[110px] items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center border text-sm font-semibold ${active ? "border-slate-900 bg-slate-900 text-white" : done ? "border-emerald-600 bg-emerald-100 text-emerald-700" : "border-slate-300 bg-white text-slate-500"}`}>
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`text-xs ${active ? "text-slate-900" : "text-slate-600"}`}>{label}</span>
                </div>
              );
            })}
          </div>

          {feedback ? (
            <div className={`border px-4 py-3 text-sm ${feedback.type === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}>
              {feedback.text}
            </div>
          ) : null}

          {localError ? (
            <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{localError}</div>
          ) : null}

          {wizardDone ? (
            <div className="space-y-4 border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
              <p className="text-lg font-semibold">Aula criada com sucesso!</p>
              <p className="text-sm">O modulo, atividade, telas selecionadas e midia foram integrados no fluxo web para mobile.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigate("/admin/conteudo")} className="border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Voltar ao painel</button>
                <button type="button" onClick={() => navigate("/mobile/modulos")} className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Abrir mobile de teste</button>
              </div>
            </div>
          ) : (
            <>
              {renderStep()}

              <div className="flex items-center justify-between border-t border-slate-300 pt-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>

                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={goNext} className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    Proximo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={submitting || Boolean(busy)} className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {submitting ? "Salvando..." : "Criar aula e integrar"}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="border border-slate-300 bg-white p-4">
          <div className="flex items-center gap-2 border-b border-slate-300 pb-3">
            <Eye className="h-4 w-4 text-slate-700" />
            <p className="text-sm font-semibold text-slate-900">Preview mobile</p>
          </div>

          <div className="mx-auto mt-4 w-[240px] rounded-[28px] border-[6px] border-slate-900 bg-white px-3 pb-4 pt-6">
            <div className="mb-3 rounded bg-slate-100 px-2 py-1 text-center text-xs font-medium text-slate-700">Tela do Alfabetizador</div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Modulo</p>
              <p className="font-semibold text-slate-900">{moduleTitle || "Novo modulo"}</p>
              <p className="mt-2 text-xs text-slate-500">Aula</p>
              <p className="text-sm text-slate-800">{lessonTitle || "Nova aula"}</p>
              <p className="mt-2 text-xs text-slate-500">Usuario em exibicao</p>
              <p className="text-sm text-slate-800">{previewName || "Alfabetizador"}</p>
              <p className="mt-2 text-xs text-slate-500">Telas selecionadas</p>
              <p className="text-sm text-slate-800">{selectedBlueprintIds.length}</p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
