// ==UserScript==
// @name         Blood Test Results Extractor with UI (Revisado v1.2)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Extrai os resultados dos exames de uma página HTML e os exibe em um div flutuante para cópia manual.
// @match        *://sm.shiftcloud.com.br/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // Cria um container flutuante no canto superior direito.
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "10px";
  container.style.right = "10px";
  container.style.zIndex = "9999";
  container.style.width = "380px";
  container.style.maxWidth = "90vw";
  container.style.backgroundColor = "rgba(255,255,255,0.95)";
  container.style.border = "1px solid #ccc";
  container.style.padding = "8px";
  container.style.borderRadius = "5px";
  container.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
  container.style.fontFamily = "Segoe UI, Arial, sans-serif";

  const actionRow = document.createElement("div");
  actionRow.style.display = "flex";
  actionRow.style.gap = "6px";
  actionRow.style.marginBottom = "6px";

  const copyRow = document.createElement("div");
  copyRow.style.display = "flex";
  copyRow.style.gap = "6px";
  copyRow.style.marginBottom = "6px";

  function setButtonIcon(buttonEl, label, svgMarkup) {
    buttonEl.style.display = "inline-flex";
    buttonEl.style.alignItems = "center";
    buttonEl.style.justifyContent = "center";
    buttonEl.style.gap = "4px";
    buttonEl.innerHTML = `${svgMarkup}<span>${label}</span>`;
  }

  const markdownIcon =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3.8 10V6.2l2.2 2.2 2.2-2.2V10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.2 6.5v3.5m0 0l-1.4-1.4m1.4 1.4l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const simpleTextIcon =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 5.5h8M4 8h8M4 10.5h5.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
  const richTextIcon =
    '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4 5.3h4.2M4 8h4.2M4 10.7h4.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M10.2 5.1h1.4a1.2 1.2 0 0 1 0 2.4h-1.4zm0 0v5.8m0-3.4h1.6a1.2 1.2 0 0 1 0 2.4h-1.6" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Cria os botões de ação.
  const button = document.createElement("button");
  button.innerText = "Extract";
  button.style.flex = "1";

  const toggleButton = document.createElement("button");
  toggleButton.innerText = "Expand";

  const closeButton = document.createElement("button");
  closeButton.innerText = "Close";

  const copyMarkdownButton = document.createElement("button");
  const copyTextButton = document.createElement("button");
  const copyRichButton = document.createElement("button");
  copyMarkdownButton.disabled = true;
  copyTextButton.disabled = true;
  copyRichButton.disabled = true;
  copyMarkdownButton.style.flex = "1";
  copyTextButton.style.flex = "1";
  copyRichButton.style.flex = "1";
  setButtonIcon(copyMarkdownButton, "Markdown", markdownIcon);
  setButtonIcon(copyTextButton, "Simple Text", simpleTextIcon);
  setButtonIcon(copyRichButton, "Rich Text", richTextIcon);

  actionRow.appendChild(button);
  actionRow.appendChild(toggleButton);
  actionRow.appendChild(closeButton);
  copyRow.appendChild(copyMarkdownButton);
  copyRow.appendChild(copyTextButton);
  copyRow.appendChild(copyRichButton);
  container.appendChild(actionRow);
  container.appendChild(copyRow);

  // Cria um div para exibir o resultado (com HTML renderizado).
  const resultDiv = document.createElement("div");
  const collapsedHeight = "180px";
  const expandedHeight = "60vh";
  resultDiv.style.width = "100%";
  resultDiv.style.height = collapsedHeight;
  resultDiv.style.maxHeight = "60vh";
  resultDiv.style.overflow = "auto";
  resultDiv.style.border = "1px solid #aaa";
  resultDiv.style.padding = "6px";
  resultDiv.style.display = "none"; // oculto inicialmente
  // Permite a seleção de texto para que a cópia seja manual.
  resultDiv.style.userSelect = "text";
  resultDiv.style.lineHeight = "1.35";
  container.appendChild(resultDiv);

  document.body.appendChild(container);

  let isExpanded = false;
  let lastExtraction = null;

  // -------------------------------
  // Funções de extração e utilitários

  const fanAntibodyKeys = ["Anti-núcleo", "Anti-envelope", "Anti-nucléolo", "Anti-citoplasma", "Anti-mitótico", "Anti-placa metafásica"];

  // Categorização dos exames por tipo de amostra
  const urineExams = ["EAS-pH", "Urobilinogênio", "Glicose", "Corpos Cetônicos", "Bilirrubina", "Proteínas", "Hemoglobina", "Nitrito", "Leucoesterase", "Células Epiteliais", "Leucócitos", "Hemácias", "Cilindros", "Cristais", "Muco", "Bactérias", "Albuminúria isolada", "Proteinúria 24h", "UROC"];

  const stoolExams = [
    "PSOF1",
    "PSOF2",
    "PSOF3",
    "H pylori nas fezes",
    "Gorduras fecais",
    "PPF1",
    "PPF2",
    "PPF3",
    "Calprotectina fecal",
    "F.F. Consistência",
    "F.F. Forma",
    "F.F. Cor",
    "F.F. pH",
    "F.F. Muco",
    "F.F. Fibras mal dig.",
    "F.F. Fibras pouco dig.",
    "F.F. Fibras bem dig.",
    "F.F. Gordura",
    "F.F. Amido",
    "F.F. Flora Iodófila",
    "F.F. Leveduras",
    "F.F. Hemácias",
    "F.F. Leucócitos",
  ];

  const spermExams = ["Vol. Sêmen", "pH Sêmen", "Conc. Esperm.", "Motilidade Total", "Motilidade Prog.", "Morfologia Típica"];

  // Provas reumatológicas (autoimunidade / inflamação / reumatologia)
  const rheumExams = [
    // Inflamação
    "PCR (mg/L)",
    "VHS",

    // Artrites / marcadores reumato
    "FR",
    "Anti-CCP",
    "HLA-B27",

    // FAN e padrões
    "FAN",
    "FAN Título",
    "Padrão",
    ...fanAntibodyKeys,

    // ENA / autoanticorpos
    "Anti-SSA/RO",
    "Anti-SSB (LA)",
    "Anti-dsDNA",
    "Anti-RNP",
    "Anti-SM",
    "ANTI-CENTRÔMERO",
    "ANCA C",
    "ANCA P",
    "ANCA Atípico",

    // Complemento / outros
    "C3",
    "C4",
    "ASLO",

    // Hematologia/imuno associada
    "Coombs D.",
    "CRIOGLOBULINAS",

    // Eletroforese/Imunofixação sérica
    "Proteínas Totais (g/dL)",
    "Albumina (g/dL)",
    "Alfa 1 (g/dL)",
    "Alfa 2 (g/dL)",
    "Beta 1 (g/dL)",
    "Beta 2 (g/dL)",
    "Gama (g/dL)",
    "Relação A/G",
    "Pico Monoclonal",
    "Imunofixação de proteínas séricas-Q",
  ];

  // Função para determinar a categoria do exame
  function getExamCategory(examName) {
    // Atalho por “seções” (evita ter que listar todas as chaves no array urineExams)
    if (/^ELEP\s*24h\b/i.test(examName)) return "urine";
    if (urineExams.includes(examName)) return "urine";
    if (stoolExams.includes(examName)) return "stool";
    if (spermExams.includes(examName)) return "sperm";

    // Provas alérgicas (IgE total e IgE específicas/múltiplas)
    if (examName === "IgE total" || /^IgE\s/i.test(examName)) return "allergy";

    if (rheumExams.includes(examName)) return "rheum";
    return "blood";
  }

  // Padrões regex para os exames.
  const examPatterns = {
    "b-hCG": /ordem de serviço[\s\S]*?HCG[\s\S]+?Resultado\s*:?\s*(\S+)/i,
    ABO: /ordem de serviço[\s\S]*?GRUPO SANG[UÜ]ÍNEO[\s\S]*?RESULTADO:?\s*(AB|A|B|O)\b/i,
    RH: /ordem de serviço[\s\S]*?FATOR RH[\s\S]*?FATOR RH:?\s*(Positivo|Negativo)/i,
    Du: /ordem de serviço[\s\S]*?Fator DU\:?\s*(\S+)/i,
    RBC: /ordem de serviço[\s\S]*?Hem[aá]cias\.{2,}:\s+(\d+(?:,\d*)?)\s+milh[õo]es/i,
    "Eletroforese de Hb - HbA1": /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*A1:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    HbA2: /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*A2:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    HbF: /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*F:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    HbS: /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*S:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    HbC: /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*C:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    Outras: /ordem de serviço[\s\S]*?ELETROFORESE DE HEMOGLOBINA[\s\S]*?(?:\n|^)\s*OUTRAS:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    HB: /ordem de serviço[\s\S]*?HEMOGLOBINA\.{2,}:\s+(\d+(?:,\d*)?)\s+g\/dl/i,
    HT: /ordem de serviço[\s\S]*?HEMATÓCRITO\.{2,}:\s+(\d+(?:,\d*)?)\s+%/i,
    VCM: /ordem de serviço[\s\S]*?V\.?C\.?M\.{2,}:\s+(\d+(?:,\d*)?)\s+fL/i,
    HCM: /ordem de serviço[\s\S]*?H\.?C\.?M\.{2,}:\s+(\d+(?:,\d*)?)\s+pg/i,
    RDW: /ordem de serviço[\s\S]*?R\.?D\.?W\.{2,}:\s+(\d+(?:,\d*)?)\s+%/i,
    Leuco: /ordem de serviço[\s\S]*?(?<!sedimento )Leucócitos\.{2,}:\s+(\d+(?:.\d*)?)\s+\/mm/i,
    B: /ordem de serviço[\s\S]*?Bastonetes\.{2,}:(?:[\s\S]*?)(\d+(?:.\d*)?)(?=\s*\/mm)/i,
    S: /ordem de serviço[\s\S]*?entados\.{2,}:(?:[\s\S]*?)(\d+(?:.\d*)?)(?=\s*\/mm)/i,
    E: /ordem de serviço[\s\S]*?Eosinófilos\.{2,}:(?:[\s\S]*?)(\d+(?:.\d*)?)(?=\s*\/mm)/i,
    L: /ordem de serviço[\s\S]*?Linfócitos(?: Típicos)?\.{0,}:(?:[\s\S]*?)(\d+(?:[,.]\d*)?)\s*[\/]*mm³/i,
    PLT: /ordem de serviço[\s\S]*?Plaquetas\.{2,}:\s+(\d+(?:.\d*)?)\s+\/mm/i,
    Retic: /ordem de serviço[\s\S]*?CONTAGEM\s+DOS\s+RETICUL[ÓO]CITOS[\s\S]*?RESULTADO:?\s*([\d,\.]+)/i,
    FE: /ordem de serviço[\s\S]*?FERRO[\s\S]+?(.*?)\s+mcg\/dL/i,
    LÍTIO: /ordem de serviço[\s\S]*?LÍTIO[\s\S]*?RESULTADO:\s*([\d,.]+)\s*mmol\/L/i,
    Cobre: /ordem de serviço[\s\S]*?COBRE[\s\S]*?RESULTADO:\s*([\d,]+)\s*µg\/dL/i,
    Zinco: /ordem de serviço[\s\S]*?ZINCO[\s\S]*?RESULTADO:\s*([\d,.]+)\s*mcg\/dL/i,
    Selênio: /ordem de serviço[\s\S]*?SELÊNIO[\s\S]*?RESULTADO:\s*([\d,.]+)\s*mcg\/L/i,
    Magnésio: /ordem de serviço[\s\S]*?MAGNÉSIO[\s\S]*?RESULTADO:\s*([\d,.]+)\s*mg\/dL/i,
    "HAPTOGLOBINA (mg/dL)": /ordem de serviço[\s\S]*?HAPTOGLOBINA[\s\S]*?Resultado:?\s*(\d+(?:[.,]\d+)?)\s*mg\/dL/i,
    Ferritina: /ordem de serviço[\s\S]*?FERRITINA[\s\S]+?Resultado:?\s+(.*?)\s+ng\/mL/i,
    Transferrina: /ordem de serviço[\s\S]*?(?<!da )TRANSFERRINA[\s\S]+?Resultado:?\s+(.*?)\s+mg\/dL/i,
    TSAT: /ordem de serviço[\s\S]*?(?:SATURAÇÃO\s+)?DA TRANSFERRINA[\s\S]*?(?:Resultado|RESULTADO):?\s*(\d+(?:,\d*)?)/i,
    TIBC: /ordem de serviço[\s\S]*?CAPACIDADE TOTAL (?:DE )?(?:COMBINAÇÃO|LIGAÇÃO|FIXAÇÃO)(?: DO)? FERRO[\s\S]*?RESULTADO:\s*(\d+(?:,\d*)?)/i,
    CR: /ordem de serviço[\s\S]*?^\s*CREATININA\s*$[\s\S]{0,400}?\bRESULTADO:?\s*([\d,]+)\s*mg\/dL/im,
    UR: /ordem de serviço[\s\S]*?UR[EÉ]IA[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    CaT: /ordem de serviço[\s\S]*?C[AÁ]LCIO(?![ \t]*I[OÔ]NICO)[\s\S]*?RESULTADO:\s*(\d+(?:,\d+)?)/i,
    CaI: /ordem de serviço[\s\S]*?C[AÁ]LCIO I[OÔ]NICO[\s\S]*?RESULTADO:\s*(\d+(?:,\d*)?)\s*mmol\/L/i,
    MG: /ordem de serviço[\s\S]*?Magn[ée]sio[\s\S]*?Resultado.*?(\d+(?:,\d*)?)/i,
    Pi: /ordem de serviço[\s\S]*?F[óo]sforo(?!\s+URI)[\s\S]*?Resultado:?\s*(\d+(?:,\d*)?)/i,
    NA: /ordem de serviço[\s\S]*?S[ÓO]DIO[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    K: /ordem de serviço[\s\S]*?POT[ÁA]SSIO[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    Cloretos: /ordem de serviço[\s\S]*?CLORETOS[\s\S]*?RESULTADO:\s*([\d,]+)\s*mEq\/L/i,
    Lítio: /ordem de serviço[\s\S]*?LITIO[\s\S]+?Resultado[\s\S]*?(\d+(?:,\d*)?)/i,
    GJ: /ordem de serviço[\s\S]*?GLICOSE JEJUM[\s\S]+?(\d+(?:,\d*)?)(?=\s+mg\/dL)/i,
    "TTOG75g/Jejum": /ordem de serviço[\s\S]*?CURVA GLICÊMICA[\s\S]+?Jejum:\s*(\d+(?:,\d*)?)(?=\s+mg\/dL)/i,
    "TTOG75g/2h": /ordem de serviço[\s\S]*?CURVA GLICÊMICA[\s\S]+?120 Minutos:\s*(\d+(?:,\d*)?)(?=\s+mg\/dL)/i,
    HbA1c: /ordem de serviço[\s\S]*?HEMOGLOBINA GLICADA[\s\S]*?GLICADA:\s*(\d+(?:,\d*)?)(?=\s*%)/i,
    A1a: /ordem de serviço[\s\S]*?(?<=A1a:)\s*(.*?)%/i,
    A1b: /ordem de serviço[\s\S]*?(?<=A1b:)\s*(.*?)%/i,
    // HbF: /ordem de serviço[\s\S]*?(?<=Hb F:)\s*(.*?)%/i, // Note: This might conflict with Eletroforese HbF
    "A1c lábil": /ordem de serviço[\s\S]*?(?<=A1c lábil:)\s*(.*?)%/i,
    HbA: /ordem de serviço[\s\S]*?(?<=Hb A:)\s*(.*?)%/i,
    "Anti-GAD": /ordem de serviço[\s\S]*?GAD - ANTICORPOS ANTI[\s\S]*?Resultado:\s*(\S+)/i,
    "ALFA (%)": /ordem de serviço[\s\S]*?ALFA\s+LIPOPROT[EÍ]NA[\s\S]*?(\d+(?:,\d+)?)\s*%/i,
    "PRE-BETA (%)": /ordem de serviço[\s\S]*?PRE\s*BETA\s+LIPOPROT[EÍ]NA[\s\S]*?(\d+(?:,\d+)?)\s*%/i,
    "BETA (%)": /ordem de serviço[\s\S]*?BETA\s+LIPOPROT[EÍ]NA[\s\S]*?(\d+(?:,\d+)?)\s*%/i,
    "RELACAO BETA/PRE-BETA": /ordem de serviço[\s\S]*?RELA[ÇC]AO\s+BETA\/PRE-?BETA[\s\S]*?(\d+(?:,\d+)?)/i,
    CT: /ordem de serviço[\s\S]*?COLESTEROL TOTAL[\s\S]*?(\d+(?:,\d*)?)(?=\s+mg\/dL)/i,
    HDL: /ordem de serviço[\s\S]*?Colesterol HDL[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    LDL: /ordem de serviço[\s\S]*?Colesterol LDL[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    TG: /ordem de serviço[\s\S]*?TRIGLIC[\s\S]*?Resultado:\s*((?:(?:Inferior|Superior)\s+a\s+)?\d+(?:\.\d{3})*(?:,\d+)?)/i,
    CPK: /ordem de serviço[\s\S]*?CREATINOFOSFOQUINASE[\s\S]+?Resultado:?\s+(.*?)\s+U\/L/i,
    "CK-MB": /ordem de serviço[\s\S]*?CREATINOFOSFOQUINASE FRAÇÃO MB[\s\S]*?RESULTADO:\s*([\d,]+)\s*U\/L/i,
    Amilase: /ordem de serviço[\s\S]*?AMILASE[\s\S]*?Resultado.*?(\d+(?:,\d*)?)/i,
    "LKM-1": /ordem de serviço[\s\S]*?LKM\s*1[\s\S]*?ANTICORPOS\s+ANTI[\s\S]*?Resultado:?\s*(N(?:[ãa]o)\s+reagente|Reagente|Indeterminado|Inconclusivo)/i,
    AST: /ordem de serviço[\s\S]*?AST\/TGO[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    ALT: /ordem de serviço[\s\S]*?ALT\/TGP[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    GGT: /ordem de serviço[\s\S]*?GLUTAMIL[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    FA: /ordem de serviço[\s\S]*?FOSFATASE ALCALINA[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    BT: /ordem de serviço[\s\S]*?BILIRRUBINA\s+TOTAL\s*:\s*([\d]+(?:[.,]\d+)?)\s*mg\/dL/i,
    BD: /ordem de serviço[\s\S]*?(?<!Ausentes )BILIRRUBINA[\s\S]*?Direta.*?:?\s+(\d+(?:,\d*)?)\s+mg\/dL/i,
    BI: /ordem de serviço[\s\S]*?(?<!Ausentes )BILIRRUBINA[\s\S]*?Indireta.*?:?\s+(\d+(?:,\d*)?)\s+mg\/dL/i,
    TP: /ordem de serviço[\s\S]*?(?:Tempo de Protrombina|Plasma Paciente):?\s*(\d+(?:[.,]\d+)?)/i,
    INR: /ordem de serviço[\s\S]*?R\.?N\.?I\.?\s*[:\s]+(\d+(?:[.,]\d+)?)/i,
    TTPA: /ordem de serviço[\s\S]*?TROMBOPLASTINA[\s\S]*?(?:Plasma [Pp]aciente|Paciente):?\s*(\d+(?:[.,]\d+)?)/i,
    "Coombs D.": /ordem de serviço[\s\S]*?Coombs Direto[\s\S]*?Resultado:\s*(\S+)/i,
    "Proteínas totais": /ordem de serviço[\s\S]*?PROTE[IÍ]NAS TOTAIS E[\s\S]*?Prote[ií]nas totais:?\s+(.*?)\s+g\/dL/i,
    Albumina: /ordem de serviço[\s\S]*?PROTE[IÍ]NAS TOTAIS E[\s\S]*?Albumina[\s\S]*?(\d+(?:,\d*)?)/i,
    Album: /ordem de serviço[\s\S]*?Albumina[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)\s+g\/dL/i,
    Globulina: /ordem de serviço[\s\S]*?PROTE[IÍ]NAS TOTAIS E[\s\S]*?Globulina[\s\S]*?(\d+(?:,\d*)?)/i,
    "Relacao A/G": /ordem de serviço[\s\S]*?PROTE[IÍ]NAS TOTAIS E[\s\S]*?Relação A[\s\S]*?(\d+(?:,\d*)?)/i,
    "Alfa-fetoproteína": /ordem de serviço[\s\S]*?FETOPROTE[\s\S]*?Resultado[\s\S]*?(\d+(?:,\d*)?)/i,
    "TTL (Lactose) - Jejum": /ordem de serviço[\s\S]*?LACTOSE[\s\S]*?Glicose em Jejum:?\s+(\d+,?\d*)/i,
    "TTL (Lactose) - 30 min": /ordem de serviço[\s\S]*?LACTOSE[\s\S]*?Glicose após 30 minutos:?\s+(\d+,?\d*)/i,
    "TTL (Lactose) - 60 min": /ordem de serviço[\s\S]*?LACTOSE[\s\S]*?Glicose após 60 minutos:?\s+(\d+,?\d*)/i,
    // ----------------------------------------------
    // Anticorpos, provas inflamatórias e auto-imunes
    "Gliadina IgA": /ordem de serviço[\s\S]*?GLIADINA IgA[\s\S]*?Resultado:?\s+(\d+,?\d*)/i,
    "Endomísio IgA": /ordem de serviço[\s\S]*?ENDOMISIO IgA[\s\S]*?Resultado:?\s+(\S+)/i,
    "Endomísio IgG": /ordem de serviço[\s\S]*?ENDOMISIO IgG[\s\S]*?Resultado:?\s+(\S+)/i,
    "Endomísio IgM": /ordem de serviço[\s\S]*?ENDOMISIO IgM[\s\S]*?Resultado:?\s+(\S+)/i,
    "tTG-IgA": /ordem de serviço[\s\S]*?ANTI-TRANSGLUTAMINASE[\s\S]*?Resultado:?\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "PCR (mg/L)": /ordem de serviço[\s\S]*?PROTEÍNA C REATIVA[\s\S]*?Resultado:?\s+(\d+,?\d*)\s+mg\/L/i,
    VHS: /ordem de serviço[\s\S]*?HEMOSSEDIMENTAÇÃO[\s\S]*?Resultado.:?\s+(\d+)\s+mm\/1/i,
    "ANTI-CENTRÔMERO": /ordem de serviço[\s\S]*?CENTR(?:Ô|O)MERO[\s\S]*?RESULTADO:\s*(N(?:ÃO|AO)\s+reagente|Reagente)/i,
    "ANTI-BETA2GP1 IgG (U/mL)": /ordem de serviço[\s\S]*?ANTICORPOS\s+IGG\s+ANTI\s+BETA\s*2\s+GLICOPROTEINA\s*1[\s\S]*?RESULTADO:\s*(?:Inferior\s+a|Superior\s+a)?\s*(\d+(?:[.,]\d+)?)\s*[\s\S]*?U\/mL/i,
    DHL: /ordem de serviço[\s\S]*?Desidrogenase[\s\S]*?Resultado:?\s+(\d+,?\d*)/i,
    LDH: /ordem de serviço[\s\S]*?Dehidrogenase[\s\S]*?Resultado:?\s+(\d+,?\d*)/i,
    "Ácido Láctico": /ordem de serviço[\s\S]*?ÁCIDO LÁCTICO[\s\S]*?RESULTADO:\s*([\d,]+)\s*mg\/dL/i,
    pH: /ordem de serviço[\s\S]*?GASOMETRIA VENOSA[\s\S]*?pH:[\s\S]*?([\d,.]+)[\s\r\n]+De/i,
    pCO2: /ordem de serviço[\s\S]*?pCO2:[\s\S]*?([\d,.]+)[\s\r\n]+mmHg/i,
    pO2: /ordem de serviço[\s\S]*?pO2:[\s\S]*?([\d,.]+)[\s\r\n]+mmHg/i,
    HCO3: /ordem de serviço[\s\S]*?HCO3:[\s\S]*?([\d,.]+)[\s\r\n]+mmol\/L/i,
    "B.E": /ordem de serviço[\s\S]*?B\.E:[\s\S]*?([-\d,.]+)[\s\r\n]+mmol\/L/i,
    ctCO2: /ordem de serviço[\s\S]*?ctCO2:[\s\S]*?([\d,.]+)[\s\r\n]+mmol\/L/i,
    "Saturação O2": /ordem de serviço[\s\S]*?SATURAÇÃO DE O2:[\s\S]*?([\d,.]+)[\s\r\n]+%/i,
    AUR: /ordem de serviço[\s\S]*?(?<!Cristais de )ÁCIDO ÚRICO(?!\s+urin[áa]rio)[\s\S]*?Resultado:?\s+(.*?)\s+mg\/dL/i,
    "HLA-B27": /ordem de serviço[\s\S]*?HLA B27[\s\S]*?Resultado:?\s*(Detectado|Não detectado)/i,
    FR: /ordem de serviço[\s\S]*?FATOR REUMATÓIDE[\s\S]*?RESULTADO:\s*([\d,.]+|Inferior)\b/i, // <-- UPDATED REGEX
    "Anti-CCP": /ordem de serviço[\s\S]*?ANTI-CCP[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    "FAN Título": /ordem de serviço[\s\S]*?PESQUISA DE AUTOANTICORPOS ANTIC[ÉE]LULA[\s\S]*?T[íi]tulo:?\s*([0-9]+\s*[\/:]\s*[0-9]+)/i,
    Padrão: /ordem de serviço[\s\S]*?PESQUISA DE AUTOANTICORPOS ANTICÉLULA[\s\S]*?PADRÃO:\s*([^:]+?)\s*?T[íi]tulo/i,
    "Anti-núcleo": /ordem de serviço[\s\S]*?Anticorpos Nucleares:\s*([^:]+?)/i,
    "Anti-envelope": /ordem de serviço[\s\S]*?Envelope Nuclear:\s*([^:]+?)/i,
    "Anti-nucléolo": /ordem de serviço[\s\S]*?Nucleolares:\s*([^:]+?)/i,
    "Anti-citoplasma": /ordem de serviço[\s\S]*?Citoplasmáticos:\s*([^:]+?)/i,
    "Anti-mitótico": /ordem de serviço[\s\S]*?Aparelho Mitótico:\s*([^:]+?)/i,
    "Anti-placa metafásica": /ordem de serviço[\s\S]*?Cromossômica:\s*([^:]+?)/i,
    CRIOGLOBULINAS: /ordem de serviço[\s\S]*?CRIOGLOBULINAS[\s\S]*?RESULTADO:\s*([^\r\n]+)/i,

    Aldolase: /ordem de serviço[\s\S]*?ALDOLASE[\s\S]*?RESULTADO:\s*([\d,]+)\s*U\/L/i,
    Ceruloplasmina: /ordem de serviço[\s\S]*?CERULOPLASMINA[\s\S]*?RESULTADO:\s*([\d,]+)\s*mg\/dL/i,
    "IgA total": /ordem de serviço[\s\S]*?IMUNOGLOBULINA A[\s\S]*?Resultado:\s+(\d+(?:\.\d*)?)/i,
    "IgG total": /ordem de serviço[\s\S]*?IMUNOGLOBULINA G[\s\S]*?Resultado:?\s+(\d+(?:[.,]\d+)*)\s+mg\/dL/i,
    "IgE total": /ordem de serviço[\s\S]*?IMUNOGLOBULINA\s+E[\s\S]*?RESULTADO:?\s*(?:Superior\s+a\s+)?(\d[\d.,]*)\s*UI\/mL/i,
    "IgM total": /ordem de serviço[\s\S]*?IMUNOGLOBULINA\s*M[\s\S]*?Resultado:?[\s\S]*?(\d+(?:[.,]\d+)?)\s+mg\/dL/i,

    /* ------------  IgE total e painéis alérgicos ------------- */
    "IgE HX2 (poeira)": /IGE\s+MULTIPLO[\s\S]*?\(HX2\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE E1 (gato)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?\(E1\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE E2 (cão)": /IGE\s+ESPEC[ÍI]FICA:?\s*(?:PELO\s+DE\s+C[ÃA]O|PELO\s+DE\s+CAO)\s*\(E2\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE E5 (cão)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?\(E5\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE GX2 (grama)": /IGE\s+MULTIPLO[\s\S]*?\(GX2\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE D1 (ácaro)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?\(D1\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE D2 (ácaro)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?\(D2\)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F245 (ovo)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?____\([^)]+\)1__1__[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F2 (leite)": /ordem de serviço[\s\S]*?IGE\s*ESPECIFICA[:\s]*LEITE\s*\(F2\)[\s\S]*?RESULTADO:?\s*(?:<\s*)?(\d+(?:,\d+)?)\s*kU\/L/i,
    "IgE F14 (soja)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?____\([^)]+\)3__3__[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F4 (trigo)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?____\([^)]+\)4__4__[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F3 (bacalhau)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?____\([^)]+\)5__5__[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE FX2 (frutos do mar)": /ordem de serviço[\s\S]*?IGE MULTIPLO:\s*FRUTOS DO MAR\s*\(FX2\)[\s\S]*?Resultado:?\s*(Inferior a \d+(?:[.,]\d+))\s+kU\/L/i,
    "IgE F13 (amendoim)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?(?:AMENDOIM\s*\(F13\)|____\([^)]+\)7__7__)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F299 (castanha)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?____\([^)]+\)8__8__[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F256 (nozes)": /IGE\s+ESPEC[ÍI]FICA[\s\S]*?(?:NOZES\s*\(F256\)|____\([^)]+\)9__9__)[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F311 (peixe-galo)": /IGE\s+ESPEC[ÍI]FIC[AO][\s\S]*?F311[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,
    "IgE F312 (peixe-espada)": /IGE\s+ESPEC[ÍI]FIC[AO][\s\S]*?F312[\s\S]*?RESULTADO:\s*((?:Inferior|Superior)\s+a\s+[\d.,]+|[\d.,]+)/i,

    "IgE F26": /ordem de serviço[\s\S]*?IGE\s+ESPECIFICA[\s\S]*?CARNE\s+DE\s+PORCO[\s\S]*?Resultado:?[\s\S]*?(?:Inferior\s+a\s+)?(\d+(?:,\d+)?)\s+kU\/L/i,
    "IgE TX7 (polen)": /ordem de serviço[\s\S]*?IGE\s+M[ÚU]LTIPLO\s+PARA\s+TX7(?:\s*\([^)]+\))?[\s\S]*?RESULTADO:?\s*([\w\s<>,]+)(?=\s*kU\/L)/i,

    // --- Eletroforese de Proteínas (ELEP) - SÉRICA (SORO) ---
    // (ancora em "Material: SORO" para não “grudar” no bloco de URINA 24H quando houver ambos no mesmo texto)
    "Albumina (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Albumina:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Alfa 1 (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Alfa\s*1:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Alfa 2 (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Alfa\s*2:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Beta 1 (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Beta\s*1:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Beta 2 (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Beta\s*2:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Gama (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Gama:\s*[\s\S]*?%[\s\S]*?([\d,]+)\s*g\/dL/i,
    "Proteínas Totais (g/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Prote[ií]nas\s+Totais:\s*([\d,]+)\s*g\/dL/i,
    "Relação A/G": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Relação\s+A\/G:\s*([\d,]+)/i,
    "Pico Monoclonal": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*SORO\b[\s\S]*?Pico\s+Monoclonal:\s*(Não\s*detectado|\d+(?:,\d+)?)/i,

    // --- Eletroforese de Proteínas (ELEP) - URINA 24H ---
    "ELEP 24h Volume (mL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Volume:\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*mL/i,
    "ELEP 24h Albumina (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Albumina:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Alfa 1 (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Alfa\s*1\s+globulina:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Alfa 2 (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Alfa\s*2\s+globulina:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Beta (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Beta\s+globulina:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Gama (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Gama\s+globulina:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Globulinas (%)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Globulinas:\s*([\d]+(?:[.,]\d+)?)\s*%/i,
    "ELEP 24h Proteínas Totais (mg/dL)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Prote[ií]nas\s+Totais:\s*(\d+(?:[.,]\d+)?)\s*mg\/dL/i,
    "ELEP 24h Proteínas 24 horas (mg/24 horas)": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Prote[ií]nas\s*24\s*horas:\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*mg\/24\s*horas/i,
    "ELEP 24h Conclusão": /ordem de serviço[\s\S]*?ELETROFORESE DE PROTE[IÍ]NAS[\s\S]*?Material:\s*URINA\s*(?:24\s*HORAS|24H)\b[\s\S]*?Conclus[aã]o:\s*([^\r\n]+)/i,
    Beta2Microglobulina: /ordem de serviço[\s\S]*?BETA\s*2\s*MICROGLOBULINA[\s\S]*?RESULTADO:\s*([\d.,]+)\s*ng\/mL/i,
    "Anti-dsDNA": /ordem de serviço[\s\S]*?DNA, AUTO ANTICORPOS[\s\S]*?Resultado:\s+(\S+)/i,
    "Anti-SSA/RO": /ordem de serviço[\s\S]*?SSA\/[\s\S]*?Resultado:?\s+(\S+)/i,
    "Anti-SSB (LA)": /ordem de serviço[\s\S]*?SSB[\s\S]*?Resultado:?\s*(\S+)/i,
    "Anti-RNP": /ordem de serviço[\s\S]*?RNP - AUTO ANTICORPOS[\s\S]*?Resultado:?\s*(\S+)/i,
    "Anti-SM": /ordem de serviço[\s\S]*?SM, AUTO ANTICORPOS[\s\S]*?Resultado:\s+(\S+)/i,
    "SCL-70 (U/mL)": /ordem de serviço[\s\S]*?SCL\s*-?\s*70[\s\S]*?RESULTADO:\s*\r?\n?\s*([^\r\n]+)\s*\r?\n?\s*U\/mL/i,
    C3: /ordem de serviço[\s\S]*?COMPLEMENTO\s+C3[\s\S]*?RESULTADO:?\s*([\d,\.]+)/i,
    C4: /ordem de serviço[\s\S]*?COMPLEMENTO SERICO C4[\s\S]*?Resultado:\s+(\S+)/i,
    ASLO: /ordem de serviço[\s\S]*?ANTIESTREPTOLISINA[\s\S]*?Resultado:\s+(\S+)/i,
    "Cardiolipina-IgG": /ordem de serviço[\s\S]*?CARDIOLIPINA IGG[\s\S]*?Resultado:\s+(\S+)/i,
    "Cardiolipina-IgM": /ordem de serviço[\s\S]*?CARDIOLIPINA IGM[\s\S]*?Resultado:\s+(\S+)/i,
    "Anticoagulante lúpico": /ordem de serviço[\s\S]*?ANTICOAGULANTE L[ÚU]PICO[\s\S]*?Screening:?\s+(\S+)/i,
    "Anti-beta2 glicoproteína-IgG": /ordem de serviço[\s\S]*?BETA2 GLICOPROTEINA IGG E IGM[\s\S]*?IGG:\s+(\d+(?:,\d*)?)/i,
    "Anti-beta2 glicoproteína-IgM": /ordem de serviço[\s\S]*?BETA2 GLICOPROTEINA IGG E IGM[\s\S]*?IGM:\s+(\d+(?:,\d*)?)/i,
    "ANCA C": /ordem de serviço[\s\S]*?ANCA C:\s+(\S+)/i,
    "ANCA P": /ordem de serviço[\s\S]*?ANCA P:\s+(\S+)/i,
    "ANCA Atípico": /ordem de serviço[\s\S]*?ANCA At[íi]pico:\s+(\S+)/i,
    "Imunofixação de proteínas séricas-Q": /ordem de serviço[\s\S]*?IMUNOFIXACAO DE PROTEINAS SERICAS-Q[\s\S]*?Resultado\s+(\S+)/i,
    "T.cruzi-IgM": /ordem de serviço[\s\S]*?cruzi[\s\S]*?IgM[\s\S]*?(?:Resultado|Leitura):?\s*(\S+)/i,
    "T.cruzi-IgG": /ordem de serviço[\s\S]*?cruzi[\s\S]*?IgG[\s\S]*?(?:Resultado|Leitura):?\s*(\S+)/i,
    "TOXO IgG": /ordem de serviço[\s\S]*?TOXOPLASMOSE[\s\S]*?IgG[\s\S]*?RESULTADO:?\s*(?:Superior\s+a\s+)?(\d+(?:[.,]\d+)?)\s*UI\/mL/i,
    "TOXO IgM": /ordem de serviço[\s\S]*?TOXOPLASMOSE[\s\S]*?IgM[\s\S]*?RESULTADO:?\s*(\d+(?:[.,]\d+)?)/i,
    "EBV-IgG": /ordem de serviço[\s\S]*?EPSTEIN\s+BARR[\s\S]*?ANTICORPOS\s+IGG[\s\S]*?RESULTADO:?\s*([\d,\.]+)/i,
    "EBV-IgM": /ordem de serviço[\s\S]*?EPSTEIN\s+BARR[\s\S]*?ANTICORPOS\s+IgM[\s\S]*?RESULTADO:?\s*(?:ÍNDICE\s*)?([\d,\.]+)/i,
    "CMV-IgG": /ordem de serviço[\s\S]*?CITOMEGALOV[IÍ]RUS[\s\S]*?ANTICORPOS\s+IgG[\s\S]*?RESULTADO:?\s*([\w\s<>,]+)(?=\s*AU\/mL)/i,
    "CMV-IgM": /ordem de serviço[\s\S]*?CITOMEGALOV[IÍ]RUS[\s\S]*?ANTICORPOS\s+IgM[\s\S]*?RESULTADO:?\s*(?:ÍNDICE\s*)?([\d,\.]+)/i,
    "Herpes Simples IgG": /ordem de serviço[\s\S]*?HERPES SIMPLES TIPO I E II, ANTICORPOS IgG[\s\S]*?RESULTADO:\s+(\d+,?\d*)/i,
    "Herpes Simples IgM": /ordem de serviço[\s\S]*?HERPES SIMPLES TIPO I E II - ANTICORPOS IgM[\s\S]*?RESULTADO: ÍNDICE\s+(\d+,?\d*)/i,
    Esquistossomose: /ordem de serviço[\s\S]*?Esquistossomose[\s\S]*?Resultado:?\s*(\S+)/i,
    "Anti-TPO": /ordem de serviço[\s\S]*?TIREOPEROXIDASE[\s\S]*?RESULTADO:?\s+(\d+(?:[.,]\d+)?)\s+UI\/mL/i,
    TRAB: /ordem de serviço[\s\S]*?TRAB[\s\S]*?Resultado:?\s*(\d+(?:,\d*)?)/i,
    "Anti-Tg": /ordem de serviço[\s\S]*?TIREOGLOBULINA[\s\S]*?Resultado:?\s*(\d+(?:,\d*)?)\s+UI\/mL/i,
    VDRL: /ordem de serviço[\s\S]*?VDRL[\s\S]{0,300}?RESULTADO:\s*(?:Amostra\s+)?(N[ÃA]O|NAO|Reagente|REAGENTE|\d+\s*:\s*\d+)/i,
    "FTA-ABS IgG": /ordem de serviço[\s\S]*?FTA\s*ABS[\s\S]*?IgG[\s\S]*?Resultado:?[\s\S]*?(REAGENTE|N[ÃA]O\s+REAGENTE)/i,
    "FTA-ABS IgM": /ordem de serviço[\s\S]*?FTA\s*ABS[\s\S]*?IgM[\s\S]*?Resultado:?[\s\S]*?(N[ÃA]O\s+REAGENTE|INDETERMINADO|REAGENTE)/i,
    HBsAg: /ordem de serviço[\s\S]*?HBsAg[\s\S]*?Resultado:?\s*(\S+)/i,
    "Anti-HBs": /ordem de serviço[\s\S]*?ANTI-?HBs[\s\S]*?Resultado:?\s*(?:([\d,.]+)\s*UI\/L|(N[ÃA]O\s*REAGENTE|REAGENTE))/i,
    "Anti-HCV": /ordem de serviço[\s\S]*?HCV[\s\S]*?Resultado:?\s*(\S+)/i,
    "Anti-HBe": /ordem de serviço[\s\S]*?\(ANTI-HBE\)[\s\S]*?RESULTADO:\s*((?:N(?:Ã|A)O\s+)?Reagente)/i,
    HBeAg: /ordem de serviço[\s\S]*?\(HBEAG\)[\s\S]*?RESULTADO:\s*((?:N(?:Ã|A)O\s+)?Reagente)/i,
    "Anti-HBc": /ordem de serviço[\s\S]*?\(ANTI-HBC\)[\s\S]*?RESULTADO:\s*((?:N(?:Ã|A)O\s+)?Reagente)/i,
    PLTs: /ordem de serviço[\s\S]*?CONTAGEM DE PLAQUETAS[\s\S]*?RESULTADO:\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*\/mm/i,

    "Anti-HIV": /HIV[^\n]*[\s\S]{0,300}?RESULTADO:\s*([^\n]+)/i,
    "HAV-IgM": /ordem de serviço[\s\S]*?Hepatite A IgM[\s\S]*?(?:Resultado|Leitura):?\s*(\S+)/i,
    // ----------------------------------------------
    // Vitaminas
    B12: /ordem de serviço[\s\S]*?VITAMINA B12[\s\S]*?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)(?=\s+pg\/mL)/i,
    Homocisteína: /ordem de serviço[\s\S]*?HOMOCISTEÍNA[\s\S]*?RESULTADO:\s*([\d,]+)\s*micromol\/L/i,
    "B1 (Tiamina)": /ordem de serviço[\s\S]*?VITAMINA B1[\s\S]*?(\d+(?:,\d*)?)(?=\s+μg\/L)/i,
    "Ác. fólico": /ordem de serviço[\s\S]*?ACIDO FOLICO[\s\S]*?Resultado:?\s*(.*?)\s+ng\/mL/i,
    "Vit. D": /ordem de serviço[\s\S]*?25 HIDROXI[\s\S]*?(\d+(?:,\d*)?)(?=\s+ng\/mL)/i,
    // ----------------------------------------------
    // Hormônios
    TSH: /ordem de serviço[\s\S]*?TIREOESTIMULANTE[\s\S]*?Resultado:?\s+(\d+,?\d*)\s+micro\s?UI\/mL/i,
    T4L: /ordem de serviço[\s\S]*?T4 L[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    T3L: /ordem de serviço[\s\S]*?T3 LIVRE[\s\S]*?Resultado:?\s+(.*?)\s+ng\/dL/i,
    "T3 [ng/mL]": /ordem de serviço[\s\S]*?T3 - TOTAL[\s\S]*?Resultado:?\s+(.*?)\s+ng\/mL/i,
    PTH: /ordem de serviço[\s\S]*?PARATIROIDEANO[\s\S]*?Resultado:?\s+(.*?)\s+pg\/mL/i,
    PTHi: /ordem de serviço[\s\S]*?PARATORMÔNIO[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)\s*pg\/mL/i,

    "Peptídeo C": /ordem de serviço[\s\S]*?PEPTÍDEO C[\s\S]*?RESULTADO:?\s+(\d+,?\d*)\s+ng\/mL/i,
    Insulina: /ordem de serviço[\s\S]*?Insulina[\s\S]*?Resultado:?\s+(.*?)\s+micro UI\/mL/i,
    "IGFBP-3": /ordem de serviço[\s\S]*?IGFBP\s*-\s*3[\s\S]*?RESULTADO:?\s*([\d]+(?:[.,]\d+)?)\s*mcg\/mL/i,
    "IGF-1": /ordem de serviço[\s\S]*?(?:SOMATOMEDINA\s*C|IGF-?\s*1)[\s\S]*?RESULTADO:?\s*([\d]+(?:[.,]\d+)?)\s*ng\/mL/i,

    TestoT: /ordem de serviço[\s\S]*?(?<!de )TESTOSTERONA TOTAL[\s\S]*?(?:Resultado:)?\s+(.*?)\s+ng\/dL/i,
    TestoL: /ordem de serviço[\s\S]*?TESTOSTERONA LIVRE[\s\S]*?(?:Resultado:)?\s+(.*?)\s+ng\/dL/i,
    SHBG: /ordem de serviço[\s\S]*?TESTOSTERONA LIVRE[\s\S]*?SHBG:\s+(.*?)\s+nmol\/L/i,
    PRL: /ordem de serviço[\s\S]*?PROLACTINA[\s\S]*?Resultado:?\s+(.*?)\s+ng\/mL/i,
    E1: /ordem de serviço[\s\S]*?ESTRONA[\s\S]*?RESULTADO:\s*([\d,.]+)\s*pg\/mL/i,
    E2: /ordem de serviço[\s\S]*?ESTRADIOL[\s\S]*?Resultado:?\s+(.*?)\s+pg\/mL/i,
    E3: /ordem de serviço[\s\S]*?ESTRIOL[\s\S]*?RESULTADO:\s*([\d,.]+)\s*ng\/mL/i,
    PROG: /ordem de serviço[\s\S]*?17\s*ALFA\s*HIDROXIPROG(?:ESTERONA)?[\s\S]*?RESULTADO:?\s*([\d.,]+)\s*ng\/dL/i,

    FSH: /ordem de serviço[\s\S]*?CULO ESTIMULANTE[\s\S]*?Resultado:\s*(\d+(?:,\d*)?)/i,
    LH: /ordem de serviço[\s\S]*?HORM[OÔ]NIO LUTEINIZANTE[\s\S]*?Resultado:?\s+(.*?)\s+mUI\/mL/i,
    ACTH: /ordem de serviço[\s\S]*?ADRENOCORTICOTRÓFICO[\s\S]*?Resultado:?\s+(.*?)\s+pg\/mL/i,
    GH: /ordem de serviço[\s\S]*?HGH[\s\S]*?Resultado:?\s+(.*?)\s+ng\/mL/i,
    DHEAS: /ordem de serviço[\s\S]*?\bDHEAS\b[\s\S]*?RESULTADO:?\s*([\d.,]+)\s*(?:mcg\/dL|µg\/dL)/i,
    DHEA: /ordem de serviço[\s\S]*?\bDHEA\b(?!S)[\s\S]*?RESULTADO:?\s*([\d.,]+)\s*ng\/mL/i,

    Aldosterona: /ordem de serviço[\s\S]*?Aldosterona[\s\S]*?Resultado:?\s+(.*?)\s+ng\/dL/i,
    "Atividade da Renina": /ordem de serviço[\s\S]*?RENINA - ATIVIDADE[\s\S]*?Resultado:?\s+(.*?)\s+ng\/mL\/h/i,
    Cortisol: /ordem de serviço[\s\S]*?CORTISOL[\s\S]*?RESULTADO:?\s+(\d+,?\d*)\s+mcg\/dL/i,
    "Cortisol basal (8h)": /ordem de serviço[\s\S]*?CORTISOL Basal[\s\S]*?Resultado:?\s+(.*?)\s+ug\/dL/i,
    // ----------------------------------------------
    // Fezes e urina
    PSAT: /ordem de serviço[\s\S]*?PSA TOTAL:\s*(\d+(:?,\d*)?)/i,
    PSAL: /ordem de serviço[\s\S]*?PSA LIVRE:\s*(\d+(:?,\d*)?)/i,
    Relação: /ordem de serviço[\s\S]*?PSA LIVRE\/PSA TOTAL:\s*(\d+(:?,\d*)?)/i,
    PSOF1: /ordem de serviço[\s\S]*?SANGUE OCULTO[\s\S]*?Resultado:\s*(\S+)/i,
    PSOF2: /ordem de serviço[\s\S]*?NAS FEZES - 2[\s\S]*?Resultado:\s*(\S+)/i,
    PSOF3: /ordem de serviço[\s\S]*?NAS FEZES - 3[\s\S]*?Resultado:\s*(\S+)/i,
    "H pylori nas fezes": /ordem de serviço[\s\S]*?HELICOBACTER[\s\S]*?Resultado:?\s*(\S+)/i,
    "Gorduras fecais": /ordem de serviço[\s\S]*?Gorduras fecais[\s\S]*?Resultado\s*(\S+)/i,
    PPF1: /ordem de serviço[\s\S]*?Parasitol[óo]gico de fezes[\s\S]+?Resultado:\s*(\S+)/i,
    PPF2: /ordem de serviço[\s\S]*?DE FEZES - 2[\s\S]+?Resultado:?\s*(\S+)/i,
    PPF3: /ordem de serviço[\s\S]*?DE FEZES - 3[\s\S]+?Resultado:?\s*(\S+)/i,
    "Calprotectina fecal": /ordem de serviço[\s\S]*?Calprotectina[\s\S]*?Resultado:?\s*(\S+)/i,
    "F.F. Consistência": /FUNCIONAL DE FEZES[\s\S]*?CONSISTENCIA:\s*([^\r\n]+)/i,
    "F.F. Forma": /FUNCIONAL DE FEZES[\s\S]*?FORMA:\s*([^\r\n]+)/i,
    "F.F. Cor": /FUNCIONAL DE FEZES[\s\S]*?COR:\s*([^\r\n]+)/i,
    "F.F. pH": /FUNCIONAL DE FEZES[\s\S]*?PH\s*\(REAÇÃO\):\s*([\d,]+)/i,
    "F.F. Muco": /FUNCIONAL DE FEZES[\s\S]*?MUCO:\s*([^\r\n]+)/i,
    "F.F. Fibras mal dig.": /FUNCIONAL DE FEZES[\s\S]*?FIBRAS MUSCULARES MAL DIGERIDAS:\s*([^\r\n]+)/i,
    "F.F. Fibras pouco dig.": /FUNCIONAL DE FEZES[\s\S]*?FIBRAS MUSCULARES POUCO DIGERIDAS:\s*([^\r\n]+)/i,
    "F.F. Fibras bem dig.": /FUNCIONAL DE FEZES[\s\S]*?FIBRAS MUSCULARES BEM DIGERIDAS:\s*([^\r\n]+)/i,
    "F.F. Gordura": /FUNCIONAL DE FEZES[\s\S]*?GORDURA:\s*([^\r\n]+)/i,
    "F.F. Amido": /FUNCIONAL DE FEZES[\s\S]*?AMIDO:\s*([^\r\n]+)/i,
    "F.F. Flora Iodófila": /FUNCIONAL DE FEZES[\s\S]*?FLORA IODOFILA:\s*([^\r\n]+)/i,
    "F.F. Leveduras": /FUNCIONAL DE FEZES[\s\S]*?LEVEDURAS:\s*([^\r\n]+)/i,
    "F.F. Hemácias": /FUNCIONAL DE FEZES[\s\S]*?HEMACIAS:\s*([^\r\n]+)/i,
    "F.F. Leucócitos": /FUNCIONAL DE FEZES[\s\S]*?LEUCOCITOS:\s*([^\r\n]+)/i,
    "EAS-pH": /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?pH:\s*([\d]+(?:[.,]\d+)?)/i,
    Urobilinogênio: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Urobilinog[eê]nio:\s*([^\r\n]+)/i,
    Glicose: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Glicose:\s*(Negativo|\+{1,4})/i,
    "Corpos Cetônicos": /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Corpos\s+Cet[oô]nicos:\s*(Negativo|\+{1,4})/i,
    Bilirrubina: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Pigmento(?:s)?\s+biliares:\s*(Negativo|\+{1,4})|ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Bilirrubina:\s*(Negativo|\+{1,4})/i,
    Proteínas: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Prote[ií]nas:\s*(Negativo|\+{1,4})/i,
    Hemoglobina: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Hemoglobina:\s*(Negativo|Positivo\s*\+{1,4}|\+{1,4})/i,
    Nitrito: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Nitrito:\s*(Negativo|Positivo\s*\+{1,4}|\+{1,4})/i,
    Leucoesterase: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?Leuc[oó]cito\s+esterase:\s*(Negativo|Positivo\s*\+{1,4}|\+{1,4})/i,
    "Células Epiteliais": /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?C[eé]lulas\s+epiteliais(?:\s+escamosas)?:\s*([^\r\n]+)/i,
    Leucócitos: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?Leuc[oó]citos:\s*([\d]+(?:[.,]\d+)?|[^\r\n]+)/i,
    Hemácias: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?(?:Hem[aá]cias|Eritr[oó]citos):\s*([\d]+(?:[.,]\d+)?|[^\r\n]+)/i,
    Cilindros: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?Cilindros:\s*([^\r\n]+)/i,
    Cristais: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?Cristais:\s*([^\r\n]+)/i,
    Muco: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?(?:Filamentos\s+de\s+muco|Muco):\s*([^\r\n]+)/i,
    Bactérias: /ordem de serviço[\s\S]*?URINA TIPO I[\s\S]*?EXAME DO SEDIMENTO[\s\S]*?Bact[eé]rias:\s*([^\r\n]+)/i,
    "Albuminúria isolada": /ordem de serviço[\s\S]*?RELAÇÃO\s+ALBUMINA\/CREATININA[\s\S]*?(\d+(?:,\d+)?)\s+mg\/g/i,
    "Proteinúria 24h": /ordem de serviço[\s\S]*?PROTEINÚRIA URINA DE 24[\s\S]*?Resultado:\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i,
    UROC: /ordem de serviço[\s\S]*?UROCULTURA[\s\S]*?Resultado:\s*(\S+)/i, // May need refinement based on result format
    "Vol. Sêmen": /VOLUME\s*:\s*([\d,]+)\s*mL/i,
    "pH Sêmen": /ESPERMA[\s\S]*?pH\s*:\s*([\d,]+)/i,
    "Conc. Esperm.": /CONCENTRAÇÃO ESPERMÁTICA\s*:\s*([\d.]+)/i,
    "Motilidade Total": /ESPERMATOZOIDES MÓVEIS\s*:\s*(\d+)\s*%/i,
    "Motilidade Prog.": /ESPERMATOZOIDES PROGRESSIVOS\s*:\s*(\d+)\s*%/i,
    "Morfologia Típica": /FORMAS TÍPICAS\s*:\s*(\d+)/i,
  };

  // Faixas de referência para os exames.
  const reference_values = {
    RBC: [4.0, 5.2],
    "Índice de Mentzer": [13.0, 999.0],
    HB: [12.0, 16.0],
    HT: [35.0, 50.0],
    VCM: [80.0, 100.0],
    HCM: [26.0, 34.0],
    RDW: [0.0, 15.0],
    Leuco: [4500.0, 11000.0],
    B: [0.0, 0.0],
    S: [2000.0, 7500.0],
    E: [0.0, 400.0],
    L: [900.0, 4400.0],
    PLT: [150000.0, 400000.0],
    Retic: [0.5, 2.0],
    FE: [50.0, 175.0],
    Ferritina: [20.0, 500.0],
    Transferrina: [200.0, 360.0],
    TSAT: [15.0, 50.0],
    TIBC: [250.0, 425.0],
    PSAT: [0.0, 2.5],
    R: [20.0, 60.0],
    CR: [0.0, 1.2],
    "Clearance Cr. corrigido": [90.0, 150.0],
    "Albuminúria 24h": [0.0, 30.0],
    "Albuminúria isolada": [0.0, 30.0],
    UR: [10.0, 50.0],
    CaT: [8.6, 10.3],
    CaI: [1.11, 1.4],
    MG: [1.6, 2.6],
    Magnésio: [1.6, 2.6],
    Cobre: [],
    Zinco: [],
    Selênio: [],
    Cloretos: [],
    Pi: [2.7, 4.5],
    NA: [136, 145],
    K: [3.5, 5.1],
    Lítio: [0.6, 1.2],
    "TTOG75g/Jejum": [0, 99],
    "TTOG75g/2h": [0, 139],
    GJ: [0, 99.9],
    HbA1c: [0, 5.69],
    TSH: [0.48, 5.6],
    T4L: [0.9, 1.8],
    T3L: [0.23, 0.42],
    T3: [0.4, 2.04],
    "T3 [ng/mL]": [0.4, 2.04],
    "Anti-TPO": [0, 9],
    TRAB: [0, 1.5],
    PTH: [18.5, 88],
    PTHi: [18.5, 88],
    "Peptídeo C": [1.03, 4.79],
    CT: [0, 200],
    HDL: [0, 120], // Note: Often minimum is > 40 or 60
    LDL: [0, 130],
    TG: [0, 230],
    CPK: [0, 174],
    Amilase: [23, 88],
    AST: [0, 40],
    ALT: [0, 41],
    GGT: [8, 73],
    FA: [35, 129],
    BT: [0.2, 1.2],
    BD: [0, 0.4],
    BI: [0.2, 1.1],
    TP: [10.1, 12.8],
    INR: [0.8, 1.2],
    TTPA: [25.4, 33.4],
    "Proteínas totais": [6.8, 8.1],
    Albumina: [3.5, 5.2],
    Album: [3.5, 5.2],
    Globulina: [1.7, 3.5],
    "Relacao A/G": [0.9, 2.0],
    "Alfa-fetoproteína": [0, 7.5],
    "PCR [mg/dL]": [0, 0.5],
    "PCR (mg/L)": [0, 5.0], // Updated key to match examPatterns
    VHS: [2, 36],
    DHL: [100, 284],
    AUR: [0, 8],
    "Anti-Tg": [0, 4.5],
    FR: [0, 14], // Matched key
    "Anti-CCP": [0, 4.0], // From example
    "IgA total": [50, 400],
    "IgG total": [600, 1500],
    "IgE total": [0, 214],
    "Proteínas Totais (g/dL)": [6.4, 8.9],
    "Albumina (g/dL)": [3.57, 5.88],
    "Alfa 1 (g/dL)": [0.19, 0.44],
    "Alfa 2 (g/dL)": [0.45, 1.05],
    "Beta 1 (g/dL)": [0.3, 0.64],
    "Beta 2 (g/dL)": [0.2, 0.58],
    "Gama (g/dL)": [0.71, 1.67],
    "Relação A/G": [0.8, 2.2],
    "Pico Monoclonal": [0, 0],
    Beta2Microglobulina: [0, 2600],
    C3: [75, 135],
    C4: [19, 52], // Note: Example VR is 12-36
    "Anticoagulante lúpico": [0, 1.2],
    "Cardiolipina-IgG": [0, 15],
    "Cardiolipina-IgM": [0, 12.5],
    B12: [300, 1500],
    Homocisteína: [5, 15],
    "Ác. fólico": [4, 30],
    "Vit. D": [20, 60], // Key matches examPatterns
    "Eletroforese de Hb - HbA1": [95, 100],
    HbA2: [1.5, 3.7],
    HbF: [0, 0.5],
    HbC: [0, 0],
    HbS: [0, 0],
    Outras: [0, 0],
    TestoT: [350, 816],
    TestoL: [6.5, 20],
    SHBG: [18, 77],
    PRL: [0, 31],
    E2: [39, 440],
    FSH: [0, 25],
    LH: [0, 100],
    "HSV-IgG": [0, 1],
    "HSV-IgM": [0, 1],
    "EAS-pH": [5.0, 8.0],
    Dens: [1.005, 1.035], // Matched key
    // Add reference values for urine sediment counts if needed (e.g., Leucócitos/campo, Hemácias/campo)
    "Cálcio urina 24h": [100, 300],
    "AUR urina 24h": [250, 800],
    "Oxalato urina 24h": [4, 44],
    "Fósforo urina 24h": [400, 1300],
    "Citrato urina 24h": [320, 1240],
    "Creatinina urina 24h": [600, 2000],
    "Sódio urina 24h": [40, 220],
    "Proteinúria 24h": [0, 80],
    "Vol. Sêmen": [1.5, 5.0],
    "pH Sêmen": [7.2, 8.0],
    "Conc. Esperm.": [15000000, 1000000000],
    "Motilidade Total": [40, 100],
    "Motilidade Prog.": [32, 100],
    "Morfologia Típica": [30, 100],
  };

  // Função para converter string numérica (com vírgula) em float.
  function convertToFloat(str) {
    if (typeof str !== "string") return NaN;
    str = str.trim();

    // ignora títulos sorológicos (1:80 etc.)
    if (/[/:]/.test(str)) return NaN;

    // caso 1 : "." + ","
    if (str.includes(".") && str.includes(",")) {
      return parseFloat(str.replace(/\./g, "").replace(",", "."));
    }

    // caso 2 : só ","
    if (str.includes(",")) {
      return parseFloat(str.replace(/\./g, "").replace(",", "."));
    }

    // caso 3 : só "."
    if (str.includes(".")) {
      const lastBlock = str.split(".").pop(); // depois do último ponto
      if (lastBlock.length === 3) {
        // milhar (ex.: 7.100, 150.000)
        return parseFloat(str.replace(/\./g, ""));
      } else {
        // decimal (ex.: 9.90, 3.5)
        return parseFloat(str);
      }
    }

    // caso 4 : só dígitos
    return parseFloat(str);
  }
  // Função para remover zeros isolados após a vírgula (aplicado ao final).
  function removeIsolatedZeros(text) {
    // Improved regex: handles end of string and non-digit followers
    return text.replace(/\.0+(\D|$)/g, "$1").replace(/\.0+$/, "");
  }

  function normalizeForComparison(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  async function copyToClipboard(text) {
    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(text, "text");
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }

    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  async function copyRichToClipboard(html, plainText) {
    if (navigator.clipboard && typeof navigator.clipboard.write === "function" && typeof ClipboardItem !== "undefined") {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plainText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return;
    }

    if (typeof GM_setClipboard === "function") {
      try {
        GM_setClipboard(html, "html");
        return;
      } catch (error) {
        console.warn("Fallback para texto simples ao copiar rich text:", error);
      }
      GM_setClipboard(plainText, "text");
      return;
    }

    await copyToClipboard(plainText);
  }

  // Função para formatar o valor do exame.
  function formatValue(exam, value, formatType) {
    const specialWords = ["Superior", "Positivo", "Presentes", "Presente", "Presença", "Reagente", "REAGENTE"]; // Added Reagente
    const emphasize = (display) => {
      if (formatType === "html") return `<strong><u>${display}</u></strong>`;
      if (formatType === "markdown") return `**${display}**`;
      return display;
    };
    // Use lowercase for comparison
    if (typeof value === "string" && specialWords.some((word) => word.toLowerCase() === value.toLowerCase())) {
      return emphasize(value);
    }
    if (exam in reference_values) {
      // Value is already a number here if it was convertible
      if (typeof value === "number" && !isNaN(value)) {
        const [low, high] = reference_values[exam];
        // Format the number to avoid excessive decimals, keeping original if needed
        let displayValue = Number.isInteger(value) ? value : value.toFixed(2).replace(/\.?0+$/, ""); // Basic formatting
        if (value < low || value > high) {
          return emphasize(displayValue);
        } else {
          return displayValue;
        }
      }
    }
    // Return non-numeric or non-referenced values as is
    return value;
  }

  // Função para extrair o valor do exame usando regex.
  function extractValue(text, exam, pattern) {
    // Tratamento dedicado para VDRL: prioriza o TÍTULO (ex.: 1:8)
    if (exam === "VDRL") {
      // Localiza o início do bloco VDRL e limita a busca a um trecho subsequente
      const start = text.search(/\bVDRL\b/i);
      if (start !== -1) {
        const block = text.slice(start, start + 2000); // 2.000 chars após "VDRL" costumam cobrir o laudo

        // 1) Tenta capturar o título (com ou sem acento)
        const titerMatch = block.match(/T[ÍI]TULO\s*:?\s*([0-9]+)\s*[:\/]\s*([0-9]+)/i);
        if (titerMatch) {
          // Normaliza para "1:8"
          return `${titerMatch[1]}:${titerMatch[2]}`;
        }

        // 2) Se não houver TÍTULO, tenta ler o RESULTADO
        const resultMatch = block.match(/RESULTADO:\s*(?:Amostra\s+)?(N[ÃA]O\s*REAGENTE|REAGENTE)/i);
        if (resultMatch) {
          const v = resultMatch[1].toUpperCase();
          if (/N[ÃA]O\s*REAGENTE/.test(v)) return "NR";
          return "REAGENTE"; // caso positivo sem título informado
        }
      }

      // 3) Fallback: tenta o padrão antigo, se houver
      const fallback = text.match(pattern);
      if (fallback) {
        const val = fallback.slice(1).find((group) => typeof group === "string" && group.trim() !== "");
        if (!val) return "Não encontrado";
        const normalizedVal = val.trim();
        // Se capturou um título direto (ex.: "1:8"), retorna-o
        if (/^\d+\s*[:\/]\s*\d+$/.test(normalizedVal)) {
          return normalizedVal.replace(/\s*/g, "").replace("/", ":");
        }
        // Se capturou "NÃO" ou "NAO", normaliza para NR
        if (/^N[ÃA]O$/i.test(normalizedVal)) return "NR";
        return normalizedVal;
      }

      return "Não encontrado";
    }

    // Demais exames: mantém o comportamento padrão
    const match = text.match(pattern);

    // ----------------------------------
    // Tratamento universal de limites
    // Converte "Inferior a 0,10" -> "< 0,10"
    //         "Superior a 5,00"  -> "> 5,00"
    if (match) {
      const captured = match.slice(1).find((group) => typeof group === "string" && group.trim() !== "");
      if (!captured) return "Não encontrado";
      let tmp = captured.trim();
      tmp = tmp.replace(/^(Inferior|Superior)\s+a\s+([\d.,]+)/i, (_, dir, num) => (dir.toLowerCase().startsWith("inferior") ? "< " : "> ") + num);
      return tmp;
    }

    return "Não encontrado";
  }

  // Função principal de extração.
  function extractResults() {
    const pageText = document.body.innerText;
    let cadastroDate = "DATA"; // Default
    const dateMatch = pageText.match(/Coleta:\s+([\d/]+)/i);
    if (dateMatch) {
      cadastroDate = dateMatch[1];
    }

    let results = {};
    for (let exam in examPatterns) {
      results[exam] = extractValue(pageText, exam, examPatterns[exam]);
    }

    // --- Derivação do Índice de Mentzer ---
    if (results["RBC"] && results["RBC"] !== "Não encontrado" && results["VCM"] && results["VCM"] !== "Não encontrado") {
      const rbcVal = convertToFloat(results["RBC"]);
      const vcmVal = convertToFloat(results["VCM"]);
      if (!isNaN(rbcVal) && !isNaN(vcmVal) && rbcVal > 0) {
        const mentzer = vcmVal / rbcVal;
        results["Índice de Mentzer"] = mentzer.toFixed(2).replace(".", ",");
      }
    }

    // --- Derivação do TSAT (Saturação da Transferrina) ---
    if (results["FE"] && results["FE"] !== "Não encontrado") {
      const feVal = convertToFloat(results["FE"]);
      const hasTsat = results["TSAT"] && results["TSAT"] !== "Não encontrado";

      // Só processa se não estiver explícito no exame (e o ferro for numérico válido)
      if (!hasTsat && !isNaN(feVal) && feVal > 0) {
        let computedTsat = null;

        if (results["TIBC"] && results["TIBC"] !== "Não encontrado") {
          const tibcVal = convertToFloat(results["TIBC"]);
          if (!isNaN(tibcVal) && tibcVal > 0) {
            // A saturação é simplesmente Ferro / TIBC * 100
            computedTsat = (feVal / tibcVal) * 100;
          }
        } else if (results["Transferrina"] && results["Transferrina"] !== "Não encontrado") {
          const transfVal = convertToFloat(results["Transferrina"]);
          if (!isNaN(transfVal) && transfVal > 0) {
            // TIBC = Transferrina * 1.4 (Padrão estimado aceito para cálculo)
            computedTsat = (feVal / (transfVal * 1.4)) * 100;
          }
        }

        if (computedTsat !== null) {
          results["TSAT"] = computedTsat.toFixed(1).replace(".", ",");
        }
      }
    }

    // --- FAN negative logic (revisado) ----------------------------------
    // Considera que existe resultado de FAN se capturamos
    //   a) o título (ex.: 1/320) ou
    //   b) o padrão (ex.: Nuclear pontilhado fino denso)
    // Caso contrário, e havendo qualquer anticorpo, devolve “FAN = NR”.
    const fanAntibodiesPresent = fanAntibodyKeys.some((key) => results[key] !== "Não encontrado");
    const fanDetailsPresent = ["FAN Título", "Padrão"].some((key) => results[key] && results[key] !== "Não encontrado");

    if (fanAntibodiesPresent && !fanDetailsPresent) {
      fanAntibodyKeys.forEach((key) => {
        delete results[key];
      }); // limpa redundâncias
      results["FAN"] = "NR"; // marca como não reagente
    }

    // Define words that should be replaced with "NR" (case-insensitive check)
    const renameToNRWords = ["Não", "Inferior"];
    // Define exams to omit if result is "Ausente", "Negativo", or "Normal"
    // OBS: Nitrito é um marcador importante no EAS; não omitir quando vier "Negativo".
    const omitExamsIfNeutral = ["Cetonas", "Bilirru", "Urobili", "Protein", "Glicose", "Hemoglo", "Cilindr", "Escamos", "Não esc", "Levedur", "Fil muc", "Muco", "Cristal", "Células Epiteliais", "F.F."];
    // Define neutral results that trigger omission for specific exams
    const neutralResults = ["Ausente", "Ausentes", "Negativo", "Normal"];
    const renameToNRWordsNormalized = renameToNRWords.map(normalizeForComparison);
    const omitExamsIfNeutralNormalized = omitExamsIfNeutral.map(normalizeForComparison);
    const neutralResultsNormalized = neutralResults.map(normalizeForComparison);
    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isNeutralValue = (normalizedValue) => neutralResultsNormalized.some((neutral) => new RegExp(`^${escapeRegex(neutral)}(?:\\s+${escapeRegex(neutral)})*$`).test(normalizedValue));

    // Separar resultados por categoria
    let bloodPartsHTML = [];
    let allergyPartsHTML = [];
    let rheumPartsHTML = [];
    let urinePartsHTML = [];
    let stoolPartsHTML = [];
    let bloodPartsPlain = [];
    let allergyPartsPlain = [];
    let rheumPartsPlain = [];
    let urinePartsPlain = [];
    let stoolPartsPlain = [];
    let bloodPartsMarkdown = [];
    let allergyPartsMarkdown = [];
    let rheumPartsMarkdown = [];
    let urinePartsMarkdown = [];
    let stoolPartsMarkdown = [];
    let spermPartsHTML = [];
    let spermPartsPlain = [];
    let spermPartsMarkdown = [];

    for (let exam in results) {
      let rawResult = results[exam];
      const normalizedExam = normalizeForComparison(exam);
      let normalizedRawResult = normalizeForComparison(rawResult);

      // Normalize Anti-HIV results that start with "Amostra não" (ignore case and accents)
      if (exam === "Anti-HIV") {
        if (normalizedRawResult.startsWith("amostra nao")) {
          rawResult = "NR";
          normalizedRawResult = "nr";
        }
      }

      if (rawResult === "Não encontrado") {
        continue; // Omitir campos não encontrados
      }

      // Check if the raw result (case-insensitive) should be replaced with "NR"
      if (renameToNRWordsNormalized.includes(normalizedRawResult)) {
        rawResult = "NR";
        normalizedRawResult = "nr";
      }

      // Check if the exam should be omitted based on a neutral result (case-insensitive)
      if (isNeutralValue(normalizedRawResult) && omitExamsIfNeutralNormalized.some((token) => normalizedExam.includes(token))) {
        continue;
      }

      let formattedHTML, formattedPlain, formattedMarkdown;
      if (/^\d+\s*[:/]\s*\d+$/.test(rawResult)) {
        // Título (e.g., "1:64" ou "1/320"), manter como string
        formattedHTML = rawResult;
        formattedPlain = rawResult;
        formattedMarkdown = rawResult;
      } else {
        const num = convertToFloat(rawResult);
        if (!isNaN(num)) {
          formattedHTML = formatValue(exam, num, "html");
          formattedPlain = formatValue(exam, num, "plain");
          formattedMarkdown = formatValue(exam, num, "markdown");
        } else {
          formattedHTML = formatValue(exam, rawResult, "html");
          formattedPlain = formatValue(exam, rawResult, "plain");
          formattedMarkdown = formatValue(exam, rawResult, "markdown");
        }
      }

      // Special formatting for VDRL
      if (exam === "VDRL") {
        const normalized = normalizeForComparison(rawResult);
        if (rawResult !== "NR" && !/^amostra nao/.test(normalized)) {
          formattedHTML = `<strong>${rawResult}</strong>`;
          formattedMarkdown = `**${rawResult}**`;
        }
      }

      // Adicionar ao array da categoria apropriada
      const examEntry = `${exam} ${formattedHTML}`;
      const examEntryPlain = `${exam} ${formattedPlain}`;
      const examEntryMarkdown = `${exam} ${formattedMarkdown}`;
      const category = getExamCategory(exam);
      if (category === "urine") {
        urinePartsHTML.push(examEntry);
        urinePartsPlain.push(examEntryPlain);
        urinePartsMarkdown.push(examEntryMarkdown);
      } else if (category === "stool") {
        stoolPartsHTML.push(examEntry);
        stoolPartsPlain.push(examEntryPlain);
        stoolPartsMarkdown.push(examEntryMarkdown);
      } else if (category === "rheum") {
        rheumPartsHTML.push(examEntry);
        rheumPartsPlain.push(examEntryPlain);
        rheumPartsMarkdown.push(examEntryMarkdown);
      } else if (category === "allergy") {
        allergyPartsHTML.push(examEntry);
        allergyPartsPlain.push(examEntryPlain);
        allergyPartsMarkdown.push(examEntryMarkdown);
      } else if (category === "sperm") {
        spermPartsHTML.push(examEntry);
        spermPartsPlain.push(examEntryPlain);
        spermPartsMarkdown.push(examEntryMarkdown);
      } else {
        bloodPartsHTML.push(examEntry);
        bloodPartsPlain.push(examEntryPlain);
        bloodPartsMarkdown.push(examEntryMarkdown);
      }
    }

    // Construir o HTML final com itens separados por categoria
    let listItems = [];
    let listItemsPlain = [];
    let listItemsMarkdown = [];

    if (bloodPartsHTML.length > 0) {
      listItems.push(`<li><strong>Exames de sangue ${cadastroDate}:</strong> ${bloodPartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Exames de sangue ${cadastroDate}: ${bloodPartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Exames de sangue ${cadastroDate}:** ${bloodPartsMarkdown.join(" / ")}`);
    }

    if (allergyPartsHTML.length > 0) {
      listItems.push(`<li><strong>Provas alérgicas ${cadastroDate}:</strong> ${allergyPartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Provas alérgicas ${cadastroDate}: ${allergyPartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Provas alérgicas ${cadastroDate}:** ${allergyPartsMarkdown.join(" / ")}`);
    }

    if (rheumPartsHTML.length > 0) {
      listItems.push(`<li><strong>Provas reumatológicas ${cadastroDate}:</strong> ${rheumPartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Provas reumatológicas ${cadastroDate}: ${rheumPartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Provas reumatológicas ${cadastroDate}:** ${rheumPartsMarkdown.join(" / ")}`);
    }

    if (urinePartsHTML.length > 0) {
      listItems.push(`<li><strong>Exames de urina ${cadastroDate}:</strong> ${urinePartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Exames de urina ${cadastroDate}: ${urinePartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Exames de urina ${cadastroDate}:** ${urinePartsMarkdown.join(" / ")}`);
    }

    if (stoolPartsHTML.length > 0) {
      listItems.push(`<li><strong>Exames de fezes ${cadastroDate}:</strong> ${stoolPartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Exames de fezes ${cadastroDate}: ${stoolPartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Exames de fezes ${cadastroDate}:** ${stoolPartsMarkdown.join(" / ")}`);
    }

    if (spermPartsHTML.length > 0) {
      listItems.push(`<li><strong>Espermograma ${cadastroDate}:</strong> ${spermPartsHTML.join(" / ")}</li>`);
      listItemsPlain.push(`Espermograma ${cadastroDate}: ${spermPartsPlain.join(" / ")}`);
      listItemsMarkdown.push(`- **Espermograma ${cadastroDate}:** ${spermPartsMarkdown.join(" / ")}`);
    }

    const finalHTML = listItems.length > 0 ? `<ul>${listItems.join("")}</ul>` : "<p>Nenhum exame encontrado.</p>";
    const finalPlain = listItemsPlain.length > 0 ? listItemsPlain.join("\n") : "Nenhum exame encontrado.";
    const finalMarkdown = listItemsMarkdown.length > 0 ? listItemsMarkdown.join("\n") : "Nenhum exame encontrado.";

    return {
      finalHTML: removeIsolatedZeros(finalHTML),
      finalPlain: removeIsolatedZeros(finalPlain),
      finalMarkdown: removeIsolatedZeros(finalMarkdown),
    };
  }

  // -------------------------------
  // Manipulador de evento para exibir os resultados na caixa de mensagens.
  button.addEventListener("click", function () {
    const results = extractResults();
    lastExtraction = results;
    // Exibe o relatório com formatação HTML na caixa de mensagens.
    resultDiv.innerHTML = results.finalHTML;
    resultDiv.style.display = "block";
    const noData = !results.finalPlain || results.finalPlain === "Nenhum exame encontrado.";
    copyMarkdownButton.disabled = noData;
    copyTextButton.disabled = noData;
    copyRichButton.disabled = noData;
    console.log("Relatório extraído exibido para cópia manual.");
  });

  copyMarkdownButton.addEventListener("click", async function () {
    if (!lastExtraction || !lastExtraction.finalMarkdown) return;

    try {
      await copyToClipboard(lastExtraction.finalMarkdown);
      console.log("Relatório em markdown copiado para a área de transferência.");
    } catch (error) {
      console.error("Falha ao copiar relatório markdown:", error);
    }
  });

  copyTextButton.addEventListener("click", async function () {
    if (!lastExtraction || !lastExtraction.finalPlain) return;

    try {
      await copyToClipboard(lastExtraction.finalPlain);
      console.log("Relatório em texto simples copiado para a área de transferência.");
    } catch (error) {
      console.error("Falha ao copiar relatório em texto simples:", error);
    }
  });

  copyRichButton.addEventListener("click", async function () {
    if (!lastExtraction || !lastExtraction.finalHTML) return;

    try {
      await copyRichToClipboard(lastExtraction.finalHTML, lastExtraction.finalPlain || "");
      console.log("Relatório formatado (rich text) copiado para a área de transferência.");
    } catch (error) {
      console.error("Falha ao copiar relatório rich text:", error);
    }
  });

  toggleButton.addEventListener("click", function () {
    if (resultDiv.style.display === "none") return;
    isExpanded = !isExpanded;
    resultDiv.style.height = isExpanded ? expandedHeight : collapsedHeight;
    toggleButton.innerText = isExpanded ? "Collapse" : "Expand";
  });

  closeButton.addEventListener("click", function () {
    resultDiv.style.display = "none";
    resultDiv.style.height = collapsedHeight;
    toggleButton.innerText = "Expand";
    isExpanded = false;
    copyMarkdownButton.disabled = true;
    copyTextButton.disabled = true;
    copyRichButton.disabled = true;
    lastExtraction = null;
  });
})();
