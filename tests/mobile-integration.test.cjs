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
  assert.match(app, /"escrutinio"\]/);
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
