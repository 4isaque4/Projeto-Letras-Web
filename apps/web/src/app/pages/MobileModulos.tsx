import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Image as ImageIcon, Video } from "lucide-react";
import StateDisplay from "../components/StateDisplay";
import { apiGet } from "../core/api/client";
import { env } from "../core/config/env";
import { resolvePublicAssetUrl } from "./admin/conteudo/cmsUtils";

interface ThemeItem {
  id: string;
  title: string;
  description?: string;
  sort_order?: number;
}

interface ModuleItem {
  id: string;
  theme_id: string;
  title: string;
  description?: string;
  stage_number?: number;
  sort_order?: number;
}

interface ActivityItem {
  id: string;
  module_id: string;
  title: string;
  type: string;
  instructions?: string;
  is_published?: boolean;
  sort_order?: number;
}

interface ConteudoResponse {
  themes: ThemeItem[];
  modules: ModuleItem[];
  activities: ActivityItem[];
  assets: unknown[];
}

interface MatchLetterItem {
  id: string;
  label: string;
  imageUrl: string | null;
  wordAudioUrl: string | null;
}

interface MarkImageItem {
  id: string;
  label: string;
  imageUrl: string | null;
  isCorrect: boolean;
}

interface MatchLetterInstructions {
  screenTemplate: "exercise-match-letter";
  letraAlvo: string;
  instructionAudioUrl: string | null;
  exercise: { items: MatchLetterItem[] };
}

interface MarkImagesInstructions {
  screenTemplate: "exercise-mark-images";
  instructionText: string;
  instructionAudioUrl: string | null;
  exercise: { items: MarkImageItem[] };
}

interface VideoInstructions {
  screenTemplate: "video";
  videoUrl: string | null;
  instructionText: string | null;
  instructionAudioUrl: string | null;
}

interface CompositeVideoBlock {
  type: "video";
  videoUrl: string | null;
  instrText: string;
  instrAudioUrl: string | null;
}

interface CompositeMatchBlock {
  type: "exercise-match-letter";
  letraAlvo: string;
  instructionAudioUrl: string | null;
  exercise: { items: MatchLetterItem[] };
}

interface CompositeMarkBlock {
  type: "exercise-mark-images";
  instructionText: string;
  instructionAudioUrl: string | null;
  exercise: { items: MarkImageItem[] };
}

type CompositeBlock = CompositeVideoBlock | CompositeMatchBlock | CompositeMarkBlock;

interface CompositeInstructions {
  screenTemplate: "composite";
  blocks: CompositeBlock[];
}

// ─── V2 block schema ──────────────────────────────────────────────────────────

interface V2TextBlock { id: string; type: "text"; content: string; audience: "educator" | "learner" | "both" }
interface V2ImageBlock { id: string; type: "image"; url: string; caption?: string }
interface V2VideoBlock { id: string; type: "video"; url: string; caption?: string }
interface V2AudioBlock { id: string; type: "audio"; url: string; caption?: string }
interface V2ExerciseMatchBlock {
  id: string; type: "exercise-match-letter";
  letter: string; instruction: string; instructionAudioUrl?: string;
  rows: Array<{ id: string; label: string; imageUrl?: string; wordAudioUrl?: string; options?: string[]; correctOption?: string }>;
}
interface V2ExerciseMarkBlock {
  id: string; type: "exercise-mark-images";
  letter: string; instruction: string; instructionAudioUrl?: string;
  rows: Array<{ id: string; label: string; imageUrl?: string; audioUrl?: string; isCorrectTarget: boolean }>;
}
type V2Block = V2TextBlock | V2ImageBlock | V2VideoBlock | V2AudioBlock | V2ExerciseMatchBlock | V2ExerciseMarkBlock;
interface V2Instructions { schema: "letras-stage2-v2"; blocks: V2Block[] }

// ─────────────────────────────────────────────────────────────────────────────

type ParsedInstructions =
  | MatchLetterInstructions
  | MarkImagesInstructions
  | VideoInstructions
  | CompositeInstructions
  | V2Instructions
  | null;

const EMPTY_DATA: ConteudoResponse = { themes: [], modules: [], activities: [], assets: [] };

function parseInstructions(raw?: string): ParsedInstructions {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedInstructions;
  } catch {
    return null;
  }
}

function toUrl(path: string | null | undefined): string {
  if (!path) return "";
  return resolvePublicAssetUrl(path, env.supabaseUrl ?? "");
}

// Player de áudio do preview: um único áudio por vez, com toggle.
// Clicar de novo no alto-falante que está tocando PARA o áudio (queixa:
// "não para quando clicamos"). O `src` que está tocando fica num store
// externo simples para os botões refletirem o estado (verde escuro
// enquanto toca) via useSyncExternalStore.
let activePreviewAudio: HTMLAudioElement | null = null;
let activePreviewSrc: string | null = null;
const previewAudioListeners = new Set<() => void>();

function emitPreviewAudioChange() {
  previewAudioListeners.forEach((listener) => listener());
}

function subscribePreviewAudio(listener: () => void) {
  previewAudioListeners.add(listener);
  return () => {
    previewAudioListeners.delete(listener);
  };
}

function clearActivePreviewAudio() {
  activePreviewAudio = null;
  activePreviewSrc = null;
  emitPreviewAudioChange();
}

function stopPreviewAudio() {
  if (activePreviewAudio) {
    activePreviewAudio.pause();
    activePreviewAudio.currentTime = 0;
  }
  if (activePreviewSrc !== null) {
    clearActivePreviewAudio();
  }
}

function playPreviewAudio(src: string) {
  if (!src) return;
  // Toggle: clicar de novo no áudio que já está tocando o interrompe.
  if (activePreviewSrc === src) {
    stopPreviewAudio();
    return;
  }
  if (activePreviewAudio) {
    activePreviewAudio.pause();
    activePreviewAudio.currentTime = 0;
  }
  const audio = new Audio(src);
  activePreviewAudio = audio;
  activePreviewSrc = src;
  audio.addEventListener("ended", () => {
    if (activePreviewAudio === audio) clearActivePreviewAudio();
  });
  void audio.play().catch(() => {
    // Autoplay/format bloqueado: limpa o estado para o botão não ficar preso "tocando".
    if (activePreviewAudio === audio) clearActivePreviewAudio();
  });
  emitPreviewAudioChange();
}

function PreviewSoundButton({ src, large = false }: { src?: string; large?: boolean }) {
  const resolvedSrc = src ?? "";
  const isPlaying = useSyncExternalStore(
    subscribePreviewAudio,
    () => resolvedSrc !== "" && activePreviewSrc === resolvedSrc,
  );
  const color = large || isPlaying ? "#2fa536" : "#9be39f";
  return (
    <button
      type="button"
      onClick={() => playPreviewAudio(resolvedSrc)}
      className={`flex shrink-0 items-center justify-center transition hover:opacity-80 active:scale-95 ${
        large ? "h-[68px] w-[86px]" : "h-[38px] w-12"
      }`}
      aria-label={isPlaying ? "Parar áudio" : "Reproduzir áudio"}
      aria-pressed={isPlaying}
    >
      <svg
        width={large ? 66 : 38}
        height={large ? 54 : 32}
        viewBox="0 0 66 54"
        fill="none"
        aria-hidden="true"
      >
        <path d="M8 22H19L33 10V44L19 32H8V22Z" fill={color} />
        <path
          d="M42 20C45 23.5 45 30.5 42 34"
          stroke={color}
          strokeWidth={large ? 4.5 : 4}
          strokeLinecap="round"
        />
        <path
          d="M49 15C55 21 55 33 49 39"
          stroke={color}
          strokeWidth={large ? 4.5 : 4}
          strokeLinecap="round"
        />
        {large ? (
          <path
            d="M56 10C65 19 65 35 56 44"
            stroke={color}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        ) : null}
      </svg>
    </button>
  );
}

function PreviewNextArrow() {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="55" height="46" viewBox="0 0 55 46" fill="none" aria-hidden="true">
        <path
          d="M4 17H30V8L51 23L30 38V29H4V17Z"
          stroke="#8fd17e"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[10px] font-semibold lowercase text-[#8fd17e]">avançar</span>
    </div>
  );
}

function PhonePreview({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px] rounded-[18px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-8">
        <img src="/logo-letras.png" alt="Letras" className="h-6 w-auto object-contain" />
      </div>
      {children}
      <div className="mt-10 flex justify-center">
        <PreviewNextArrow />
      </div>
    </div>
  );
}

function LetterBoxes({ count }: { count: number }) {
  return (
    <div className="ml-[58px] mt-1 flex flex-wrap gap-1">
      {Array.from({ length: Math.max(1, count) }).map((_, index) => (
        <span key={index} className="h-8 w-8 rounded-[3px] border-2 border-slate-300 bg-white" />
      ))}
    </div>
  );
}

function MatchLetterView({ instr }: { instr: MatchLetterInstructions }) {
  return (
    <PhonePreview>
      <div className="mb-7 flex justify-center">
        <PreviewSoundButton src={toUrl(instr.instructionAudioUrl)} large />
      </div>

      <div className="space-y-7">
        {instr.exercise.items.map((item) => {
          const imgUrl = toUrl(item.imageUrl);
          const wordLength = String(item.label || "").trim().replace(/\s+/g, "").length;
          return (
            <div key={item.id}>
              <div className="flex items-center gap-6 pl-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt={item.label} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <PreviewSoundButton src={toUrl(item.wordAudioUrl)} />
              </div>
              <LetterBoxes count={wordLength} />
            </div>
          );
        })}
      </div>
    </PhonePreview>
  );
}

function MarkImagesView({ instr }: { instr: MarkImagesInstructions }) {
  return (
    <PhonePreview>
      <div className="mb-5 flex justify-center">
        <PreviewSoundButton src={toUrl(instr.instructionAudioUrl)} large />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {instr.exercise.items.map((item) => {
          const imgUrl = toUrl(item.imageUrl);
          return (
            <div
              key={item.id}
              className={`relative flex min-h-[104px] flex-col items-center justify-center rounded-[6px] border bg-white p-2 ${
                item.isCorrect ? "border-[#8fd17e] ring-1 ring-[#8fd17e]" : "border-slate-200"
              }`}
            >
              <div className="flex h-16 items-center justify-center">
                {imgUrl ? (
                  <img src={imgUrl} alt={item.label} className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-slate-300" />
                )}
              </div>
              <span className="mt-1 text-[11px] text-slate-600">{item.label}</span>
              {item.isCorrect ? (
                <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full bg-[#8fd17e]" />
              ) : null}
            </div>
          );
        })}
      </div>
    </PhonePreview>
  );
}

function VideoBlockView({
  videoUrl,
  instrText,
  instrAudioUrl,
}: {
  videoUrl: string | null;
  instrText?: string | null;
  instrAudioUrl?: string | null;
}) {
  const url = toUrl(videoUrl);
  return (
    <PhonePreview>
      {instrAudioUrl ? (
        <div className="mb-4 flex justify-center">
          <PreviewSoundButton src={toUrl(instrAudioUrl)} large />
        </div>
      ) : null}
      {url ? (
        <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded bg-black">
          <video
            src={url}
            controls
            preload="metadata"
            playsInline
            className="aspect-[9/16] h-auto w-full bg-black object-contain"
          />
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50">
          <Video className="h-8 w-8 text-slate-300" />
        </div>
      )}
      {instrText ? <p className="mt-4 text-center text-xs leading-5 text-slate-500">{instrText}</p> : null}
    </PhonePreview>
  );
}

function V2BlocksView({ blocks }: { blocks: V2Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === "text") {
          const audienceLabel =
            block.audience === "educator" ? "Alfabetizador" :
            block.audience === "learner" ? "Alfabetizando" : null;
          return (
            <div key={block.id} className={`rounded border px-4 py-3 text-sm ${
              block.audience === "educator"
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : block.audience === "learner"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700"
            }`}>
              {audienceLabel && (
                <p className="mb-1 text-[10px] font-semibold uppercase opacity-60">{audienceLabel}</p>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{block.content}</p>
            </div>
          );
        }

        if (block.type === "image") {
          const url = toUrl(block.url);
          return (
            <div key={block.id} className="overflow-hidden rounded border border-slate-200 bg-white">
              {url ? (
                <img src={url} alt={block.caption ?? ""} className="mx-auto max-h-56 object-contain" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-slate-100">
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                </div>
              )}
              {block.caption && <p className="px-3 py-2 text-center text-xs text-slate-500">{block.caption}</p>}
            </div>
          );
        }

        if (block.type === "video") {
          return (
            <VideoBlockView key={block.id} videoUrl={block.url} instrText={block.caption} />
          );
        }

        if (block.type === "audio") {
          const url = toUrl(block.url);
          return (
            <div key={block.id} className="flex items-center gap-3 rounded border border-teal-200 bg-teal-50 px-4 py-3">
              <PreviewSoundButton src={url} />
              <span className="text-sm text-teal-800">{block.caption || "Áudio"}</span>
            </div>
          );
        }

        if (block.type === "exercise-match-letter") {
          const adapted: MatchLetterInstructions = {
            screenTemplate: "exercise-match-letter",
            letraAlvo: block.letter,
            instructionAudioUrl: block.instructionAudioUrl ?? null,
            exercise: {
              items: (block.rows ?? []).map((row) => ({
                id: row.id,
                label: row.label,
                imageUrl: row.imageUrl ?? null,
                wordAudioUrl: row.wordAudioUrl ?? null,
              })),
            },
          };
          return <MatchLetterView key={block.id} instr={adapted} />;
        }

        if (block.type === "exercise-mark-images") {
          const adapted: MarkImagesInstructions = {
            screenTemplate: "exercise-mark-images",
            instructionText: block.instruction,
            instructionAudioUrl: block.instructionAudioUrl ?? null,
            exercise: {
              items: (block.rows ?? []).map((row) => ({
                id: row.id,
                label: row.label,
                imageUrl: row.imageUrl ?? null,
                isCorrect: row.isCorrectTarget,
              })),
            },
          };
          return <MarkImagesView key={block.id} instr={adapted} />;
        }

        return null;
      })}
    </div>
  );
}

function RenderInstructions({ parsed }: { parsed: ParsedInstructions }) {
  if (!parsed) {
    return <p className="text-sm text-slate-400">Nenhum conteudo configurado nesta aula.</p>;
  }

  // V2 multi-block format
  if ((parsed as V2Instructions).schema === "letras-stage2-v2") {
    return <V2BlocksView blocks={(parsed as V2Instructions).blocks ?? []} />;
  }

  if ((parsed as MatchLetterInstructions).screenTemplate === "exercise-match-letter") {
    return <MatchLetterView instr={parsed as MatchLetterInstructions} />;
  }

  if ((parsed as MarkImagesInstructions).screenTemplate === "exercise-mark-images") {
    return <MarkImagesView instr={parsed as MarkImagesInstructions} />;
  }

  if ((parsed as VideoInstructions).screenTemplate === "video") {
    const instr = parsed as VideoInstructions;
    return (
      <VideoBlockView
        videoUrl={instr.videoUrl}
        instrText={instr.instructionText}
        instrAudioUrl={instr.instructionAudioUrl}
      />
    );
  }

  if ((parsed as CompositeInstructions).screenTemplate === "composite") {
    return (
      <div className="space-y-4">
        {(parsed as CompositeInstructions).blocks.map((block, index) => (
          <div key={index}>
            {block.type === "video" ? (
              <VideoBlockView
                videoUrl={(block as CompositeVideoBlock).videoUrl}
                instrText={(block as CompositeVideoBlock).instrText}
                instrAudioUrl={(block as CompositeVideoBlock).instrAudioUrl}
              />
            ) : null}
            {block.type === "exercise-match-letter" ? (
              <MatchLetterView instr={block as unknown as MatchLetterInstructions} />
            ) : null}
            {block.type === "exercise-mark-images" ? (
              <MarkImagesView instr={block as unknown as MarkImagesInstructions} />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-slate-400">Preview indisponivel para este tipo de aula.</p>;
}

function ActivityCard({
  activity,
  isHighlighted,
}: {
  activity: ActivityItem;
  isHighlighted: boolean;
}) {
  const [expanded, setExpanded] = useState(isHighlighted);
  const parsed = parseInstructions(activity.instructions);

  return (
    <div
      id={`activity-${activity.id}`}
      className={`overflow-hidden border transition-shadow ${
        isHighlighted ? "border-[#8fd17e] shadow-sm" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${
          isHighlighted ? "bg-[#f3fbf0] hover:bg-[#eef8ea]" : "bg-white hover:bg-slate-50"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{activity.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {activity.is_published ? "Publicada" : "Rascunho"}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <RenderInstructions parsed={parsed} />
        </div>
      ) : null}
    </div>
  );
}

export default function MobileModulos() {
  const [data, setData] = useState<ConteudoResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);

  // Interrompe qualquer áudio ao sair da tela — sem isso o preview seguiria
  // tocando após navegar para outra página.
  useEffect(() => stopPreviewAudio, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = (await apiGet("/painel/conteudo")) as Partial<ConteudoResponse>;
        if (!active) return;
        setData({
          themes: payload.themes ?? [],
          modules: payload.modules ?? [],
          activities: payload.activities ?? [],
          assets: payload.assets ?? [],
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar conteudo.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const modulesByThemeId = useMemo(() => {
    const map = new Map<string, ModuleItem[]>();
    for (const moduleItem of data.modules) {
      const current = map.get(moduleItem.theme_id) ?? [];
      current.push(moduleItem);
      map.set(moduleItem.theme_id, current);
    }
    for (const [key, items] of map.entries()) {
      items.sort(
        (a, b) =>
          Number(a.stage_number ?? 0) - Number(b.stage_number ?? 0) ||
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      );
      map.set(key, items);
    }
    return map;
  }, [data.modules]);

  const activitiesByModuleId = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    for (const activity of data.activities) {
      const current = map.get(activity.module_id) ?? [];
      current.push(activity);
      map.set(activity.module_id, current);
    }
    for (const [key, items] of map.entries()) {
      items.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
      map.set(key, items);
    }
    return map;
  }, [data.activities]);

  const sortedThemes = useMemo(
    () => [...data.themes].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [data.themes],
  );

  useEffect(() => {
    if (loading || data.activities.length === 0) return;
    const match = /^#activity-([0-9a-f-]+)$/i.exec(window.location.hash);
    if (!match) return;

    const activityId = match[1];
    const activity = data.activities.find((item) => item.id === activityId);
    if (!activity) return;

    const moduleItem = data.modules.find((item) => item.id === activity.module_id);
    if (!moduleItem) return;

    setExpandedThemeId(moduleItem.theme_id);
    setExpandedModuleId(moduleItem.id);
    setHighlightedActivityId(activityId);
    const timer = window.setTimeout(() => {
      document.getElementById(`activity-${activityId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loading, data.activities, data.modules]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Preview de Aulas</h1>
        <p className="mt-1 text-sm text-slate-500">
          O preview abaixo segue o mesmo padrao visual do mobile.
        </p>
      </div>

      {loading ? (
        <StateDisplay type="loading" />
      ) : error ? (
        <StateDisplay type="error" message={error} />
      ) : sortedThemes.length === 0 ? (
        <StateDisplay type="empty" message="Nenhum tema cadastrado." />
      ) : (
        <div className="space-y-3">
          {sortedThemes.map((theme) => {
            const modules = modulesByThemeId.get(theme.id) ?? [];
            const isOpen = expandedThemeId === theme.id;
            const totalActivities = modules.reduce(
              (sum, moduleItem) => sum + (activitiesByModuleId.get(moduleItem.id)?.length ?? 0),
              0,
            );

            return (
              <section key={theme.id} className="overflow-hidden border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setExpandedThemeId(isOpen ? null : theme.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{theme.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {modules.length} modulo(s) - {totalActivities} aula(s)
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {isOpen ? (
                  <div className="divide-y divide-slate-100 border-t border-slate-200">
                    {modules.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-slate-400">Sem modulos neste tema.</p>
                    ) : (
                      modules.map((moduleItem) => {
                        const activities = activitiesByModuleId.get(moduleItem.id) ?? [];
                        const isModuleOpen = expandedModuleId === moduleItem.id;

                        return (
                          <div key={moduleItem.id} className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() => setExpandedModuleId(isModuleOpen ? null : moduleItem.id)}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800">
                                  {moduleItem.stage_number ? `Etapa ${moduleItem.stage_number} - ` : ""}
                                  {moduleItem.title}
                                </p>
                                <p className="text-xs text-slate-400">{activities.length} aula(s)</p>
                              </div>
                              {isModuleOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              )}
                            </button>

                            {isModuleOpen ? (
                              <div className="mt-3 space-y-2">
                                {activities.length === 0 ? (
                                  <p className="text-sm text-slate-400">Sem aulas neste modulo.</p>
                                ) : (
                                  activities.map((activity) => (
                                    <ActivityCard
                                      key={activity.id}
                                      activity={activity}
                                      isHighlighted={highlightedActivityId === activity.id}
                                    />
                                  ))
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

