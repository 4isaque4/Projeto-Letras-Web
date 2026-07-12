import { describe, expect, it } from "vitest";
import {
  isCrossGroupMove,
  presentActivityContent,
} from "./activityManagementPresentation";

describe("activity management presentation", () => {
  it("hides technical payload and reports its number of screens", () => {
    const result = presentActivityContent({
      instructions: JSON.stringify({
        blocks: [{}, {}, {}],
        tutorNotes: "Oriente a leitura.",
      }),
      type: "letra",
    });
    expect(result).toEqual({
      description: "Oriente a leitura.",
      screenCount: 3,
      typeLabel: "Exercício de letras",
    });
  });

  it("detects a movement between groups", () => {
    expect(isCrossGroupMove("m1", "m2")).toBe(true);
    expect(isCrossGroupMove("m1", "m1")).toBe(false);
  });
});
