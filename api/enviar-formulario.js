// Rota Node.js/Vercel: /api/enviar-formulario
// Arquitetura do fluxo:
// 1) Recebe e valida os dados do formulário;
// 2) Gera um PDF preenchido no backend;
// 3) Envia o PDF para a Assinafy;
// 4) Cria o assinante principal;
// 5) Cria assinante do contratante e assinante(s) administrador(es);
// 6) Solicita assinatura virtual ou collect para contratante e sindicalizado/admin;
// 6) Retorna IDs/status para o front e deixa o webhook separado para acompanhamento.

import { jsonResponse } from "../lib/utils.js";
import { normalizarFormulario, validarFormulario } from "../lib/formulario.js";
import { gerarPdfPreenchido } from "../lib/pdf.js";
import {
  validarAmbienteAssinafy,
  enviarPdfParaAssinafy,
  criarAssinante,
  criarAssinantesAdministradores,
  solicitarAssinatura,
} from "../lib/assinafyClient.js";
import { notificarAdministradoresExternamente } from "../lib/notificacoes.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return jsonResponse(res, 405, { success: false, message: "Método não permitido." });
  }

  try {
    validarAmbienteAssinafy();

    const formulario = normalizarFormulario(req.body || {});
    validarFormulario(formulario);

    const pdfBuffer = await gerarPdfPreenchido(formulario);
    const documento = await enviarPdfParaAssinafy(pdfBuffer, formulario);
    const assinante = await criarAssinante(formulario);
    const admins = await criarAssinantesAdministradores();
    const assinatura = await solicitarAssinatura({ documento, assinante, admins, formulario });

    const assinafy = {
      documento,
      assinante,
      admins,
      assinatura,
      webhook_status_url: "/api/webhook-assinafy",
    };

    const notificacao = await notificarAdministradoresExternamente(formulario, assinafy);

    return jsonResponse(res, 200, {
      success: true,
      message: "Formulário enviado para assinatura digital com sucesso.",
      assinafy,
      notificacao,
    });
  } catch (error) {
    console.error("Erro ao processar formulário:", error);
    return jsonResponse(res, error.status || 500, {
      success: false,
      message: error.message || "Erro interno ao processar o formulário.",
      details: error.details || null,
    });
  }
}
