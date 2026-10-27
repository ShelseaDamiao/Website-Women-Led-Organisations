/*
 * Comunidados — lógica do site
 * Navegação, formulário de registo, envio para a Google Sheet, pesquisa e diretório.
 */
(function () {
  "use strict";

  const CFG = window.COMUNIDADOS_CONFIG || {};
  const DADOS = window.COMUNIDADOS_DADOS;
  const URL_API = (CFG.APPS_SCRIPT_URL || "").trim();

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  // Minúsculas e sem acentos, para a pesquisa encontrar "educacao" e "Educação"
  const normalizar = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lista = (s) => (Array.isArray(s) ? s : String(s || "").split(";")).map((x) => String(x).trim()).filter(Boolean);
  const semMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================= Navegação ================= */
  const ROTAS = {
    "inicio": "Comunidados — Registo Nacional das Organizações da Sociedade Civil",
    "registar": "Registar organização — Comunidados",
    "diretorio": "Pesquisar organizações — Comunidados",
    "sobre": "Sobre — Comunidados"
  };

  function navegar() {
    const hash = location.hash.slice(1);
    if (hash === "conteudo") { $("#conteudo").focus(); return; }
    const rota = ROTAS[hash] ? hash : "inicio";
    $$("[data-view]").forEach((v) => { v.hidden = v.dataset.view !== rota; });
    $$(".site-nav a").forEach((a) => {
      if (a.dataset.route === rota) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title = ROTAS[rota];
    fecharMenu();
    window.scrollTo(0, 0);
    if (rota === "diretorio") carregarDiretorio();
  }

  const menuBtn = $(".menu-toggle");
  const nav = $("#nav-principal");
  function fecharMenu() { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    const aberto = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(aberto));
  });

  /* ================= Formulário ================= */
  const PREFIXO = "reg";

  function htmlCampo(f) {
    const id = `${PREFIXO}-${f.name}`;
    const span = f.span === 2 ? " span-2" : "";
    const req = f.required ? " required" : "";
    const marca = f.required ? ' <span class="req" aria-hidden="true">*</span>' : "";
    const ajuda = f.help ? `<p class="help" id="${id}-ajuda">${esc(f.help)}</p>` : "";
    const erro = `<p class="error" id="${id}-erro" hidden></p>`;
    const desc = `aria-describedby="${f.help ? id + "-ajuda " : ""}${id}-erro"`;

    if (f.type === "checks") {
      const opcoes = f.options.map((o, i) => `
        <label class="check"><input type="checkbox" name="${f.name}" value="${esc(o)}" id="${id}-${i}"> ${esc(o)}</label>`).join("");
      return `<div class="field${span}" data-field="${f.name}" data-group="1" data-required="${f.required ? 1 : 0}">
        <fieldset class="checks" ${desc}>
          <legend class="group-label">${esc(f.label)}${marca}</legend>
          ${ajuda}<div class="checks-grid">${opcoes}</div>
        </fieldset>${erro}</div>`;
    }

    if (f.type === "consent") {
      return `<div class="field${span}" data-field="${f.name}">
        <label class="check consent"><input type="checkbox" name="${f.name}" id="${id}" value="Sim"${req} ${desc}> <span>${esc(f.label)}${marca}</span></label>
        ${erro}</div>`;
    }

    const rotulo = `<label for="${id}">${esc(f.label)}${marca}</label>`;
    let controlo;
    if (f.type === "select") {
      controlo = `<select id="${id}" name="${f.name}"${req} ${desc}>
        <option value="">Seleccione</option>
        ${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}
      </select>`;
    } else if (f.type === "textarea") {
      controlo = `<textarea id="${id}" name="${f.name}" rows="3"${req} ${desc}${f.maxlength ? ` maxlength="${f.maxlength}"` : ""}></textarea>`;
    } else {
      const attrs = [
        f.placeholder && `placeholder="${esc(f.placeholder)}"`,
        f.pattern && `pattern="${esc(f.pattern)}"`,
        f.maxlength && `maxlength="${f.maxlength}"`,
        f.min !== undefined && `min="${f.min}"`,
        f.max !== undefined && `max="${f.max}"`,
        f.inputmode && `inputmode="${f.inputmode}"`,
        f.autocomplete && `autocomplete="${f.autocomplete}"`,
        f.patternMsg && `data-pattern-msg="${esc(f.patternMsg)}"`
      ].filter(Boolean).join(" ");
      controlo = `<input type="${f.type}" id="${id}" name="${f.name}" ${attrs}${req} ${desc}>`;
    }
    return `<div class="field${span}" data-field="${f.name}">${rotulo}${ajuda}${controlo}${erro}</div>`;
  }

  function construirFormulario(contentor) {
    const seccoes = DADOS.SECCOES;

    const navItens = seccoes.map((s) =>
      `<li data-nav-seccao="${s.id}"><button type="button" data-ir="${PREFIXO}-${s.id}"><span class="n"></span>${esc(s.titulo)}</button></li>`).join("");

    const corpo = seccoes.map((s) => {
      const classes = ["form-section", s.destaque && "lideranca", s.destaquePublico && "publico"].filter(Boolean).join(" ");
      const tag = s.destaquePublico ? ' <span class="publico-tag">Aparece no diretório</span>' : "";
      return `
      <fieldset class="${classes}" id="${PREFIXO}-${s.id}" data-seccao="${s.id}">
        <legend><span class="section-title"><span class="num"></span><h2>${esc(s.titulo)}${tag}</h2></span></legend>
        ${s.descricao ? `<p class="section-desc">${esc(s.descricao)}</p>` : ""}
        <div class="grid">${s.campos.map(htmlCampo).join("")}</div>
      </fieldset>`;
    }).join("");

    const aviso = URL_API ? "" :
      `<p class="demo-note">Modo de demonstração: a ligação à Google Sheet ainda não foi configurada em <code>js/config.js</code>, por isso os registos não são gravados.</p>`;

    contentor.innerHTML = `
      <div class="form-layout">
        <aside class="form-nav" aria-label="Secções do formulário">
          <ol>${navItens}</ol>
          <p class="draft-note">O que escrever fica guardado neste dispositivo até enviar.</p>
        </aside>
        <div class="form-area">
          ${aviso}
          <form novalidate>
            <div class="form-alert" role="alert" hidden></div>
            ${corpo}
            <div class="hp" aria-hidden="true">
              <label>Não preencha este campo <input type="text" name="_website_hp" tabindex="-1" autocomplete="off"></label>
            </div>
            <div class="form-actions">
              <button type="submit" class="primary">Enviar registo</button>
            </div>
          </form>
        </div>
      </div>`;

    const form = $("form", contentor);

    $$("[data-ir]", contentor).forEach((b) => b.addEventListener("click", () => {
      const alvo = document.getElementById(b.dataset.ir);
      alvo.scrollIntoView({ behavior: semMovimento() ? "auto" : "smooth" });
      const primeiro = $("input, select, textarea", alvo);
      if (primeiro) primeiro.focus({ preventScroll: true });
    }));

    restaurarRascunho(form);
    actualizarCondicionais(form, contentor);

    form.addEventListener("input", (e) => {
      guardarRascunho(form);
      const w = e.target.closest(".field");
      if (w && w.classList.contains("invalid")) mostrarErro(w);
    });
    form.addEventListener("change", (e) => {
      actualizarCondicionais(form, contentor);
      const w = e.target.closest(".field");
      if (w && w.classList.contains("invalid")) mostrarErro(w);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      enviar(form, contentor);
    });
  }

  /** Mostra ou esconde secções com "mostrarSe" e renumera as secções visíveis. */
  function actualizarCondicionais(form, contentor) {
    DADOS.SECCOES.forEach((s) => {
      if (!s.mostrarSe) return;
      const marcados = $$(`input[name="${s.mostrarSe.campo}"]:checked`, form).map((c) => c.value);
      const visivel = marcados.includes(s.mostrarSe.valor);
      const fs = $(`[data-seccao="${s.id}"]`, form);
      fs.hidden = !visivel;
      fs.disabled = !visivel; // campos desactivados não são validados nem enviados
      $(`[data-nav-seccao="${s.id}"]`, contentor).hidden = !visivel;
    });
    let n = 0;
    $$("[data-seccao]", form).forEach((fs) => {
      if (fs.hidden) return;
      n += 1;
      $(".num", fs).textContent = n;
      $(`[data-nav-seccao="${fs.dataset.seccao}"] .n`, contentor).textContent = n + ". ";
    });
  }

  /* ---------- Validação ---------- */
  function mensagemErro(w) {
    if (w.dataset.group) {
      const marcados = $$("input:checked", w).length;
      return w.dataset.required === "1" && marcados === 0 ? "Seleccione pelo menos uma opção." : "";
    }
    const el = $("input, select, textarea", w);
    const v = el.validity;
    if (v.valid) return "";
    if (v.valueMissing) {
      if (el.type === "checkbox") return "Marque esta caixa para poder enviar.";
      if (el.tagName === "SELECT") return "Escolha uma opção.";
      return "Preencha este campo.";
    }
    if (v.typeMismatch && el.type === "email") return "Indique um email válido, por exemplo nome@organizacao.org.";
    if (v.typeMismatch && el.type === "url") return "Indique o endereço completo, a começar por https://";
    if (v.patternMismatch) return el.dataset.patternMsg || "O formato não é válido.";
    if (v.rangeUnderflow || v.rangeOverflow) {
      return el.max ? `Indique um número entre ${el.min} e ${el.max}.` : `Indique um número igual ou superior a ${el.min}.`;
    }
    if (v.badInput) return "Indique apenas algarismos.";
    return el.validationMessage;
  }

  function mostrarErro(w) {
    const msg = mensagemErro(w);
    const caixa = $(".error", w);
    caixa.textContent = msg;
    caixa.hidden = !msg;
    w.classList.toggle("invalid", !!msg);
    const ctrl = $("input, select, textarea", w);
    if (ctrl && !w.dataset.group) ctrl.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  function validar(form) {
    let primeiro = null;
    $$(".field[data-field]", form).forEach((w) => {
      if (w.closest("fieldset[disabled]")) return;
      if (!mostrarErro(w) && !primeiro) primeiro = w;
    });
    if (primeiro) {
      primeiro.scrollIntoView({ block: "center" });
      $("input, select, textarea", primeiro).focus({ preventScroll: true });
    }
    return !primeiro;
  }

  /* ---------- Recolha e envio ---------- */
  function recolher(form) {
    const fd = new FormData(form);
    const dados = {};
    const rotulos = {};
    DADOS.SECCOES.forEach((s) => s.campos.forEach((f) => {
      rotulos[f.name] = f.label;
      if (f.type === "checks") dados[f.name] = fd.getAll(f.name);
      else if (f.type === "consent") dados[f.name] = fd.get(f.name) ? "Sim" : "Não";
      else dados[f.name] = String(fd.get(f.name) || "").trim();
    }));
    dados._rotulos = rotulos;
    dados._website_hp = fd.get("_website_hp") || "";
    return dados;
  }

  async function enviarParaPlanilha(dados) {
    if (!URL_API) {
      await espera(800);
      return { ok: true, id: "DEMO-" + Math.floor(Math.random() * 9000 + 1000), demo: true };
    }
    // text/plain evita o pedido prévio de CORS, que o Apps Script não suporta
    const resp = await fetch(URL_API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return resp.json();
  }

  async function enviar(form, contentor) {
    const alerta = $(".form-alert", form);
    alerta.hidden = true;
    if (!validar(form)) return;

    const botao = $("button[type=submit]", form);
    botao.disabled = true;
    botao.textContent = "A enviar…";

    try {
      const r = await enviarParaPlanilha(recolher(form));
      if (r.ok) {
        limparRascunho();
        mostrarSucesso(contentor, r);
        dirCache = null;
        carregarEstatisticas();
        return;
      }
      alerta.textContent = r.erro === "duplicado"
        ? "Já existe uma organização registada com este nome. Para corrigir os dados, escreva para " + (CFG.EMAIL_CONTACTO || "a equipa") + "."
        : (r.mensagem || "O registo não foi aceite. Reveja os dados e tente novamente.");
    } catch (err) {
      console.error(err);
      alerta.textContent = "Não foi possível enviar o registo. Verifique a ligação à internet e tente novamente; os dados preenchidos foram mantidos.";
    }
    alerta.hidden = false;
    alerta.scrollIntoView({ block: "center" });
    botao.disabled = false;
    botao.textContent = "Enviar registo";
  }

  function mostrarSucesso(contentor, r) {
    contentor.innerHTML = `
      <div class="success" tabindex="-1">
        <h2>Registo enviado</h2>
        <p>A referência deste registo é</p>
        <p class="ref">${esc(r.id)}</p>
        <p>A organização já está no diretório. Guarde esta referência para pedir correcções ou actualizar os dados.</p>
        ${r.demo ? '<p class="demo-note">Modo de demonstração: nada foi gravado na Google Sheet.</p>' : ""}
        <div class="form-actions">
          <a class="button" href="#diretorio">Ver no diretório</a>
          <button type="button" class="secondary" data-novo>Registar outra organização</button>
        </div>
      </div>`;
    window.scrollTo(0, 0);
    $(".success", contentor).focus();
    $("[data-novo]", contentor).addEventListener("click", () => {
      construirFormulario(contentor);
      window.scrollTo(0, 0);
    });
  }

  /* ---------- Rascunho no dispositivo ---------- */
  const CHAVE = "comunidados-rascunho";

  function guardarRascunho(form) {
    try {
      const d = recolher(form);
      delete d._rotulos; delete d._website_hp;
      localStorage.setItem(CHAVE, JSON.stringify(d));
    } catch (_) { /* armazenamento indisponível */ }
  }

  function restaurarRascunho(form) {
    let d;
    try { d = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (_) { d = null; }
    if (!d) return;
    DADOS.SECCOES.forEach((s) => s.campos.forEach((f) => {
      const v = d[f.name];
      if (v === undefined) return;
      if (f.type === "checks") {
        $$(`input[name="${f.name}"]`, form).forEach((c) => { c.checked = Array.isArray(v) && v.includes(c.value); });
      } else if (f.type === "consent") {
        form.elements[f.name].checked = v === "Sim";
      } else if (form.elements[f.name]) {
        form.elements[f.name].value = v;
      }
    }));
  }

  function limparRascunho() {
    try { localStorage.removeItem(CHAVE); } catch (_) { /* ignorar */ }
  }

  /* ================= Pesquisa e diretório ================= */
  let dirCache = null;
  const elLista = $("#dir-lista");
  const elEstado = $("#dir-status");
  const btnLimpar = $("#limpar-filtros");
  const filtros = {
    q: $("#f-pesquisa"), prov: $("#f-provincia"), tipo: $("#f-tipo"),
    classe: $("#f-classificacao"), area: $("#f-area")
  };
  const opcoes = (sel, itens) => itens.forEach((t) => sel.insertAdjacentHTML("beforeend", `<option>${esc(t)}</option>`));
  opcoes(filtros.prov, DADOS.PROVINCIAS);
  opcoes(filtros.tipo, DADOS.TIPOS_ORGANIZACAO);
  opcoes(filtros.classe, DADOS.CLASSIFICACOES);
  opcoes(filtros.area, DADOS.AREAS);
  Object.values(filtros).forEach((el) => el.addEventListener("input", desenharDiretorio));
  btnLimpar.addEventListener("click", () => {
    Object.values(filtros).forEach((el) => { el.value = ""; });
    desenharDiretorio();
    filtros.q.focus();
  });

  // Pesquisa da página inicial: leva ao diretório com o termo já escrito
  $("#pesquisa-inicio").addEventListener("submit", (e) => {
    e.preventDefault();
    filtros.q.value = $("#q-inicio").value.trim();
    if (location.hash === "#diretorio") desenharDiretorio();
    else location.hash = "diretorio";
  });

  async function carregarDiretorio() {
    if (dirCache) { desenharDiretorio(); return; }
    if (!URL_API && window.COMUNIDADOS_DEMO) { dirCache = window.COMUNIDADOS_DEMO; desenharDiretorio(); return; }
    if (!URL_API) {
      elEstado.textContent = "";
      elLista.innerHTML = `<div class="empty"><p><strong>O diretório ainda não está ligado à base de dados.</strong></p>
        <p>Configure o endereço da Google Sheet em <code>js/config.js</code> para mostrar as organizações registadas.</p></div>`;
      return;
    }
    elEstado.textContent = "A carregar organizações…";
    elLista.innerHTML = "";
    try {
      const r = await fetch(URL_API + "?accao=diretorio").then((x) => x.json());
      dirCache = r.organizacoes || [];
      desenharDiretorio();
    } catch (err) {
      console.error(err);
      elEstado.textContent = "";
      elLista.innerHTML = `<div class="empty"><p><strong>Não foi possível carregar o diretório.</strong></p>
        <p>Verifique a ligação à internet.</p><button type="button" class="secondary" id="dir-repetir">Tentar novamente</button></div>`;
      $("#dir-repetir").addEventListener("click", carregarDiretorio);
    }
  }

  function textoPesquisavel(o) {
    if (!o._texto) {
      o._texto = normalizar([o.nome, o.sigla, o.missao, o.distrito, o.provincia, o.provincias_actuacao,
        o.areas, o.tipo_organizacao, o.tipo_outro, o.classificacao].join(" "));
    }
    return o._texto;
  }

  function desenharDiretorio() {
    if (!dirCache) return;
    const palavras = normalizar(filtros.q.value).split(/\s+/).filter(Boolean);
    const prov = filtros.prov.value, tipo = filtros.tipo.value, classe = filtros.classe.value, area = filtros.area.value;
    btnLimpar.hidden = !(palavras.length || prov || tipo || classe || area);

    const resultado = dirCache.filter((o) => {
      if (prov && o.provincia !== prov && !lista(o.provincias_actuacao).includes(prov)) return false;
      if (tipo && o.tipo_organizacao !== tipo) return false;
      if (classe && !lista(o.classificacao).includes(classe)) return false;
      if (area && !lista(o.areas).includes(area)) return false;
      const t = textoPesquisavel(o);
      return palavras.every((p) => t.includes(p));
    }).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt"));

    elEstado.textContent = resultado.length === 1 ? "1 organização encontrada" : `${resultado.length} organizações encontradas`;

    if (!resultado.length) {
      elLista.innerHTML = dirCache.length
        ? `<div class="empty"><p>Nenhuma organização corresponde a esta pesquisa. Experimente outra palavra ou retire um filtro.</p></div>`
        : `<div class="empty"><p><strong>Ainda não há organizações no diretório.</strong></p>
           <p><a href="#registar">Registe a primeira organização</a>.</p></div>`;
      return;
    }

    elLista.innerHTML = resultado.map(htmlOrganizacao).join("");
  }

  function htmlOrganizacao(o) {
    const tipo = o.tipo_organizacao === "Outro" && o.tipo_outro ? o.tipo_outro : o.tipo_organizacao;
    const badges = lista(o.classificacao).map((c) => `<span class="badge-class">${esc(c)}</span>`).join("");
    const tags = lista(o.areas).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

    const contactos = [];
    if (o.telefone_publico) {
      const tel = String(o.telefone_publico).replace(/[^\d+]/g, "");
      contactos.push(`<span>Telefone</span> <a href="tel:${esc(tel)}">${esc(o.telefone_publico)}</a>`);
    }
    if (o.email_publico) contactos.push(`<span>Email</span> <a href="mailto:${esc(o.email_publico)}">${esc(o.email_publico)}</a>`);
    if (o.website && /^https?:\/\//i.test(o.website)) {
      contactos.push(`<span>Website</span> <a href="${esc(o.website)}" target="_blank" rel="noopener">${esc(o.website.replace(/^https?:\/\//i, "").replace(/\/$/, ""))}</a>`);
    }
    if (o.redes_sociais) contactos.push(`<span>Redes sociais</span> ${esc(o.redes_sociais)}`);
    const nota = o.info_contacto ? `<p class="nota">${esc(o.info_contacto)}</p>` : "";

    return `<article class="org">
      <div>
        <h3>${esc(o.nome)}${o.sigla ? ` <span class="sigla">(${esc(o.sigla)})</span>` : ""}</h3>
        <p class="org-meta">${esc(tipo)}, ${esc(o.distrito ? o.distrito + ", " : "")}${esc(o.provincia)}</p>
      </div>
      <div class="org-badges">${badges}</div>
      ${o.missao ? `<p class="org-missao">${esc(o.missao)}</p>` : ""}
      ${contactos.length || nota ? `<div class="org-contactos">${contactos.map((c) => `<p class="c">${c}</p>`).join("")}${nota}</div>` : ""}
      <div class="org-tags">${tags}</div>
    </article>`;
  }

  /* ================= Estatísticas ================= */
  async function carregarEstatisticas() {
    let r = null;
    if (URL_API) {
      try { r = await fetch(URL_API + "?accao=estatisticas").then((x) => x.json()); } catch (_) { return; }
    } else if (window.COMUNIDADOS_DEMO) {
      const d = window.COMUNIDADOS_DEMO;
      const tem = (c) => d.filter((o) => lista(o.classificacao).includes(c)).length;
      r = { ok: true, total: d.length, mulheres: tem("Liderada por mulheres"), jovens: tem("Liderada por jovens"),
            provincias: new Set(d.map((o) => o.provincia)).size };
    }
    if (!r || !r.ok) return;
    ["total", "mulheres", "jovens", "provincias"].forEach((k) => {
      const el = $(`[data-stat="${k}"]`);
      if (el) el.textContent = r[k] ?? "—";
    });
    $("[data-stats]").hidden = false;
  }

  /* ================= Arranque ================= */
  $$("[data-email]").forEach((a) => {
    if (!CFG.EMAIL_CONTACTO) return;
    a.href = "mailto:" + CFG.EMAIL_CONTACTO;
    a.textContent = CFG.EMAIL_CONTACTO;
  });
  $$("[data-ano]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  $$("[data-classificacoes]").forEach((ul) => {
    ul.innerHTML = DADOS.CLASSIFICACOES.map((c) => `<li>${esc(c)}</li>`).join("");
  });

  construirFormulario($("#formulario-registo"));
  carregarEstatisticas();
  window.addEventListener("hashchange", navegar);
  navegar();
})();
