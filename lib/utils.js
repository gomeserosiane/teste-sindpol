export const DEFAULT_ASSINAFY_BASE_URL = "https://api.assinafy.com.br/v1";

export function jsonResponse(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function limparTexto(value = "") {
  return String(value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

export function removerAcentos(value = "") {
  return limparTexto(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function onlyNumbers(value = "") {
  return String(value).replace(/\D/g, "");
}

export function splitList(value = "") {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export function normalizarBaseUrl(url = DEFAULT_ASSINAFY_BASE_URL) {
  return String(url || DEFAULT_ASSINAFY_BASE_URL).replace(/\/$/, "");
}

export function normalizarTelefoneE164(value = "") {
  const digits = onlyNumbers(value);
  if (!digits) return "";
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

export function formatCurrencyBR(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataExpiracaoISO() {
  const days = Number(process.env.ASSINAFY_ASSIGNMENT_EXPIRATION_DAYS || 7);
  const date = new Date();
  date.setDate(date.getDate() + (Number.isFinite(days) && days > 0 ? days : 7));
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}
