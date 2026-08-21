import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lessonSourceUrl = new URL("./LearnerLessonScreenView.tsx", import.meta.url);
const layoutSourceUrl = new URL("./components/LearnerScreenLayout.tsx", import.meta.url);
const viewModelSourceUrl = new URL("../../viewmodels/learner/useLearnerHomeViewModel.ts", import.meta.url);

test("o limite configurado bloqueia o exercício e preserva o pedido manual", async () => {
  const source = await readFile(lessonSourceUrl, "utf8");

  assert.match(source, /lockCurrentExercise/);
  assert.match(source, /nextAttempts\s*>=\s*screen\.exercise\.maxAttemptsBeforeLock/);
  assert.match(source, /status: "LOCKED"/);
  assert.match(source, /setSessionLocked\(true\)/);
  assert.match(source, /canRequestHelp=\{isLearnerDriven && !learnerSession\.isLocked\}/);
});

test("o pedido manual de ajuda mantém a tela em espera", async () => {
  const lessonSource = await readFile(lessonSourceUrl, "utf8");
  const layoutSource = await readFile(layoutSourceUrl, "utf8");
  const viewModelSource = await readFile(viewModelSourceUrl, "utf8");

  assert.match(lessonSource, /learnerSession\.isHelpPending/);
  assert.match(layoutSource, /isSessionLocked \|\| isHelpPending/);
  assert.match(layoutSource, /accessibilityLabel="Pedir ajuda ao alfabetizador"/);
  assert.match(
    viewModelSource,
    /await httpClient\.post\('\/painel\/support-requests'[\s\S]*?setHelpRequestedAt\([\s\S]*?\}\s*catch/,
  );
});
