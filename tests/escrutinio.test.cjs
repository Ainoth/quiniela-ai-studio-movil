const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../android/app/src/main/assets/engine.js");

function preLine(round, result = "11111111111111", plenoCode = "0") {
  const line = Array(209).fill(" ");
  String(round).padStart(2, "0").split("").forEach((char, index) => { line[index] = char; });
  [0, 0, 1, 2, 3, 4].forEach((value, index) => {
    String(value).padStart(7, " ").split("").forEach((char, offset) => { line[2 + index * 7 + offset] = char; });
  });
  [100, 10, 1, 0.5, 0.25, 0].forEach((value, index) => {
    const text = value.toFixed(2).replace(".", ",").padStart(10, " ");
    text.split("").forEach((char, offset) => { line[44 + index * 10 + offset] = char; });
  });
  result.split("").forEach((char, index) => { line[104 + index] = char; });
  line[118] = plenoCode;
  return line.join("");
}

test("lee escrutinio definitivo de PRE con los 14 signos y el Pleno", () => {
  const parsed = E.scrutiny(preLine(16));
  assert.equal(parsed.result, "11111111111111");
  assert.equal(parsed.pleno, "00");
  assert.deepEqual(parsed.prizes.map((row) => row.category), [15, 14, 13, 12, 11, 10]);
  assert.equal(parsed.prizes[0].amountCents, 10000);
  assert.equal(parsed.prizes[1].amountCents, 1000);
});

test("desglosa premio de Pleno y 14 aciertos en céntimos", () => {
  const official = E.scrutiny(preLine(16));
  const exact15 = "11111111111111" + "00";
  const exact14 = "11111111111111" + "12";
  const result = E.awardBreakdown([exact15, exact14], official);
  assert.equal(result.rows[0].mine, 1);
  assert.equal(result.rows[0].subtotalCents, 10000);
  assert.equal(result.rows[1].mine, 2);
  assert.equal(result.rows[1].subtotalCents, 2000);
  assert.equal(result.totalCents, 12000);
});

test("convierte marcador final y no interpreta un 0-0 pendiente como empate", () => {
  const pending = E.live({ orden: 1, estado: "Sin comenzar", local_goles: 0, visitante_goles: 0 });
  assert.equal(pending.sign, "");
  assert.equal(pending.score, "—");
  const final = E.live({ orden: 1, estado: "Finalizado", local_goles: 3, visitante_goles: 1 });
  assert.equal(final.sign, "1");
  assert.equal(final.pleno, "M1");
  assert.equal(final.final, true);
});

test("mantiene los 14 aciertos y separa el acierto P15", () => {
  const result = E.scrutiny(preLine(16));
  const rows = Array.from({ length: 15 }, (_, index) => ({
    orden: index + 1,
    sign: index < 14 ? result.result[index] : "",
    pleno: index === 14 ? result.pleno : "",
    final: true,
  }));
  const exact15 = result.result + result.pleno;
  const wrong15 = result.result + "12";
  const evaluated = E.evaluate([exact15, wrong15], rows);
  assert.equal(evaluated[0].hits, 14);
  assert.equal(evaluated[0].plenoHit, true);
  assert.equal(evaluated[1].hits, 14);
  assert.equal(evaluated[1].plenoHit, false);
});

test("identifica de forma exacta la línea PRE de la jornada solicitada", () => {
  const data = "01  fixture\r\n16  round 16\r\n" + preLine(160);
  assert.equal(E.roundLine(data, 16), "16  round 16");
  assert.equal(E.roundLine(data, 10), "");
});
