"use strict";

const SCRUTINY_LIVE_URL = "https://static.dataradar.es/marcador/json/partidos.json";
const SCRUTINY_ESTIMATE_URL = "https://www.eduardolosilla.es/quiniela/ayudas/estimacion?jornada=";

function scrutinyKey() { return state.season + ":" + state.round; }
function scrutinyState() {
  if (!state.scrutinyBets || typeof state.scrutinyBets !== "object") state.scrutinyBets = {};
  if (!state.scrutinyLive || typeof state.scrutinyLive !== "object") state.scrutinyLive = {};
  if (!state.scrutinyEstimates || typeof state.scrutinyEstimates !== "object") state.scrutinyEstimates = {};
  return { bets: state.scrutinyBets, live: state.scrutinyLive, estimates: state.scrutinyEstimates };
}
function scrutinyStatus(message, kind = "") {
  const el = byId("scrutinyStatus");
  if (!el) return;
  el.textContent = message;
  el.className = "help-text" + (kind ? " " + kind : "");
}
function scrutinyOfficial() {
  if (!state.data || !state.season || !state.round) return null;
  return E.scrutiny(E.roundLine(state.data["PRE" + state.season + ".TXT"], state.round));
}
function scrutinyResults() {
  const official = scrutinyOfficial();
  const matches = fixture(state.round, state.season);
  if (official) return matches.map((match, index) => ({
    orden: index + 1, local: match.home, visitante: match.away, score: "Final",
    sign: index < 14 ? official.result[index] : "", pleno: index === 14 ? official.pleno : "",
    final: true, status: "Escrutinio definitivo",
  }));
  return scrutinyState().live[scrutinyKey()]?.rows || [];
}
function scrutinyNormalizeTeam(value) {
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
function scrutinyValidateLiveRows(rows) {
  const matches = fixture(state.round, state.season);
  if (rows.length !== 15 || rows.some((row, index) => +row.orden !== index + 1))
    throw Error("No hay marcadores publicados para esta jornada.");
  return rows.map((row, index) => {
    const match = matches[index];
    const sameHome = E.sameTeamName ? E.sameTeamName(row.local, match.home) : scrutinyNormalizeTeam(row.local) === scrutinyNormalizeTeam(match.home);
    const sameAway = E.sameTeamName ? E.sameTeamName(row.visitante, match.away) : scrutinyNormalizeTeam(row.visitante) === scrutinyNormalizeTeam(match.away);
    if (!sameHome || !sameAway) return {
      orden: index + 1, local: match.home, visitante: match.away, score: "—",
      sign: "", pleno: "", final: false, status: "Equipos distintos · marcador descartado",
    };
    return E.live(row);
  });
}
function scrutinyFormatMoney(cents) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function renderScrutiny() {
  scrutinyState();
  const seasonSelect = byId("scrutinySeason"), roundSelect = byId("scrutinyRound");
  const seasons = Object.keys(state.data || {}).filter((key) => /^FEC\d{2}-\d{2}\.TXT$/.test(key))
    .map((key) => key.slice(3, 8)).sort().reverse();
  seasonSelect.innerHTML = seasons.map((season) => '<option value="' + escapeHtml(season) + '">' + escapeHtml(season) + "</option>").join("");
  seasonSelect.value = seasons.includes(state.season) ? state.season : (seasons[0] || "");
  const rounds = state.data && seasonSelect.value ? E.availableRounds(state.data, seasonSelect.value) : [];
  roundSelect.innerHTML = rounds.map(({ round }) => '<option value="' + round + '">Jornada ' + round + "</option>").join("");
  roundSelect.value = rounds.some(({ round }) => round === +state.round) ? String(state.round) : (rounds.at(-1)?.round ? String(rounds.at(-1).round) : "");
  seasonSelect.disabled = !state.data || !seasons.length;
  roundSelect.disabled = !state.data || !rounds.length;

  const matches = fixture(state.round, state.season);
  const results = scrutinyResults();
  const official = scrutinyOfficial();
  const saved = scrutinyState().bets[scrutinyKey()] || { name: "", bets: [] };
  const bets = Array.isArray(saved.bets) ? saved.bets : [];
  const evaluated = bets.length && results.length ? E.evaluate(bets, results) : [];
  const best = evaluated[0];
  const known = results.slice(0, 14).filter((row) => row.sign).length;
  const finalized = results.slice(0, 14).filter((row) => row.final && row.sign).length;
  const confirmedHits = best?.confirmed || 0;
  const confirmedMisses = best ? finalized - best.confirmed : 0;
  const provisionalHits = best ? Math.max(0, best.hits - best.confirmed) : 0;
  byId("scrutinyHits").textContent = best ? confirmedHits + (provisionalHits ? " + " + provisionalHits + "*" : "") : "—";
  byId("scrutinyMisses").textContent = best ? String(confirmedMisses) : "—";
  byId("scrutinyPending").textContent = String(14 - finalized);
  byId("scrutinyBetCaption").textContent = bets.length ? (saved.name || bets.length + " APUESTAS") : "TUS APUESTAS";
  const prize = official && bets.length ? E.awardBreakdown(bets, official) : null;

  byId("scrutinyProgress").textContent = known + "/14";
  byId("scrutinySummary").textContent = !state.data
    ? "Descarga los datos desde Ajustes para empezar."
    : !bets.length ? "Importa un TXT o usa el desarrollo actual."
      : !known ? bets.length + " apuestas · esperando resultados"
        : official ? (best ? best.hits + "/14 aciertos · " + scrutinyFormatMoney(prize.totalCents) : "Escrutinio definitivo disponible")
          : best.hits + "/14 aciertos actuales · mejor apuesta";
  byId("scrutinyDetail").textContent = !bets.length
    ? (saved.name || "Las apuestas se guardan por temporada y jornada.")
    : official ? bets.length + " apuestas · escrutinio definitivo · " + (saved.name || "TXT importado")
      : best ? confirmedHits + " aciertos confirmados · " + confirmedMisses + " fallos confirmados · " + (14 - finalized) + " pendientes · " + bets.length + " apuestas · * acierto provisional"
        : bets.length + " apuestas guardadas para " + state.season + " · J" + state.round;

  if (!matches.length) {
    byId("scrutinyMatches").innerHTML = '<div class="empty">Actualiza los datos de WIN1X2 para consultar los partidos.</div>';
  } else {
    byId("scrutinyMatches").innerHTML = matches.map((match, index) => {
      const result = results[index] || {};
      const betSign = best?.bet[index] || "";
      const hit = index < 14 && result.sign && betSign && result.sign === betSign;
      const own = index < 14 && result.sign && betSign
        ? '<small class="hit-mark ' + (hit ? "ok" : "no") + '">' + (hit ? "✓ Acierto de la mejor apuesta" : "× No acierta la mejor apuesta") + "</small>" : "";
      const plenoHit = !!(best && best.bet.length === 16 && best.hits === 14 && best.bet.slice(14) === result.pleno);
      const pleno = index === 14 && best && best.bet.length === 16 && result.pleno
        ? '<small class="hit-mark ' + (plenoHit ? "ok" : "no") + '">' + (plenoHit ? "✓ Pleno acertado" : "× Pleno distinto") + "</small>" : "";
      return '<article class="match ' + (result.final ? "final" : result.sign ? "" : "pending") + '"><span class="match-number">' + String(index + 1).padStart(2, "0") +
        '</span><span class="teams"><strong>' + escapeHtml(match.home) + " – " + escapeHtml(match.away) + '</strong><small>' +
        escapeHtml(result.status || match.kick || "Pendiente") + '</small></span><span class="score">' + escapeHtml(result.score || "—") +
        '</span><span class="sign">' + escapeHtml(index === 14 ? (result.pleno || "P15") : (result.sign || "—")) + "</span>" + own + pleno + "</article>";
    }).join("");
  }

  if (!official) {
    byId("scrutinyPrizes").innerHTML = '<div class="prize-placeholder">El reparto solo se muestra cuando WIN1X2 publica el escrutinio definitivo. Los marcadores provisionales no permiten calcular premios.</div>';
  } else if (!bets.length) {
    byId("scrutinyPrizes").innerHTML = '<div class="prize-placeholder">Escrutinio definitivo disponible · resultado ' + escapeHtml(official.result) +
      ' · Pleno ' + escapeHtml(official.pleno.split("").join("–")) + '. Importa tus apuestas para calcular el premio.</div>';
  } else {
    const breakdown = prize;
    byId("scrutinyPrizes").innerHTML = '<div class="prize-placeholder">Jornada ' + state.round + " · Resultado " + escapeHtml(official.result) +
      " · Pleno " + escapeHtml(official.pleno.split("").join("–")) + '</div><div class="prize-table"><div class="prize-head"><span>Categoría</span><span>Tuyas</span><span>€/apuesta</span><span>Subtotal</span></div>' +
      breakdown.rows.map((row) => '<div class="prize-row"><span>' + (row.category === 15 ? "Pleno al 15" : row.category + " aciertos") + "</span><span>" + row.mine + " / " + row.winners +
        "</span><span>" + scrutinyFormatMoney(row.amountCents) + "</span><b>" + scrutinyFormatMoney(row.subtotalCents) + "</b></div>").join("") +
      '</div><div class="prize-total"><span>Premio calculado</span><strong>' + scrutinyFormatMoney(breakdown.totalCents) + "</strong></div>";
  }
  renderScrutinyEstimate(bets, results, official);
}
window.renderScrutiny = renderScrutiny;

function scrutinyParseLocaleNumber(value) {
  const parsed = Number(String(value || "0").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function scrutinyEstimatePayload(html) {
  const embedded = String(html).match(/<script id="eduardo-losilla-state" type="application\/json">([\s\S]*?)<\/script>/i);
  if (!embedded) throw Error("La fuente de estimación no devolvió sus datos de jornada.");
  const transfer = JSON.parse(embedded[1].replace(/&q;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
  const year = 2000 + Number(state.season.slice(-2));
  const round = transfer["jornada_" + state.round + "_" + year];
  const probability = transfer["probabilidades_" + state.round + "_" + year];
  if (!round || +round.jornada !== +state.round || +round.temporada !== year || !probability)
    throw Error("Quinielista todavía no ofrece datos de estimación para " + state.season + " · J" + state.round + ".");
  const played = probability.partidos?.quinielista || [];
  const market = probability.partidos?.real || [];
  if (played.length < 15) throw Error("Faltan porcentajes jugados para calcular la estimación.");
  const toOdds = (row) => {
    const values = [row.porc_1_dec ?? row.porc_1, row.porc_X_dec ?? row.porc_X, row.porc_2_dec ?? row.porc_2].map(Number);
    const sum = values.reduce((total, value) => total + value, 0);
    if (!sum || values.some((value) => !Number.isFinite(value) || value < 0)) throw Error("Los porcentajes de la fuente no son válidos.");
    return values.map((value) => value / sum);
  };
  const pleno = played[14];
  const goalShare = (side, goals) => Number(pleno["porc_15" + side + "_" + goals + "_dec"] ?? pleno["porc_15" + side + "_" + goals] ?? 0) / 100;
  const home = ["0", "1", "2", "M"].map((goal) => goalShare("L", goal));
  const away = ["0", "1", "2", "M"].map((goal) => goalShare("V", goal));
  return {
    revenueCents: Math.round(scrutinyParseLocaleNumber(round.recaudacion) * 100),
    boteCents: Math.round(scrutinyParseLocaleNumber(round.boteEstimacion || round.textoBote) * 100),
    ticketCents: Math.round(Number(round.costeApuesta || 0.75) * 100),
    public: played.slice(0, 14).map(toOdds), market: market.length >= 14 ? market.slice(0, 14).map(toOdds) : null,
    plenoHome: home, plenoAway: away, capturedAt: new Date().toISOString(),
  };
}
let scrutinyEstimateBusy = false;
async function scrutinyUpdateEstimate(force = false) {
  if (!state.data || !state.season || !state.round) return;
  const key = scrutinyKey();
  if (scrutinyOfficial()) return renderScrutiny();
  const cached = scrutinyState().estimates[key];
  if (scrutinyEstimateBusy || (!force && cached && Date.now() - Date.parse(cached.capturedAt) < 10 * 60 * 1000)) return;
  scrutinyEstimateBusy = true;
  const target = byId("scrutinyEstimate");
  if (!cached) target.innerHTML = '<div class="empty">Calculando estimación orientativa…</div>';
  try {
    const html = await api("text", SCRUTINY_ESTIMATE_URL + state.round + "&temporada=" + (2000 + Number(state.season.slice(-2))));
    if (key !== scrutinyKey()) return;
    scrutinyState().estimates[key] = scrutinyEstimatePayload(html);
    save(); renderScrutiny();
  } catch (error) {
    if (key === scrutinyKey() && !cached) target.innerHTML = '<div class="empty">No hay estimación disponible en este momento. ' + escapeHtml(error.message) + '</div>';
  } finally { scrutinyEstimateBusy = false; }
}
window.scrutinyUpdateEstimate = scrutinyUpdateEstimate;
function renderScrutinyEstimate(bets, results, official) {
  const card = document.querySelector(".scrutiny-estimate");
  const target = byId("scrutinyEstimate");
  card.hidden = !!official;
  if (official) return;
  if (!bets.length) {
    target.innerHTML = '<div class="empty">Importa tus apuestas o usa el desarrollo actual para estimar los premios.</div>';
    return;
  }
  const model = scrutinyState().estimates[scrutinyKey()];
  if (!model) return;
  if (!(model.revenueCents > 0) || !(model.ticketCents > 0) || !model.public?.length) {
    target.innerHTML = '<div class="empty">La fuente todavía no ha publicado recaudación o porcentajes suficientes.</div>';
    return;
  }
  const data = model.market || model.public;
  const signs = Array.from({ length: 14 }, (_, index) => {
    if (results[index]?.sign) return results[index].sign;
    const favorites = data[index];
    return ["1", "X", "2"][favorites.indexOf(Math.max(...favorites))];
  });
  const plenoResult = results[14]?.pleno || (() => {
    let max = -1, selected = "00";
    for (let home = 0; home < 4; home++) for (let away = 0; away < 4; away++) {
      const probability = (model.plenoHome[home] || 0) * (model.plenoAway[away] || 0);
      if (probability > max) { max = probability; selected = "012M"[home] + "012M"[away]; }
    }
    return selected;
  })();
  const dist = Array(15).fill(0); dist[0] = 1;
  signs.forEach((sign, index) => {
    const hitProbability = model.public[index][["1", "X", "2"].indexOf(sign)];
    for (let hits = index + 1; hits >= 0; hits--)
      dist[hits] = (dist[hits] || 0) * (1 - hitProbability) + (hits ? dist[hits - 1] * hitProbability : 0);
  });
  const entryCount = model.revenueCents / model.ticketCents;
  const pools = { 15: model.revenueCents * 0.075 + model.boteCents, 14: model.revenueCents * 0.16,
    13: model.revenueCents * 0.075, 12: model.revenueCents * 0.075, 11: model.revenueCents * 0.075, 10: model.revenueCents * 0.09 };
  const plenoProbability = (model.plenoHome["012M".indexOf(plenoResult[0])] || 0) * (model.plenoAway["012M".indexOf(plenoResult[1])] || 0);
  const expected = {};
  for (let category = 10; category <= 14; category++) expected[category] = entryCount * dist[category];
  expected[15] = expected[14] * plenoProbability;
  const payout = {};
  for (let category = 10; category <= 14; category++) payout[category] = expected[category] > 0 ? Math.min(pools[category], pools[category] / expected[category]) : 0;
  payout[15] = expected[15] > 0 ? Math.min(pools[15], pools[15] / expected[15]) + pools[14] / Math.max(1, expected[14]) : 0;
  const scenarioRows = signs.map((sign, index) => ({ orden: index + 1, sign, final: true }));
  scenarioRows.push({ orden: 15, pleno: plenoResult, final: true });
  const scenario = E.evaluate(bets, scenarioRows);
  const own = Object.fromEntries([10, 11, 12, 13, 14, 15].map((category) => [category, 0]));
  scenario.forEach((entry) => {
    if (entry.hits >= 10) {
      if (entry.hits === 14 && entry.bet.length === 16 && entry.bet.slice(14) === plenoResult) own[15]++;
      else own[entry.hits]++;
    }
  });
  let totalCents = 0;
  const prizeRows = [15, 14, 13, 12, 11, 10].map((category) => {
    const unit = Math.round(payout[category] || 0), subtotal = unit * own[category]; totalCents += subtotal;
    return '<div class="prize-row"><span>' + (category === 15 ? "Pleno al 15" : category + " aciertos") + '</span><span>' + own[category] + '</span><span>' + (unit ? scrutinyFormatMoney(unit) : "—") + '</span><b>' + (subtotal ? scrutinyFormatMoney(subtotal) : "—") + '</b></div>';
  }).join("");
  const updated = new Date(model.capturedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  target.innerHTML = '<div class="prize-placeholder">Escenario: marcadores actuales y favoritos para partidos pendientes · datos ' + updated + '</div><div class="prize-table"><div class="prize-head"><span>Categoría</span><span>Tuyas</span><span>€/apuesta</span><span>Subtotal</span></div>' + prizeRows + '</div><div class="prize-total"><span>Estimación en este escenario</span><strong>' + scrutinyFormatMoney(totalCents) + '</strong></div>';
}

let scrutinyPollTimer = null;
function stopScrutinyPolling() {
  if (scrutinyPollTimer) clearInterval(scrutinyPollTimer);
  scrutinyPollTimer = null;
}
function startScrutinyPolling() {
  stopScrutinyPolling();
  if (document.visibilityState === "visible") { scrutinyRefresh(true); scrutinyUpdateEstimate(); }
  scrutinyPollTimer = setInterval(() => {
    if (document.visibilityState === "visible" && document.querySelector("#page-escrutinio.active")) {
      scrutinyRefresh(true); scrutinyUpdateEstimate();
    }
  }, 60000);
}
window.startScrutinyPolling = startScrutinyPolling;
window.stopScrutinyPolling = stopScrutinyPolling;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.querySelector("#page-escrutinio.active")) {
    scrutinyRefresh(true); scrutinyUpdateEstimate();
  }
});

function scrutinyChangeSeason(season) {
  if (!state.data || !season) return;
  state.season = season;
  const rounds = E.availableRounds(state.data, season);
  state.round = season === state.data.season ? E.currentRound(state.data, season) : (rounds.at(-1)?.round || 0);
  save(); renderAll(); renderScrutiny(); scrutinyRefresh(true); scrutinyUpdateEstimate();
}
function scrutinyChangeRound(round) {
  if (!round) return;
  state.round = Number(round);
  save(); renderAll(); renderScrutiny(); scrutinyRefresh(true); scrutinyUpdateEstimate();
}
function scrutinyGoCurrentRound() {
  if (!state.data) return scrutinyStatus("Descarga primero los datos de la jornada.", "error");
  state.season = state.data.season; state.round = E.currentRound(state.data, state.season);
  save(); renderAll(); renderScrutiny(); scrutinyRefresh(true); scrutinyUpdateEstimate();
}
async function scrutinyUpdateData() {
  await updateData();
  renderScrutiny(); scrutinyRefresh(true); scrutinyUpdateEstimate(true);
}
function scrutinyUseDevelopment() {
  if (!state.data || !state.round) return scrutinyStatus("Actualiza primero los datos de WIN1X2.", "error");
  const bets = current().bets || [];
  if (!bets.length) return scrutinyStatus("Todavía no hay un desarrollo generado para esta jornada.", "error");
  scrutinyState().bets[scrutinyKey()] = { name: "Desarrollo actual", bets: bets.slice(), importedAt: new Date().toISOString() };
  save(); renderScrutiny(); scrutinyStatus(bets.length + " apuestas añadidas al escrutinio de " + state.season + " · J" + state.round + ".", "success");
  scrutinyUpdateEstimate();
}
function scrutinyTicketContext(filename) {
  const name = String(filename || "");
  let match = name.match(/(\d{2}-\d{2}).{0,32}?J(?:ornada)?[_ -]?0?(\d+)/i);
  if (match) return { season: match[1], round: +match[2] };
  match = name.match(/J(?:ornada)?[_ -]?0?(\d+).*?(\d{2}-\d{2})/i);
  return match ? { season: match[2], round: +match[1] } : null;
}
window.onImportedText = (text, filename) => {
  if (!state.data || !state.round) return scrutinyStatus("Descarga primero los datos para asociar el TXT a una jornada.", "error");
  const bets = String(text).split(/\r?\n/).map((line) => line.trim().toUpperCase().replace(/\s/g, "")).filter(Boolean);
  if (!bets.length || bets.some((bet) => !/^[1X2]{14}([012M]{2})?$/.test(bet)))
    return scrutinyStatus("TXT no válido: cada línea debe llevar 14 signos 1/X/2 y, si juega el Pleno, dos goles 0/1/2/M.", "error");
  const context = scrutinyTicketContext(filename);
  if (context) {
    if (!Object.keys(state.data).includes("FEC" + context.season + ".TXT") ||
        !E.availableRounds(state.data, context.season).some((row) => row.round === context.round))
      return scrutinyStatus("El TXT indica " + context.season + " · J" + context.round + ", una jornada que no está en los datos.", "error");
    state.season = context.season; state.round = context.round;
  }
  scrutinyState().bets[scrutinyKey()] = { name: filename || "Apuestas TXT", bets, importedAt: new Date().toISOString() };
  save(); renderAll(); renderScrutiny();
  scrutinyStatus(bets.length + " apuestas importadas para " + state.season + " · J" + state.round + ".", "success");
  scrutinyRefresh(true);
  scrutinyUpdateEstimate();
};
async function scrutinyRefresh(silent = false) {
  if (!state.data || !state.round) return scrutinyStatus("Actualiza los datos de WIN1X2 para consultar esta jornada.");
  if (scrutinyOfficial()) {
    renderScrutiny();
    scrutinyStatus("Escrutinio definitivo disponible · " + state.season + " · J" + state.round + ".", "success");
    return;
  }
  const key = scrutinyKey();
  if (!silent) scrutinyStatus("Consultando marcadores de J" + state.round + "…");
  try {
    const year = 2000 + Number(state.season.slice(-2));
    const raw = await api("text", SCRUTINY_LIVE_URL + "?r=" + Date.now());
    if (key !== scrutinyKey()) return;
    const candidates = JSON.parse(raw).filter((row) => +row.temporada === year && +row.jornada === +state.round)
      .sort((a, b) => +a.orden - +b.orden);
    const rows = scrutinyValidateLiveRows(candidates);
    scrutinyState().live[key] = { capturedAt: new Date().toISOString(), rows };
    save(); renderScrutiny();
    const finalCount = rows.slice(0, 14).filter((row) => row.final).length;
    const rejected = rows.filter((row) => row.status === "Equipos distintos · marcador descartado").length;
    scrutinyStatus("Marcadores recibidos · " + finalCount + "/14 finalizados" + (rejected ? " · " + rejected + " partido(s) omitido(s) por no coincidir los equipos" : "") + " · " + new Date().toLocaleTimeString("es-ES") + ".", "success");
  } catch (error) {
    if (key !== scrutinyKey()) return;
    const cached = scrutinyState().live[key];
    scrutinyStatus(cached
      ? "No se pudo renovar el marcador. Se muestran los datos guardados de " + new Date(cached.capturedAt).toLocaleString("es-ES") + ". " + error.message
      : "Todavía no hay marcadores publicados para esta jornada. " + error.message, cached ? "" : "error");
  }
}
