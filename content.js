(() => {
  const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
  const CNJ_ONE_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

  const FALLBACK = { rules: [], defaultColor: "#7f8c8d" };

  function loadConfigSafe() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(FALLBACK, resolve);
      } catch {
        resolve(FALLBACK);
      }
    });
  }

  function extractPartes(card) {
    const ativo = (card.querySelector(".dtPoloAtivo")?.innerText || "").trim();
    const passivo = (card.querySelector(".dtPoloPassivo")?.innerText || "").trim();

    // no PJe costuma vir "FULANO X " no ativo; dá pra limpar:
    const ativoClean = ativo.replace(/\s+X\s*$/i, "").trim();

    return { ativo: ativoClean, passivo };
  }

  function matchRule(r, numero, assunto, partes) {
    let value = "";

    if (r.type === "numero") value = numero || "";
    else if (r.type === "assunto") value = assunto || "";
    else if (r.type === "partes") {
      const a = partes?.ativo || "";
      const p = partes?.passivo || "";
      const polo = r.polo || "ambos";
      value = (polo === "ativo") ? a : (polo === "passivo") ? p : (a + " " + p);
    }

    try {
      if (r.mode === "contains") return value.toLowerCase().includes(r.pattern.toLowerCase());
      if (r.mode === "startswith") return value.toLowerCase().startsWith(r.pattern.toLowerCase());
      if (r.mode === "regex") return new RegExp(r.pattern, "i").test(value);
    } catch {}
    return false;
  }


  // acha o container de UM item (um processo) sem subir demais
  function findItemContainer(fromEl) {
    let node = fromEl;

    for (let i = 0; i < 14 && node; i++) {
      if (node.nodeType !== 1) { node = node.parentElement; continue; }

      const text = node.innerText || "";
      const cnjs = text.match(CNJ_RE) || [];

      const rect = node.getBoundingClientRect();
      const h = rect.height;
      const w = rect.width;

      // item típico: 1 CNJ, altura “de card”, e tem checkbox/link (evita pegar painel da lista)
      const looksLikeItem =
        cnjs.length === 1 &&
        h > 90 && h < 520 &&
        w > 250 &&
        (node.querySelector("input[type='checkbox']") || node.querySelector("a"));

      if (looksLikeItem) return node;

      node = node.parentElement;
    }
    return null;
  }

  // tenta extrair “assunto” pegando uma linha curta que não seja CNJ nem dados da vara
  function extractAssunto(card) {
    const lines = (card.innerText || "")
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    for (const l of lines) {
      if (CNJ_ONE_RE.test(l)) continue;
      if (/Vara|Comarca|Juiz|Última movimentação/i.test(l)) continue;
      if (l.length < 4) continue;
      return l;
    }
    return "";
  }

  function applyStripe(card, color) {
    card.classList.add("pje-mark");
    card.style.setProperty("--pje-accent", color);
  }

  function applyCardColor(anyElInsideCard, color) {
    const card = anyElInsideCard.closest(".datalist-content");
    if (!card) return;

    // aplica só no card principal
    card.classList.add("pje-mark");
    card.style.setProperty("--pje-accent", color);

    // remove a marcação de qualquer filho que tenha recebido por engano
    card.querySelectorAll(".pje-mark").forEach((el) => {
      if (el !== card) {
        el.classList.remove("pje-mark");
        el.style.removeProperty("--pje-accent");
      }
    });
  }



  async function paintAll() {
    const { rules, defaultColor } = await loadConfigSafe();

    // procura textos que contenham CNJ e pinta o container do item correspondente
    const candidates = Array.from(document.querySelectorAll("a, span, div"))
      .filter(el => el.textContent && CNJ_ONE_RE.test(el.textContent));

    // evita repintar o mesmo card muitas vezes
    const painted = new Set();

    for (const el of candidates) {
      const m = el.textContent.match(CNJ_ONE_RE);
      if (!m) continue;

      const numero = m[0];
      const card = findItemContainer(el);
      if (!card) continue;

      if (painted.has(card)) continue;
      painted.add(card);

      const assunto = extractAssunto(card);

      const partes = extractPartes(card);

      let cor = defaultColor;
      for (const r of rules) {
        if (matchRule(r, numero, assunto, partes)) { cor = r.color; break; }
      }

      //applyStripe(card, cor);
      applyCardColor(el, cor);

    }
  }

  // debounce pra SPA
  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => paintAll().catch(() => {}), 200);
  }

  schedule();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  chrome.runtime?.onMessage?.addListener?.((msg) => {
    if (msg?.type === "REAPPLY") schedule();
  });
})();
