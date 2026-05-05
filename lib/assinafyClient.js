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

export async function criarAssinante(formulario) {
  const componente = formulario.dadosComponente || {};
  const nome = limparTexto(componente.nome);
  const email = limparTexto(componente.email).toLowerCase();
  const whatsapp = normalizarTelefoneE164(componente.telefone);

  if (!nome) throw new Error("Nome do assinante não informado.");
  if (!email && !whatsapp) throw new Error("Informe email ou WhatsApp do assinante.");

  const body = {
    full_name: nome,
    ...(email ? { email } : {}),
    ...(whatsapp ? { whatsapp_phone_number: whatsapp } : {}),
  };

  const result = await chamarAssinafy(`/accounts/${process.env.ASSINAFY_ACCOUNT_ID}/signers`, {
    method: "POST",
    headers: assinafyHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  return extrairDataAssinafy(result);
}

export async function criarAssinantesAdministradores() {
  const admins = [];

  for (const email of splitList(process.env.ADMIN_EMAILS)) {
    const result = await chamarAssinafy(`/accounts/${process.env.ASSINAFY_ACCOUNT_ID}/signers`, {
      method: "POST",
      headers: assinafyHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ full_name: `Administrador - ${email}`, email: email.toLowerCase() }),
    });
    admins.push(extrairDataAssinafy(result));
  }

  for (const whatsapp of splitList(process.env.ADMIN_WHATSAPPS)) {
    const result = await chamarAssinafy(`/accounts/${process.env.ASSINAFY_ACCOUNT_ID}/signers`, {
      method: "POST",
      headers: assinafyHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        full_name: `Administrador - WhatsApp ${whatsapp}`,
        whatsapp_phone_number: normalizarTelefoneE164(whatsapp),
      }),
    });
    admins.push(extrairDataAssinafy(result));
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

function montarEntryCollect({ documentoMetadata, assinante }) {
  const fieldId = process.env.ASSINAFY_COLLECT_FIELD_ID;
  if (!fieldId) {
    throw new Error("Para usar collect, configure ASSINAFY_COLLECT_FIELD_ID com o ID do campo de assinatura criado na Assinafy.");
  }

  const pageNumber = Number(process.env.ASSINAFY_COLLECT_PAGE_NUMBER || 1);
  const page = documentoMetadata?.pages?.find((item) => Number(item.number) === pageNumber) || documentoMetadata?.pages?.[0];
  if (!page?.id) throw new Error("Não foi possível localizar page_id do documento para criar assinatura collect.");

  return {
    page_id: page.id,
    fields: [
      {
        signer_id: assinante.id,
        field_id: fieldId,
        display_settings: {
          left: Number(process.env.ASSINAFY_COLLECT_LEFT || 69),
          top: Number(process.env.ASSINAFY_COLLECT_TOP || 720),
          width: Number(process.env.ASSINAFY_COLLECT_WIDTH || 420),
          height: Number(process.env.ASSINAFY_COLLECT_HEIGHT || 60),
          fontFamily: process.env.ASSINAFY_COLLECT_FONT_FAMILY || "Arial",
          fontSize: Number(process.env.ASSINAFY_COLLECT_FONT_SIZE || 18),
          backgroundColor: process.env.ASSINAFY_COLLECT_BACKGROUND || "rgb(185, 218, 255)",
        },
      },
    ],
  };
}

export async function solicitarAssinatura({ documento, assinante, admins = [], formulario }) {
  const method = obterMetodoAssinatura();
  const documentId = documento?.id;
  if (!documentId) throw new Error("A Assinafy não retornou o ID do documento enviado.");
  if (!assinante?.id) throw new Error("A Assinafy não retornou o ID do assinante.");

  const common = {
    method,
    message: `Olá, ${formulario.dadosComponente?.nome || "beneficiário"}. Assine digitalmente sua ficha de cadastro do Clube de Benefícios.`,
    expires_at: dataExpiracaoISO(),
    copy_receivers: admins.map((admin) => admin.id).filter(Boolean),
  };

  let body;
  let documentoMetadata = documento;

  if (method === "collect") {
    documentoMetadata = await aguardarMetadataReady(documentId);
    body = {
      ...common,
      signers: [montarSignerConfig(assinante.id)],
      entries: [montarEntryCollect({ documentoMetadata, assinante })],
    };
  } else {
    // Compatível com a documentação atual e com o modelo novo de signers.
    body = {
      ...common,
      signerIds: [assinante.id],
      signers: [montarSignerConfig(assinante.id)],
    };
  }

  if (!body.copy_receivers.length) delete body.copy_receivers;

  const result = await chamarAssinafy(`/documents/${documentId}/assignments`, {
    method: "POST",
    headers: assinafyHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  return { method, documentoMetadata, assignment: extrairDataAssinafy(result) };
}
