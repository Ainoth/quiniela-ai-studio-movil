const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assets = path.join(__dirname, "../android/app/src/main/assets");
const html = fs.readFileSync(path.join(assets, "index.html"), "utf8");
const app = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const scrutiny = fs.readFileSync(path.join(assets, "scrutiny.js"), "utf8");
const style = fs.readFileSync(path.join(assets, "style.css"), "utf8");
const history = fs.readFileSync(path.join(assets, "historical-data.js"), "utf8");

test("Quiniela AI Studio expone Escrutinio en la navegación móvil", () => {
  assert.match(html, /data-page="escrutinio"[^>]*>[\s\S]*?<small>Escrutinio<\/small>/);
  assert.match(html, /id="page-escrutinio"/);
  assert.match(html, /<script src="scrutiny\.js"><\/script>/);
  assert.match(app, /"ajustes"\]/);
  assert.doesNotMatch(html, /data-page="reducciones"|id="page-reducciones"/);
  assert.match(html, /data-page="ajustes"[\s\S]*?<small>Ajustes<\/small>/);
  assert.match(app, /window\.renderScrutiny\(\)/);
});

test("la pantalla acepta TXT y solo calcula premios con el PRE definitivo", () => {
  assert.match(html, /Importar apuestas TXT/);
  assert.match(html, /Usar desarrollo actual/);
  assert.match(scrutiny, /window\.onImportedText/);
  assert.match(scrutiny, /const official = scrutinyOfficial\(\)/);
  assert.match(scrutiny, /E\.awardBreakdown\(bets, official\)/);
  assert.match(scrutiny, /if \(!official\)[\s\S]*?reparto solo se muestra cuando WIN1X2 publica el escrutinio definitivo/);
});

test("la generación automática muestra sus temporadas y bloquea dobles/triples manuales", () => {
  assert.match(html, /Automática · según temporadas/);
  assert.match(html, /id="historySeasons"/);
  assert.match(html, /id="doubleCount"/);
  assert.match(html, /id="generationModeHint"/);
  assert.match(app, /doubleCount"\)\.disabled = generation\.mode !== "manual"/);
});

test("factor sorpresa es independiente de las cantidades automáticas y Pleno permite cambiar de modo", () => {
  assert.match(html, /id="surpriseLevel"/);
  assert.doesNotMatch(html, /diferenciación del público|id="strategyLevel"/);
  assert.match(app, /historicalBase\(probabilities,history,generation\.historicalTarget,technicalColumnLimit\(\),round\.locks,round\.base\)/);
  assert.match(app, /function togglePlenoMode\(\)/);
  assert.match(html, /onclick="togglePlenoMode\(\)"/);
  assert.match(app, /const pleno=fixture\(\)\[14\]/);
});

test("los controles de escrutinio son compactos y la fecha queda en la columna del partido", () => {
  assert.match(html, /class="scrutiny-actions"/);
  assert.match(scrutiny, /class="match-kick"/);
});

test("el Pleno tiene selección automática de mercado o frecuencias históricas", () => {
  assert.match(html, /id="autoPlenoButton"/);
  assert.match(app, /marketPleno/);
  assert.match(app, /historyPlenoProbabilities/);
  assert.match(app, /plenoMode: "automatic"/);
  assert.match(app, /plenoMode=system\.plenoMode\|\|"manual"/);
  assert.match(history, /"pleno"/);
});

test("Condiciones ofrece reglas visuales y ajuste automático por temporadas", () => {
  assert.match(html, /id="conditionCounts"/);
  assert.match(html, /id="variantRunChoices"/);
  assert.match(html, /id="autoConditionsEnabled"/);
  assert.match(html, /id="conditionRiskLevel"[\s\S]*?value="muy-alto">Riesgo muy alto/);
  assert.match(html, /onclick="applyConditionsToDevelopment\(\)"/);
  assert.match(app, /function toggleConditionValue/);
  assert.match(app, /function recomputeHistoricalConditions/);
  assert.match(app, /function applyConditionsToDevelopment/);
  assert.match(app, /Último desarrollo con estas condiciones/);
  assert.match(app, /E\.conditionRiskCoverage\(filters\.riskLevel\)/);
  assert.match(app, /E\.historicalConditionFilters\(rows,coverage\)/);
  assert.match(app, /class="condition-value-head"/);
  assert.match(app, /title="\$\{label\}"[^>]*aria-pressed="\$\{allowed\}"[^>]*onclick=/);
  assert.match(style, /\.condition-tile\{min-height:0;height:20px[^}]*font-size:0/);
  assert.match(style, /\.scrutiny-actions button[^}]*font-size:11px/);
  assert.match(style, /\.system-actions button[^}]*font-size:11px/);
});
