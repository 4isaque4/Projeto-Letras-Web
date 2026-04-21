import { useEffect, useMemo, useState } from "react";
import StateDisplay from "../components/StateDisplay";
import { apiGet } from "../core/api/client";

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
  sort_order?: number;
}

interface AssetItem {
  id: string;
  activity_id: string;
  kind: string;
  storage_path: string;
  status: string;
}

interface ConteudoResponse {
  themes: ThemeItem[];
  modules: ModuleItem[];
  activities: ActivityItem[];
  assets: AssetItem[];
}

interface InstructionPreview {
  text: string;
  template?: string;
  itemsCount?: number;
}

function summarizeInstruction(rawValue?: string): InstructionPreview {
  const raw = String(rawValue ?? "").trim();
  if (!raw) {
    return { text: "Sem orientacao cadastrada." };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const exercise =
        parsed.exercise && typeof parsed.exercise === "object" && !Array.isArray(parsed.exercise)
          ? (parsed.exercise as Record<string, unknown>)
          : null;
      const template =
        typeof exercise?.template === "string"
          ? exercise.template
          : typeof parsed.screenTemplate === "string"
            ? parsed.screenTemplate
            : undefined;
      const itemsCount = Array.isArray(exercise?.items) ? exercise?.items.length : undefined;
      const instructionText =
        (typeof exercise?.instructionText === "string" && exercise.instructionText.trim()) ||
        (typeof parsed.learnerSpeech === "string" && parsed.learnerSpeech.trim()) ||
        (typeof parsed.educatorGuidance === "string" && parsed.educatorGuidance.trim()) ||
        "";

      return {
        text: instructionText || "Fluxo estruturado da etapa 2 configurado.",
        template,
        itemsCount,
      };
    }
  } catch {
    // raw text; keep fallback below
  }

  if (raw.length <= 180) {
    return { text: raw };
  }

  return {
    text: `${raw.slice(0, 177)}...`,
  };
}

const EMPTY_DATA: ConteudoResponse = {
  themes: [],
  modules: [],
  activities: [],
  assets: [],
};

export default function MobileModulos() {
  const [data, setData] = useState<ConteudoResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const payload = (await apiGet("/painel/conteudo")) as Partial<ConteudoResponse>;
        if (!active) {
          return;
        }
        setData({
          themes: payload.themes ?? [],
          modules: payload.modules ?? [],
          activities: payload.activities ?? [],
          assets: payload.assets ?? [],
        });
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar modulos do mobile.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

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

    for (const [themeId, items] of map.entries()) {
      items.sort(
        (a, b) =>
          Number(a.stage_number ?? 0) - Number(b.stage_number ?? 0) ||
          Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
      );
      map.set(themeId, items);
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

    for (const [moduleId, items] of map.entries()) {
      items.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
      map.set(moduleId, items);
    }

    return map;
  }, [data.activities]);

  const assetsByActivityId = useMemo(() => {
    const map = new Map<string, AssetItem[]>();

    for (const asset of data.assets) {
      const current = map.get(asset.activity_id) ?? [];
      current.push(asset);
      map.set(asset.activity_id, current);
    }

    return map;
  }, [data.assets]);

  const sortedThemes = useMemo(() => {
    return [...data.themes].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  }, [data.themes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mobile - Modulos</h1>
        <p className="text-sm text-gray-600 mt-1">Visualizacao web do fluxo de trilhas, modulos e midias do mobile.</p>
      </div>

      {loading ? (
        <StateDisplay type="loading" />
      ) : error ? (
        <StateDisplay type="error" message={error} />
      ) : sortedThemes.length === 0 ? (
        <StateDisplay type="empty" message="Nenhuma trilha encontrada no conteudo." />
      ) : (
        <div className="space-y-4">
          {sortedThemes.map((theme) => {
            const modules = modulesByThemeId.get(theme.id) ?? [];
            const isThemeExpanded = expandedThemeId === theme.id;

            return (
              <section key={theme.id} className="border border-gray-300 bg-white">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{theme.title}</p>
                    <p className="text-sm text-gray-600">{theme.description || "Sem descricao"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedThemeId(isThemeExpanded ? null : theme.id)}
                    className="border border-gray-400 px-3 py-1 text-xs font-semibold hover:bg-gray-100"
                  >
                    {isThemeExpanded ? "Ocultar dados da trilha" : "Ver dados da trilha"}
                  </button>
                </div>

                {isThemeExpanded ? (
                  modules.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-600">Sem modulos cadastrados nesta trilha.</div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {modules.map((moduleItem) => {
                        const activities = activitiesByModuleId.get(moduleItem.id) ?? [];
                        const isModuleExpanded = expandedModuleId === moduleItem.id;

                        return (
                          <div key={moduleItem.id} className="px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">Etapa {moduleItem.stage_number ?? 1} - {moduleItem.title}</p>
                                <p className="text-sm text-gray-600">{moduleItem.description || "Sem descricao"}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedModuleId(isModuleExpanded ? null : moduleItem.id)}
                                className="border border-gray-400 px-3 py-1 text-xs hover:bg-gray-100"
                              >
                                {isModuleExpanded ? "Ocultar aulas" : `Ver aulas (${activities.length})`}
                              </button>
                            </div>

                            {isModuleExpanded ? (
                              activities.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500">Sem atividades neste modulo.</p>
                              ) : (
                                <ul className="mt-3 space-y-3">
                                  {activities.map((activity) => {
                                    const assets = assetsByActivityId.get(activity.id) ?? [];
                                    const instructionPreview = summarizeInstruction(activity.instructions);
                                    return (
                                      <li key={activity.id} className="border border-gray-200 bg-gray-50 px-3 py-3">
                                        <p className="font-medium text-gray-900">{activity.title}</p>
                                        <p className="text-xs text-gray-600 mt-1">Tipo: {activity.type}</p>
                                        <p className="text-sm text-gray-700 mt-1">{instructionPreview.text}</p>
                                        {instructionPreview.template || instructionPreview.itemsCount ? (
                                          <div className="mt-2 flex flex-wrap items-center gap-1">
                                            {instructionPreview.template ? (
                                              <span className="border border-gray-300 bg-white px-2 py-0.5 text-[10px] uppercase text-gray-600">
                                                {instructionPreview.template}
                                              </span>
                                            ) : null}
                                            {instructionPreview.itemsCount ? (
                                              <span className="border border-gray-300 bg-white px-2 py-0.5 text-[10px] text-gray-600">
                                                {instructionPreview.itemsCount} item(ns)
                                              </span>
                                            ) : null}
                                          </div>
                                        ) : null}
                                        {assets.length > 0 ? (
                                          <div className="mt-2 space-y-1">
                                            {assets.map((asset) => (
                                              <a
                                                key={asset.id}
                                                href={asset.storage_path}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block text-xs text-blue-700 underline"
                                              >
                                                [{asset.kind}] {asset.storage_path}
                                              </a>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="mt-2 text-xs text-gray-500">Sem midia vinculada nesta atividade.</p>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
