"use strict";
(function (root) {
  const SIGNS = ["1", "X", "2"];

  function roundLine(text, round) {
    return (text || "")
      .split(/\r?\n/)
      .find((line) => /^\d{1,2}$/.test(line.slice(0, 2).trim()) && +line.slice(0, 2) === +round) || "";
  }

  function parseKickoff(text) {
    const match = String(text || "").match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
    return match ? new Date(+match[3], +match[2] - 1, +match[1], +match[4], +match[5]) : null;
  }

  function formatKickoff(text) {
    return String(text || "").replace(/^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})/, "$1 · $2");
  }

  function parseDates(text) {
    return (text || "").split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^(\d{2}):(\d{2})\/(\d{2})\/(\d{4})/);
      return match ? [{ round: +match[1], date: new Date(+match[4], +match[3] - 1, +match[2]) }] : [];
    });
  }

  function parseHours(text, round) {
    const line = (text || "").split(/\r?\n/).find((row) => row.startsWith(String(round).padStart(2, "0"))) || "";
    return Array.from({ length: 15 }, (_, i) => line.slice(2 + i * 15, 17 + i * 15));
  }

  function parseNames(text) {
    const names = {};
    (text || "").split(/\r?\n/).forEach((line) => {
      const separator = line.indexOf("-");
      if (separator > 0) names[line.slice(0, separator).trim().toUpperCase()] = line.slice(separator + 1).trim();
    });
    return names;
  }

  function availableRounds(data, season) {
    const pre = data?.["PRE" + season + ".TXT"] || "";
    return parseDates(data?.["FEC" + season + ".TXT"] || "")
      .sort((a, b) => a.round - b.round)
      .filter(({ round }) => roundLine(pre, round).slice(119, 209).trim().length === 90);
  }

  function currentRound(data, season, now = new Date()) {
    const rounds = availableRounds(data, season);
    const pending = rounds.filter(({ round }) => !scrutiny(roundLine(data["PRE" + season + ".TXT"], round)));
    const active = pending.find(({ round, date }) => {
      const kicks = parseHours(data["HOR" + season + ".TXT"], round).map(parseKickoff).filter(Boolean);
      const end = kicks.length ? new Date(Math.max(...kicks.map((kick) => kick.getTime()))) : date;
      end.setHours(23, 59, 59, 999);
      return end >= now;
    });
    return active?.round || pending.find(({ date }) => date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))?.round || rounds.at(-1)?.round || 1;
  }

  function scrutiny(line) {
    const result = String(line || "").slice(104, 118);
    if (!/^[1X2]{14}$/.test(result)) return null;
    const code = Number.parseInt(line[118], 16), goals = "012M";
    const pleno = Number.isFinite(code) && code >= 0 && code <= 15 ? goals[code >> 2] + goals[code % 4] : "";
    if (!/^[012M]{2}$/.test(pleno)) return null;
    const tokens = line.slice(2, 104).match(/\d[\d.]*,\d{2}|\d+/g) || [];
    const amountCents = (value) => {
      const amount = Number(String(value || "0").replace(/\./g, "").replace(",", "."));
      return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : 0;
    };
    return {
      result,
      pleno,
      prizes: [15, 14, 13, 12, 11, 10].map((category, index) => ({
        category,
        winners: Number(tokens[index]) || 0,
        amountCents: amountCents(tokens[index + 6]),
      })),
    };
  }

  function live(row) {
    const status = String(row.estado || "").trim();
    const final = /^(finalizado|final|terminado|finalizada)$/i.test(status);
    const pending = /^(sin comenzar|pendiente|aplazado|suspendido)$/i.test(status);
    let sign = "", pleno = "", score = "—", done = final;
    const valid = (final || String(row.live) === "1") && !pending &&
      [row.local_goles, row.visitante_goles].every((goals) => /^\d{1,2}$/.test(String(goals)));
    if (valid) {
      const home = +row.local_goles, away = +row.visitante_goles;
      score = home + " - " + away;
      sign = home > away ? "1" : home < away ? "2" : "X";
      pleno = [home, away].map((goals) => goals >= 3 ? "M" : String(goals)).join("");
    }
    if (String(row.sorteado) === "1") {
      const officialSign = String(row.signo || "").toUpperCase();
      const officialPleno = String(row.signo_goles || "").replace("-", "").toUpperCase();
      if (SIGNS.includes(officialSign)) { sign = officialSign; done = true; }
      if (/^[012M]{2}$/.test(officialPleno)) pleno = officialPleno;
    }
    return { ...row, final: done, score, sign, pleno, status };
  }

  function evaluate(bets, rows) {
    const known = rows.slice(0, 14).filter((row) => SIGNS.includes(row.sign));
    const finalized = known.filter((row) => row.final);
    const pleno = rows[14]?.pleno || "";
    return bets.map((bet) => {
      let hits = 0, misses = 0;
      known.forEach((row) => {
        if (bet[row.orden - 1] === row.sign) hits++;
        else if (row.final) misses++;
      });
      const plenoHit = bet.length === 16 && hits === 14 && !!pleno && bet.slice(14) === pleno;
      return { bet, hits, confirmed: finalized.length - misses, maximum: 14 - misses, plenoHit };
    }).sort((a, b) => b.hits - a.hits || b.maximum - a.maximum);
  }

  function awardBreakdown(bets, official) {
    const counts = {};
    bets.forEach((bet) => {
      const hits = [...official.result].filter((sign, index) => bet[index] === sign).length;
      counts[hits] = (counts[hits] || 0) + 1;
      if (hits === 14 && bet.length === 16 && bet.slice(14) === official.pleno)
        counts[15] = (counts[15] || 0) + 1;
    });
    let totalCents = 0;
    const rows = official.prizes.map((prize) => {
      const mine = counts[prize.category] || 0;
      const subtotalCents = mine * prize.amountCents;
      totalCents += subtotalCents;
      return { ...prize, mine, subtotalCents };
    });
    return { rows, totalCents };
  }

  root.EscrutinioEngine = { roundLine, parseKickoff, formatKickoff, parseDates, parseHours, parseNames,
    availableRounds, currentRound, scrutiny, live, evaluate, awardBreakdown };
  if (typeof module !== "undefined") module.exports = root.EscrutinioEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
