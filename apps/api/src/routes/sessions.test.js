import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeLearnerSessionRole } from "./sessions.js";

describe("sessions route contracts", () => {
  it("normalizes mobile presence roles before writing the SessionRole enum", () => {
    assert.equal(normalizeLearnerSessionRole("learner"), "LEARNER");
    assert.equal(normalizeLearnerSessionRole("LEARNER"), "LEARNER");
    assert.equal(normalizeLearnerSessionRole("alfabetizando"), "LEARNER");
    assert.equal(normalizeLearnerSessionRole(undefined), "LEARNER");
    assert.equal(normalizeLearnerSessionRole("educator"), "EDUCATOR");
    assert.equal(normalizeLearnerSessionRole("tutor"), "EDUCATOR");
    assert.equal(normalizeLearnerSessionRole("alfabetizador"), "EDUCATOR");
  });
});
