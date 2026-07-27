import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Etapa 1 usa a conclusão visual canônica das demais etapas", async () => {
  const source = await readFile(
    new URL("./EducatorEtapa1LessonsView.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \{ LearnerStageConclusionView \}/);
  assert.match(
    source,
    /name="LearnerStageConclusion" component=\{LearnerStageConclusionView\}/,
  );
  assert.doesNotMatch(source, /function Etapa1DoneScreen/);
});
