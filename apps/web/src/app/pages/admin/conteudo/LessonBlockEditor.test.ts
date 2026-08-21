import { describe, expect, it } from "vitest";
import {
  deserializeToBlocks,
  serializeBlocks,
  type GifBlock,
  type LessonBlock,
} from "./LessonBlockEditor";

describe("LessonBlockEditor serialization", () => {
  it("serializes with the canonical letras-stage2-v2 schema", () => {
    const blocks: LessonBlock[] = [
      { id: "t1", type: "text", content: "Ola", audience: "educator" },
    ];

    const parsed = JSON.parse(serializeBlocks(blocks));

    expect(parsed.schema).toBe("letras-stage2-v2");
    expect(parsed.screenTemplate).toBe("composite");
    expect(Array.isArray(parsed.blocks)).toBe(true);
  });

  it("returns an empty string for an empty block list", () => {
    expect(serializeBlocks([])).toBe("");
  });

  it("round-trips a GIF block preserving type, url and caption", () => {
    const gif: GifBlock = {
      id: "g1",
      type: "gif",
      url: "https://cdn.exemplo/anim.gif",
      caption: "Movimento da letra A",
    };

    const restored = deserializeToBlocks(serializeBlocks([gif]));

    expect(restored).toHaveLength(1);
    const [block] = restored;
    expect(block.type).toBe("gif");
    expect(block).toMatchObject({
      id: "g1",
      url: "https://cdn.exemplo/anim.gif",
      caption: "Movimento da letra A",
    });
  });

  it("preserves the order of mixed blocks through a round-trip", () => {
    const blocks: LessonBlock[] = [
      { id: "t1", type: "text", content: "Introducao", audience: "educator" },
      { id: "g1", type: "gif", url: "g.gif", caption: "gif" },
      { id: "i1", type: "image", url: "i.png", caption: "imagem" },
      { id: "a1", type: "audio", url: "a.mp3", caption: "audio" },
    ];

    const restored = deserializeToBlocks(serializeBlocks(blocks));

    expect(restored.map((b) => b.id)).toEqual(["t1", "g1", "i1", "a1"]);
    expect(restored.map((b) => b.type)).toEqual([
      "text",
      "gif",
      "image",
      "audio",
    ]);
  });

  it("assigns ids to blocks that arrive without one", () => {
    const raw = JSON.stringify({
      schema: "letras-stage2-v2",
      screenTemplate: "composite",
      blocks: [{ type: "gif", url: "x.gif", caption: "" }],
    });

    const [block] = deserializeToBlocks(raw);

    expect(block.type).toBe("gif");
    expect(block.id).toMatch(/^gif-/);
  });

  it("serializes exercise-match-letter rows into options and correctOptions", () => {
    const blocks: LessonBlock[] = [
      {
        id: "ex1",
        type: "exercise-match-letter",
        letter: "A",
        instruction: "Encontre a letra",
        instructionAudioUrl: "",
        maxAttempts: 3,
        progressiveUnlock: true,
        reinforcementText: "",
        reinforcementAudioUrl: "",
        rows: [
          {
            id: "r1",
            label: "Abelha",
            imageUrl: "abelha.png",
            wordAudioUrl: "abelha.mp3",
            spellingAudioUrl: "",
            optionsText: "a, b, c",
            correctOption: "a",
            notes: "",
          },
        ],
      },
    ];

    const parsed = JSON.parse(serializeBlocks(blocks));
    const row = parsed.blocks[0].rows[0];

    expect(parsed.blocks[0].maxAttempts).toBe(3);
    expect(row.options).toEqual(["A", "B", "C"]);
    expect(row.correctOptions).toEqual(["A"]);
    expect(row.imageUrl).toBe("abelha.png");
  });

  it("splits legacy plain-text content into text blocks", () => {
    const restored = deserializeToBlocks("Primeiro paragrafo\n\nSegundo paragrafo");

    expect(restored).toHaveLength(2);
    expect(restored.every((b) => b.type === "text")).toBe(true);
    expect(restored[0].audience).toBe("educator");
    expect(restored[1].audience).toBe("learner");
  });

  it("returns no blocks for blank input", () => {
    expect(deserializeToBlocks("")).toEqual([]);
    expect(deserializeToBlocks("   ")).toEqual([]);
  });
});
