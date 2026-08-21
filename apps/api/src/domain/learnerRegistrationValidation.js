export function isValidLearnerDocument(value) {
  const document = String(value ?? "").trim();
  if (/[a-z]/i.test(document)) {
    return /^[a-z0-9]{6,20}$/i.test(document.replace(/[^a-z0-9]/gi, ""));
  }
  return document.replace(/\D/g, "").length === 11;
}

export function isValidLearnerPhone(value) {
  return String(value ?? "").replace(/\D/g, "").length === 11;
}

export function validateLearnerRegistrationIdentity({ document, phone }) {
  if (!isValidLearnerDocument(document)) {
    return "Informe um CPF com 11 dígitos ou passaporte com 6 a 20 caracteres.";
  }
  if (!isValidLearnerPhone(phone)) {
    return "Informe um celular válido com DDD e 11 dígitos.";
  }
  return null;
}
