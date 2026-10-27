const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assets = path.join(__dirname, "../android/app/src/main/assets");
const html = fs.readFileSync(path.join(assets, "index.html"), "utf8");
const app = fs.readFileSync(path.join(assets, "app.js"), "utf8");
const scrutiny = fs.readFileSync(path.join(assets, "scrutiny.js"), "utf8");

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

test("un único control combina sorpresa y diferenciación y Pleno muestra los equipos", () => {
  assert.match(html, /id="strategyLevel"/);
  assert.doesNotMatch(html, /id="differenceLevel"|id="surpriseLevel"/);
  assert.match(app, /const pleno=fixture\(\)\[14\]/);
});

test("los controles de escrutinio son compactos y la fecha queda en la columna del partido", () => {
  assert.match(html, /class="scrutiny-actions"/);
  assert.match(scrutiny, /class="match-kick"/);
});
