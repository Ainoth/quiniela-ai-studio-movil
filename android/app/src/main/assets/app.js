"use strict";
const E = EscrutinioEngine;
const HISTORY = window.QuinielaHistory || { seasons: [], results: {} };
const STORAGE_KEY = "quinielaAiStudioMovilV1";
const PERCENTAGES_URL = "https://www.quinielista.es/xml2/porcentajes_completo.asp?jornada=";
const SECTIONS = ["quiniela", "condiciones", "reducciones", "analisis", "sistemas", "ajustes", "escrutinio"];
let state = {
  data: null, season: "", round: 0, currentRound: 0, updatedAt: "", source: "market",
  percentages: {}, rounds: {}, systems: [], settings: { priceCents: 75 },
};
let busy = false, requestId = 0;
let pendingProbabilityImport = false;
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
    generation: { mode: "automatic", doubles: 1, triples: 1, historicalTarget: 0.7 },
    historySeasons: HISTORY.seasons.slice(),
    differentiation: 0,
    surpriseLevel: 0,
    manualMatrix: null, savedMatrix: null, auxiliaryWeights: { classification: 0, form5: 0, history: 0 },
    reductionTable: 1, reductionPositions: null,
    locks: Array(14).fill(false),
    filters: { accountEnabled: false, minCounts: { "1": 0, X: 0, "2": 0, V: 0 },
      maxCounts: { "1": 14, X: 14, "2": 14, V: 14 }, streakEnabled: false, maxVariantRun: 14 },
    bets: [], generatedAt: "", selectedSource: "market",
  };
}
function roundKey(season = state.season, round = state.round) { return season + ":" + round; }
function current() {
  const key = roundKey();
  if (!state.rounds[key]) state.rounds[key] = newRoundState();
  const round=state.rounds[key];
  if(!round.generation)round.generation={mode:"automatic",doubles:1,triples:1,historicalTarget:0.7};
  if(!Number.isFinite(Number(round.generation.historicalTarget)))round.generation.historicalTarget=0.7;
  if(!Array.isArray(round.historySeasons))round.historySeasons=HISTORY.seasons.slice();
  if(!round.auxiliaryWeights)round.auxiliaryWeights={classification:0,form5:0,history:0};
  if(!Array.isArray(round.locks)||round.locks.length!==14)round.locks=Array(14).fill(false);
  if(!Number.isInteger(round.reductionTable))round.reductionTable=1;
  if(!Number.isInteger(round.differentiation))round.differentiation=0;
  if(!Number.isInteger(round.surpriseLevel))round.surpriseLevel=0;
  return round;
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
  const localSources = available.localSources || {};
  const localSelect = byId("localSourceSelect");
  const localEntries = Object.entries(localSources);
  byId("localSourceRow").hidden = !localEntries.length;
  localSelect.innerHTML = localEntries.map(([key,item])=>'<option value="local:'+escapeHtml(key)+'">'+escapeHtml(item.source+' · '+item.kind)+'</option>').join("");
  if(selected.startsWith("local:")) localSelect.value=selected;
  document.querySelectorAll("[data-source]").forEach((button) => {
    const source = button.dataset.source;
    button.classList.toggle("active", source === selected);
    button.disabled = source === "market" || source === "public" ? !available[source] : source === "matrix" ? !round.manualMatrix : false;
  });
  const localCapture=selected.startsWith("local:")?localSources[selected.slice(6)]?.capturedAt:null;
  const time = (localCapture||available.capturedAt) ? new Date(localCapture||available.capturedAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sin descargar";
  byId("sourceAge").textContent = time;
  byId("sourceNote").textContent = selected.startsWith("local:")
    ? (localSources[selected.slice(6)]?.source + " · fuente local importada y asociada a esta jornada.")
    : selected === "matrix" ? "Matriz editable local · puedes guardarla para esta temporada y jornada."
    : selected === "market"
    ? (available.market ? "Mercado · porcentajes deportivos publicados por Quinielista/Betfair. No es un modelo propio." : "Descarga los porcentajes de la jornada para usar el mercado. Puedes editar la base manualmente.")
    : selected === "public"
      ? (available.public ? "Popularidad · porcentaje de signos jugados publicado por Quinielista. No equivale a probabilidad deportiva." : "La popularidad no está descargada para esta jornada. Puedes editar la base manualmente.")
      : "Modo manual · marca tú los signos de cada partido. No se aplican porcentajes.";
}
function selectedProbabilities() {
  const source = current().selectedSource || state.source;
  if(source==="matrix")return current().manualMatrix||null;
  if(source.startsWith("local:"))return state.percentages[roundKey()]?.localSources?.[source.slice(6)]?.values||null;
  return state.percentages[roundKey()]?.[source] || null;
}
function effectiveProbabilities(){
  const level=current().differentiation||0;
  if(!level)return selectedProbabilities();
  const data=state.percentages[roundKey()]||{};
  if(!data.market||!data.public)throw Error("La diferenciación requiere datos de Mercado y Popularidad descargados para esta jornada.");
  return E.differentiateProbabilities(data.market,data.public,level);
}
function renderMatrixEditor() {
  const round=current(), values=round.manualMatrix||selectedProbabilities();
  const matches=fixture();
  byId("matrixEditor").innerHTML='<div class="matrix-row matrix-head"><b>Partido</b><b>1</b><b>X</b><b>2</b></div>'+Array.from({length:14},(_,i)=>'<div class="matrix-row"><span>'+String(i+1).padStart(2,"0")+' · '+escapeHtml((matches[i]?.home||"Local")+" – "+(matches[i]?.away||"Visitante"))+'</span>'+[0,1,2].map(j=>'<input type="number" min="0" max="100" step="0.01" aria-label="'+(i+1)+" "+["1","X","2"][j]+'" value="'+(values?Number(values[i][j]*100).toFixed(2):"")+'" onchange="editMatrix('+i+','+j+',this.value)">').join("")+'</div>').join("");
  const weights=current().auxiliaryWeights||{classification:0,form5:0,history:0};
  const locals=state.percentages[roundKey()]?.localSources||{};
  const labels={classification:"Clasificación",form5:"Últimas 5 jornadas",history:"Historial"};
  byId("auxiliaryWeights").innerHTML=Object.entries(labels).map(([kind,label])=>{
    const available=Object.values(locals).some(x=>x.kind===kind);
    return '<label>'+label+' <small>'+(available?"importada":"sin importar")+'</small><input type="number" min="0" max="100" value="'+(weights[kind]||0)+'" '+(available?"":"disabled")+' onchange="setAuxiliaryWeight(\''+kind+'\',this.value)"></label>';
  }).join("");
}
function renderReductionSetup() {
  const select=byId("reductionTable"),tables=window.QuinielaReductionTables||[];
  if(!tables.length)return;
  if(select.options.length!==tables.length)select.innerHTML=tables.map(t=>'<option value="'+t.number+'">Reducida '+t.number+' · '+t.widths.filter(w=>w===2).length+' dobles + '+t.widths.filter(w=>w===3).length+' triples · '+t.patterns.length+' columnas</option>').join("");
  const round=current();if(!round.reductionTable)round.reductionTable=1;select.value=String(round.reductionTable);
  byId("manualReductionPositions").checked=!!round.manualReductionPositions;
  const table=tables.find(t=>t.number===Number(select.value)),prob=selectedProbabilities();if(!table)return;
  const pairs=countPairs(),quantity=table.patterns.length*pairs;
  byId("officialReductionInfo").textContent='Base: '+(14-table.widths.length)+' fijos · '+table.widths.filter(w=>w===2).length+' dobles · '+table.widths.filter(w=>w===3).length+' triples. '+table.patterns.length+' patrones × '+pairs+' Pleno(s) = '+quantity+' apuestas · '+money(quantity*state.settings.priceCents)+'. Mínimo: '+table.minimumHits+' aciertos en los 14 signos si se acierta toda la base.';
  let template=null;try{if(prob)template=E.reducedTemplate(prob,table,byId("manualReductionPositions").checked?round.reductionPositions:null);}catch(_){}
  const manual=byId("manualReductionPositions").checked;
  if(manual&&!round.reductionPositions&&template)round.reductionPositions=template.selectedPositions.slice();
  byId("reductionPositions").innerHTML=manual?'<p class="help-text">Selecciona '+table.widths.length+' partidos. Los más inciertos entre ellos se asignan como dobles/triples.</p>'+fixture().slice(0,14).map((match,i)=>'<label class="position-chip"><input type="checkbox" '+((round.reductionPositions||[]).includes(i)?"checked":"")+' onchange="setReductionPosition('+i+',this.checked)" '+(!isEditable()?"disabled":"")+'><span>'+String(i+1).padStart(2,"0")+' '+escapeHtml(match.home)+' – '+escapeHtml(match.away)+'</span></label>').join(""):'';
  byId("reductionTable").disabled=!isEditable();byId("manualReductionPositions").disabled=!isEditable();
}
function setReductionPosition(index,checked){const round=current(),set=new Set(round.reductionPositions||[]);checked?set.add(index):set.delete(index);round.reductionPositions=[...set].sort((a,b)=>a-b);save();renderReductionSetup();}
function selectReductionTable(value){current().reductionTable=Number(value);current().reductionPositions=null;save();renderReductionSetup();}
function toggleManualReductionPositions(enabled){current().manualReductionPositions=!!enabled;if(enabled&&!current().reductionPositions){try{const table=window.QuinielaReductionTables.find(t=>t.number===current().reductionTable),template=E.reducedTemplate(selectedProbabilities(),table);current().reductionPositions=template.selectedPositions.slice();}catch(_){current().reductionPositions=[];}}save();renderReductionSetup();}
function reductionTemplateFor(table){const probabilities=selectedProbabilities();if(!probabilities)throw Error("Descarga o selecciona porcentajes antes de crear la reducida.");return E.reducedTemplate(probabilities,table,current().manualReductionPositions?current().reductionPositions:null);}
function buildReducedBase(){
  if(!isEditable())return setStatus("Solo se crea una base en la jornada en curso.","error");
  try{const table=window.QuinielaReductionTables.find(t=>t.number===Number(byId("reductionTable").value)),template=reductionTemplateFor(table);current().base=template.base;current().bets=[];save();renderAll();setStatus("Base propia de Reducida "+table.number+" preparada.","success");}
  catch(error){setStatus(error.message,"error");}
}
function applyOfficialReduction(){
  if(!isEditable())return setStatus("Solo se genera una reducida en la jornada en curso.","error");
  const round=current(),table=window.QuinielaReductionTables.find(t=>t.number===Number(byId("reductionTable").value));
  try{const template=reductionTemplateFor(table),count=table.patterns.length*countPairs();if(count>E.MAX_GENERATED)throw Error("La reducida supera el límite de "+E.MAX_GENERATED.toLocaleString("es-ES")+" apuestas. Reduce las selecciones del Pleno.");const bets=E.reduceByTable(template.base,round.goals,table,template.positions);round.unreducedBets=round.bets?.length?round.bets.slice():null;round.unreducedBase=round.base.slice();round.base=template.base;round.bets=bets;round.generatedAt="Tabla Reducida "+table.number;round.appliedReduction={number:table.number,minimumHits:table.minimumHits,base:template.base.slice()};save();renderAll();setStatus("Reducida "+table.number+": "+bets.length.toLocaleString("es-ES")+" apuestas · "+money(bets.length*state.settings.priceCents)+". Cobertura condicional mínima "+table.minimumHits+"/14 sobre la base; no garantiza Pleno ni premio.","success");}
  catch(error){setStatus(error.message,"error");}
}
function formatPct(value) { return Number.isFinite(value) ? Math.round(value) + "%" : ""; }
function renderCoverageLevels() {
  const round = current();
  if (!round.generation) round.generation = { mode: "automatic", doubles: 1, triples: 1, historicalTarget: 0.7 };
  const generation = round.generation;
  byId("generationMode").value = generation.mode;
  byId("doubleCount").value = generation.doubles;
  byId("tripleCount").value = generation.triples;
  byId("doubleCount").disabled = generation.mode !== "manual";
  byId("tripleCount").disabled = generation.mode !== "manual";
  let counts = { fixed: 14 - generation.doubles - generation.triples, doubles: generation.doubles, triples: generation.triples };
  const history=selectedHistoryRows();let probabilities=null,summary="";
  try{probabilities=effectiveProbabilities()||historyProbabilities(history);}catch(_){summary=" · faltan Mercado y Popularidad";}
  byId("historicalTarget").value=Math.round(generation.historicalTarget*100);
  byId("historicalTargetValue").textContent=Math.round(generation.historicalTarget*100)+"%";
  byId("differenceLevel").value=round.differentiation;
  byId("differenceLevelValue").textContent=round.differentiation+"/10";
  byId("differenceLevel").disabled=!(state.percentages[roundKey()]?.market&&state.percentages[roundKey()]?.public);
  byId("surpriseLevel").value=round.surpriseLevel;
  byId("surpriseLevelValue").textContent=round.surpriseLevel+"/10 · "+Math.min(14,4+round.surpriseLevel)+" partidos";
  if(generation.mode==="automatic"&&probabilities&&history.length){
    try{const eligible=E.surpriseEligiblePositions(surpriseProbabilityRows()||probabilities,round.surpriseLevel);const choice=E.historicalBase(probabilities,history,generation.historicalTarget,technicalColumnLimit(),round.locks,round.base,eligible);counts={fixed:choice.fixed,doubles:choice.doubles,triples:choice.triples};summary=" · "+choice.columns.toLocaleString("es-ES")+" col. · "+Math.round(choice.historicalCoverage*100)+"% hist.";}catch(_){summary=" · revisa el histórico";}
  }
  byId("coverageCaption").textContent = counts.fixed + " fijos · " + counts.doubles + " dobles · " + counts.triples + " triples"+summary;
  byId("fillBaseButton").disabled = !isEditable() || (generation.mode==="automatic"?!history.length:!selectedProbabilities());
}
function countPairs() {
  return (current().goals[0].length || 0) * (current().goals[1].length || 0);
}
function technicalColumnLimit(){return Math.max(1,Math.floor(E.MAX_GENERATED/Math.max(1,countPairs())));}
function selectedHistoryRows(){const selected=new Set(current().historySeasons||[]);return (HISTORY.seasons||[]).filter(season=>selected.has(season)).flatMap(season=>HISTORY.results[season]||[]);}
function historyProbabilities(results=selectedHistoryRows()){if(!results.length)return null;return Array.from({length:14},(_,i)=>["1","X","2"].map(sign=>results.filter(row=>row[i]===sign).length/results.length));}
function surpriseProbabilityRows(){try{return effectiveProbabilities()||historyProbabilities();}catch(_){return selectedProbabilities()||historyProbabilities();}}
function renderHistoryControls(){
  const round=current(),selected=new Set(round.historySeasons||[]),seasons=(HISTORY.seasons||[]).slice().reverse();
  byId("historySeasons").innerHTML=seasons.map(season=>'<label class="history-season"><input type="checkbox" '+(selected.has(season)?"checked":"")+' onchange="setHistorySeason(\''+season+'\',this.checked)"><span>'+escapeHtml(season)+" · "+(HISTORY.results[season]?.length||0)+" jornadas</span></label>").join("");
  const rows=selectedHistoryRows();byId("historySummary").textContent=(selected.size?selected.size+" temporadas · "+rows.length.toLocaleString("es-ES")+" jornadas":"Sin temporadas seleccionadas")+". Cobertura descriptiva de la muestra; no es una predicción.";
}
function setHistorySeason(season,checked){const selected=new Set(current().historySeasons||[]);checked?selected.add(season):selected.delete(season);current().historySeasons=HISTORY.seasons.filter(x=>selected.has(x));save();renderAll();}
function selectAllHistory(checked){current().historySeasons=checked?HISTORY.seasons.slice():[];save();renderAll();}
function setHistoricalTarget(value){current().generation.historicalTarget=Number(value)/100;save();renderCoverageLevels();}
function setDifferentiation(value){current().differentiation=Math.max(0,Math.min(10,Number(value)||0));save();renderCoverageLevels();renderFixtures();}
function setSurpriseLevel(value){current().surpriseLevel=Math.max(0,Math.min(10,Number(value)||0));save();renderCoverageLevels();renderFixtures();}
function baseSize() {
  return E.baseSize(current().base, current().goals);
}
function renderFixtures() {
  const matches = fixture();
  const round = current();
  const probabilities = selectedProbabilities();
  const riskRows = surpriseProbabilityRows();
  if (matches.length < 14) {
    byId("fixtures").innerHTML = '<div class="empty">Descarga una jornada válida para editar los 14 partidos.</div>';
    byId("baseCount").textContent = "0 apuestas base";
    return;
  }
  byId("fixtures").innerHTML = matches.slice(0, 14).map((match, index) => {
    const row = probabilities?.[index],riskRow=riskRows?.[index];
    const risk=riskRow?Math.round((1-Math.max(...riskRow))*100):null;
    const level=risk===null?"":risk>=55?"fácil":risk>=40?"medio":"difícil",riskClass=risk===null?"":" risk-"+(risk>=55?"high":risk>=40?"mid":"low");
    const odds = row ? "1 " + formatPct(row[0]) + " · X " + formatPct(row[1]) + " · 2 " + formatPct(row[2]) : match.kick;
    const insight=risk===null?odds:"Desvío estimado "+risk+"% · "+level+(odds?" · "+odds:"");
    return '<div class="fixture-row"><div class="fixture-meta"><strong class="fixture-teams">' + String(index + 1).padStart(2, "0") + " · " + escapeHtml(match.home) + " – " + escapeHtml(match.away) + '</strong><small class="fixture-extra'+riskClass+'">' + escapeHtml(insight || "Horario pendiente") + '</small></div><div class="fixture-controls"><button class="lock-button '+(round.locks[index]?"locked":"")+'" onclick="toggleLock('+index+')" aria-label="'+(round.locks[index]?"Desbloquear":"Bloquear")+' partido '+(index+1)+'" '+(!isEditable()?"disabled":"")+'>'+(round.locks[index]?"🔒":"🔓")+'</button><div class="sign-buttons">' + ["1", "X", "2"].map((sign) =>
      '<button class="' + (round.base[index].includes(sign) ? "selected" : "") + '" onclick="toggleSign(' + index + ',\'' + sign + '\')" aria-label="Partido ' + (index + 1) + " signo " + sign + '" ' + (!isEditable() ? "disabled" : "") + ">" + sign + "</button>",
    ).join("") + "</div></div></div>";
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
  renderHistoryControls();
  renderMatrixEditor();
  renderReductionSetup();
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
        sources.localSources = state.percentages[roundKey()]?.localSources || {};
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
  if (source.startsWith("local:") && !state.percentages[roundKey()]?.localSources?.[source.slice(6)])
    return setStatus("No se encontró esa fuente importada para esta jornada.", "error");
  if (source === "matrix" && !current().manualMatrix)
    return setStatus("Copia primero una fuente a la matriz editable.", "error");
  if ((source === "market" || source === "public") && !state.percentages[roundKey()]?.[source])
    return setStatus("Descarga primero los porcentajes de esta jornada o elige Manual.", "error");
  current().selectedSource = source;
  state.source = source;
  save(); renderAll();
}
function copySelectedToMatrix() {
  const values=selectedProbabilities();
  if(!values)return setStatus("Elige primero una fuente disponible para copiar a la matriz.","error");
  current().manualMatrix=values.map(row=>row.slice());current().selectedSource="matrix";save();renderAll();
  setStatus("Matriz copiada. Los cambios siguientes quedan guardados en esta jornada.","success");
}
function editMatrix(i,j,value) {
  const round=current();
  if(!round.manualMatrix)round.manualMatrix=selectedProbabilities()?.map(row=>row.slice())||Array.from({length:14},()=>[0.34,0.33,0.33]);
  const n=Number(String(value).replace(",","."));
  if(!Number.isFinite(n)||n<0||n>100)return setStatus("Introduce porcentajes entre 0 y 100.","error");
  round.manualMatrix[i][j]=n/100;round.selectedSource="matrix";round.bets=[];save();renderAll();
}
function normalizeMatrix() {
  const rows=byId("matrixEditor").querySelectorAll(".matrix-row:not(.matrix-head)");
  try{current().manualMatrix=[...rows].map((row,i)=>{const values=[...row.querySelectorAll("input")].map(input=>Number(String(input.value).replace(",",".")));const total=values.reduce((a,b)=>a+b,0);if(values.some(v=>!Number.isFinite(v)||v<0)||total<=0)throw Error("Porcentajes inválidos en el partido "+(i+1)+".");return values.map(v=>v/total);});current().selectedSource="matrix";save();renderAll();setStatus("Cada fila se ha normalizado a 100%.","success");}
  catch(error){setStatus(error.message,"error");}
}
function saveMatrix(){if(!current().manualMatrix)return setStatus("Copia o edita primero una matriz.","error");current().savedMatrix=current().manualMatrix.map(r=>r.slice());save();setStatus("Porcentajes guardados para esta temporada y jornada.","success");}
function loadMatrix(){if(!current().savedMatrix)return setStatus("No hay porcentajes guardados en esta jornada.","error");current().manualMatrix=current().savedMatrix.map(r=>r.slice());current().selectedSource="matrix";save();renderAll();setStatus("Matriz guardada cargada.","success");}
function setAuxiliaryWeight(kind,value){const n=Number(value);if(!Number.isInteger(n)||n<0||n>100)return setStatus("El peso debe estar entre 0 y 100%.","error");current().auxiliaryWeights[kind]=n;save();}
function importProbabilitySource(){if(!isEditable())return setStatus("Solo se importan fuentes para la jornada en curso.","error");pendingProbabilityImport=true;Android.pickTextFile();}
window.handleProbabilitySourceImported=(text,filename)=>{
  pendingProbabilityImport=false;
  try{const matches=fixture(),key=state.season+"/J"+String(state.round).padStart(2,"0");const parsed=E.parseProbabilitySource(text,filename,key,matches,byId("auxiliaryKind").value);const data=state.percentages[roundKey()]||(state.percentages[roundKey()]={});if(!data.localSources)data.localSources={};const id=parsed.kind+":"+parsed.source+":"+parsed.capturedAt;data.localSources[id]=parsed;current().selectedSource="local:"+id;save();renderAll();setStatus("Fuente «"+parsed.source+"» importada y validada para J"+state.round+".","success");}
  catch(error){setStatus("No se importó la fuente: "+error.message,"error");}
};
function applyAuxiliaryWeights(){
  const locals=state.percentages[roundKey()]?.localSources||{},weights=current().auxiliaryWeights||{};
  try{const sources=Object.entries({classification:weights.classification||0,form5:weights.form5||0,history:weights.history||0}).map(([kind,weight])=>{const source=Object.values(locals).filter(s=>s.kind===kind).at(-1);if(weight&&!source)throw Error("Importa datos de "+kind+" o pon su peso a 0%.");return source?{values:source.values,weight}:null;}).filter(Boolean);current().manualMatrix=E.weightedProbabilities(sources);current().selectedSource="matrix";current().bets=[];save();renderAll();setStatus("Media ponderada aplicada a la matriz. Genera de nuevo para usarla.","success");}
  catch(error){setStatus(error.message,"error");}
}
function selectCoverage(level) { current().coverageLevel = Number(level); save(); renderAll(); }
function setGenerationMode(mode) { current().generation.mode = mode === "manual" ? "manual" : "automatic"; save(); renderAll(); }
function setGenerationCounts() {
  const generation = current().generation || (current().generation = {});
  generation.doubles = Math.max(0, Math.min(14, Number(byId("doubleCount").value) || 0));
  generation.triples = Math.max(0, Math.min(14-generation.doubles, Number(byId("tripleCount").value) || 0));
  byId("tripleCount").value = generation.triples;
  save(); renderAll();
}
function fillBase() {
  if (!isEditable()) return setStatus("La jornada seleccionada es solo de consulta.", "error");
  const round=current(),generation=round.generation,history=selectedHistoryRows();
  let chosen;
  try {
    const probabilities=generation.mode==="automatic"?(effectiveProbabilities()||historyProbabilities(history)):effectiveProbabilities(),limit=technicalColumnLimit();
    if(!probabilities)throw Error("Descarga porcentajes o selecciona Mercado/Popularidad para crear la base.");
    if(generation.mode==="manual"){
      chosen={base:E.configuredBase(probabilities,generation.doubles,generation.triples,Number.MAX_SAFE_INTEGER,round.locks,round.base),doubles:generation.doubles,triples:generation.triples};
      chosen.columns=chosen.base.reduce((n,row)=>n*row.length,1);
      if(chosen.columns>limit)throw Error("La base manual supera el límite técnico de "+limit.toLocaleString("es-ES")+" columnas con el Pleno seleccionado.");
    }else{
      if(!history.length)throw Error("Selecciona al menos una temporada con resultados para el modo automático.");
      chosen=E.historicalBase(probabilities,history,generation.historicalTarget,limit,round.locks,round.base,E.surpriseEligiblePositions(surpriseProbabilityRows()||probabilities,round.surpriseLevel));
    }
  }
  catch (error) { return setStatus(error.message, "error"); }
  round.base = chosen.base;round.bets = [];
  if(generation.mode==="automatic")round.historyAudit={seasons:round.historySeasons.slice(),rounds:history.length,target:generation.historicalTarget,coverage:chosen.historicalCoverage,columns:chosen.columns};
  save(); renderAll();
  const counts = { fixed: 14-chosen.doubles-chosen.triples, doubles: chosen.doubles, triples: chosen.triples };
  const audit=generation.mode==="automatic"?" · "+Math.round(chosen.historicalCoverage*100)+"% de "+history.length.toLocaleString("es-ES")+" jornadas históricas seleccionadas":"";
  setStatus("Base creada: "+counts.fixed+" fijos, "+counts.doubles+" dobles y "+counts.triples+" triples · "+chosen.columns.toLocaleString("es-ES")+" columnas"+audit+". El histórico describe la muestra, no predice la jornada.","success");
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
function toggleLock(index){if(!isEditable())return setStatus("Solo se bloquea la base de la jornada en curso.","error");current().locks[index]=!current().locks[index];save();renderAll();}
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
  if (!round.unreducedBets?.length && !round.unreducedBase) return setStatus("No hay una copia completa pendiente de restaurar.");
  if(round.unreducedBets?.length){round.bets = round.unreducedBets; delete round.unreducedBets;}
  if(round.unreducedBase){round.base=round.unreducedBase;delete round.unreducedBase;}
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
    filters: JSON.parse(JSON.stringify(round.filters)), locks: round.locks.slice(), bets: round.bets.slice(),
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
  round.locks = Array.isArray(system.locks)&&system.locks.length===14?system.locks.slice():Array(14).fill(false);
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
