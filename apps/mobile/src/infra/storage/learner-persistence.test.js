import assert from "node:assert/strict";
import test from "node:test";

import {
  addEntry,
  createLearnerSyncOutbox,
  markAttempt,
  removeEntry,
} from "./learner-sync-outbox.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setItem(key, value) {
      store.set(key, value);
    },
    async removeItem(key) {
      store.delete(key);
    },
  };
}

function makeEntry(overrides = {}) {
  return {
    idempotencyKey: "k1",
    learnerId: "learner-1",
    kind: "progress",
    endpoint: "/painel/progress",
    method: "POST",
    payload: { status: "IN_PROGRESS" },
    createdAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

test("addEntry dedupes by idempotencyKey and preserves attempt count", () => {
  const first = addEntry([], makeEntry({ attempts: 0 }));
  assert.equal(first.length, 1);

  const bumped = markAttempt(first, "k1", "network");
  assert.equal(bumped[0].attempts, 1);

  // Reenfileirar a mesma chave nao cria duplicata e mantem as tentativas.
  const reAdded = addEntry(bumped, makeEntry({ payload: { status: "COMPLETED" } }));
  assert.equal(reAdded.length, 1);
  assert.equal(reAdded[0].attempts, 1);
  assert.deepEqual(reAdded[0].payload, { status: "COMPLETED" });
});

test("removeEntry drops only the acked key", () => {
  const entries = [makeEntry({ idempotencyKey: "a" }), makeEntry({ idempotencyKey: "b" })];
  const result = removeEntry(entries, "a");
  assert.deepEqual(
    result.map((e) => e.idempotencyKey),
    ["b"],
  );
});

test("enqueue persists a roundtrip through the storage adapter", async () => {
  const storage = createMemoryStorage();
  const outbox = createLearnerSyncOutbox({ storage });

  await outbox.enqueue(makeEntry());
  const pending = await outbox.pending();

  assert.equal(pending.length, 1);
  assert.equal(pending[0].idempotencyKey, "k1");
});

test("pending isolates entries per learner", async () => {
  const storage = createMemoryStorage();
  const outbox = createLearnerSyncOutbox({ storage });

  await outbox.enqueue(makeEntry({ idempotencyKey: "k1", learnerId: "learner-1" }));
  await outbox.enqueue(makeEntry({ idempotencyKey: "k2", learnerId: "learner-2" }));

  const forOne = await outbox.pending("learner-1");
  assert.deepEqual(
    forOne.map((e) => e.idempotencyKey),
    ["k1"],
  );
});

test("enqueue rejects entries without an idempotencyKey", async () => {
  const storage = createMemoryStorage();
  const outbox = createLearnerSyncOutbox({ storage });
  await assert.rejects(() => outbox.enqueue(makeEntry({ idempotencyKey: "" })));
});

test("drain removes only successfully sent items and is idempotent", async () => {
  const storage = createMemoryStorage();
  const outbox = createLearnerSyncOutbox({ storage });

  await outbox.enqueue(makeEntry({ idempotencyKey: "ok" }));
  await outbox.enqueue(makeEntry({ idempotencyKey: "fail" }));

  const sent = [];
  const sender = async (entry) => {
    sent.push(entry.idempotencyKey);
    if (entry.idempotencyKey === "fail") {
      throw new Error("network");
    }
  };

  const afterFirst = await outbox.drain(sender);
  assert.deepEqual(
    afterFirst.map((e) => e.idempotencyKey),
    ["fail"],
  );
  assert.equal(afterFirst[0].attempts, 1);
  assert.equal(afterFirst[0].lastError, "network");

  // Segunda drenagem so retenta o item pendente; o item confirmado nao volta.
  const afterSecond = await outbox.drain(sender);
  assert.deepEqual(
    afterSecond.map((e) => e.idempotencyKey),
    ["fail"],
  );
  assert.deepEqual(sent, ["ok", "fail", "fail"]);
});

test("drain of a fully-sent queue leaves it empty", async () => {
  const storage = createMemoryStorage();
  const outbox = createLearnerSyncOutbox({ storage });

  await outbox.enqueue(makeEntry({ idempotencyKey: "a" }));
  await outbox.enqueue(makeEntry({ idempotencyKey: "b" }));

  const remaining = await outbox.drain(async () => {});
  assert.deepEqual(remaining, []);

  const pending = await outbox.pending();
  assert.deepEqual(pending, []);
});
