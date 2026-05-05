import { removerAcentos } from "./utils.js";
import { montarResumoFormulario } from "./formulario.js";

function escaparPdfText(value = "") {
  return removerAcentos(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function quebrarLinha(texto, max = 92) {
  const palavras = String(texto).split(" ");
  const linhas = [];
  let atual = "";

  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > max) {
      if (atual) linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }

  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export function gerarPdfPreenchido(formulario) {
  const linhasOriginais = montarResumoFormulario(formulario);
  const linhas = linhasOriginais.map(removerAcentos).flatMap((linha) => quebrarLinha(linha));
  const pages = [];
  const maxLinesPerPage = 42;

  for (let i = 0; i < linhas.length; i += maxLinesPerPage) {
    pages.push(linhas.slice(i, i + maxLinesPerPage));
  }

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  pages.forEach((pageLines) => {
    const content = ["BT", "/F1 10 Tf", "50 790 Td", "14 TL"];
    pageLines.forEach((line, index) => {
      const escaped = escaparPdfText(line);
      if (index === 0) content.push(`(${escaped}) Tj`);
      else content.push(`T* (${escaped}) Tj`);
    });
    content.push("ET");

    const stream = content.join("\n");
    const streamId = addObj(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(`<< /Type /Page /Parent PARENT_REF /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  });

  const pagesId = addObj(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  pageIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("PARENT_REF", `${pagesId} 0 R`);
  });

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
