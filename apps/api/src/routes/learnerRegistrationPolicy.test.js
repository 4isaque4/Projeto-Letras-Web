import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("./cadastros.js", import.meta.url);

test("cadastro do alfabetizando não confirma vínculo antes da solicitação", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const registrationStart = source.indexOf('cadastrosRouter.post("/alfabetizandos"');
  const registrationEnd = source.indexOf('cadastrosRouter.patch("/alfabetizandos/:id"');
  const registrationRoute = source.slice(registrationStart, registrationEnd);

  assert.ok(registrationStart >= 0 && registrationEnd > registrationStart);
  assert.match(registrationRoute, /metadata:[\s\S]*educatorId/);
  assert.doesNotMatch(registrationRoute, /replaceLearnerLink\(/);
  assert.doesNotMatch(registrationRoute, /createTutorStudentLink\(/);
});
