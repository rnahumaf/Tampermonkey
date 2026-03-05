// ==UserScript==
// @name         e-SUS – Estilo + Botão Atalho (alvo correto)
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Pinta painéis e cria um botão-atalho ao lado do alvo; o clique é roteado para o botão real mais próximo no mesmo form (classe .css-1mtpmwu), sem mover nós do React.
// @match        *://*esus.jaguariuna.sp.gov.br*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // 1) Estilos dos painéis (como no original)
  const style = { backgroundColor: "rgb(35, 34, 78)", color: "white" };

  const defaultXpaths = ['//*[@id="accordion__panel-D"]/div/div/div[8]', '//*[@id="accordion__panel-A"]/div/div/div[2]/div/div/div/div/div[1]/div/div[2]/div/div/div[2]/div'];

  const cyanXpaths = ['//*[@id="accordion__heading-medicoes"]', '//*[@id="accordion__panel-P"]/div/div/div[4]/div/div[1]'];

  // 2) Alvo e seletor do botão real
  const buttonSelector = ".css-1mtpmwu";
  const targetXPath = "/html/body/div[1]/div/div[3]/main/div[1]/form/div[1]/div/div/div[2]/div/div/div[4]/div[2]/div/div/div[3]/div/div/div/div/div[1]/div/div[2]/div/div/div[1]/div/div/div/div/div/div/div/div/div";

  const proxyId = "userscript_proxy_button";

  // 3) Utilitários
  function xpathFirst(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }
  function insertAfter(ref, node) {
    if (ref && ref.parentNode) ref.parentNode.insertBefore(node, ref.nextSibling);
  }
  function domDistance(a, b) {
    const map = new Map();
    let d = 0,
      n = a;
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
    const all = Array.from(document.querySelectorAll(buttonSelector)).filter((el) => el.id !== proxyId); // exclui o proxy
    if (all.length === 0) return null;

    const form = target.closest("form");
    const sameForm = form ? all.filter((el) => el.closest("form") === form) : all;
    const list = sameForm.length ? sameForm : all;

    let best = null,
      bestScore = Infinity;
    for (const el of list) {
      const cs = getComputedStyle(el);
      // prioriza visíveis
      const visible = cs.display !== "none" && cs.visibility !== "hidden" && el.offsetWidth > 0 && el.offsetHeight > 0;
      const score = domDistance(target, el) + (visible ? 0 : 1000); // penaliza não visíveis
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  // 4) Cria/posiciona o botão-atalho (não move o botão real)
  function ensureProxyAndWire() {
    const target = xpathFirst(targetXPath);
    if (!target) return;

    let proxy = document.getElementById(proxyId);
    if (!proxy) {
      proxy = document.createElement("button");
      proxy.id = proxyId;
      proxy.type = "button";
      // estilo simples e neutro
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
          const real = findBestRealButton(target);
          if (!real) return;
          // aciona o botão real
          real.focus();
          real.click();
        },
        true,
      );
    } else {
      if (proxy.previousSibling !== target) insertAfter(target, proxy);
    }

    // Ajusta rótulo e estado a partir do botão real escolhido
    const real = findBestRealButton(target);
    if (!real) {
      proxy.disabled = true;
      proxy.textContent = "Aguardando botão...";
    } else {
      proxy.disabled = real.disabled || real.getAttribute("aria-disabled") === "true";
      // rótulo amigável: tenta usar o texto do botão real
      const txt = (real.innerText || real.textContent || "Ação").trim();
      if (txt && proxy.textContent !== txt) proxy.textContent = txt;
    }
  }

  function positionProxy() {
    const target = xpathFirst(targetXPath);
    const proxy = document.getElementById(proxyId);
    if (!target || !proxy) return;

    const rect = target.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    if (!visible) {
      proxy.style.visibility = "hidden";
      return;
    }

    proxy.style.visibility = "visible";
    // fixo na viewport e acompanha via scroll handler
    proxy.style.position = "fixed";
    proxy.style.top = rect.top + "px";
    proxy.style.left = rect.right + 8 + "px";
    proxy.style.zIndex = "9999";
  }

  // 5) Pinta painéis + garante o atalho
  function applyStyle() {
    defaultXpaths.forEach((p) => {
      const n = xpathFirst(p);
      if (n) Object.assign(n.style, style);
    });
    cyanXpaths.forEach((p) => {
      const n = xpathFirst(p);
      if (n) n.style.backgroundColor = "#00dbdb";
    });
    ensureProxyAndWire();
    positionProxy();
  }

  // 6) Inicialização e eventos leves (sem loops)
  applyStyle();

  const schedule = (fn, wait = 50) => {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  };
  const scheduleApply = schedule(applyStyle, 60);
  const schedulePos = (() => {
    let pend = false;
    return () => {
      if (pend) return;
      pend = true;
      requestAnimationFrame(() => {
        pend = false;
        positionProxy();
      });
    };
  })();

  // Observa apenas adições/remoções (evita loop por alterar style/class)
  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("scroll", schedulePos, true);
  window.addEventListener("resize", schedulePos);
  document.addEventListener("click", scheduleApply, true);
  document.addEventListener("change", scheduleApply, true);
  document.addEventListener("input", scheduleApply, true);
  document.addEventListener("keydown", scheduleApply, true);
})();
