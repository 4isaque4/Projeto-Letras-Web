import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("logout e sessão expirada do alfabetizador voltam ao login unificado", async () => {
  const source = await readFile(
    new URL("./EducatorProfileView.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /navigation\.replace\(['"]EducatorLogin['"]\)/);
  assert.match(source, /CommonActions\.reset\([\s\S]*?UnifiedLogin/);
});
