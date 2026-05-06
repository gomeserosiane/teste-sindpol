import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { limparTexto, removerAcentos, formatCurrencyBR } from "./utils.js";

const TEMPLATE_PATH = path.join(process.cwd(), "docs", "ficha-sindpol-template.pdf");

function texto(value = "") {
  return removerAcentos(limparTexto(value || ""));
}

function limitar(value = "", max = 42) {
  const clean = texto(value);
  return clean.length > max ? `${clean.slice(0, Math.max(0, max - 1))}.` : clean;
}

function draw(page, value, x, yTop, options = {}) {
  const { font, size = 8.2, max = 38, color = rgb(0, 0, 0) } = options;
  const pageHeight = page.getHeight();
  page.drawText(limitar(value, max), {
    x,
    y: pageHeight - yTop,
    size,
    font,
    color,
  });
}

function campoLinha(page, dados, prefixTop, font) {
  // Coordenadas medidas no template A4 enviado pelo usuário, em pontos PDF com origem visual no topo.
  draw(page, dados.nome, 68, prefixTop.nome, { font, max: 70 });
  draw(page, dados.nascimento, 130, prefixTop.nascimento, { font, max: 18 });
  draw(page, dados.rg, 267, prefixTop.nascimento, { font, max: 22 });
  draw(page, dados.cpf, 379, prefixTop.nascimento, { font, max: 22 });
  draw(page, dados.sexo, 63, prefixTop.sexo, { font, max: 22 });
  draw(page, dados.tipoSanguineo, 286, prefixTop.sexo, { font, max: 15 });
  draw(page, dados.estadoCivil, 93, prefixTop.estadoCivil, { font, max: 28 });
  draw(page, dados.endereco, 84, prefixTop.endereco, { font, max: 72 });
  draw(page, dados.bairro, 68, prefixTop.bairro, { font, max: 24 });
  draw(page, dados.cidade, 180, prefixTop.bairro, { font, max: 28 });
  draw(page, dados.uf, 302, prefixTop.bairro, { font, max: 5 });
  draw(page, dados.cep, 414, prefixTop.bairro, { font, max: 13 });
  draw(page, dados.admissao, 122, prefixTop.admissao, { font, max: 18 });
  draw(page, dados.telefone, 136, prefixTop.telefone, { font, max: 22 });
  draw(page, dados.email, 280, prefixTop.telefone, { font, max: 45 });
  draw(page, dados.cargo, 68, prefixTop.cargo, { font, max: 20 });
  draw(page, dados.lotacao, 184, prefixTop.cargo, { font, max: 25 });
  draw(page, dados.situacaoFuncional, 354, prefixTop.cargo, { font, max: 22 });
}

function preencherComponentesAdicionais(page, componentes = [], font) {
  const colunas = [
    { xLabel: 68, yNome: 582, yCpf: 594, yNasc: 606 },
    { xLabel: 245, yNome: 582, yCpf: 594, yNasc: 606 },
    { xLabel: 422, yNome: 582, yCpf: 594, yNasc: 606 },
  ];

  componentes.slice(0, 3).forEach((item, index) => {
    const col = colunas[index];
    draw(page, item.nome, col.xLabel, col.yNome, { font, max: 22, size: 7.8 });
    draw(page, item.cpf, col.xLabel, col.yCpf, { font, max: 18, size: 7.8 });
    draw(page, item.nascimento, col.xLabel + 60, col.yNasc, { font, max: 14, size: 7.8 });
  });
}

function preencherValorTotal(page, formulario, fontBold) {
  const total = formatCurrencyBR(formulario.valorTotal);
  const pessoas = formulario.totalPessoas;
  page.drawText(`Total: ${pessoas} pessoa(s) x R$ 40,00 = ${total}`, {
    x: 36,
    y: 215,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.05, 0.05),
  });
}

export async function gerarPdfPreenchido(formulario) {
  const templateBytes = await fs.readFile(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPage(0);

  campoLinha(page, formulario.dadosComponente || {}, {
    nome: 134,
    nascimento: 154,
    sexo: 175,
    estadoCivil: 195,
    endereco: 215,
    bairro: 235,
    admissao: 255,
    telefone: 276,
    cargo: 296,
  }, font);

  campoLinha(page, formulario.dadosPagador || {}, {
    nome: 348,
    nascimento: 369,
    sexo: 389,
    estadoCivil: 409,
    endereco: 429,
    bairro: 450,
    admissao: 470,
    telefone: 490,
    cargo: 510,
  }, font);

  preencherComponentesAdicionais(page, formulario.componentesAdicionais || [], font);
  preencherValorTotal(page, formulario, fontBold);

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}
