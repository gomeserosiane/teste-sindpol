import fetch from "node-fetch";
import { splitList } from "./utils.js";

export async function notificarAdministradoresExternamente(formulario, assinafyResult) {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      skipped: true,
      reason: "NOTIFICATION_WEBHOOK_URL não configurado. Use copy_receivers da Assinafy ou configure um webhook externo de email/WhatsApp.",
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.NOTIFICATION_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      emails: splitList(process.env.ADMIN_EMAILS),
      whatsapps: splitList(process.env.ADMIN_WHATSAPPS),
      assunto: "Novo formulário enviado para assinatura",
      mensagem: `Novo cadastro enviado: ${formulario.dadosProponente?.nome || "Nome não informado"}`,
      formulario,
      assinafy: assinafyResult,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Erro ao notificar administradores pelo webhook externo.");

  return data;
}
