import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { removeLearnerLink, replaceLearnerLink } from "./learnerLinkService.js";

describe("learner link lifecycle", () => {
  it("replaces the active link while preserving the previous link as history", async () => {
    const repository = createRepository();
    const result = await replaceLearnerLink({
      studentId: "student-1",
      tutorId: "tutor-2",
      changedBy: "admin-1",
      reason: "Reorganização do atendimento",
      repository,
    });

    assert.equal(result.active.tutorId, "tutor-2");
    assert.equal(result.previous.status, "encerrado");
    assert.equal(repository.events[0].eventType, "link.transferred");
  });

  it("removes the active link without deleting learner history", async () => {
    const repository = createRepository();
    const result = await removeLearnerLink({
      studentId: "student-1",
      changedBy: "admin-1",
      reason: "Sem alfabetizador definido",
      repository,
    });

    assert.equal(result.ended.status, "encerrado");
    assert.equal(repository.deletedProfiles.length, 0);
    assert.equal(repository.events[0].eventType, "link.removed");
  });
});

function createRepository() {
  return {
    events: [],
    deletedProfiles: [],
    async replaceActiveLink(input) {
      return {
        previous: { id: "link-1", tutorId: "tutor-1", studentId: input.studentId, status: "encerrado" },
        active: { id: "link-2", tutorId: input.tutorId, studentId: input.studentId, status: "confirmado" },
      };
    },
    async endActiveLink(input) {
      return { id: "link-1", tutorId: "tutor-1", studentId: input.studentId, status: "encerrado" };
    },
    async appendSyncEvent(event) {
      this.events.push(event);
    },
  };
}
