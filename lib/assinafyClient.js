import fetch from "node-fetch";
import FormData from "form-data";
import {
  limparTexto,
  normalizarBaseUrl,
  normalizarTelefoneE164,
  splitList,
  dataExpiracaoISO,
  DEFAULT_ASSINAFY_BASE_URL,
} from "./utils.js";

function extrairDataAssinafy(responseJson) {
  return responseJson?.data || responseJson;
}

function assinafyHeaders(extra = {}) {
  return {
    "X-Api-Key": process.env.ASSINAFY_API_KEY,
    ...extra,
  };
}

async function chamarAssinafy(path, options = {}) {
  const baseUrl = normalizarBaseUrl(process.env.ASSINAFY_BASE_URL || DEFAULT_ASSINAFY_BASE_URL);
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message = data?.message || data?.error || `Erro na Assinafy: HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

export function validarAmbienteAssinafy() {
  const missing = [];
  if (!process.env.ASSINAFY_API_KEY) missing.push("ASSINAFY_API_KEY");
  if (!process.env.ASSINAFY_ACCOUNT_ID) missing.push("ASSINAFY_ACCOUNT_ID");
  if (missing.length) throw new Error(`Configure as variáveis de ambiente na Vercel: ${missing.join(", ")}.`);
}

export async function enviarPdfParaAssinafy(pdfBuffer, formulario) {
  const nome = limparTexto(formulario.dadosComponente?.nome) || "cadastro";
  const filename = `ficha-sindpool-${nome.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.pdf`;

  const formData = new FormData();
  formData.append("file", pdfBuffer, {
    filename,
    contentType: "application/pdf",
    knownLength: pdfBuffer.length,
  });

  const result = await chamarAssinafy(`/accounts/${process.env.ASSINAFY_ACCOUNT_ID}/documents`, {
    method: "POST",
    headers: assinafyHeaders(formData.getHeaders()),
    body: formData,
  });

  return extrairDataAssinafy(result);
}

export async function obterDocumento(documentId) {
  const result = await chamarAssinafy(`/documents/${documentId}`, {
    method: "GET",
    headers: assinafyHeaders(),
  });
  return extrairDataAssinafy(result);
}

async function aguardarMetadataReady(documentId) {
  const maxAttempts = Number(process.env.ASSINAFY_METADATA_MAX_ATTEMPTS || 12);
  const delayMs = Number(process.env.ASSINAFY_METADATA_DELAY_MS || 1500);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const documento = await obterDocumento(documentId);
    if (documento?.status === "metadata_ready") return documento;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("O documento ainda não chegou ao status metadata_ready. Tente novamente ou aumente ASSINAFY_METADATA_MAX_ATTEMPTS.");
}

async function criarSigner(body) {
  const result = await chamarAssinafy(`/accounts/${process.env.ASSINAFY_ACCOUNT_ID}/signers`, {
    method: "POST",
    headers: assinafyHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  return extrairDataAssinafy(result);
}

export async function criarAssinante(formulario) {
  const componente = formulario.dadosComponente || {};
  const nome = limparTexto(componente.nome);
  const email = limparTexto(componente.email).toLowerCase();
  const whatsapp = normalizarTelefoneE164(componente.telefone);

  if (!nome) throw new Error("Nome do assinante contratante não informado.");
  if (!email && !whatsapp) throw new Error("Informe email ou WhatsApp do contratante para enviar a assinatura digital.");

  return criarSigner({
    full_name: nome,
    ...(email ? { email } : {}),
    ...(whatsapp ? { whatsapp_phone_number: whatsapp } : {}),
  });
}

export async function criarAssinantesAdministradores() {
  const admins = [];
  const adminName = limparTexto(process.env.ADMIN_SIGNER_NAME || "SINDPOL/PA");

  for (const email of splitList(process.env.ADMIN_EMAILS)) {
    admins.push(await criarSigner({ full_name: adminName, email: email.toLowerCase() }));
  }

  for (const whatsapp of splitList(process.env.ADMIN_WHATSAPPS)) {
    admins.push(await criarSigner({
      full_name: adminName,
      whatsapp_phone_number: normalizarTelefoneE164(whatsapp),
    }));
  }

  return admins;
}

function obterMetodoAssinatura() {
  const method = limparTexto(process.env.ASSINAFY_SIGNATURE_METHOD || "virtual").toLowerCase();
  return method === "collect" ? "collect" : "virtual";
}

function obterMetodoNotificacao() {
  const method = limparTexto(process.env.ASSINAFY_NOTIFICATION_METHOD || "Email");
  return method === "Whatsapp" ? "Whatsapp" : "Email";
}

function montarSignerConfig(assinanteId) {
  const method = obterMetodoNotificacao();
  return {
    id: assinanteId,
    verification_method: method,
    notification_methods: [method],
  };
}

function montarCampoCollect({ signerId, fieldId, left, top, width, height }) {
  if (!fieldId) {
    throw new Error("Para usar collect, configure os field IDs de assinatura na Assinafy: ASSINAFY_COLLECT_CONTRATANTE_FIELD_ID e ASSINAFY_COLLECT_SINDICALIZADO_FIELD_ID.");
  }

  return {
    signer_id: signerId,
    field_id: fieldId,
    display_settings: {
      left: Number(left),
      top: Number(top),
      width: Number(width),
      height: Number(height),
      fontFamily: process.env.ASSINAFY_COLLECT_FONT_FAMILY || "Arial",
      fontSize: Number(process.env.ASSINAFY_COLLECT_FONT_SIZE || 16),
      backgroundColor: process.env.ASSINAFY_COLLECT_BACKGROUND || "rgb(255, 255, 255)",
    },
  };
}

function montarEntryCollect({ documentoMetadata, contratante, sindicalizado }) {
  const pageNumber = Number(process.env.ASSINAFY_COLLECT_PAGE_NUMBER || 1);
  const page = documentoMetadata?.pages?.find((item) => Number(item.number) === pageNumber) || documentoMetadata?.pages?.[0];
  if (!page?.id) throw new Error("Não foi possível localizar page_id do documento para criar assinatura collect.");

  return {
    page_id: page.id,
    fields: [
      montarCampoCollect({
        signerId: contratante.id,
        fieldId: process.env.ASSINAFY_COLLECT_CONTRATANTE_FIELD_ID || process.env.ASSINAFY_COLLECT_FIELD_ID,
        left: process.env.ASSINAFY_COLLECT_CONTRATANTE_LEFT || 45,
        top: process.env.ASSINAFY_COLLECT_CONTRATANTE_TOP || 665,
        width: process.env.ASSINAFY_COLLECT_CONTRATANTE_WIDTH || 210,
        height: process.env.ASSINAFY_COLLECT_CONTRATANTE_HEIGHT || 45,
      }),
      montarCampoCollect({
        signerId: sindicalizado.id,
        fieldId: process.env.ASSINAFY_COLLECT_SINDICALIZADO_FIELD_ID,
        left: process.env.ASSINAFY_COLLECT_SINDICALIZADO_LEFT || 355,
        top: process.env.ASSINAFY_COLLECT_SINDICALIZADO_TOP || 665,
        width: process.env.ASSINAFY_COLLECT_SINDICALIZADO_WIDTH || 210,
        height: process.env.ASSINAFY_COLLECT_SINDICALIZADO_HEIGHT || 45,
      }),
    ],
  };
}

export async function solicitarAssinatura({ documento, assinante, admins = [], formulario }) {
  const method = obterMetodoAssinatura();
  const documentId = documento?.id;
  const sindicalizado = admins[0];
  const copyReceivers = admins.slice(1).map((admin) => admin.id).filter(Boolean);

  if (!documentId) throw new Error("A Assinafy não retornou o ID do documento enviado.");
  if (!assinante?.id) throw new Error("A Assinafy não retornou o ID do assinante contratante.");
  if (!sindicalizado?.id) throw new Error("Configure ADMIN_EMAILS ou ADMIN_WHATSAPPS para criar o assinante administrador/sindicalizado.");

  const signers = [assinante, sindicalizado];
  const common = {
    method,
    message: `Olá. Segue a ficha do Clube de Benefícios Sindpol para assinatura digital.`,
    expires_at: dataExpiracaoISO(),
    copy_receivers: copyReceivers,
  };

  let body;
  let documentoMetadata = documento;

  if (method === "collect") {
    documentoMetadata = await aguardarMetadataReady(documentId);
    body = {
      ...common,
      signers: signers.map((item) => montarSignerConfig(item.id)),
      entries: [montarEntryCollect({ documentoMetadata, contratante: assinante, sindicalizado })],
    };
  } else {
    body = {
      ...common,
      signerIds: signers.map((item) => item.id),
      signers: signers.map((item) => montarSignerConfig(item.id)),
    };
  }

  if (!body.copy_receivers.length) delete body.copy_receivers;

  const result = await chamarAssinafy(`/documents/${documentId}/assignments`, {
    method: "POST",
    headers: assinafyHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  return {
    method,
    documentoMetadata,
    assignment: extrairDataAssinafy(result),
    assinaturas: {
      contratante: assinante,
      sindicalizado,
      copias: admins.slice(1),
    },
  };
}
