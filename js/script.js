// ===============================
// ELEMENTOS DOM
// ===============================
const form1 = document.getElementById("cadastroForm1");
const proponentesContainer = document.getElementById("proponentes-container");
const addProponenteBtn = document.getElementById("addProponenteBtn");
const gerarTotalBtn = document.getElementById("gerarTotalBtn");
const valorTotalOutput = document.getElementById("valorTotal");
const dadosPagadorSection = document.getElementById("dados-pagador-section");
const submitBtn = document.querySelector(".submit-btn");
const formaPagamentoRadios = document.querySelectorAll('input[name="formaPagamento"]');
const paymentPanels = document.querySelectorAll("[data-payment-panel]");

const VALOR_POR_PESSOA = 40;
let pagadorAlertShown = false;

// ===============================
// FUNÇÕES AUXILIARES
// ===============================
function onlyNumbers(value) {
  return (value || "").replace(/\D/g, "");
}

function formatCPF(value) {
  value = onlyNumbers(value).slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return value;
}

function formatCEP(value) {
  value = onlyNumbers(value).slice(0, 8);
  value = value.replace(/(\d{5})(\d)/, "$1-$2");
  return value;
}

function formatPhone(value) {
  value = onlyNumbers(value).slice(0, 11);

  if (value.length <= 10) {
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
  }

  return value;
}

function formatDateBR(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatCurrencyBR(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getFieldValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setFieldValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value || "";
}

// ===============================
// MÁSCARAS
// ===============================
["f1_cpf", "pagador_cpf"].forEach((id) => {
  const input = document.getElementById(id);
  input?.addEventListener("input", (event) => {
    event.target.value = formatCPF(event.target.value);
  });
});

["f1_cep", "pagador_cep"].forEach((id) => {
  const input = document.getElementById(id);
  input?.addEventListener("input", (event) => {
    event.target.value = formatCEP(event.target.value);
  });
});

["f1_telefone", "pagador_telefone"].forEach((id) => {
  const input = document.getElementById(id);
  input?.addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
  });
});

// ===============================
// VIA CEP
// ===============================
async function buscarCEP(cep, prefix) {
  const cepLimpo = onlyNumbers(cep);
  if (cepLimpo.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    const enderecoInput = document.getElementById(`${prefix}_endereco`);
    const bairroInput = document.getElementById(`${prefix}_bairro`);
    const cidadeInput = document.getElementById(`${prefix}_cidade`);
    const ufInput = document.getElementById(`${prefix}_uf`);

    if (bairroInput) bairroInput.value = data.bairro || "";
    if (cidadeInput) cidadeInput.value = data.localidade || "";
    if (ufInput) ufInput.value = data.uf || "";

    if (enderecoInput && !enderecoInput.value.trim()) {
      enderecoInput.value = data.logradouro || "";
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao consultar o CEP.");
  }
}

document.getElementById("f1_cep")?.addEventListener("blur", (event) => buscarCEP(event.target.value, "f1"));
document.getElementById("pagador_cep")?.addEventListener("blur", (event) => buscarCEP(event.target.value, "pagador"));

// ===============================
// PROPONENTES ADICIONAIS
// ===============================
function atualizarOrdemProponentes() {
  const cards = [...document.querySelectorAll(".proponente-card")];

  cards.forEach((card, index) => {
    const number = index + 1;
    card.dataset.index = String(number);
    card.querySelector(".proponente-title").textContent = `Proponente ${number}`;

    card.querySelectorAll("input").forEach((input) => {
      const field = input.dataset.field;
      input.id = `proponente_${field}_${number}`;
      input.name = `proponente_${field}_${number}`;
    });

    card.querySelectorAll("label").forEach((label) => {
      const field = label.dataset.field;
      label.setAttribute("for", `proponente_${field}_${number}`);
    });
  });
}

function criarProponenteCard() {
  const number = document.querySelectorAll(".proponente-card").length + 1;
  const card = document.createElement("div");
  card.className = "proponente-card";
  card.dataset.index = String(number);

  card.innerHTML = `
    <div class="proponente-top">
      <span class="proponente-title">Proponente ${number}</span>
      <div class="proponente-actions">
        <button class="btn btn-value valor-pessoa-btn" type="button" disabled>Valor por pessoa: R$ 40,00</button>
        <button type="button" class="btn btn-danger delete-btn" aria-label="Excluir proponente">
          🗑 Excluir
        </button>
      </div>
    </div>

    <div class="grid">
      <div class="field full">
        <label data-field="nome" for="proponente_nome_${number}">Nome:</label>
        <input data-field="nome" type="text" id="proponente_nome_${number}" name="proponente_nome_${number}" />
      </div>

      <div class="field">
        <label data-field="cpf" for="proponente_cpf_${number}">CPF:</label>
        <input data-field="cpf" type="text" id="proponente_cpf_${number}" name="proponente_cpf_${number}" />
      </div>

      <div class="field">
        <label data-field="nascimento" for="proponente_nascimento_${number}">Data de nascimento:</label>
        <input data-field="nascimento" type="date" id="proponente_nascimento_${number}" name="proponente_nascimento_${number}" />
      </div>
    </div>
  `;

  card.querySelector(".delete-btn").addEventListener("click", () => {
    card.remove();
    atualizarOrdemProponentes();
    gerarValorTotal();
  });

  card.querySelector('[data-field="cpf"]')?.addEventListener("input", (event) => {
    event.target.value = formatCPF(event.target.value);
  });

  proponentesContainer?.appendChild(card);
  atualizarOrdemProponentes();
  gerarValorTotal();
}

function getProponentesAdicionais() {
  return [...document.querySelectorAll(".proponente-card")].map((card, index) => ({
    numero: index + 1,
    nome: card.querySelector('[data-field="nome"]')?.value?.trim() || "",
    cpf: card.querySelector('[data-field="cpf"]')?.value?.trim() || "",
    nascimento: formatDateBR(card.querySelector('[data-field="nascimento"]')?.value || ""),
    valorPorPessoa: VALOR_POR_PESSOA,
  }));
}

addProponenteBtn?.addEventListener("click", () => {
  criarProponenteCard();
});

// ===============================
// DADOS DO RESPONSÁVEL FINANCEIRO
// ===============================
function copiarDadosProponenteParaPagador() {
  const map = {
    pagador_nome: "f1_nome",
    pagador_rg: "f1_rg",
    pagador_cpf: "f1_cpf",
    pagador_sexo: "f1_sexo",
    pagador_admissao: "f1_admissao",
    pagador_nascimento: "f1_nascimento",
    pagador_tipoSanguineo: "f1_tipoSanguineo",
    pagador_endereco: "f1_endereco",
    pagador_cep: "f1_cep",
    pagador_bairro: "f1_bairro",
    pagador_cidade: "f1_cidade",
    pagador_uf: "f1_uf",
    pagador_telefone: "f1_telefone",
    pagador_email: "f1_email",
    pagador_estadoCivil: "f1_estadoCivil",
    pagador_cargo: "f1_cargo",
    pagador_lotacao: "f1_lotacao",
    pagador_situacaoFuncional: "f1_situacaoFuncional",
  };

  Object.entries(map).forEach(([pagadorId, proponenteId]) => {
    setFieldValue(pagadorId, getFieldValue(proponenteId));
  });
}

function fecharAlertaPagador() {
  document.querySelector(".payer-alert-overlay")?.remove();
}

function mostrarAlertaPagador() {
  if (pagadorAlertShown) return;
  pagadorAlertShown = true;

  const overlay = document.createElement("div");
  overlay.className = "payer-alert-overlay";
  overlay.innerHTML = `
    <div class="payer-alert-card" role="dialog" aria-modal="true">
      <p>Deseja utilizar os mesmos dados já preenchidos?</p>
      <div class="payer-alert-actions">
        <button type="button" class="btn btn-success" id="usarDadosProponenteBtn">Sim</button>
        <button type="button" class="btn btn-danger" id="preencherManualBtn">Não</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("usarDadosProponenteBtn")?.addEventListener("click", () => {
    copiarDadosProponenteParaPagador();
    fecharAlertaPagador();
  });

  document.getElementById("preencherManualBtn")?.addEventListener("click", fecharAlertaPagador);
}

dadosPagadorSection?.addEventListener("focusin", mostrarAlertaPagador);


// ===============================
// FORMA DE PAGAMENTO
// ===============================
function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function atualizarPainelPagamento() {
  const formaSelecionada = getCheckedValue("formaPagamento");

  paymentPanels.forEach((panel) => {
    const isActive = panel.dataset.paymentPanel === formaSelecionada;
    panel.hidden = !isActive;

    if (!isActive) {
      panel.querySelectorAll("input, select, textarea").forEach((field) => {
        if (field.type === "radio" || field.type === "checkbox") field.checked = false;
        else field.value = "";
      });
    }
  });
}

function getFormaPagamento() {
  const forma = getCheckedValue("formaPagamento");

  return {
    forma,
    boleto: {
      melhorDiaPagamento: getCheckedValue("boletoDia"),
    },
    cartaoCredito: {
      nomeImpresso: getFieldValue("cartao_nome"),
      numero: getFieldValue("cartao_numero"),
      validade: getFieldValue("cartao_validade"),
      cvv: getFieldValue("cartao_cvv"),
    },
    debitoConta: {
      tipoConta: getFieldValue("debito_tipo_conta"),
      banco: getFieldValue("debito_banco"),
      agencia: getFieldValue("debito_agencia"),
      conta: getFieldValue("debito_conta"),
    },
    descontoFolha: {
      matricula: getFieldValue("folha_matricula"),
      orgao: getFieldValue("folha_orgao"),
      esfera: getCheckedValue("folha_esfera"),
    },
  };
}

function resetarFormaPagamento() {
  document.querySelectorAll('input[name="formaPagamento"], input[name="boletoDia"], input[name="folha_esfera"]').forEach((field) => {
    field.checked = false;
  });
  paymentPanels.forEach((panel) => {
    panel.hidden = true;
  });
}

formaPagamentoRadios.forEach((radio) => {
  radio.addEventListener("change", atualizarPainelPagamento);
});

// ===============================
// VALOR TOTAL
// ===============================
function calcularValorTotal() {
  const quantidadePessoas = document.querySelectorAll(".valor-pessoa-btn").length;
  return quantidadePessoas * VALOR_POR_PESSOA;
}

function gerarValorTotal() {
  const total = calcularValorTotal();

  if (valorTotalOutput) {
    valorTotalOutput.textContent = formatCurrencyBR(total);
  }

  return total;
}

gerarTotalBtn?.addEventListener("click", gerarValorTotal);

// ===============================
// COLETA DE DADOS
// ===============================
function getFormDataObject() {
  return {
    tipoFormulario: "Formulário 1 - Clube de Benefícios Planos de Saúde",
    enviadoEm: new Date().toISOString(),
    valorPorPessoa: VALOR_POR_PESSOA,
    valorTotal: gerarValorTotal(),
    dadosProponente: {
      nome: getFieldValue("f1_nome"),
      rg: getFieldValue("f1_rg"),
      cpf: getFieldValue("f1_cpf"),
      sexo: getFieldValue("f1_sexo"),
      admissao: formatDateBR(getFieldValue("f1_admissao")),
      nascimento: formatDateBR(getFieldValue("f1_nascimento")),
      tipoSanguineo: getFieldValue("f1_tipoSanguineo"),
      endereco: getFieldValue("f1_endereco"),
      cep: getFieldValue("f1_cep"),
      bairro: getFieldValue("f1_bairro"),
      cidade: getFieldValue("f1_cidade"),
      uf: getFieldValue("f1_uf"),
      telefone: getFieldValue("f1_telefone"),
      email: getFieldValue("f1_email"),
      estadoCivil: getFieldValue("f1_estadoCivil"),
      cargo: getFieldValue("f1_cargo"),
      lotacao: getFieldValue("f1_lotacao"),
      situacaoFuncional: getFieldValue("f1_situacaoFuncional"),
    },
    dadosPagador: {
      nome: getFieldValue("pagador_nome"),
      rg: getFieldValue("pagador_rg"),
      cpf: getFieldValue("pagador_cpf"),
      sexo: getFieldValue("pagador_sexo"),
      admissao: formatDateBR(getFieldValue("pagador_admissao")),
      nascimento: formatDateBR(getFieldValue("pagador_nascimento")),
      tipoSanguineo: getFieldValue("pagador_tipoSanguineo"),
      endereco: getFieldValue("pagador_endereco"),
      cep: getFieldValue("pagador_cep"),
      bairro: getFieldValue("pagador_bairro"),
      cidade: getFieldValue("pagador_cidade"),
      uf: getFieldValue("pagador_uf"),
      telefone: getFieldValue("pagador_telefone"),
      email: getFieldValue("pagador_email"),
      estadoCivil: getFieldValue("pagador_estadoCivil"),
      cargo: getFieldValue("pagador_cargo"),
      lotacao: getFieldValue("pagador_lotacao"),
      situacaoFuncional: getFieldValue("pagador_situacaoFuncional"),
    },
    proponentesAdicionais: getProponentesAdicionais(),
    formaPagamento: getFormaPagamento(),
  };
}

// ===============================
// ENVIO PARA API
// ===============================
async function processarEnvio(event) {
  event.preventDefault();

  if (!form1.checkValidity()) {
    form1.reportValidity();
    return;
  }

  const payload = getFormDataObject();

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";
    }

    const response = await fetch("/api/enviar-formulario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Não foi possível enviar o formulário.");
    }

    alert("Formulário enviado com sucesso! O documento foi encaminhado para assinatura digital.");
    form1.reset();
    if (proponentesContainer) proponentesContainer.innerHTML = "";
    if (valorTotalOutput) valorTotalOutput.textContent = formatCurrencyBR(0);
    resetarFormaPagamento();
  } catch (error) {
    console.error("Erro no envio:", error);
    alert(error.message || "Erro ao enviar formulário. Tente novamente.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar formulário";
    }
  }
}

form1?.addEventListener("submit", processarEnvio);

// ===============================
// INICIALIZAÇÃO
// ===============================
window.addEventListener("load", () => {
  if (proponentesContainer) proponentesContainer.innerHTML = "";
  if (valorTotalOutput) valorTotalOutput.textContent = formatCurrencyBR(0);
  resetarFormaPagamento();
});
