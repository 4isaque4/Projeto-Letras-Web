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
