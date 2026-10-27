/**
 * Comunidados — ligação entre o site e a Google Sheet
 *
 * Instalação (resumo; detalhes no README.md):
 *  1. Crie uma Google Sheet e abra Extensões > Apps Script.
 *  2. Cole este código, guarde e execute a função "configurar" uma vez.
 *  3. Implementar > Nova implementação > Aplicação Web
 *     Executar como: Eu | Quem tem acesso: Qualquer pessoa
 *  4. Copie o URL (termina em /exec) para js/config.js no site.
 *
 * Cada registo é publicado de imediato no diretório (Estado "Publicado").
 * Para retirar uma organização do diretório, mude o Estado para "Removido".
 */

const CONFIG = {
  FOLHA: "Registo_OSC",
  PREFIXO: "OSC",
  ESTADOS: ["Publicado", "Removido"],
  // Campos que podem aparecer no diretório público. Nunca inclua contactos.
  // Campos que aparecem no diretório público. Os dados da pessoa responsável (rep_*) ficam de fora.
  CAMPOS_PUBLICOS: ["nome", "sigla", "tipo_organizacao", "tipo_outro", "classificacao",
                    "provincia", "distrito", "ambito", "areas", "provincias_actuacao", "missao",
                    "telefone_publico", "email_publico", "website", "redes_sociais", "info_contacto"],
  OBRIGATORIOS: ["nome", "tipo_organizacao", "provincia", "telefone_publico", "rep_nome", "rep_telefone"],
  // Email que recebe aviso de cada novo registo (deixe vazio para não enviar)
  EMAIL_AVISO: ""
};

const FIXAS = ["ID", "Data de submissão", "Estado"];

/** Execute uma vez para criar a folha e os cabeçalhos. */
function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CONFIG.FOLHA) || ss.insertSheet(CONFIG.FOLHA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(FIXAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FIXAS.length).setFontWeight("bold").setBackground("#E6EEFC");
  }
  const regra = SpreadsheetApp.newDataValidation().requireValueInList(CONFIG.ESTADOS, true).build();
  sh.getRange(2, 3, sh.getMaxRows() - 1, 1).setDataValidation(regra);
}

/* ===================== Receber registos ===================== */
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    // Armadilha anti-spam: pessoas não vêem este campo
    if (dados._website_hp) return resposta({ ok: true, id: "—" });

    const rotulos = dados._rotulos || {};
    delete dados._rotulos; delete dados._website_hp;

    const emFalta = CONFIG.OBRIGATORIOS.filter(function (c) { return !String(dados[c] || "").trim(); });
    if (emFalta.length) {
      return resposta({ ok: false, erro: "incompleto", mensagem: "Faltam campos obrigatórios: " + emFalta.join(", ") });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sh = folha();
      const cabecalhos = garantirCabecalhos(sh, Object.keys(dados), rotulos);

      if (duplicado(sh, cabecalhos, dados)) {
        return resposta({ ok: false, erro: "duplicado" });
      }

      const id = proximoId();
      const linha = cabecalhos.map(function (h) {
        if (h === "ID") return id;
        if (h === "Data de submissão") return new Date();
        if (h === "Estado") return "Publicado";
        const v = dados[h];
        return limpar(Array.isArray(v) ? v.join("; ") : v);
      });
      sh.appendRow(linha);
      CacheService.getScriptCache().removeAll(["diretorio", "estatisticas"]);
      avisar(id, dados);
      return resposta({ ok: true, id: id });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return resposta({ ok: false, erro: "servidor", mensagem: "Erro no servidor. Tente novamente mais tarde." });
  }
}

/* ===================== Diretório e estatísticas ===================== */
function doGet(e) {
  const accao = (e && e.parameter && e.parameter.accao) || "";
  const cache = CacheService.getScriptCache();

  if (accao === "diretorio" || accao === "estatisticas") {
    const guardado = cache.get(accao);
    if (guardado) return ContentService.createTextOutput(guardado).setMimeType(ContentService.MimeType.JSON);

    const resultado = accao === "diretorio" ? diretorio() : estatisticas();
    const texto = JSON.stringify(resultado);
    if (texto.length < 90000) cache.put(accao, texto, 300); // 5 minutos
    return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON);
  }
  return resposta({ ok: true, servico: "Comunidados", versao: 1 });
}

function diretorio() {
  const organizacoes = activas().map(function (r) {
    const o = {};
    CONFIG.CAMPOS_PUBLICOS.forEach(function (c) { o[c] = r[c] === undefined ? "" : String(r[c]); });
    return o;
  });
  return { ok: true, organizacoes: organizacoes };
}

function estatisticas() {
  const todas = activas();
  const provincias = {};
  todas.forEach(function (r) { if (r.provincia) provincias[r.provincia] = true; });
  const com = function (c) {
    return todas.filter(function (r) { return String(r.classificacao || "").indexOf(c) > -1; }).length;
  };
  return {
    ok: true,
    total: todas.length,
    mulheres: com("Liderada por mulheres"),
    jovens: com("Liderada por jovens"),
    provincias: Object.keys(provincias).length
  };
}

function activas() {
  return linhas().filter(function (r) { return r.Estado !== "Removido"; });
}

/* ===================== Auxiliares ===================== */
function folha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CONFIG.FOLHA);
  if (!sh) { configurar(); sh = ss.getSheetByName(CONFIG.FOLHA); }
  return sh;
}

/** Acrescenta colunas para campos novos; a nota de cada cabeçalho mostra a pergunta do formulário. */
function garantirCabecalhos(sh, chaves, rotulos) {
  const ultimaCol = Math.max(sh.getLastColumn(), 1);
  const cabecalhos = sh.getRange(1, 1, 1, ultimaCol).getValues()[0].filter(String);
  chaves.forEach(function (k) {
    if (cabecalhos.indexOf(k) === -1) {
      cabecalhos.push(k);
      const cel = sh.getRange(1, cabecalhos.length);
      cel.setValue(k).setFontWeight("bold").setBackground("#E6EEFC");
      if (rotulos[k]) cel.setNote(rotulos[k]);
    }
  });
  return cabecalhos;
}

function linhas() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.FOLHA);
  if (!sh || sh.getLastRow() < 2) return [];
  const valores = sh.getDataRange().getValues();
  const cab = valores.shift();
  return valores.map(function (v) {
    const o = {};
    cab.forEach(function (h, i) { o[h] = v[i]; });
    return o;
  });
}

function duplicado(sh, cabecalhos, dados) {
  if (sh.getLastRow() < 2) return false;
  const iNome = cabecalhos.indexOf("nome");
  const nome = String(dados.nome || "").trim().toLowerCase();
  const valores = sh.getRange(2, 1, sh.getLastRow() - 1, cabecalhos.length).getValues();
  return valores.some(function (r) {
    if (iNome > -1 && String(r[iNome]).trim().toLowerCase() === nome) return true;
    return false;
  });
}

/** Referências do tipo OSC-2026-00001, que nunca se repetem mesmo apagando linhas. */
function proximoId() {
  const props = PropertiesService.getScriptProperties();
  const ano = new Date().getFullYear();
  const chave = "seq_" + ano;
  const n = Number(props.getProperty(chave) || 0) + 1;
  props.setProperty(chave, String(n));
  return CONFIG.PREFIXO + "-" + ano + "-" + ("00000" + n).slice(-5);
}

/** Impede que texto começado por = + - @ seja interpretado como fórmula. */
function limpar(v) {
  if (v === undefined || v === null) return "";
  const s = String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function avisar(id, dados) {
  if (!CONFIG.EMAIL_AVISO) return;
  try {
    const classes = Array.isArray(dados.classificacao) ? dados.classificacao.join(", ") : "";
    MailApp.sendEmail(CONFIG.EMAIL_AVISO,
      "Novo registo " + id + ": " + dados.nome,
      "Organização: " + dados.nome + "\nTipo: " + dados.tipo_organizacao +
      "\nClassificação: " + (classes || "nenhuma") + "\nProvíncia: " + dados.provincia +
      "\nResponsável: " + dados.rep_nome + " (" + dados.rep_telefone + ")" + "\n\nO registo já está publicado no diretório.");
  } catch (err) { console.error(err); }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
