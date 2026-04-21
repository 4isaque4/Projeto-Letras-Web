import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, FileText, HelpCircle, Upload } from "lucide-react";
import { useNavigate } from "react-router";
import StateDisplay from "../../../components/StateDisplay";
import { inferAssetKindFromFile } from "./cmsUtils";
import { useConteudoData } from "./useConteudoData";

const DEFAULT_STAGE_TWO_DIRECTORY = "C:\\Projetos\\letras-mobile-ref\\docs\\Conteudos das telas";

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

export default function ConteudoImportarTelasPage() {
  const navigate = useNavigate();
  const {
    data,
    loading,
    error,
    busy,
    feedback,
    setFeedback,
    importManifest,
    importAssetDirectory,
    uploadAsset,
    createBlueprint,
  } = useConteudoData();
  const [manifestPath, setManifestPath] = useState("assets/mobile/etapa-1/manifest.json");
  const [blueprintStageTag, setBlueprintStageTag] = useState("etapa-2-aulas");
  const [blueprintModuleCode, setBlueprintModuleCode] = useState("");
  const [blueprintFiles, setBlueprintFiles] = useState<File[]>([]);
  const [stageTwoDirectoryPath, setStageTwoDirectoryPath] = useState(DEFAULT_STAGE_TWO_DIRECTORY);
  const [stageTwoStageTag, setStageTwoStageTag] = useState("etapa-2-aulas");
  const [stageTwoModuleCode, setStageTwoModuleCode] = useState("etapa-2-figma");

  const latestBlueprints = useMemo(() => data.blueprints.slice(0, 8), [data.blueprints]);

  const onImportStageTwoDirectory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const imported = await importAssetDirectory({
      directoryPath: stageTwoDirectoryPath.trim() || DEFAULT_STAGE_TWO_DIRECTORY,
      activityId: null,
      status: "publicado",
      folder: "blueprints/etapa-2",
      metadata: {
        source: "blueprint-stage2-directory",
        stageTag: stageTwoStageTag.trim() || "etapa-2-aulas",
        moduleCode: stageTwoModuleCode.trim() || null,
      },
    });

    if (!imported) {
      return;
    }

    let upserted = 0;
    for (const item of imported.items ?? []) {
      if (!item.storagePath) {
        continue;
      }

      const title = stripFileExtension(item.fileName || "").trim() || "Tela etapa 2";
      const created = await createBlueprint({
        title,
        svgPath: item.storagePath,
        stageTag: stageTwoStageTag.trim() || "etapa-2-aulas",
        moduleCode: stageTwoModuleCode.trim() || undefined,
      });
      if (created) {
        upserted += 1;
      }
    }

    setFeedback({
      type: "ok",
      text: `Etapa 2 importada: ${imported.imported ?? 0} arquivo(s) enviados e ${upserted} tela(s) base cadastrada(s)/atualizada(s).`,
    });
  };

  const onUploadBlueprintFiles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blueprintFiles.length === 0) {
      return;
    }

    for (const file of blueprintFiles) {
      const uploaded = await uploadAsset({
        file,
        kind: inferAssetKindFromFile(file) ?? "png",
        status: "publicado",
        metadata: { source: "blueprint-upload", stageTag: blueprintStageTag },
      });

      if (!uploaded?.sourceUrl) {
        continue;
      }

      await createBlueprint({
        title: file.name.replace(/\.[^/.]+$/, ""),
        svgPath: uploaded.sourceUrl,
        stageTag: blueprintStageTag || undefined,
        moduleCode: blueprintModuleCode.trim() || undefined,
      });
    }

    setBlueprintFiles([]);
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
        <div
          className={`border px-4 py-3 text-sm ${
            feedback.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
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
              Agora voce tambem pode enviar arquivos de tela criados pelo alfabetizador e transformar em telas base na hora.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={onImportStageTwoDirectory} className="space-y-3 border border-slate-300 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Importar telas faltantes da etapa 2</h2>
          <p className="mt-2 text-sm text-slate-600">
            Lê a pasta local de referência do Figma (etapa 2), envia os arquivos e cria/atualiza as telas base automaticamente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={stageTwoDirectoryPath}
            onChange={(event) => setStageTwoDirectoryPath(event.target.value)}
            placeholder={DEFAULT_STAGE_TWO_DIRECTORY}
            className="border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={stageTwoStageTag}
            onChange={(event) => setStageTwoStageTag(event.target.value)}
            placeholder="Tag da etapa (ex.: etapa-2-aulas)"
            className="border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <input
            value={stageTwoModuleCode}
            onChange={(event) => setStageTwoModuleCode(event.target.value)}
            placeholder="Codigo de modulo (opcional)"
            className="border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy === "asset-import-directory" || busy === "blueprint"}
            className="inline-flex items-center justify-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {busy === "asset-import-directory" || busy === "blueprint"
              ? "Importando etapa 2..."
              : "Importar etapa 2 agora"}
          </button>
        </div>
      </form>

      <form onSubmit={onUploadBlueprintFiles} className="space-y-3 border border-slate-300 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Enviar telas por arquivo</h2>
          <p className="mt-2 text-sm text-slate-600">
            Envie imagens/SVG e reutilize essas telas no wizard de criacao de aulas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            value={blueprintStageTag}
            onChange={(event) => setBlueprintStageTag(event.target.value)}
            placeholder="Tag da etapa (ex.: etapa-2-aulas)"
            className="border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={blueprintModuleCode}
            onChange={(event) => setBlueprintModuleCode(event.target.value)}
            placeholder="Codigo do modulo (opcional)"
            className="border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="file"
            multiple
            accept="image/*,.svg"
            onChange={(event) => setBlueprintFiles(Array.from(event.target.files ?? []))}
            className="border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {blueprintFiles.length > 0 ? (
          <div className="max-h-24 space-y-1 overflow-auto border border-slate-200 bg-slate-50 p-2">
            {blueprintFiles.map((file) => (
              <p key={`blueprint-upload-${file.name}-${file.size}`} className="text-xs text-slate-600">
                {file.name}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy === "asset-upload" || busy === "blueprint" || blueprintFiles.length === 0}
            className="inline-flex items-center gap-2 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {busy === "asset-upload" || busy === "blueprint"
              ? "Enviando telas..."
              : `Enviar ${blueprintFiles.length || ""} arquivo(s)`}
          </button>
        </div>
      </form>

      <section className="border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-slate-300 bg-white">
          <FileText className="h-6 w-6 text-slate-600" />
        </div>
        <p className="mt-6 text-xl font-medium text-slate-900">Importar via manifest</p>
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
          <p className="mt-2 font-semibold text-slate-900">Enviar arquivo</p>
          <p className="text-sm text-slate-600">Suba imagens/SVG ou use um manifest pronto.</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="inline-flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-semibold text-white">2</p>
          <p className="mt-2 font-semibold text-slate-900">Cadastro automatico</p>
          <p className="text-sm text-slate-600">O sistema cria as telas base e prepara para o wizard.</p>
        </div>
        <div className="border border-slate-300 bg-white p-4">
          <p className="inline-flex h-8 w-8 items-center justify-center bg-slate-900 text-sm font-semibold text-white">3</p>
          <p className="mt-2 font-semibold text-slate-900">Reutilizar em aulas</p>
          <p className="text-sm text-slate-600">As telas aparecem em "Telas base" na criacao de aula.</p>
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
