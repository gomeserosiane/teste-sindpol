import { limparTexto, formatCurrencyBR } from "./utils.js";

export function normalizarFormulario(raw = {}) {
  const proponentesAdicionais = Array.isArray(raw.proponentesAdicionais) ? raw.proponentesAdicionais : [];
  const valorPorPessoa = Number(raw.valorPorPessoa || 40);
  const totalPessoas = 1 + proponentesAdicionais.length;
  const valorTotal = totalPessoas * valorPorPessoa;

  return {
    ...raw,
    valorPorPessoa,
    totalPessoas,
    valorTotal,
    dadosProponente: raw.dadosProponente || raw.dadosPessoais || {},
    dadosPagador: raw.dadosPagador || {},
    proponentesAdicionais,
    formaPagamento: raw.formaPagamento || {},
  };
}

export function validarFormulario(formulario) {
  const proponente = formulario?.dadosProponente || {};

  if (!limparTexto(proponente.nome)) {
    throw new Error("O nome do proponente é obrigatório.");
  }

  if (!limparTexto(proponente.email) && !limparTexto(proponente.telefone)) {
    throw new Error("Informe email ou telefone WhatsApp do proponente para enviar a assinatura digital.");
  }
}

export function montarResumoFormulario(formulario) {
  const linhas = [];
  const push = (label, value) => linhas.push(`${label}: ${limparTexto(value) || "-"}`);
  const section = (title) => {
    linhas.push("");
    linhas.push(`### ${title}`);
  };

  const proponente = formulario.dadosProponente || {};
  const pagador = formulario.dadosPagador || {};
  const proponentesAdicionais = formulario.proponentesAdicionais || [];
  const pagamento = formulario.formaPagamento || {};

  linhas.push("FICHA DE CADASTRO - CLUBE DE BENEFICIOS SINDPOL");
  linhas.push(`Gerada em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" })}`);

  section("Dados do proponente");
  push("Valor por pessoa", formatCurrencyBR(formulario.valorPorPessoa));
  push("Nome", proponente.nome);
  push("RG", proponente.rg);
  push("CPF", proponente.cpf);
  push("Sexo", proponente.sexo);
  push("Admissao", proponente.admissao);
  push("Nascimento", proponente.nascimento);
  push("Tipo sanguineo", proponente.tipoSanguineo);
  push("Endereco", proponente.endereco);
  push("CEP", proponente.cep);
  push("Bairro", proponente.bairro);
  push("Cidade", proponente.cidade);
  push("UF", proponente.uf);
  push("Telefone WhatsApp", proponente.telefone);
  push("Email", proponente.email);
  push("Estado civil", proponente.estadoCivil);
  push("Cargo", proponente.cargo);
  push("Lotacao", proponente.lotacao);
  push("Situacao funcional", proponente.situacaoFuncional);

  section("Dados do responsavel financeiro");
  push("Nome", pagador.nome);
  push("RG", pagador.rg);
  push("CPF", pagador.cpf);
  push("Sexo", pagador.sexo);
  push("Admissao", pagador.admissao);
  push("Nascimento", pagador.nascimento);
  push("Tipo sanguineo", pagador.tipoSanguineo);
  push("Endereco", pagador.endereco);
  push("CEP", pagador.cep);
  push("Bairro", pagador.bairro);
  push("Cidade", pagador.cidade);
  push("UF", pagador.uf);
  push("Telefone WhatsApp", pagador.telefone);
  push("Email", pagador.email);
  push("Estado civil", pagador.estadoCivil);
  push("Cargo", pagador.cargo);
  push("Lotacao", pagador.lotacao);
  push("Situacao funcional", pagador.situacaoFuncional);

  section("Proponentes adicionais");
  if (!proponentesAdicionais.length) linhas.push("Nenhum proponente adicional informado.");
  proponentesAdicionais.forEach((item, index) => {
    linhas.push(`Proponente ${index + 1}`);
    push("Valor por pessoa", formatCurrencyBR(formulario.valorPorPessoa));
    push("Nome", item.nome);
    push("CPF", item.cpf);
    push("Nascimento", item.nascimento);
    linhas.push("");
  });

  section("Valor total");
  push("Quantidade de pessoas", formulario.totalPessoas);
  push("Total", formatCurrencyBR(formulario.valorTotal));

  section("Forma de pagamento");
  push("Forma escolhida", pagamento.forma);
  if (pagamento.forma === "boleto") {
    push("Melhor dia para boleto", pagamento.boleto?.melhorDiaPagamento);
  }
  if (pagamento.forma === "cartao_credito") {
    push("Nome impresso", pagamento.cartaoCredito?.nomeImpresso);
    push("Número do cartão", pagamento.cartaoCredito?.numero);
    push("Validade", pagamento.cartaoCredito?.validade);
  }
  if (pagamento.forma === "debito_conta") {
    push("Tipo de conta", pagamento.debitoConta?.tipoConta);
    push("Banco", pagamento.debitoConta?.banco);
    push("Agência", pagamento.debitoConta?.agencia);
    push("Conta", pagamento.debitoConta?.conta);
  }
  if (pagamento.forma === "desconto_folha") {
    push("Matrícula", pagamento.descontoFolha?.matricula);
    push("Órgão", pagamento.descontoFolha?.orgao);
    push("Esfera", pagamento.descontoFolha?.esfera);
  }

  section("Assinatura digital");
  linhas.push("Documento enviado para assinatura digital pela Assinafy.");
  linhas.push("Assinante principal: titular informado em Dados do proponente.");

  return linhas;
}
