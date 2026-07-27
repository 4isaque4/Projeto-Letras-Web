import assert from "node:assert/strict";
import test from "node:test";

import { toUserFacingMessage, USER_FACING_FALLBACK } from "./user-facing-error.js";

test("replaces raw HTTP 500 messages with JSON payloads", () => {
  const raw = new Error('Request failed (500): {"message":"Erro interno inesperado."}');
  const result = toUserFacingMessage(raw);
  assert.equal(result, USER_FACING_FALLBACK);
  assert.ok(!result.includes("{"));
  assert.ok(!result.includes("500"));
});

test("hides timeout and connection failures", () => {
  assert.equal(
    toUserFacingMessage(new Error("Timeout ao chamar /painel/conteudo em http://localhost:3000")),
    USER_FACING_FALLBACK,
  );
  assert.equal(
    toUserFacingMessage(new Error("Falha de conexao com /sessions em http://localhost:8082")),
    USER_FACING_FALLBACK,
  );
});

test("keeps friendly domain messages untouched", () => {
  const friendly = "Nenhuma sessao de alfabetizando encontrada. Faca login novamente.";
  assert.equal(toUserFacingMessage(new Error(friendly)), friendly);
});

test("falls back on empty or non-error input", () => {
  assert.equal(toUserFacingMessage(null), USER_FACING_FALLBACK);
  assert.equal(toUserFacingMessage(""), USER_FACING_FALLBACK);
  assert.equal(toUserFacingMessage(undefined), USER_FACING_FALLBACK);
});

test("accepts a custom fallback", () => {
  const custom = "Nao foi possivel carregar suas aulas agora.";
  assert.equal(toUserFacingMessage(new Error("Request failed (500)"), custom), custom);
});
