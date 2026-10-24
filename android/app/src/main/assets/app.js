"use strict";
const E = EscrutinioEngine;
const LIVE_URL = "https://static.dataradar.es/marcador/json/partidos.json";
const STORAGE_KEY = "quinielaEscrutinioV1";
let state = { data: null, season: "", round: 0, bets: {}, live: {}, updated: "" };
let matchRows = [], busy = false, liveBusy = false, requestId = 0;
const requests = new Map();
const byId = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}
function roundKey() { return state.season + ":" + state.round; }
function currentBets() { return state.bets[roundKey()] || { name: "", bets: [] }; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (_error) { setStatus("No se pudo guardar el estado local del teléfono.", "error"); }
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") state = { ...state, ...saved };
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
function setBusy(value, text = "Actualizando resultados…") {
  busy = value;
  byId("loadingText").textContent = text;
  byId("loading").classList.toggle("hidden", !value);
  byId("updateButton").disabled = value;
  byId("importButton").disabled = value;
  byId("refreshButton").disabled = value || !state.data;
  renderSelectors();
}
function setStatus(text, kind = "") {
  const status = byId("status");
  status.textContent = text;
  status.className = "status" + (kind ? " " + kind : "");
}
function seasonList() {
  return Object.keys(state.data || {}).filter((key) => /^FEC\d{2}-\d{2}\.TXT$/.test(key))
    .map((key) => key.slice(3, 8)).sort().reverse();
}
function fixture(round) {
  const line = E.roundLine(state.data?.["PRE" + state.season + ".TXT"], round);
  const block = line.slice(119, 209);
  const names = E.parseNames(state.data?.["WEQUIPOS.TXT"]);
  const hours = E.parseHours(state.data?.["HOR" + state.season + ".TXT"], round);
  return Array.from({ length: 15 }, (_, index) => {
    const homeCode = block.slice(index * 6, index * 6 + 3);
    const awayCode = block.slice(index * 6 + 3, index * 6 + 6);
    return { number: index + 1, home: names[homeCode] || homeCode,
      away: names[awayCode] || awayCode, kick: E.formatKickoff(hours[index] || "") };
  });
}
function selectedOfficial() {
  if (!state.data || !state.season || !state.round) return null;
  return E.scrutiny(E.roundLine(state.data["PRE" + state.season + ".TXT"], state.round));
}
function renderSelectors() {
  const seasons = seasonList();
  const season = byId("seasonSelect"), round = byId("roundSelect");
  const previousSeason = season.value;
  season.innerHTML = seasons.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  season.value = seasons.includes(state.season) ? state.season : (seasons[0] || "");
  const rounds = state.data ? E.availableRounds(state.data, season.value) : [];
  round.innerHTML = rounds.map(({ round: number }) => `<option value="${number}">Jornada ${number}</option>`).join("");
  round.value = rounds.some((entry) => entry.round === +state.round) ? String(state.round) : (rounds.at(-1)?.round ? String(rounds.at(-1).round) : "");
  const ready = !busy && !!state.data && !!season.value && rounds.length > 0;
  season.disabled = !ready;
  round.disabled = !ready;
  byId("currentButton").disabled = !ready;
  byId("refreshButton").disabled = !ready;
  if (previousSeason !== season.value && ready) {
    state.season = season.value;
    state.round = +round.value;
  }
}
function loadSelectedRound() {
  if (!state.data || !state.season || !state.round) { matchRows = []; return; }
  matchRows = fixture(state.round);
  save();
  render();
}
function changeSeason(season) {
  if (!state.data || !season) return;
  state.season = season;
  const current = season === state.data.season ? E.currentRound(state.data, season) : 0;
  const rounds = E.availableRounds(state.data, season);
  state.round = current || rounds.at(-1)?.round || 0;
  loadSelectedRound();
  setStatus("Consulta " + season + " · jornada " + state.round + ". Las apuestas se guardan por sorteo.");
  refreshResults(true);
}
function changeRound(round) {
  if (!round) return;
  state.round = +round;
  loadSelectedRound();
  setStatus("Consulta " + state.season + " · jornada " + state.round + ".");
  refreshResults(true);
}
function goCurrentRound() {
  if (!state.data) return;
  state.season = state.data.season;
  state.round = E.currentRound(state.data, state.season);
  renderSelectors();
  loadSelectedRound();
  setStatus("Jornada en curso · " + state.season + " · J" + state.round + ".");
  refreshResults(true);
}
byId("seasonSelect").addEventListener("change", (event) => changeSeason(event.target.value));
byId("roundSelect").addEventListener("change", (event) => changeRound(event.target.value));

async function updateData() {
  if (busy) return;
  const wasCurrent = state.data && state.season === state.data.season &&
    state.round === E.currentRound(state.data, state.data.season);
  setBusy(true, "Descargando calendario y escrutinios…");
  try {
    const data = JSON.parse(await api("winData"));
    if (!data.season || !data["PRE" + data.season + ".TXT"] || !data["FEC" + data.season + ".TXT"])
      throw Error("El paquete no contiene calendario y escrutinio de la temporada actual.");
    state.data = data;
    const seasons = seasonList();
    if (!seasons.includes(state.season) || wasCurrent) {
      state.season = data.season;
      state.round = E.currentRound(data, data.season);
    } else if (!E.availableRounds(data, state.season).some((row) => row.round === +state.round)) {
      state.round = E.availableRounds(data, state.season).at(-1)?.round || 0;
    }
    state.updated = new Date().toLocaleString("es-ES");
    loadSelectedRound();
    renderSelectors();
    save();
    setStatus("Datos actualizados " + state.updated + ". Puedes consultar sin conexión.", "success");
  } catch (error) {
    setStatus("No se pudieron actualizar los datos. " + error.message + (state.data ? " Se conservan los datos guardados." : ""), "error");
  } finally {
    setBusy(false);
    render();
    if (state.data) refreshResults(true);
  }
}

function normalizeTeam(value) {
  let key = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  key = key.replace(/WF$/, "F").replace(/F$/, "");
  const aliases = {
    ATHCLUBBILBAO: "ATHCLUB", ATHLETICCLUB: "ATHCLUB", ATHLETICBILBAO: "ATHCLUB",
    ATLETICOMADRID: "ATMADRID", ATLETICODEMADRID: "ATMADRID", RAYOVALLECANO: "RAYO",
    REALSOCIEDAD: "RSOCIEDAD", REALOVIEDO: "ROVIEDO", REALMADRID: "RMADRID",
    RACINGSANTANDER: "RACINGS", DEPORTIVOCORUNA: "DEPORTIVO", DEPORTIVOLACORUNA: "DEPORTIVO",
    MANCHUNITED: "MANUNITED", MANCHESTERUNITED: "MANUNITED", MANCHESTCITY: "MANCITY",
    MANCHESTERCITY: "MANCITY", SHAKTARDONETSK: "SHAKHTARDONETSK", RBLEIPZIG: "LEIPZIG",
  };
  return aliases[key] || key;
}
function validateLiveRows(rows) {
  if (rows.length !== 15 || rows.some((row, index) => +row.orden !== index + 1))
    throw Error("No hay un marcador publicado para " + state.season + " · J" + state.round + ". Revisa la jornada o inténtalo más tarde.");
  rows.forEach((row, index) => {
    const expected = matchRows[index];
    if (normalizeTeam(row.local) !== normalizeTeam(expected.home) || normalizeTeam(row.visitante) !== normalizeTeam(expected.away))
      throw Error("Los equipos del marcador no coinciden en el partido " + (index + 1) + ". No se han mezclado resultados.");
  });
  return rows.map(E.live);
}
function officialRows(official) {
  return matchRows.map((match, index) => ({ orden: index + 1, local: match.home,
    visitante: match.away, score: "Final", sign: index < 14 ? official.result[index] : "",
    pleno: index === 14 ? official.pleno : "", final: true, status: "Escrutinio definitivo" }));
}
function resultRows() {
  const official = selectedOfficial();
  return official ? officialRows(official) : (state.live[roundKey()]?.rows || []);
}
async function refreshResults(silent = false) {
  if (busy || liveBusy || !state.data || !state.round) return;
  const official = selectedOfficial();
  if (official) {
    render();
    setStatus("Escrutinio definitivo disponible · " + state.season + " · J" + state.round + ".", "success");
    return;
  }
  const key = roundKey();
  liveBusy = true;
  if (!silent) setStatus("Consultando marcadores de J" + state.round + "…");
  try {
    const year = 2000 + Number(state.season.slice(-2));
    const raw = await api("text", LIVE_URL + "?r=" + Date.now());
    if (key !== roundKey()) return;
    const candidates = JSON.parse(raw).filter((row) => +row.temporada === year && +row.jornada === +state.round)
      .sort((a, b) => +a.orden - +b.orden);
    const rows = validateLiveRows(candidates);
    state.live[key] = { capturedAt: new Date().toISOString(), rows };
    save();
    const finalCount = rows.slice(0, 14).filter((row) => row.final).length;
    setStatus("Marcadores recibidos · " + finalCount + "/14 partidos finalizados · " + new Date().toLocaleTimeString("es-ES") + ".", "success");
  } catch (error) {
    if (key !== roundKey()) return;
    const cached = state.live[key];
    setStatus(cached
      ? "No se pudo renovar el marcador. Se muestran los datos guardados de " + new Date(cached.capturedAt).toLocaleString("es-ES") + ". " + error.message
      : error.message.startsWith("No hay un marcador publicado") ? error.message
        : "Todavía no hay marcadores disponibles para esta jornada. " + error.message,
    cached ? "" : "error");
  } finally {
    liveBusy = false;
    render();
    if (key !== roundKey() && state.data) setTimeout(() => refreshResults(true), 0);
  }
}

function parseTicketContext(filename) {
  const name = String(filename || "");
  let match = name.match(/(\d{2}-\d{2}).{0,32}?J(?:ornada)?[_ -]?0?(\d+)/i);
  if (match) return { season: match[1], round: +match[2] };
  match = name.match(/J(?:ornada)?[_ -]?0?(\d+).*?(\d{2}-\d{2})/i);
  return match ? { season: match[2], round: +match[1] } : null;
}
window.onImportedText = (text, filename) => {
  if (!state.data || !state.round) {
    setStatus("Actualiza primero los datos para asociar el TXT a una temporada y jornada.", "error");
    return;
  }
  const bets = String(text).split(/\r?\n/).map((line) => line.trim().toUpperCase().replace(/\s/g, "")).filter(Boolean);
  if (!bets.length || bets.some((bet) => !/^[1X2]{14}([012M]{2})?$/.test(bet))) {
    setStatus("TXT no válido: cada línea debe tener 14 signos 1/X/2 y, opcionalmente, dos goles de Pleno 0/1/2/M.", "error");
    return;
  }
  const context = parseTicketContext(filename);
  if (context) {
    if (!seasonList().includes(context.season) || !E.availableRounds(state.data, context.season).some((row) => row.round === context.round)) {
      setStatus("El TXT indica " + context.season + " · J" + context.round + ", pero esa jornada no está en los datos descargados.", "error");
      return;
    }
    state.season = context.season;
    state.round = context.round;
    loadSelectedRound();
  }
  state.bets[roundKey()] = { name: filename || "Apuestas TXT", bets };
  save();
  renderSelectors();
  render();
  setStatus(bets.length + " apuestas importadas para " + state.season + " · J" + state.round + ".", "success");
  refreshResults(true);
};

function formatMoney(cents) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function renderPrize(official, bets) {
  const container = byId("prizes");
  if (!official) {
    container.innerHTML = '<div class="prize-placeholder">El reparto de premios aún no aparece en los datos de esta jornada. Con marcadores provisionales solo mostramos aciertos confirmados.</div>';
    return;
  }
  const breakdown = E.awardBreakdown(bets, official);
  container.innerHTML = '<div class="prize-placeholder">Jornada ' + state.round + ' · Resultado ' + escapeHtml(official.result) + ' · Pleno ' + escapeHtml(official.pleno.split("").join("–")) + '</div>' +
    '<div class="prize-table"><div class="prize-head"><span>Categoría</span><span>Tuyas</span><span>€/apuesta</span><span>Subtotal</span></div>' +
    breakdown.rows.map((row) => '<div class="prize-row"><span>' + (row.category === 15 ? "Pleno al 15" : row.category + " aciertos") + '</span><span>' + row.mine + ' / ' + row.winners + '</span><span>' + formatMoney(row.amountCents) + '</span><b>' + formatMoney(row.subtotalCents) + '</b></div>').join("") +
    '</div><div class="prize-total"><span>Premio calculado</span><strong>' + formatMoney(breakdown.totalCents) + '</strong></div>';
}
function renderMatches(rows, bets, results) {
  if (!matchRows.length) {
    byId("matches").innerHTML = '<div class="empty">Los partidos aparecerán al actualizar los datos.</div>';
    byId("matchProgress").textContent = "0/14";
    return;
  }
  const best = bets.length ? E.evaluate(bets, results)[0] : null;
  const known = results.slice(0, 14).filter((row) => row.sign).length;
  byId("matchProgress").textContent = known + "/14";
  byId("matches").innerHTML = matchRows.map((match, index) => {
    const result = results[index] || {};
    const betSign = best?.bet[index] || "";
    const ownHit = !!(index < 14 && result.sign && betSign && betSign === result.sign);
    const ownResult = index < 14 && result.sign && betSign ?
      '<small class="hit-mark ' + (ownHit ? "ok" : "no") + '">' + (ownHit ? "✓ Acierto de la mejor apuesta" : "× No acierta la mejor apuesta") + '</small>' : "";
    const p15Hit = !!(best && best.bet.length === 16 && best.hits === 14 && best.bet.slice(14) === result.pleno);
    const p15 = index === 14 && best && best.bet.length === 16 && result.pleno ?
      '<small class="hit-mark ' + (p15Hit ? "ok" : "no") + '">' + (p15Hit ? "✓ Pleno acertado" : "× Pleno distinto") + '</small>' : "";
    const kick = match.kick.replace(/\s+/g, " ").trim();
    return '<article class="match ' + (result.final ? "final" : result.sign ? "" : "pending") + '"><span class="match-number">' + String(index + 1).padStart(2, "0") + '</span><span class="teams"><strong>' + escapeHtml(match.home) + ' – ' + escapeHtml(match.away) + '</strong><small>' + escapeHtml(result.status || kick || "Sin horario") + '</small></span><span class="score">' + escapeHtml(result.score || "—") + '</span><span class="sign">' + escapeHtml(index === 14 ? (result.pleno || "P15") : (result.sign || "—")) + '</span>' + ownResult + p15 + '</article>';
  }).join("");
}
function render() {
  renderSelectors();
  const selected = currentBets();
  const bets = selected.bets || [];
  const official = selectedOfficial();
  const results = resultRows();
  const evaluated = bets.length && results.length ? E.evaluate(bets, results) : [];
  const best = evaluated[0];
  byId("betCaption").textContent = bets.length ? (selected.name || "APUESTAS TXT") : "APUESTAS";
  byId("hitSummary").textContent = !bets.length ? "Importa un TXT para consultar tus aciertos" : !results.length ? bets.length + " apuestas · esperando resultados" :
    best.hits + "/" + results.slice(0, 14).filter((row) => row.sign).length + " aciertos actuales";
  byId("hitDetail").textContent = !bets.length ? "Cada apuesta queda asociada a su temporada y jornada." : !results.length ? "Los resultados se actualizarán cuando el proveedor los publique." :
    best.confirmed + " confirmados · máximo " + best.maximum + " · " + bets.length + " apuestas" + (official ? " · escrutinio definitivo" : " · puede cambiar");
  if (official) byId("hitSummary").textContent = best ? best.hits + "/14 aciertos · " + formatMoney(E.awardBreakdown(bets, official).totalCents) : "Escrutinio definitivo disponible";
  byId("prizeCard").classList.toggle("official", !!official);
  renderMatches(matchRows, bets, results);
  renderPrize(official, bets);
}

restore();
renderSelectors();
if (state.data && state.season && state.round && E.availableRounds(state.data, state.season).some((row) => row.round === +state.round)) {
  loadSelectedRound();
  setStatus("Datos guardados " + (state.updated || "") + ". Puedes consultar sin conexión.", "success");
  render();
  refreshResults(true);
} else render();
