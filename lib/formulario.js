import { limparTexto, formatCurrencyBR } from "./utils.js";

export function normalizarFormulario(raw = {}) {
  const componentesAdicionais = Array.isArray(raw.componentesAdicionais) ? raw.componentesAdicionais : [];
  const valorPorPessoa = Number(raw.valorPorPessoa || 40);
  const totalPessoas = 1 + componentesAdicionais.length;
  const valorTotal = totalPessoas * valorPorPessoa;

  return {
    ...raw,
    valorPorPessoa,
    totalPessoas,
    valorTotal,
    dadosComponente: raw.dadosComponente || raw.dadosPessoais || {},
    dadosPagador: raw.dadosPagador || {},
    componentesAdicionais,
  };
}

export function validarFormulario(formulario) {
  const componente = formulario?.dadosComponente || {};

  if (!limparTexto(componente.nome)) {
    throw new Error("O nome do componente é obrigatório.");
  }

  if (!limparTexto(componente.email) && !limparTexto(componente.telefone)) {
    throw new Error("Informe email ou telefone WhatsApp do componente para enviar a assinatura digital.");
  }
}

export function montarResumoFormulario(formulario) {
  const linhas = [];
  const push = (label, value) => linhas.push(`${label}: ${limparTexto(value) || "-"}`);
  const section = (title) => {
    linhas.push("");
    linhas.push(`### ${title}`);
  };

  const componente = formulario.dadosComponente || {};
  const pagador = formulario.dadosPagador || {};
  const componentesAdicionais = formulario.componentesAdicionais || [];

  linhas.push("FICHA DE CADASTRO - CLUBE DE BENEFICIOS SINDPOL");
  linhas.push(`Gerada em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" })}`);

  section("Dados do componente");
  push("Valor por pessoa", formatCurrencyBR(formulario.valorPorPessoa));
  push("Nome", componente.nome);
  push("RG", componente.rg);
  push("CPF", componente.cpf);
  push("Sexo", componente.sexo);
  push("Admissao", componente.admissao);
  push("Nascimento", componente.nascimento);
  push("Tipo sanguineo", componente.tipoSanguineo);
  push("Endereco", componente.endereco);
  push("CEP", componente.cep);
  push("Bairro", componente.bairro);
  push("Cidade", componente.cidade);
  push("UF", componente.uf);
  push("Telefone WhatsApp", componente.telefone);
  push("Email", componente.email);
  push("Estado civil", componente.estadoCivil);
  push("Cargo", componente.cargo);
  push("Lotacao", componente.lotacao);
  push("Situacao funcional", componente.situacaoFuncional);

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

  section("Componentes adicionais");
  if (!componentesAdicionais.length) linhas.push("Nenhum componente adicional informado.");
  componentesAdicionais.forEach((item, index) => {
    linhas.push(`Componente ${index + 1}`);
    push("Valor por pessoa", formatCurrencyBR(formulario.valorPorPessoa));
    push("Nome", item.nome);
    push("CPF", item.cpf);
    push("Nascimento", item.nascimento);
    linhas.push("");
  });

  section("Valor total");
  push("Quantidade de pessoas", formulario.totalPessoas);
  push("Total", formatCurrencyBR(formulario.valorTotal));

  section("Assinatura digital");
  linhas.push("Documento enviado para assinatura digital pela Assinafy.");
  linhas.push("Assinante principal: titular informado em Dados do componente.");

  return linhas;
}
