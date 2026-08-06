import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a última tela aguarda a persistência antes de abrir a conclusão", async () => {
  const screenSource = await readFile(
    new URL("./LearnerLessonScreenView.tsx", import.meta.url),
    "utf8",
  );
  const activitySource = await readFile(
    new URL("./LearnerLessonActivityView.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    screenSource,
    /const goNextDefault = async[\s\S]*?await learnerSession\.recordProgress[\s\S]*?LearnerLessonConclusion/,
  );
  assert.match(
    activitySource,
    /const onContinue = async[\s\S]*?await learnerSession\.recordProgress[\s\S]*?LearnerLessonConclusion/,
  );
});

// O backend só sinaliza a conclusão de ETAPA uma vez (dedupe por
// `stage:<tutor>:<aluno>:<etapa>` em recordEducatorScoreEvent). Quem recebe
// esse sinal é a gravação da ÚLTIMA tela da aula; a tela de conclusão regrava
// a primeira atividade (lesson.progressId) e sempre vê o dedupe. Se a última
// tela descartar o retorno, a celebração da etapa (RN048) nunca aparece —
// foi exatamente o bug relatado ("terminei o exercício e não apareceu a
// conclusão"). Estes asserts travam o repasse do sinal.
test("a última tela repassa o sinal de etapa concluída para a tela de conclusão", async () => {
  const screenSource = await readFile(
    new URL("./LearnerLessonScreenView.tsx", import.meta.url),
    "utf8",
  );

  // O retorno de recordProgress precisa ser capturado, não descartado.
  assert.match(
    screenSource,
    /const goNextDefault = async[\s\S]*?const completion = await learnerSession\.recordProgress/,
    "goNextDefault deve capturar o retorno de recordProgress",
  );

  // E precisa viajar como param da navegação para a conclusão.
  assert.match(
    screenSource,
    /navigation\.push\("LearnerLessonConclusion",\s*\{[\s\S]*?stageCompleted: completion\?\.stageCompleted === true/,
    "goNextDefault deve passar stageCompleted para LearnerLessonConclusion",
  );
});

test("a tela de conclusão aceita o sinal de etapa vindo da última tela", async () => {
  const conclusionSource = await readFile(
    new URL("./LearnerLessonConclusionView.tsx", import.meta.url),
    "utf8",
  );

  // Tolerante a formatação (a desestruturação pode quebrar em várias linhas):
  // exige apenas o alias e que ele venha de route.params.
  assert.match(
    conclusionSource,
    /stageCompleted: stageCompletedFromScreen[\s\S]{0,200}?=\s*route\.params/,
    "a conclusão deve ler stageCompleted dos params da rota",
  );

  // Decisão por OU: o param (sinal fresco) OU o retorno local, que na prática
  // vem sempre deduplicado. Confiar só no segundo é o bug.
  assert.match(
    conclusionSource,
    /stageCompletedFromScreen === true \|\| result\?\.stageCompleted === true/,
    "a conclusão deve considerar o sinal da última tela, não só o retorno local",
  );
});

// Os pontos da etapa seguem o mesmo caminho do sinal: sem carona, a celebração
// caía no fallback `/painel/score/<alfabetizando>`, que le learner_score_events
// — mas a conclusao de etapa credita educator_score_events (do TUTOR). Dava
// sempre "acumulou 0 pontos".
test("os pontos da etapa viajam da última tela até a celebração", async () => {
  const screenSource = await readFile(
    new URL("./LearnerLessonScreenView.tsx", import.meta.url),
    "utf8",
  );
  const conclusionSource = await readFile(
    new URL("./LearnerLessonConclusionView.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    screenSource,
    /navigation\.push\("LearnerLessonConclusion",\s*\{[\s\S]*?stagePoints: completion\?\.totalPoints/,
    "goNextDefault deve repassar stagePoints",
  );

  assert.match(
    conclusionSource,
    /pointsEarned:\s*[\s\S]{0,80}?stagePointsFromScreen \?\?/,
    "a celebração deve priorizar os pontos vindos da última tela",
  );
});
