import assert from "node:assert/strict";
import test from "node:test";

import {
  isValidLearnerDocument,
  isValidLearnerPhone,
  validateLearnerRegistrationIdentity,
} from "./learnerRegistrationValidation.js";

test("aceita CPF formatado ou passaporte alfanumérico", () => {
  assert.equal(isValidLearnerDocument("123.456.789-01"), true);
  assert.equal(isValidLearnerDocument("AB123456"), true);
});

test("rejeita documento e celular incompletos", () => {
  assert.equal(isValidLearnerDocument("123456"), false);
  assert.equal(isValidLearnerPhone("1198765"), false);
  assert.match(
    validateLearnerRegistrationIdentity({ document: "123", phone: "1198765" }),
    /CPF.*passaporte/,
  );
});

test("aceita celular com máscara quando há 11 dígitos", () => {
  assert.equal(isValidLearnerPhone("(11) 98765-4321"), true);
  assert.equal(
    validateLearnerRegistrationIdentity({ document: "AB123456", phone: "(11) 98765-4321" }),
    null,
  );
});
