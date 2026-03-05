// ==UserScript==
// @name         e-SUS – Menu de Atalhos + Botão CID (unificado, sem realce)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Script unificado: menu de atalhos, navegação, copiar, expandir/recolher e botão proxy do CID, sem realces de cor na tela.
// @match        *://*esus.jaguariuna.sp.gov.br*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // ===== SISTEMA DE BLOQUEIO DE AUTO-ROLAGEM =====
  const originalScrollTo = window.scrollTo;
  const originalScrollBy = window.scrollBy;

  window.scrollTo = function () {
    console.log("[SOAP Presets] Auto-rolagem window.scrollTo bloqueada");
  };
  window.scrollBy = function () {
    console.log("[SOAP Presets] Auto-rolagem window.scrollBy bloqueada");
  };
  console.log("[SOAP Presets] Sistema de bloqueio de auto-rolagem ativado");

  /********************************************************************
   * CONFIG (se algum botão não achar o alvo, ajuste aqui)
   ********************************************************************/
  const CFG = {
    // Copiar (mantido do seu script de referência; pode quebrar se o layout mudar)
    seletorNomePaciente: "#root > div > div.css-1ylu0bo > main > header > div > div > div:nth-child(1) > div > div > div:nth-child(1) > div > div:nth-child(1) > h2",
    seletorNomeMae: "#root > div > div.css-1ylu0bo > main > header > div > div > div:nth-child(1) > div > div > div:nth-child(2) > div > div:nth-child(2) > div > div > div > div > span > p > span.css-feas39",

    // Fallbacks via XPath (do seu script)
    xpaths: {
      PA: "/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[3]/div[2]/div/div/div[5]/div/div/div/div[1]/div",
      CID: "/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[4]/div[2]/div/div/div[3]/div/div/div/div/div[1]/div/div[2]/div/div[1]/div[2]/div/div/div[2]",
      Guias: "/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[5]/div[2]/div/div/div[4]/div/div[1]",
    },

    // Textos âncora (usados para navegação por texto)
    texts: {
      PA: ["Pressão Arterial", "P.A.", "PA"],
      Vacina: ["Vacinação em dia?"],
      SIGTAP: ["SIGTAP"],
      Guias: ["Guias"],
      ConsultaOptions: ["Consulta agendada", "Consulta no dia"],
      Conduta: ["Conduta"],
      CID: ["CID"],
    },

    // Menu
    startMinimized: false, // se quiser iniciar minimizado
    // Atalho de toggle (Fn nao e detectavel via eventos de teclado no navegador)
    menuToggleKey: "F8",

    // Botão proxy do CID (funcionalidade do adicionar_cid.js)
    proxyButtonSelector: ".css-1mtpmwu",
    proxyTargetXPath: "/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[4]/div[2]/div/div/div[3]/div/div/div/div/div[1]/div/div[2]/div/div/div[1]/div/div/div/div/div/div/div/div/div",
    proxyId: "userscript_proxy_button",
  };

  /********************************************************************
   * CSS
   ********************************************************************/
  function ensureStyles() {
    if (document.getElementById("tmShortcutMenuStyle")) return;
    const st = document.createElement("style");
    st.id = "tmShortcutMenuStyle";
    st.textContent = `
      /* Menu */
      #tmShortcutMenu {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 2147483646;

        min-width: 252px;
        max-width: 330px;

        background: rgba(255, 255, 255, 0.58);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);

        border: 1px solid rgba(255,255,255,0.35);
        border-radius: 10px;
        box-shadow: 0 10px 26px rgba(0,0,0,.25);

        font: 12px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #111;
        user-select: none;
        overflow: hidden;
      }

      #tmShortcutMenu .tmTopbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        background: rgba(246, 248, 250, 0.9);
        border-bottom: 1px solid rgba(234, 238, 242, 0.9);
        font-weight: 700;
      }

      #tmShortcutMenu .tmTopbar .tmTitle {
        display: flex;
        flex-direction: column;
        gap: 3px;
        align-items: flex-start;
      }

      #tmShortcutMenu .tmTopbar .tmTitle .tmTitleMain {
        line-height: 1.2;
      }

      #tmShortcutMenu .tmTopbar .tmHotkeyHint {
        font-size: 11px;
        font-weight: 700;
        color: #0b5394;
        background: rgba(11, 83, 148, 0.12);
        border: 1px solid rgba(11, 83, 148, 0.28);
        border-radius: 999px;
        padding: 2px 8px;
        line-height: 1.3;
        white-space: nowrap;
      }

      #tmShortcutMenu .tmTopbar .tmButtons {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      #tmShortcutMenu button.tmIconBtn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid #d0d7de;
        background: #fff;
        cursor: pointer;
        padding: 0;
        color: #444;
      }
      #tmShortcutMenu button.tmIconBtn:hover { background: #f3f4f6; }
      #tmShortcutMenu button.tmIconBtn svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #tmShortcutMenu .tmBody {
        padding: 8px 10px 10px;
        display: grid;
        gap: 8px;
      }

      #tmShortcutMenu details.tmGroup {
        border: 1px solid rgba(208, 215, 222, 0.75);
        border-radius: 10px;
        background: rgba(255,255,255,0.75);
        overflow: hidden;
      }

      #tmShortcutMenu details.tmGroup > summary {
        list-style: none;
        cursor: pointer;
        padding: 8px 10px;
        font-weight: 800;
        background: rgba(250, 251, 252, 0.9);
        border-bottom: 1px solid rgba(238, 242, 246, 0.9);
      }
      #tmShortcutMenu details.tmGroup > summary::-webkit-details-marker { display: none; }

      #tmShortcutMenu .tmGroupContent {
        padding: 8px 10px 10px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      #tmShortcutMenu button.tmBtn {
        height: 32px;
        border-radius: 10px;
        border: 1px solid #d0d7de;
        background: #ffffff;
        cursor: pointer;
        font-weight: 700;
        color: #111;
      }
      #tmShortcutMenu button.tmBtn:hover { background: #f3f4f6; }
      #tmShortcutMenu button.tmBtn.tmBtnIcon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      #tmShortcutMenu button.tmBtn.tmBtnIcon svg {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #tmShortcutMenu button.tmBtn.primary {
        border-color: #1976d2;
        background: #1976d2;
        color: #fff;
      }
      #tmShortcutMenu button.tmBtn.primary:hover { filter: brightness(1.05); }

      #tmShortcutMenu button.tmBtn:disabled {
        cursor: not-allowed;
        background: #f7f7f7;
        color: #9aa1a9;
      }

      #tmShortcutMinBtn {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 2147483647;

        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #d0d7de;
        background: rgba(255,255,255,0.92);
        box-shadow: 0 8px 20px rgba(0,0,0,.22);
        cursor: pointer;
        padding: 0;
      }
      #tmShortcutMinBtn:hover { background: #fff; }
      #tmShortcutMinBtn svg {
        width: 18px;
        height: 18px;
        stroke: #2b2f33;
        fill: none;
        stroke-width: 1.9;
        stroke-linecap: round;
      }

      /* Opcional: esconder alerts do sistema (mantido do seu script) */
      [role="alert"][data-testid="Alert.alert"] { display: none !important; }
    `;
    document.head.appendChild(st);
  }

  /********************************************************************
   * Utils: texto, XPath, scroll
   ********************************************************************/
  function norm(s) {
    return (s ?? "").replace(/\s+/g, " ").trim();
  }

  function evalXPathFirst(xpath, root = document) {
    try {
      return document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue || null;
    } catch (e) {
      console.warn("[TM] XPath inválido:", xpath, e);
      return null;
    }
  }

  function scrollIntoViewStable(el, tries = 10) {
    if (!el || el.nodeType !== 1) return false;
    if (!el.isConnected) return false;

    let i = 0;
    const step = () => {
      if (!el.isConnected) return;

      // sem smooth ajuda a não “parar no meio”
      el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });

      i++;
      if (i >= tries) return;

      // espera o layout assentar (React/accordion)
      requestAnimationFrame(() => requestAnimationFrame(step));
    };

    step();

    // “último ajuste” após o React/accordion assentar
    setTimeout(() => {
      if (el.isConnected) {
        el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      }
    }, 250);

    return true;
  }

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect?.();
    return !!r && r.width > 1 && r.height > 1;
  }

  /********************************************************************
   * Indicadores: heurísticas robustas (sem realce visual)
   ********************************************************************/

  function bestVisibleBox(el, maxHops = 14) {
    let cur = el;
    for (let i = 0; i < maxHops && cur; i++) {
      if (cur.nodeType !== 1) {
        cur = cur.parentElement;
        continue;
      }
      const st = getComputedStyle(cur);
      const r = cur.getBoundingClientRect?.();
      if (st.display !== "contents" && r && r.width > 40 && r.height > 10) return cur;
      cur = cur.parentElement;
    }
    return el;
  }

  function closestFieldContainer(anchor, maxHops = 10) {
    let cur = anchor;
    for (let i = 0; i < maxHops && cur; i++) {
      if (cur.nodeType !== 1) {
        cur = cur.parentElement;
        continue;
      }
      const hasControl = cur.querySelector?.('input, select, textarea, [role="combobox"], [role="radiogroup"]');
      if (hasControl) return cur;
      cur = cur.parentElement;
    }
    return anchor?.parentElement || anchor;
  }

  function jointContainer(label, control, maxHops = 16) {
    if (!label || !control) return null;

    let cur = control;
    for (let i = 0; i < maxHops && cur; i++) {
      if (cur.contains?.(label)) return cur;
      cur = cur.parentElement;
    }

    cur = label;
    for (let i = 0; i < maxHops && cur; i++) {
      if (cur.contains?.(control)) return cur;
      cur = cur.parentElement;
    }

    return null;
  }

  function expandIsolatedBlock(startEl, maxUp = 8) {
    let cur = startEl;
    for (let i = 0; i < maxUp; i++) {
      const p = cur?.parentElement;
      if (!p || p === document.body || p === document.documentElement) break;

      // Não deixe o highlight “subir demais” e pintar a página inteira
      if (p.matches?.("main, form, body, html, #root, [id='root']")) break;

      const rect = p.getBoundingClientRect?.();
      if (rect && rect.height > window.innerHeight * 1.6) break;

      const foreign = [...p.querySelectorAll('label, input, select, textarea, [role="combobox"], [role="radiogroup"], [role="tablist"]')].filter(isVisible).some((node) => !cur.contains(node));

      if (foreign) break;
      cur = p;
    }
    return cur;
  }

  function findLabelByExactText(txt) {
    const t = norm(txt);
    return [...document.querySelectorAll("label")].find((l) => norm(l.textContent) === t) || null;
  }

  function findFirstElementByText(texts, selectors) {
    const list = Array.isArray(texts) ? texts : [texts];
    const candidates = [...document.querySelectorAll(selectors)];
    for (const t of list) {
      const target = norm(t);
      const hit = candidates.find((el) => norm(el.textContent) === target) || candidates.find((el) => norm(el.textContent).includes(target));
      if (hit) return hit;
    }
    return null;
  }

  // Cache simples dos alvos (para o botão do menu rolar direto no bloco já realçado)
  const indicatorTargets = new Map();

  function setIndicatorTarget(key, el) {
    if (!el) return;
    indicatorTargets.set(key, el);
  }

  function clearIndicatorTargets() {
    indicatorTargets.clear();
  }

  function highlightComboboxByLabelText(labelText) {
    const label = findLabelByExactText(labelText);
    if (!label) return null;

    let control = null;

    if (label.id) {
      const id = CSS.escape(label.id);
      control = document.querySelector(`[role="combobox"][aria-labelledby~="${id}"],` + `[role="combobox"][aria-labelledby*="${id}"]`);

      if (!control) {
        control = document.querySelector(`input[aria-labelledby~="${id}"], input[aria-labelledby*="${id}"]`);
      }
    }

    // Para navegação: âncora menor = scroll mais “direto”
    return control || label;
  }

  function highlightByLabelLike(labelTexts) {
    const anchor = findFirstElementByText(labelTexts, "label");
    if (!anchor) return null;
    // Para navegação: âncora menor = scroll mais “direto”
    return anchor;
  }

  function findGuiasTablist() {
    // pega especificamente o tablist que contém as tabs que você mostrou
    const tablists = [...document.querySelectorAll('[role="tablist"]')];
    return tablists.find((tl) => tl.querySelector('[data-testid="TabMedicamento"]') && tl.querySelector('[data-testid="TabExame"]') && tl.querySelector('[data-testid="TabAtestado"]')) || null;
  }

  function highlightGuias() {
    const tablist = findGuiasTablist();
    if (!tablist) return null;

    // Para navegação: âncora menor = scroll mais “direto”
    return tablist;
  }

  function refreshIndicatorTargets() {
    clearIndicatorTargets();

    // PA
    const paEl = highlightByLabelLike(CFG.texts.PA);
    if (paEl) setIndicatorTarget("PA", paEl);

    // Vacina
    const vacEl = highlightByLabelLike(CFG.texts.Vacina);
    if (vacEl) setIndicatorTarget("Vacina", vacEl);

    // SIGTAP
    const sigEl = highlightComboboxByLabelText("SIGTAP");
    if (sigEl) setIndicatorTarget("SIGTAP", sigEl);

    // Guias
    const guiEl = highlightGuias();
    if (guiEl) setIndicatorTarget("Guias", guiEl);
  }

  /********************************************************************
   * Expandir / Recolher (aria-expanded)
   ********************************************************************/
  let ariaBatchBusy = false;

  async function expandAllAria(maxPasses = 6, pauseMs = 80) {
    if (ariaBatchBusy) return;
    ariaBatchBusy = true;
    try {
      for (let pass = 1; pass <= maxPasses; pass++) {
        const nodes = Array.from(document.querySelectorAll('[aria-expanded="false"]')).filter((el) => isVisible(el));
        if (nodes.length === 0) break;

        for (const el of nodes) {
          try {
            el.click();
          } catch {
            try {
              el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            } catch (e) {
              console.warn("[TM] Falha ao expandir aria:", e);
            }
          }
        }
        await new Promise((r) => setTimeout(r, pauseMs));
      }
    } finally {
      ariaBatchBusy = false;

      // após expandir, recalcula os alvos dos indicadores
      refreshIndicatorTargets();
    }
  }

  async function collapseAllAria(maxPasses = 3, pauseMs = 80) {
    if (ariaBatchBusy) return;
    ariaBatchBusy = true;
    try {
      for (let pass = 1; pass <= maxPasses; pass++) {
        const nodes = Array.from(document.querySelectorAll('[aria-expanded="true"]')).filter((el) => isVisible(el));
        if (nodes.length === 0) break;

        for (const el of nodes) {
          try {
            el.click();
          } catch {
            try {
              el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
            } catch (e) {
              console.warn("[TM] Falha ao recolher aria:", e);
            }
          }
        }
        await new Promise((r) => setTimeout(r, pauseMs));
      }
    } finally {
      ariaBatchBusy = false;

      // após recolher, recalcula os alvos dos indicadores
      refreshIndicatorTargets();
    }
  }

  /********************************************************************
   * Copiar (clipboard)
   ********************************************************************/
  async function copiarParaClipboard(text, buttonElement, textoBotaoPadrao) {
    const t = norm(text);
    if (!t) {
      if (buttonElement) {
        buttonElement.textContent = "Vazio!";
        setTimeout(() => {
          buttonElement.textContent = textoBotaoPadrao;
        }, 1400);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      if (buttonElement) buttonElement.textContent = "OK!";
    } catch (err) {
      // fallback antigo via textarea
      try {
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        if (buttonElement) buttonElement.textContent = "OK!";
      } catch (e) {
        console.error("[TM] Falha ao copiar:", err, e);
        if (buttonElement) buttonElement.textContent = "Erro!";
      }
    } finally {
      if (buttonElement)
        setTimeout(() => {
          buttonElement.textContent = textoBotaoPadrao;
        }, 1400);
    }
  }

  function copiarNomePaciente(btn) {
    const el = document.querySelector(CFG.seletorNomePaciente);
    const texto = el ? norm(el.textContent) : "";
    if (!texto) console.warn("[TM] Nome do paciente não encontrado (seletor pode ter mudado).");
    copiarParaClipboard(texto, btn, "Paciente");
  }

  function copiarNomeMae(btn) {
    const el = document.querySelector(CFG.seletorNomeMae);
    const texto = el ? norm(el.textContent) : "";
    if (!texto) console.warn("[TM] Nome da mãe não encontrado (seletor pode ter mudado).");
    copiarParaClipboard(texto, btn, "Mãe");
  }

  /********************************************************************
   * Navegação (Indicadores + Finalização)
   ********************************************************************/
  function scrollToIndicator(key) {
    refreshIndicatorTargets();

    const el = indicatorTargets.get(key);
    if (el) {
      scrollIntoViewStable(el);
      return;
    }

    const xp = CFG.xpaths[key];
    if (xp) {
      const node = evalXPathFirst(xp);
      if (node) scrollIntoViewStable(node);
      else console.warn("[TM] XPath não encontrado para:", key);
      return;
    }

    console.warn("[TM] Indicador sem alvo:", key);
  }

  /********************************************************************
   * Botão proxy do CID (sem pintar painéis)
   ********************************************************************/
  function insertAfter(ref, node) {
    if (ref && ref.parentNode) ref.parentNode.insertBefore(node, ref.nextSibling);
  }

  function domDistance(a, b) {
    const map = new Map();
    let d = 0;
    let n = a;
    while (n) {
      map.set(n, d++);
      n = n.parentElement;
    }
    d = 0;
    n = b;
    while (n) {
      if (map.has(n)) return map.get(n) + d;
      n = n.parentElement;
      d++;
    }
    return Number.POSITIVE_INFINITY;
  }

  function findBestRealButton(target) {
    const all = Array.from(document.querySelectorAll(CFG.proxyButtonSelector)).filter((el) => el.id !== CFG.proxyId);
    if (all.length === 0) return null;

    const form = target.closest("form");
    const sameForm = form ? all.filter((el) => el.closest("form") === form) : all;
    const list = sameForm.length ? sameForm : all;

    let best = null;
    let bestScore = Infinity;
    for (const el of list) {
      const cs = getComputedStyle(el);
      const visible = cs.display !== "none" && cs.visibility !== "hidden" && el.offsetWidth > 0 && el.offsetHeight > 0;
      const score = domDistance(target, el) + (visible ? 0 : 1000);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function ensureProxyAndWire() {
    const target = evalXPathFirst(CFG.proxyTargetXPath);
    if (!target) return;

    let proxy = document.getElementById(CFG.proxyId);
    if (!proxy) {
      proxy = document.createElement("button");
      proxy.id = CFG.proxyId;
      proxy.type = "button";
      proxy.style.display = "inline-flex";
      proxy.style.alignItems = "center";
      proxy.style.gap = "6px";
      proxy.style.marginLeft = "8px";
      proxy.style.padding = "6px 12px";
      proxy.style.borderRadius = "4px";
      proxy.style.border = "1px solid #ccc";
      proxy.style.background = "#f6f6f6";
      proxy.style.cursor = "pointer";
      proxy.textContent = "Ação";
      insertAfter(target, proxy);

      proxy.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          const clickTarget = evalXPathFirst(CFG.proxyTargetXPath) || target;
          const real = findBestRealButton(clickTarget);
          if (!real) return;
          real.focus();
          real.click();
        },
        true,
      );
    } else if (proxy.previousSibling !== target) {
      insertAfter(target, proxy);
    }

    const real = findBestRealButton(target);
    if (!real) {
      proxy.disabled = true;
      proxy.textContent = "Aguardando botão...";
      return;
    }

    proxy.disabled = real.disabled || real.getAttribute("aria-disabled") === "true";
    const txt = (real.innerText || real.textContent || "Ação").trim();
    if (txt && proxy.textContent !== txt) proxy.textContent = txt;
  }

  function positionProxy() {
    const target = evalXPathFirst(CFG.proxyTargetXPath);
    const proxy = document.getElementById(CFG.proxyId);
    if (!target || !proxy) return;

    const rect = target.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    if (!visible) {
      proxy.style.visibility = "hidden";
      return;
    }

    proxy.style.visibility = "visible";
    proxy.style.position = "fixed";
    proxy.style.top = rect.top + "px";
    proxy.style.left = rect.right + 8 + "px";
    proxy.style.zIndex = "9999";
  }

  function refreshProxyButton() {
    ensureProxyAndWire();
    positionProxy();
  }

  function scrollToCID() {
    // tenta por XPath (mais direto) e depois por texto
    const node = evalXPathFirst(CFG.xpaths.CID);
    if (node) {
      scrollIntoViewStable(bestVisibleBox(node));
      return;
    }

    const anchor = findFirstElementByText(CFG.texts.CID, "label,h1,h2,h3,h4,button,span,div");
    if (anchor) scrollIntoViewStable(bestVisibleBox(anchor));
    else console.warn('[TM] Não achei âncora para "CID".');
  }

  function scrollToConsulta() {
    // procura pelo texto das opções (normalmente mais estável do que achar o container “tipoAtendimento”)
    const anchor = findFirstElementByText(CFG.texts.ConsultaOptions, "label,span,div");
    if (!anchor) {
      console.warn('[TM] Não achei "Consulta agendada"/"Consulta no dia".');
      return;
    }

    // tenta subir até um bloco que contenha 2+ radios do mesmo name
    const optLabel = anchor.closest("label") || anchor;
    const input = optLabel.querySelector?.('input[type="radio"]') || optLabel.closest("label")?.querySelector('input[type="radio"]');
    const name = input?.getAttribute("name");

    if (name) {
      let cur = optLabel;
      for (let i = 0; i < 12 && cur; i++) {
        const count = cur.querySelectorAll?.(`input[type="radio"][name="${CSS.escape(name)}"]`).length || 0;
        if (count >= 2) {
          scrollIntoViewStable(bestVisibleBox(cur));
          return;
        }
        cur = cur.parentElement;
      }
    }

    scrollIntoViewStable(bestVisibleBox(closestFieldContainer(optLabel)));
  }

  function scrollToConduta() {
    // âncora mais estável: qualquer checkbox do grupo de conduta
    const anyCondutaInput = document.querySelector('input[name="finalizacao.conduta"]') || document.querySelector('input[data-testid^="CondutaPanel."]');

    if (!anyCondutaInput) {
      console.warn('[TM] Não achei inputs de "finalizacao.conduta".');
      return;
    }

    // sobe até achar um container que realmente represente o bloco "Conduta"
    let cur = anyCondutaInput;
    for (let i = 0; i < 16 && cur; i++) {
      const count = cur.querySelectorAll?.('input[name="finalizacao.conduta"]').length || 0;

      const hasCondutaLabel = [...(cur.querySelectorAll?.("label") || [])].some((l) => norm(l.textContent).toLowerCase().startsWith("conduta"));

      if (count >= 2 && hasCondutaLabel) {
        scrollIntoViewStable(bestVisibleBox(cur));
        return;
      }
      cur = cur.parentElement;
    }

    // fallback: só garante que navega para perto do primeiro checkbox
    scrollIntoViewStable(bestVisibleBox(closestFieldContainer(anyCondutaInput)));
  }

  /********************************************************************
   * UI: Menu por temas
   ********************************************************************/
  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    for (const c of children) n.appendChild(c);
    return n;
  }

  function makeBtn(label, title, onClick, kind = "") {
    const b = el("button", { class: `tmBtn ${kind}`.trim(), type: "button", text: label, title });
    b.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(b);
      },
      true,
    );
    return b;
  }

  function svgIcon(pathMarkup, viewBox = "0 0 16 16") {
    return `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${pathMarkup}</svg>`;
  }

  function makeIconBtn(iconHtml, title, onClick, kind = "") {
    const b = el("button", { class: `tmBtn tmBtnIcon ${kind}`.trim(), type: "button", html: iconHtml, title, "aria-label": title });
    b.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(b);
      },
      true,
    );
    return b;
  }

  const ICONS = {
    minimize: svgIcon('<path d="M3 8h10"></path>'),
    refresh: svgIcon('<path d="M13 3v4H9"></path><path d="M13 7a5 5 0 1 0 1.2 3.4"></path>'),
    menu: svgIcon('<path d="M3 4h10M3 8h10M3 12h10"></path>'),
    expand: svgIcon('<rect x="2.5" y="2.5" width="11" height="11" rx="2"></rect><path d="M8 5v6M5 8h6"></path>'),
    collapse: svgIcon('<rect x="2.5" y="2.5" width="11" height="11" rx="2"></rect><path d="M5 8h6"></path>'),
    up: svgIcon('<path d="M4 7l4-4 4 4"></path><path d="M8 3v10"></path>'),
    down: svgIcon('<path d="M4 9l4 4 4-4"></path><path d="M8 3v10"></path>'),
  };

  function makeGroup(title, buttons, openByDefault = true) {
    const content = el("div", { class: "tmGroupContent" }, buttons);
    return (el("details", { class: "tmGroup" }, [el("summary", { text: title }), content]).setAttribute("open", openByDefault ? "" : ""), content.parentElement); // (linha inócua só para ficar claro)
  }

  function buildMenu() {
    if (document.getElementById("tmShortcutMenu")) return;

    const menu = el("div", { id: "tmShortcutMenu" });

    const btnMin = el("button", {
      class: "tmIconBtn",
      type: "button",
      title: "Minimizar",
      html: ICONS.minimize,
      "aria-label": "Minimizar",
      onclick: () => minimizeMenu(),
    });

    const btnReapply = el("button", {
      class: "tmIconBtn",
      type: "button",
      title: "Atualizar alvos dos indicadores",
      html: ICONS.refresh,
      "aria-label": "Atualizar alvos dos indicadores",
      onclick: () => {
        refreshIndicatorTargets();
        refreshProxyButton();
      },
    });

    const topbarTitle = el("div", { class: "tmTitle" }, [el("span", { class: "tmTitleMain", text: "Menu de Atalhos" }), el("span", { class: "tmHotkeyHint", text: `${String(CFG.menuToggleKey || "F8").toUpperCase()}: minimizar/maximizar` })]);

    const topbar = el("div", { class: "tmTopbar" }, [topbarTitle, el("div", { class: "tmButtons" }, [btnReapply, btnMin])]);

    const body = el("div", { class: "tmBody" });

    // Colapsáveis
    const grpColapsaveis = el("details", { class: "tmGroup" }, [
      el("summary", { text: "Colapsáveis" }),
      el("div", { class: "tmGroupContent" }, [makeIconBtn(ICONS.expand, 'Expande tudo (aria-expanded="false")', () => expandAllAria(), "primary"), makeIconBtn(ICONS.collapse, 'Recolhe tudo (aria-expanded="true")', () => collapseAllAria(), "")]),
    ]);
    grpColapsaveis.open = true;

    // Copiar
    const grpCopiar = el("details", { class: "tmGroup" }, [el("summary", { text: "Copiar" }), el("div", { class: "tmGroupContent" }, [makeBtn("Paciente", "Copiar nome do paciente", (b) => copiarNomePaciente(b), ""), makeBtn("Mãe", "Copiar nome da mãe", (b) => copiarNomeMae(b), "")])]);
    grpCopiar.open = true;

    // Rolar
    const grpRolar = el("details", { class: "tmGroup" }, [
      el("summary", { text: "Rolar" }),
      el("div", { class: "tmGroupContent" }, [
        makeIconBtn(
          ICONS.up,
          "Ir para o topo",
          () => {
            const s = document.scrollingElement || document.documentElement;
            s.scrollTo({ top: 0, left: 0, behavior: "auto" });
          },
          "",
        ),

        makeIconBtn(
          ICONS.down,
          "Ir para o fim",
          () => {
            const s = document.scrollingElement || document.documentElement;
            s.scrollTo({ top: s.scrollHeight, left: 0, behavior: "auto" });
          },
          "",
        ),
      ]),
    ]);
    grpRolar.open = true;

    // Indicadores (com highlight)
    const grpIndicadores = el("details", { class: "tmGroup" }, [
      el("summary", { text: "Indicadores" }),
      el("div", { class: "tmGroupContent" }, [
        makeBtn("PA", "Ir para Pressão Arterial", () => scrollToIndicator("PA"), "primary"),
        makeBtn("Vacina", "Ir para Vacinação em dia?", () => scrollToIndicator("Vacina"), "primary"),
        makeBtn("SIGTAP", "Ir para SIGTAP", () => scrollToIndicator("SIGTAP"), "primary"),
        makeBtn("Guias", "Ir para Guias", () => scrollToIndicator("Guias"), "primary"),
      ]),
    ]);
    grpIndicadores.open = true;

    // Finalização
    const grpFinalizacao = el("details", { class: "tmGroup" }, [
      el("summary", { text: "Finalização" }),
      el("div", { class: "tmGroupContent" }, [makeBtn("CID", "Ir para CID", () => scrollToCID(), "primary"), makeBtn("Consulta", "Ir para tipo de Consulta (opções de radio)", () => scrollToConsulta(), "primary"), makeBtn("Conduta", "Ir para Conduta", () => scrollToConduta(), "primary")]),
    ]);
    grpFinalizacao.open = true;

    body.appendChild(grpColapsaveis);
    body.appendChild(grpCopiar);
    body.appendChild(grpRolar);
    body.appendChild(grpIndicadores);
    body.appendChild(grpFinalizacao);

    menu.appendChild(topbar);
    menu.appendChild(body);
    document.body.appendChild(menu);

    // Botão minimizado
    let minBtn = document.getElementById("tmShortcutMinBtn");
    if (!minBtn) {
      minBtn = el("button", {
        id: "tmShortcutMinBtn",
        type: "button",
        title: "Mostrar Menu de Atalhos",
        html: ICONS.menu,
        "aria-label": "Mostrar Menu de Atalhos",
        onclick: () => maximizeMenu(),
      });
      document.body.appendChild(minBtn);
    }

    // Garante estado inicial consistente:
    // - se o menu inicia aberto, o botão "≡" fica escondido
    // - se inicia minimizado, o menu some e o "≡" aparece
    if (CFG.startMinimized) minimizeMenu();
    else maximizeMenu();
  }

  function minimizeMenu() {
    const menu = document.getElementById("tmShortcutMenu");
    const min = document.getElementById("tmShortcutMinBtn");
    if (!menu || !min) return;
    menu.style.display = "none";
    min.style.display = "block";
  }

  function maximizeMenu() {
    const menu = document.getElementById("tmShortcutMenu");
    const min = document.getElementById("tmShortcutMinBtn");
    if (!menu || !min) return;
    menu.style.display = "";
    min.style.display = "none";
  }

  /********************************************************************
   * Atalho: toggle do menu em toque unico
   ********************************************************************/
  let toggleHotkeyInstalled = false;

  function isMenuMinimized() {
    const menu = document.getElementById("tmShortcutMenu");
    if (!menu) return false;
    return getComputedStyle(menu).display === "none";
  }

  function toggleMenu() {
    if (isMenuMinimized()) maximizeMenu();
    else minimizeMenu();
  }

  function installToggleHotkey() {
    if (toggleHotkeyInstalled) return;
    toggleHotkeyInstalled = true;

    window.addEventListener(
      "keydown",
      (e) => {
        const pressedKey = String(e.key || "").toUpperCase();
        const configuredKey = String(CFG.menuToggleKey || "").toUpperCase();

        if (!configuredKey || pressedKey !== configuredKey) return;
        if (e.repeat) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      },
      true,
    );
  }

  /********************************************************************
   * Bootstrap + reapply em DOM dinamico
   ********************************************************************/
  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function init() {
    ensureStyles();
    buildMenu();
    installToggleHotkey();
    refreshIndicatorTargets();
    refreshProxyButton();
  }

  const scheduleReapply = debounce(() => {
    // durante expandir/recolher, o DOM muda muito; evita recalcular no meio do lote
    if (!ariaBatchBusy) refreshIndicatorTargets();
    refreshProxyButton();
  }, 180);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  const mo = new MutationObserver(() => scheduleReapply());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  const scheduleProxyPosition = (() => {
    let pending = false;
    return () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        positionProxy();
      });
    };
  })();

  window.addEventListener("scroll", scheduleProxyPosition, true);
  window.addEventListener("resize", scheduleProxyPosition);
  document.addEventListener("click", scheduleReapply, true);
  document.addEventListener("change", scheduleReapply, true);
  document.addEventListener("input", scheduleReapply, true);
  document.addEventListener("keydown", scheduleReapply, true);
})();
