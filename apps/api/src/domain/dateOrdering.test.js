import assert from "node:assert/strict";
import test from "node:test";
import { orderByNewest } from "./dateOrdering.js";

test("orderByNewest ordena corretamente entre meses e anos", () => {
  const rows = [
    { id: "jul", createdAt: "2026-07-31T10:00:00.000Z" },
    { id: "ano-anterior", createdAt: "2025-12-31T23:59:00.000Z" },
    { id: "ago", createdAt: "2026-08-02T10:00:00.000Z" },
  ];

  assert.deepEqual(
    orderByNewest(rows, (row) => row.createdAt).map((row) => row.id),
    ["ago", "jul", "ano-anterior"],
  );
  assert.deepEqual(rows.map((row) => row.id), ["jul", "ano-anterior", "ago"]);
});

test("orderByNewest envia datas invalidas para o fim", () => {
  const rows = [
    { id: "invalida", createdAt: null },
    { id: "valida", createdAt: "2026-08-02T10:00:00.000Z" },
  ];

  assert.deepEqual(
    orderByNewest(rows, (row) => row.createdAt).map((row) => row.id),
    ["valida", "invalida"],
  );
});
