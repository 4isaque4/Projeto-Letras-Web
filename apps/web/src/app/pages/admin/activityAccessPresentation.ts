export type ActivityAccessStatus = "locked" | "available";
export type ActivityProgressStatus = "not_started" | "nao_iniciado" | "em_andamento" | "completed" | "concluido";

interface ActivityState {
  accessStatus: ActivityAccessStatus;
  progressStatus: ActivityProgressStatus;
}

export function getActivityStatePresentation({ accessStatus, progressStatus }: ActivityState) {
  const completed = progressStatus === "completed" || progressStatus === "concluido";
  if (completed) {
    return {
      label: "Concluída",
      actionLabel: accessStatus === "available" ? "Bloquear" : "Liberar",
      openLabel: accessStatus === "available" ? "Refazer aula" : "Indisponível",
      tone: "success" as const,
      icon: "circle-check" as const,
    };
  }
  if (accessStatus === "locked") {
    return {
      label: "Bloqueada",
      actionLabel: "Liberar",
      openLabel: "Indisponível",
      tone: "muted" as const,
      icon: "lock" as const,
    };
  }
  return {
    label: progressStatus === "em_andamento" ? "Em andamento" : "Disponível",
    actionLabel: "Bloquear",
    openLabel: progressStatus === "em_andamento" ? "Continuar aula" : "Abrir aula",
    tone: "primary" as const,
    icon: progressStatus === "em_andamento" ? "clock" as const : "unlock" as const,
  };
}
