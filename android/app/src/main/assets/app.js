"use strict";
const E = EscrutinioEngine;
const STORAGE_KEY = "quinielaAiStudioMovilV1";
const PERCENTAGES_URL = "https://www.quinielista.es/xml2/porcentajes_completo.asp?jornada=";
const SECTIONS = ["quiniela", "condiciones", "reducciones", "analisis", "sistemas", "ajustes", "escrutinio"];
let state = {
  data: null, season: "", round: 0, currentRound: 0, updatedAt: "", source: "market",
  percentages: {}, rounds: {}, systems: [], settings: { priceCents: 75 },
};
let busy = false, requestId = 0;
const requests = new Map();
const byId = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;",
  })[char]);
}
function newRoundState() {
  return {
    base: Array(14).fill("1"), goals: ["0", "0"], coverageLevel: 0,
    generation: { mode: "automatic", doubles: 1, triples: 1, maxColumns: 6 },
    filters: { accountEnabled: false, minCounts: { "1": 0, X: 0, "2": 0, V: 0 },
      maxCounts: { "1": 14, X: 14, "2": 14, V: 14 }, streakEnabled: false, maxVariantRun: 14 },
    bets: [], generatedAt: "", selectedSource: "market",
  };
}
function roundKey(season = state.season, round = state.round) { return season + ":" + round; }
function current() {
  const key = roundKey();
  if (!state.rounds[key]) state.rounds[key] = newRoundState();
  return state.rounds[key];
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (_error) { setStatus("No se pudo guardar más información local. Exporta el desarrollo TXT para conservarlo.", "error"); }
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") return;
    state = { ...state, ...saved, settings: { ...state.settings, ...(saved.settings || {}) } };
    if (!state.rounds || typeof state.rounds !== "object") state.rounds = {};
    if (!Array.isArray(state.systems)) state.systems = [];
  } catch (_error) { localStorage.removeItem(STORAGE_KEY); }
}
function api(method, argument = "") {
  return new Promise((resolve, reject) => {
    const id = String(++requestId);
    requests.set(id, { resolve, reject });
    Android.request(id, method, argument);
  });
}
window.onNativeResponse = (id, result) => {
  const request = requests.get(String(id));
  if (!request) return;
  requests.delete(String(id));
  result.startsWith("__ERROR__") ? request.reject(Error(result.slice(9))) : request.resolve(result);
};
function setStatus(text, kind = "") {
  const status = byId("status");
  if (!status) return;
  status.textContent = text;
  status.className = "status" + (kind ? " " + kind : "");
}
function setBusy(value, text = "Cargando…") {
  busy = value;
  byId("loadingText").textContent = text;
  byId("loading").classList.toggle("hidden", !value);
  byId("updateDataButton").disabled = value;
  renderSelectors();
  renderActions();
}
function seasonList() {
  return Object.keys(state.data || {}).filter((key) => /^FEC\d{2}-\d{2}\.TXT$/.test(key))
    .map((key) => key.slice(3, 8)).sort().reverse();
}
function roundsFor(season = state.season) {
  return state.data ? E.availableRounds(state.data, season) : [];
}
function fixture(round = state.round, season = state.season) {
  if (!state.data || !season || !round) return [];
  const line = E.roundLine(state.data["PRE" + season + ".TXT"], round);
  const block = line.slice(119, 209);
  const names = E.parseNames(state.data["WEQUIPOS.TXT"]);
  const hours = E.parseHours(state.data["HOR" + season + ".TXT"], round);
  if (block.length !== 90) return [];
  return Array.from({ length: 15 }, (_, index) => {
    const homeCode = block.slice(index * 6, index * 6 + 3).toUpperCase();
    const awayCode = block.slice(index * 6 + 3, index * 6 + 6).toUpperCase();
    return { number: index + 1, home: names[homeCode] || homeCode, away: names[awayCode] || awayCode,
      kick: E.formatKickoff(hours[index] || ""), codes: [homeCode, awayCode] };
  });
}
function isEditable() {
  return !!state.data && state.season === state.data.season && state.round === state.currentRound;
}
function renderSelectors() {
  const season = byId("seasonSelect"), round = byId("roundSelect");
  if (!season || !round) return;
  const seasons = seasonList();
  season.innerHTML = seasons.map((value) => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</option>").join("");
  season.value = seasons.includes(state.season) ? state.season : (seasons[0] || "");
  const rounds = state.data ? E.availableRounds(state.data, season.value) : [];
  round.innerHTML = rounds.map(({ round: number }) => '<option value="' + number + '">Jornada ' + number + "</option>").join("");
  round.value = rounds.some((entry) => entry.round === +state.round) ? String(state.round) : (rounds.at(-1)?.round ? String(rounds.at(-1).round) : "");
  const ready = !busy && !!state.data && !!season.value && rounds.length > 0;
  season.disabled = !ready;
  round.disabled = !ready;
  byId("currentButton").disabled = !ready;
  byId("updateDataButton").disabled = busy;
}
function renderSource() {
  const keyData = state.percentages[roundKey()] || null;
  const round = current();
  const available = keyData || {};
  const selected = round.selectedSource || state.source || "manual";
  document.querySelectorAll("[data-source]").forEach((button) => {
    const source = button.dataset.source;
    button.classList.toggle("active", source === selected);
    button.disabled = source !== "manual" && !available[source];
  });
  const time = available.capturedAt ? new Date(available.capturedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin descargar";
  byId("sourceAge").textContent = time;
  byId("sourceNote").textContent = selected === "market"
    ? (available.market ? "Mercado · porcentajes deportivos publicados por Quinielista/Betfair. No es un modelo propio." : "Descarga los porcentajes de la jornada para usar el mercado. Puedes editar la base manualmente.")
    : selected === "public"
      ? (available.public ? "Popularidad · porcentaje de signos jugados publicado por Quinielista. No equivale a probabilidad deportiva." : "La popularidad no está descargada para esta jornada. Puedes editar la base manualmente.")
      : "Modo manual · marca tú los signos de cada partido. No se aplican porcentajes.";
}
function selectedProbabilities() {
  const source = current().selectedSource || state.source;
  return state.percentages[roundKey()]?.[source] || null;
}
function formatPct(value) { return Number.isFinite(value) ? Math.round(value) + "%" : ""; }
function renderCoverageLevels() {
  const round = current();
  if (!round.generation) round.generation = { mode: "automatic", doubles: 1, triples: 1, maxColumns: 6 };
  const generation = round.generation;
  byId("generationMode").value = generation.mode;
  byId("doubleCount").value = generation.doubles;
  byId("tripleCount").value = generation.triples;
  byId("maxColumns").value = generation.maxColumns;
  byId("doubleCount").disabled = generation.mode !== "manual";
  byId("tripleCount").disabled = generation.mode !== "manual";
  let counts = { fixed: 14 - generation.doubles - generation.triples, doubles: generation.doubles, triples: generation.triples };
  if (generation.mode === "automatic" && selectedProbabilities()) {
    try { const choice = E.automaticBase(selectedProbabilities(), generation.maxColumns); counts = { fixed: 14-choice.doubles-choice.triples, doubles: choice.doubles, triples: choice.triples }; } catch (_) {}
  }
  byId("coverageCaption").textContent = counts.fixed + " fijos · " + counts.doubles + " dobles · " + counts.triples + " triples";
  const hasSource = !!selectedProbabilities();
  byId("fillBaseButton").disabled = !isEditable() || !hasSource;
}
function countPairs() {
  return (current().goals[0].length || 0) * (current().goals[1].length || 0);
}
function baseSize() {
  return E.baseSize(current().base, current().goals);
}
function renderFixtures() {
  const matches = fixture();
  const round = current();
  const probabilities = selectedProbabilities();
  if (matches.length < 14) {
    byId("fixtures").innerHTML = '<div class="empty">Descarga una jornada válida para editar los 14 partidos.</div>';
    byId("baseCount").textContent = "0 apuestas base";
    return;
  }
  byId("fixtures").innerHTML = matches.slice(0, 14).map((match, index) => {
    const row = probabilities?.[index];
    const odds = row ? "1 " + formatPct(row[0]) + " · X " + formatPct(row[1]) + " · 2 " + formatPct(row[2]) : match.kick;
    return '<div class="fixture-row"><div class="fixture-meta"><strong class="fixture-teams">' + String(index + 1).padStart(2, "0") + " · " + escapeHtml(match.home) + " – " + escapeHtml(match.away) + '</strong><small class="fixture-extra">' + escapeHtml(odds || "Horario pendiente") + '</small></div><div class="sign-buttons">' + ["1", "X", "2"].map((sign) =>
      '<button class="' + (round.base[index].includes(sign) ? "selected" : "") + '" onclick="toggleSign(' + index + ',\'' + sign + '\')" aria-label="Partido ' + (index + 1) + " signo " + sign + '" ' + (!isEditable() ? "disabled" : "") + ">" + sign + "</button>",
    ).join("") + "</div></div>";
  }).join("");
  let size = 0;
  try { size = baseSize(); } catch (_error) { size = 0; }
  byId("baseCount").textContent = size.toLocaleString("es-ES") + (size === 1 ? " apuesta base" : " apuestas base");
}
function renderGoals() {
  const goals = current().goals;
  const labels = ["Local", "Visitante"];
  byId("plenoChoices").innerHTML = labels.map((label, side) =>
    '<div class="goal-side"><h3>' + label + '</h3><div class="goal-buttons">' + [..."012M"].map((goal) =>
      '<button class="' + (goals[side].includes(goal) ? "selected" : "") + '" onclick="toggleGoal(' + side + ',\'' + goal + '\')" ' + (!isEditable() ? "disabled" : "") + ">" + goal + "</button>",
    ).join("") + "</div></div>",
  ).join("");
  const count = countPairs();
  byId("plenoCount").textContent = count + (count === 1 ? " pareja" : " parejas");
}
function estimatedTickets() {
  try { return baseSize(); } catch (_error) { return 0; }
}
function renderActions() {
  const active = byId("page-quiniela").classList.contains("active");
  byId("actionDock").classList.toggle("visible", active);
  let size = estimatedTickets();
  byId("dockCount").textContent = size.toLocaleString("es-ES") + (size === 1 ? " apuesta" : " apuestas");
  byId("dockCost").textContent = money(size * state.settings.priceCents);
  byId("generateButton").disabled = busy || !isEditable() || size < 1 || size > E.MAX_GENERATED;
  if (!isEditable() && state.data) byId("generateButton").textContent = "Jornada de consulta";
  else byId("generateButton").textContent = "Generar quiniela";
}
function renderGenerated() {
  const round = current();
  const bets = round.bets || [];
  if (!bets.length) {
    byId("generatedTitle").textContent = "Todavía no generado";
    byId("generatedCost").textContent = money(0);
    byId("generatedNote").textContent = "Base " + estimatedTickets().toLocaleString("es-ES") + " apuestas antes de aplicar condiciones.";
    byId("betPreview").innerHTML = "";
    return;
  }
  const unique = new Set(bets.map((bet) => bet.slice(0, 14))).size;
  byId("generatedTitle").textContent = bets.length.toLocaleString("es-ES") + (bets.length === 1 ? " apuesta" : " apuestas");
  byId("generatedCost").textContent = money(bets.length * state.settings.priceCents);
  byId("generatedNote").textContent = unique.toLocaleString("es-ES") + " columnas distintas · " + round.generatedAt + " · Se conserva en este teléfono.";
  byId("betPreview").innerHTML = bets.slice(0, 12).map((bet, index) =>
    '<div class="bet-line"><span>' + String(index + 1).padStart(2, "0") + " · " + escapeHtml(bet) + '</span><small>1 apuesta</small></div>',
  ).join("") + (bets.length > 12 ? '<div class="help-text">Vista previa de 12. El TXT incluye las ' + bets.length.toLocaleString("es-ES") + ' apuestas.</div>' : "");
}
function setTab(section) {
  if (!SECTIONS.includes(section)) return;
  if (window.stopScrutinyPolling) window.stopScrutinyPolling();
  SECTIONS.forEach((key) => {
    byId("page-" + key).classList.toggle("active", key === section);
    document.querySelector('.nav-button[data-page="' + key + '"]').classList.toggle("active", key === section);
  });
  renderActions();
  if (section === "condiciones") renderFilters();
  if (section === "analisis") renderAnalysis();
  if (section === "sistemas") renderSystems();
  if (section === "escrutinio" && window.renderScrutiny) {
    window.renderScrutiny();
    if (window.startScrutinyPolling) window.startScrutinyPolling();
  }
  window.scrollTo(0, 0);
}
document.querySelectorAll(".nav-button").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.page)));
function renderFilters() {
  const filters = current().filters;
  byId("accountEnabled").checked = filters.accountEnabled;
  byId("streakEnabled").checked = filters.streakEnabled;
  for (const sign of ["1", "X", "2", "V"]) {
    const key = sign === "1" ? "1" : sign;
    byId("min" + key).value = filters.minCounts[key];
    byId("max" + key).value = filters.maxCounts[key];
  }
  byId("maxVariantRun").value = filters.maxVariantRun;
  byId("maxVariantRunValue").value = filters.maxVariantRun;
  const active = filters.accountEnabled || filters.streakEnabled;
  byId("filterStatus").textContent = active ? "Condiciones activas al generar" : "Filtros desactivados";
  byId("filterEffect").textContent = active
    ? "El filtro puede reducir el número final de apuestas. El resultado aparece después de generar."
    : "Los valores se conservan. Activa una condición para usarla en el próximo desarrollo.";
}
function updateStreakValue() {
  byId("maxVariantRunValue").value = byId("maxVariantRun").value;
  updateFilters();
}
function updateFilters() {
  const filters = current().filters;
  filters.accountEnabled = byId("accountEnabled").checked;
  filters.streakEnabled = byId("streakEnabled").checked;
  for (const sign of ["1", "X", "2", "V"]) {
    filters.minCounts[sign] = Math.max(0, Math.min(14, Number(byId("min" + sign).value || 0)));
    filters.maxCounts[sign] = Math.max(0, Math.min(14, Number(byId("max" + sign).value || 14)));
  }
  filters.maxVariantRun = Math.max(1, Math.min(14, Number(byId("maxVariantRun").value || 14)));
  save();
  renderFilters();
}
function renderAnalysis() {
  const round = current();
  const bets = round.bets || [];
  const base = round.base;
  const widths = { fixed: base.filter((row) => row.length === 1).length,
    doubles: base.filter((row) => row.length === 2).length, triples: base.filter((row) => row.length === 3).length };
  let mass = null;
  const probabilities = selectedProbabilities();
  if (bets.length && probabilities) mass = E.probabilityMass(bets, probabilities);
  const metrics = [
    ["Apuestas generadas", bets.length.toLocaleString("es-ES"), "Sistema actual"],
    ["Coste estimado", money(bets.length * state.settings.priceCents), "" + money(state.settings.priceCents) + " por apuesta"],
    ["Fijos · dobles · triples", widths.fixed + " · " + widths.doubles + " · " + widths.triples, "Sobre 14 partidos"],
    ["Masa del modelo", mass === null ? "—" : (mass * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "%", mass === null ? "Descarga porcentajes" : "Estimación independiente, no premio"],
  ];
  byId("analysisCards").innerHTML = metrics.map(([label, value, note]) =>
    '<div class="metric-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(note) + "</small></div>",
  ).join("");
  byId("analysisBase").innerHTML = base.map((signs, index) =>
    '<div class="base-cell"><b>' + String(index + 1).padStart(2, "0") + '</b><span>' + escapeHtml(signs) + "</span></div>",
  ).join("");
}
function renderSystems() {
  const container = byId("systemsList");
  if (!state.systems.length) {
    container.innerHTML = '<div class="empty">Todavía no hay sistemas guardados. Genera una quiniela y guárdala aquí.</div>';
    return;
  }
  container.innerHTML = state.systems.slice().reverse().map((system) => `
    <article class="system-card"><div class="system-head"><div><strong>${escapeHtml(system.name)}</strong>
      <small>${escapeHtml(system.season + " · Jornada " + system.round + " · " + new Date(system.createdAt).toLocaleDateString("es-ES"))}</small></div>
      <b class="system-count">${system.bets.length.toLocaleString("es-ES")} apuestas</b></div>
      <div class="system-actions"><button onclick="openSystem('${escapeHtml(system.id)}')">Abrir</button>
      <button class="outline" onclick="exportSystem('${escapeHtml(system.id)}')">TXT</button>
      <button class="danger" onclick="deleteSystem('${escapeHtml(system.id)}')">Eliminar</button></div></article>`
  ).join("");
}
function renderSettings() { byId("priceInput").value = (state.settings.priceCents / 100).toFixed(2); byId("dataUpdated").textContent = state.updatedAt ? "Última descarga: " + new Date(state.updatedAt).toLocaleString("es-ES") : "Todavía no se han descargado datos."; }
function renderAll() {
  renderSelectors();
  byId("roundBadge").textContent = state.data ? state.season + " · J" + state.round + (isEditable() ? " · EN CURSO" : " · CONSULTA") : "DESCARGA DATOS";
  renderSource();
  renderCoverageLevels();
  renderFixtures();
  renderGoals();
  renderGenerated();
  renderActions();
  renderSettings();
}
function money(cents) { return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100); }

function changeRound(round) {
  if (!round || busy) return;
  state.round = Number(round);
  save(); renderAll();
  setStatus(isEditable() ? "Jornada en curso. Puedes editar y generar." : "Jornada de consulta. Tus sistemas guardados se conservan.", isEditable() ? "success" : "");
}
function changeSeason(season) {
  if (!season || busy) return;
  state.season = season;
  const rounds = roundsFor(season);
  state.round = season === state.data?.season ? state.currentRound : (rounds.at(-1)?.round || 0);
  save(); renderAll();
  setStatus("Consulta " + season + " · Jornada " + state.round + ". Las nuevas apuestas se crean en la jornada en curso.");
}
byId("seasonSelect").addEventListener("change", (event) => changeSeason(event.target.value));
byId("roundSelect").addEventListener("change", (event) => changeRound(event.target.value));
function goCurrentRound() {
  if (!state.data) return setStatus("Descarga primero los datos de la jornada.", "error");
  state.season = state.data.season;
  state.round = state.currentRound;
  save(); renderAll(); setStatus("Quiniela en curso · " + state.season + " · Jornada " + state.round + ".", "success");
}
function buildSourceData(xml) {
  const documentXml = new DOMParser().parseFromString(xml, "application/xml");
  if (documentXml.querySelector("parsererror")) throw Error("Quinielista devolvió un XML inválido.");
  const header = documentXml.querySelector("porcentajes");
  const seasonYear = 2000 + Number(state.season.slice(-2));
  if (!header || Number(header.getAttribute("jornada")) !== state.round || Number(header.getAttribute("temporada")) !== seasonYear)
    throw Error("Los porcentajes no corresponden a la temporada y jornada seleccionadas.");
  const tags = [...documentXml.querySelectorAll("partido")];
  if (tags.length !== 15) throw Error("La fuente no contiene los 15 encuentros de la quiniela.");
  const matches = fixture();
  const market = [], popularity = [];
  tags.forEach((tag, index) => {
    const number = Number(tag.getAttribute("num"));
    if (number !== index + 1) throw Error("La fuente contiene partidos desordenados.");
    if (!E.sameTeamName(tag.getAttribute("local"), matches[index].home)
      || !E.sameTeamName(tag.getAttribute("visitante"), matches[index].away))
      throw Error("Los equipos no coinciden en el partido " + (index + 1) + ". No se han mezclado porcentajes.");
    if (index === 14) return;
    const read = (fields, name) => {
      const values = fields.map((field) => Number(tag.getAttribute(field)));
      const sum = values.reduce((total, value) => total + value, 0);
      if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100) || sum < 99 || sum > 101)
        throw Error(name + " inválidos en el partido " + (index + 1) + ".");
      return values.map((value) => value / sum);
    };
    popularity.push(read(["p_jugados_1", "p_jugados_X", "p_jugados_2"], "Porcentajes de popularidad"));
    let marketFields = ["p_bf_1desc", "p_bf_Xdesc", "p_bf_2desc"];
    if (marketFields.some((field) => tag.getAttribute(field) === null)) marketFields = ["p_bf_1", "p_bf_X", "p_bf_2"];
    if (marketFields.every((field) => tag.getAttribute(field) !== null)) market.push(read(marketFields, "Porcentajes de mercado"));
  });
  return { public: popularity, market: market.length === 14 ? market : null,
    source: "Quinielista", capturedAt: new Date().toISOString() };
}
async function updateData() {
  if (busy) return;
  const previousCurrent = isEditable();
  setBusy(true, "Descargando calendario WIN1X2…");
  try {
    const data = JSON.parse(await api("winData"));
    if (!data.season || !data["FEC" + data.season + ".TXT"] || !data["PRE" + data.season + ".TXT"] || !data["HOR" + data.season + ".TXT"])
      throw Error("El paquete no incluye calendario completo para la temporada actual.");
    state.data = data;
    state.currentRound = E.currentRound(data, data.season);
    const seasons = seasonList();
    if (!seasons.includes(state.season) || previousCurrent || !state.round) {
      state.season = data.season; state.round = state.currentRound;
    } else if (!roundsFor(state.season).some((entry) => entry.round === Number(state.round))) {
      state.season = data.season; state.round = state.currentRound;
    }
    current();
    save(); renderAll();
    setBusy(true, "Comprobando equipos y porcentajes de " + state.season + " · J" + state.round + "…");
    let note = "Calendario actualizado. ";
    if (isEditable()) {
      try {
        const sources = buildSourceData(await api("text", PERCENTAGES_URL + state.round));
        state.percentages[roundKey()] = sources;
        if (current().selectedSource === "market" && !sources.market) current().selectedSource = "public";
        note += sources.market ? "Mercado y popularidad disponibles." : "Solo popularidad disponible.";
      } catch (sourceError) {
        note += "No se renovaron los porcentajes: " + sourceError.message;
      }
    } else note += "Descarga porcentajes desde la jornada en curso.";
    state.updatedAt = new Date().toISOString();
    save(); renderAll();
    setStatus(note, "success");
  } catch (error) {
    setStatus("No se pudieron actualizar los datos. " + error.message + (state.data ? " Se conservan el calendario y los sistemas anteriores." : ""), "error");
  } finally {
    setBusy(false); renderAll();
  }
}
function selectSource(source) {
  if (source !== "manual" && !state.percentages[roundKey()]?.[source])
    return setStatus("Descarga primero los porcentajes de esta jornada o elige Manual.", "error");
  current().selectedSource = source;
  state.source = source;
  save(); renderAll();
}
function selectCoverage(level) { current().coverageLevel = Number(level); save(); renderAll(); }
function setGenerationMode(mode) { current().generation.mode = mode === "manual" ? "manual" : "automatic"; save(); renderAll(); }
function setGenerationCounts() {
  const generation = current().generation || (current().generation = {});
  generation.doubles = Math.max(0, Math.min(14, Number(byId("doubleCount").value) || 0));
  generation.triples = Math.max(0, Math.min(14-generation.doubles, Number(byId("tripleCount").value) || 0));
  generation.maxColumns = Math.max(1, Number(byId("maxColumns").value) || 1);
  byId("tripleCount").value = generation.triples;
  save(); renderAll();
}
function fillBase() {
  if (!isEditable()) return setStatus("La jornada seleccionada es solo de consulta.", "error");
  const probabilities = selectedProbabilities();
  if (!probabilities) return setStatus("Descarga una fuente de porcentajes antes de rellenar la base.", "error");
  const generation = current().generation || { mode: "automatic", doubles: 1, triples: 1, maxColumns: 6 };
  let chosen;
  try { chosen = generation.mode === "manual"
    ? { base: E.configuredBase(probabilities, generation.doubles, generation.triples, generation.maxColumns), doubles: generation.doubles, triples: generation.triples }
    : E.automaticBase(probabilities, generation.maxColumns); }
  catch (error) { return setStatus(error.message, "error"); }
  current().base = chosen.base;
  current().bets = [];
  save(); renderAll();
  const counts = { fixed: 14-chosen.doubles-chosen.triples, doubles: chosen.doubles, triples: chosen.triples };
  setStatus("Base rellenada según " + current().selectedSource + ": " + counts.fixed + " fijos, " + counts.doubles + " dobles y " + counts.triples + " triples.", "success");
}
function toggleSign(index, sign) {
  if (!isEditable()) return setStatus("Solo se edita la jornada en curso.", "error");
  const base = current().base;
  const allowed = new Set(base[index]);
  allowed.has(sign) ? allowed.delete(sign) : allowed.add(sign);
  if (!allowed.size) return setStatus("Cada partido debe conservar al menos un signo.", "error");
  base[index] = "1X2".split("").filter((item) => allowed.has(item)).join("");
  current().bets = [];
  save(); renderAll();
}
function toggleGoal(side, goal) {
  if (!isEditable()) return setStatus("Solo se edita el Pleno de la jornada en curso.", "error");
  const goals = current().goals;
  const selected = new Set(goals[side]);
  selected.has(goal) ? selected.delete(goal) : selected.add(goal);
  if (!selected.size) return setStatus("Selecciona al menos un resultado para cada equipo.", "error");
  goals[side] = "012M".split("").filter((item) => selected.has(item)).join("");
  current().bets = [];
  save(); renderAll();
}
function generateCurrent() {
  if (busy) return;
  if (!isEditable()) return setStatus("Selecciona la jornada en curso para generar apuestas.", "error");
  setBusy(true, "Generando las combinaciones…");
  setTimeout(() => {
    try {
      const round = current();
      const filters = round.filters;
      for (const sign of ["1", "X", "2", "V"]) {
        if (filters.minCounts[sign] > filters.maxCounts[sign]) throw Error("El mínimo de " + sign + " supera su máximo.");
      }
      const bets = E.generateBets(round.base, round.goals, filters, E.MAX_GENERATED);
      if (!bets.length) throw Error("Las condiciones no dejan ninguna apuesta. Amplía los límites o desactiva algún filtro.");
      round.bets = bets;
      round.generatedAt = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      save(); renderAll();
      setStatus("Desarrollo generado: " + bets.length.toLocaleString("es-ES") + " apuestas · " + money(bets.length * state.settings.priceCents) + ".", "success");
    } catch (error) { setStatus(error.message, "error"); }
    finally { setBusy(false); renderAll(); }
  }, 35);
}
function applyReduction() {
  const round = current();
  if (!round.bets?.length) return setStatus("Genera primero las apuestas completas.", "error");
  const budget = Number(byId("reductionBudget").value);
  const target = Math.floor(budget * 100 / state.settings.priceCents);
  if (!Number.isFinite(budget) || budget <= 0 || target < 1) return setStatus("El presupuesto debe cubrir al menos una apuesta.", "error");
  const source = round.unreducedBets?.length ? round.unreducedBets : round.bets.slice();
  if (target >= source.length) return setStatus("El presupuesto ya cubre todo el desarrollo (" + source.length + " apuestas).", "error");
  if (source.length > E.MAX_GENERATED) return setStatus("El desarrollo supera el límite de reducción local.", "error");
  const probs = selectedProbabilities();
  const rows = probs || Array.from({length:14},()=>[33.34,33.33,33.33]);
  const unique = [...new Set(source)];
  const ranked = unique.map((bet) => ({ bet, score: bet.slice(0,14).split("").reduce((sum,s,i)=>sum+Math.log(Math.max(rows[i][["1","X","2"].indexOf(s)]/100,1e-12)),0) })).sort((a,b)=>b.score-a.score);
  const chosen = [ranked[0].bet], used = new Set([ranked[0].bet]);
  while (chosen.length < target && chosen.length < ranked.length) {
    let best = null, bestDistance = -1;
    for (const candidate of ranked) {
      if (used.has(candidate.bet)) continue;
      const distance = Math.min(...chosen.map((column) => [...column.slice(0,14)].reduce((n,s,i)=>n+(s!==candidate.bet[i]),0)));
      if (distance > bestDistance || (distance === bestDistance && best && candidate.score > best.score)) { best = candidate; bestDistance = distance; }
    }
    if (!best) break;
    chosen.push(best.bet); used.add(best.bet);
  }
  round.unreducedBets = source.slice(); round.bets = chosen;
  round.generatedAt = "Reducida · " + new Date().toLocaleTimeString("es-ES", {hour:"2-digit",minute:"2-digit"});
  save(); renderAll();
  byId("reductionInfo").textContent = "Reducida: " + chosen.length + " de " + source.length + " apuestas · " + money(chosen.length * state.settings.priceCents) + ". Selección diversificada con priorización probabilística; cobertura observada, sin garantía de acierto.";
  setStatus("Reducida creada. El desarrollo completo queda conservado para poder rehacerla.", "success");
}
function restoreFullDevelopment() {
  const round = current();
  if (!round.unreducedBets?.length) return setStatus("No hay una copia completa pendiente de restaurar.");
  round.bets = round.unreducedBets; delete round.unreducedBets;
  round.generatedAt = "Desarrollo completo restaurado";
  save(); renderAll();
  byId("reductionInfo").textContent = "Desarrollo completo restaurado: " + round.bets.length + " apuestas.";
}
function saveCurrentSystem() {
  const round = current();
  if (!round.bets?.length) return setStatus("Genera primero las apuestas para guardar un sistema.", "error");
  const name = (byId("systemName").value || ("Quiniela " + state.season + " J" + state.round)).trim().slice(0, 60);
  const system = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name,
    season: state.season, round: state.round, base: round.base.slice(), goals: round.goals.slice(),
    filters: JSON.parse(JSON.stringify(round.filters)), bets: round.bets.slice(),
    source: round.selectedSource, createdAt: new Date().toISOString() };
  state.systems.push(system);
  save(); renderSystems();
  setStatus("Sistema «" + name + "» guardado en este teléfono.", "success");
}
function openSystem(id) {
  const system = state.systems.find((item) => item.id === id);
  if (!system) return setStatus("No se encontró el sistema guardado.", "error");
  state.season = system.season; state.round = system.round;
  const round = current();
  round.base = system.base.slice(); round.goals = system.goals.slice();
  round.filters = JSON.parse(JSON.stringify(system.filters)); round.bets = system.bets.slice();
  round.generatedAt = "Sistema guardado"; round.selectedSource = system.source || "manual";
  save(); renderAll(); setTab("quiniela");
  setStatus("Sistema abierto · " + system.name + ".", "success");
}
function deleteSystem(id) {
  state.systems = state.systems.filter((system) => system.id !== id);
  save(); renderSystems(); setStatus("Sistema eliminado del teléfono.");
}
function filenameFor(system) { return "QuinielaAI-" + system.season + "_J" + String(system.round).padStart(2, "0") + ".txt"; }
function exportCurrentTxt() {
  const round = current();
  if (!round.bets?.length) return setStatus("No hay apuestas generadas para exportar.", "error");
  const text = round.bets.join("\n") + "\n";
  Android.saveText(filenameFor({ season: state.season, round: state.round }), text);
  setStatus(round.bets.length.toLocaleString("es-ES") + " apuestas guardadas en Descargas/QuinielaAIStudio.", "success");
}
function exportSystem(id) {
  const system = state.systems.find((item) => item.id === id);
  if (!system) return;
  Android.saveText(filenameFor(system), system.bets.join("\n") + "\n");
  setStatus("TXT guardado en Descargas/QuinielaAIStudio.", "success");
}
function updatePrice() {
  const amount = Number(byId("priceInput").value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10) {
    byId("priceInput").value = (state.settings.priceCents / 100).toFixed(2);
    return setStatus("El precio debe ser mayor que 0 y no superar 10 €.", "error");
  }
  state.settings.priceCents = Math.round(amount * 100);
  save(); renderAll(); setStatus("Precio actualizado para los cálculos de coste.", "success");
}

restore();
if (state.data && state.season && state.round) current();
renderAll();
if (state.data) setStatus("Datos locales " + (state.updatedAt ? new Date(state.updatedAt).toLocaleString("es-ES") : "guardados") + ". Puedes trabajar sin conexión.", "success");
