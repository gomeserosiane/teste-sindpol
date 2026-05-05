// Rota Node.js/Vercel: /api/webhook-assinafy
// Configure no painel/webhook da Assinafy após o deploy:
// https://SEU-DOMINIO.vercel.app/api/webhook-assinafy
//
// Aqui você acompanha status/eventos da assinatura. Em produção, conecte um banco,
// planilha, CRM ou serviço interno para persistir os eventos recebidos.

import { jsonResponse } from "../lib/utils.js";

function validarTokenWebhook(req) {
  const expectedToken = process.env.ASSINAFY_WEBHOOK_SECRET;
  if (!expectedToken) return true;

  const receivedToken =
    req.headers["x-webhook-secret"] ||
    req.headers["x-assinafy-webhook-secret"] ||
    req.headers.authorization?.replace("Bearer ", "");

  return receivedToken === expectedToken;
}

function extrairResumoEvento(evento = {}) {
  return {
    event: evento.event || evento.type || evento.name || null,
    status: evento.status || evento.document?.status || evento.data?.status || null,
    documentId: evento.document_id || evento.document?.id || evento.data?.document_id || evento.data?.document?.id || evento.data?.id || null,
    assignmentId: evento.assignment_id || evento.assignment?.id || evento.data?.assignment_id || evento.data?.assignment?.id || null,
    signerId: evento.signer_id || evento.signer?.id || evento.data?.signer_id || evento.data?.signer?.id || null,
    receivedAt: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { success: false, message: "Método não permitido." });
  }

  if (!validarTokenWebhook(req)) {
    return jsonResponse(res, 401, { success: false, message: "Webhook não autorizado." });
  }

  const evento = req.body || {};
  const resumo = extrairResumoEvento(evento);

  console.log("Webhook Assinafy recebido:", JSON.stringify({ resumo, evento }, null, 2));

  return jsonResponse(res, 200, {
    success: true,
    message: "Evento recebido com sucesso.",
    received: resumo,
  });
}
