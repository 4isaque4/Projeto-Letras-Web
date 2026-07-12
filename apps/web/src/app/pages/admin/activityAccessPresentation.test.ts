import { describe, expect, it } from "vitest";

import { getActivityStatePresentation } from "./activityAccessPresentation";

describe("activity access presentation", () => {
  it("keeps a completed available lesson replayable", () => {
    expect(getActivityStatePresentation({ accessStatus: "available", progressStatus: "completed" })).toEqual({
      label: "Concluída",
      actionLabel: "Bloquear",
      openLabel: "Refazer aula",
      tone: "success",
      icon: "circle-check",
    });
  });

  it("shows completion independently from a later manual lock", () => {
    expect(getActivityStatePresentation({ accessStatus: "locked", progressStatus: "completed" })).toMatchObject({
      label: "Concluída",
      actionLabel: "Liberar",
      openLabel: "Indisponível",
    });
  });

  it("presents a locked unfinished lesson without relying only on color", () => {
    expect(getActivityStatePresentation({ accessStatus: "locked", progressStatus: "not_started" })).toMatchObject({
      label: "Bloqueada",
      actionLabel: "Liberar",
      icon: "lock",
    });
  });
});
