export type ActivityType = "video" | "quiz" | "audio" | "letra";
export type AssetKind = "png" | "mp4" | "mp3" | "jpg" | "wav";
export type AssetStatus = "rascunho" | "publicado" | "arquivado";

export interface Theme {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  description?: string | null;
}

export interface ModuleItem {
  id: string;
  theme_id: string;
  title: string;
  stage_number: number;
  stage_id?: string;
  sort_order?: number;
  description?: string | null;
}

export interface Activity {
  id: string;
  module_id: string;
  title: string;
  type: ActivityType;
  sort_order: number;
  instructions?: string | null;
  is_published?: boolean;
}

export interface Asset {
  id: string;
  activity_id?: string | null;
  kind: AssetKind;
  status: AssetStatus;
  storage_path: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Blueprint {
  id: string;
  title: string;
  slug: string;
  svg_path: string;
  stage_tag: string | null;
  module_code: string | null;
}

export interface Stage {
  id: string;
  theme_id: string;
  stage_number: number;
  title: string;
  description?: string | null;
  sort_order?: number;
}

export interface ConteudoData {
  themes: Theme[];
  stages: Stage[];
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

export const EMPTY_DATA: ConteudoData = {
  themes: [],
  stages: [],
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
