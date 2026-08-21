import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("o alfabetizador acessa a atividade enviada e pode aprovar a foto", async () => {
  const learningMode = await readFile(
    new URL("./EducatorLearningModeView.tsx", import.meta.url),
    "utf8",
  );
  const comparison = await readFile(
    new URL("./EducatorComparativoView.tsx", import.meta.url),
    "utf8",
  );

  assert.match(learningMode, /ATIVIDADE ENVIADA/);
  assert.match(learningMode, /navigate\('EducatorComparativo'/);
  assert.match(comparison, /fotos-atividade\/\$\{latest\.id\}\/aprovar/);
  assert.match(comparison, /APROVAR\{'\\n'\}TAREFA/);
});
