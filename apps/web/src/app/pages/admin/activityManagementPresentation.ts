export interface ActivityPresentationInput {
  instructions?: string;
  type?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  letra: "Exercício de letras",
  quiz: "Exercício de escolha",
  audio: "Áudio",
  video: "Vídeo",
  image: "Imagem",
};

// `tutorNotes` / `educatorGuidance` no nível da aula são LEITURA LEGADA: o campo
// "Orientações para o alfabetizador — aula inteira" saiu do editor a pedido do
// cliente (issue #92) porque nunca chegava ao app. Aulas gravadas antes disso
// seguem exibindo o texto como descrição no card da trilha; aulas novas caem no
// texto genérico. Não reintroduzir o campo sem pedido do cliente.
export function presentActivityContent(activity: ActivityPresentationInput) {
  const raw = String(activity.instructions ?? "").trim();
  let description = raw;
  let screenCount = 1;
  if (raw.startsWith("{")) {
    try {
      const payload = JSON.parse(raw) as {
        blocks?: unknown[];
        screens?: unknown[];
        tutorNotes?: string;
        educatorGuidance?: string;
      };
      screenCount = Math.max(
        1,
        payload.blocks?.length ?? payload.screens?.length ?? 1,
      );
      description = String(
        payload.tutorNotes ?? payload.educatorGuidance ?? "",
      ).trim();
    } catch {
      description = "Orientações disponíveis na execução da aula.";
    }
  }
  if (!description || description.startsWith("{"))
    description = "Orientações disponíveis na execução da aula.";
  return {
    description,
    screenCount,
    typeLabel: TYPE_LABELS[String(activity.type ?? "").toLowerCase()] ?? "Aula",
  };
}

export function isCrossGroupMove(
  sourceModuleId: string,
  targetModuleId: string,
) {
  return sourceModuleId !== targetModuleId;
}
