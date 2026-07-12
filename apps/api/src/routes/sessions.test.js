import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureLegacyLearnerProfile, normalizeLearnerSessionRole } from "./sessions.js";

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

  it("creates the legacy learner profile from the canonical profile before opening a session", async () => {
    const calls = [];
    const repository = {
      async getLegacyLearnerProfile() {
        return null;
      },
      async getCanonicalLearnerProfile(id) {
        calls.push(["canonical", id]);
        return { id, displayName: "Alfabetizando Local" };
      },
      async upsertLegacyLearnerProfile(profile) {
        calls.push(["legacy", profile]);
        return profile;
      },
    };

    const result = await ensureLegacyLearnerProfile({
      learnerProfileId: "bac63343-f5f9-404c-90e1-997db2b24198",
      repository,
    });

    assert.equal(result.displayName, "Alfabetizando Local");
    assert.deepEqual(calls, [
      ["canonical", "bac63343-f5f9-404c-90e1-997db2b24198"],
      ["legacy", {
        id: "bac63343-f5f9-404c-90e1-997db2b24198",
        displayName: "Alfabetizando Local",
      }],
    ]);
  });
});
