import assert from "node:assert/strict";
import test from "node:test";

import { parseMobileLockStudentId } from "./queueItem.js";

test("resolve o alfabetizando de um bloqueio de sessão sem progresso", () => {
  assert.equal(parseMobileLockStudentId("mobile-lock-student-1"), "student-1");
});

test("ignora itens normais da fila e ids incompletos", () => {
  assert.equal(parseMobileLockStudentId("progress-1"), null);
  assert.equal(parseMobileLockStudentId("mobile-lock-"), null);
});
