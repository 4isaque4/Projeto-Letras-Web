import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("./EducatorHomeView.tsx", import.meta.url);

test("a home pesquisa nomes e pagina alfabetizandos em blocos de dez", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /LEARNERS_PAGE_SIZE = 10/);
  assert.match(source, /accessibilityLabel="Buscar alfabetizando por nome"/);
  assert.match(source, /filteredLearners\.slice\(0, visibleLearnerCount\)/);
  assert.match(source, /accessibilityLabel="Carregar mais alfabetizandos"/);
});

test("a home destaca o próximo tutorial pendente pela regra canônica", async () => {
  const source = await readFile(sourceUrl, "utf8");

  assert.match(source, /getSelectedTutorial\(tutorials, null\)/);
  assert.doesNotMatch(source, /tutorials\.find\(\(tutorial, index\) => isTutorialUnlocked/);
});

test("pedidos e bloqueios aguardam todas as fontes da carga inicial", async () => {
  const source = await readFile(new URL("./EducatorHomeView.tsx", import.meta.url), "utf8");

  assert.match(source, /const notificationsReady\s*=/);
  assert.match(source, /learnersLoaded\s*&&\s*lockedSessionsLoaded\s*&&\s*openHelpAlertsLoaded\s*&&\s*pendingSessionRequestsLoaded/);
  assert.match(source, /!notificationsReady \? \(/);
  assert.match(source, /notificationsReady && notificationCount > 0/);
});
