import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("./LearnerLessonScreenView.tsx", import.meta.url);

test("a tela de aula separa o carregamento do componente que executa os hooks", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /function LoadedLearnerLessonScreenView\(/);
  assert.match(
    source,
    /if \(!lesson\)[\s\S]*?<LearnerScreenLayout[\s\S]*?<LoadedLearnerLessonScreenView/,
  );
});
