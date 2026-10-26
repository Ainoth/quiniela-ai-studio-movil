"use strict";
(function (root) {
  const SIGNS = ["1", "X", "2"];
  const MAX_GENERATED = 50_000;
  const COVERAGE_LEVELS = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4],
    [1, 5], [2, 5], [2, 6], [3, 6], [3, 7]];

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

  function normalizeTeam(value) {
    let key = String(value || "").normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    key = key.replace(/WF$/, "F").replace(/F$/, "");
    const aliases = {
      ATHCLUBBILBAO: "ATHCLUB", ATHLETICCLUB: "ATHCLUB", ATHLETICBILBAO: "ATHCLUB",
      ATLETICOMADRID: "ATMADRID", ATLETICODEMADRID: "ATMADRID", RAYOVALLECANO: "RAYO",
      REALSOCIEDAD: "RSOCIEDAD", REALOVIEDO: "ROVIEDO", REALMADRID: "RMADRID",
      RACINGSANTANDER: "RACINGS", DEPORTIVOCORUNA: "DEPORTIVO", DEPORTIVOLACORUNA: "DEPORTIVO",
      MANCHUNITED: "MANUNITED", MANCHESTERUNITED: "MANUNITED", MANCHESTCITY: "MANCITY",
      MANCHESTERCITY: "MANCITY", SHAKTARDONETSK: "SHAKHTARDONETSK",
      RBLEIPZIG: "LEIPZIG", MADRIDCCF: "MADRIDCFF",
    };
    return aliases[key] || key;
  }

  function sameTeamName(first, second) {
    return normalizeTeam(first) === normalizeTeam(second);
  }

  function normalizeBase(base) {
    if (!Array.isArray(base) || base.length !== 14 || base.some((row) =>
      typeof row !== "string" || !row || [...row].some((sign) => !SIGNS.includes(sign))))
      throw Error("La base necesita al menos un signo 1/X/2 en cada uno de los 14 partidos.");
    return base.map((row) => SIGNS.filter((sign) => row.includes(sign)).join(""));
  }

  function validateProbabilities(rows) {
    if (!Array.isArray(rows) || rows.length !== 14) throw Error("Faltan porcentajes para los 14 partidos.");
    return rows.map((row, index) => {
      const values = Array.isArray(row) ? row.map(Number) : [row["1"], row.X, row["2"]].map(Number);
      if (values.length !== 3 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
        || Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 0.0001)
        throw Error("Porcentajes inválidos en el partido " + (index + 1) + ".");
      return values;
    });
  }

  function coverageBase(probabilities, level) {
    const rows = validateProbabilities(probabilities);
    if (!Number.isInteger(level) || level < 0 || level > 10) throw Error("El nivel de cobertura va de 0 a 10.");
    const [triples, doubles] = COVERAGE_LEVELS[level];
    const ranks = rows.map((row) => [0, 1, 2].sort((a, b) => row[b] - row[a] || a - b));
    const positions = rows.map((row, index) => ({ index, strength: Math.max(...row) }))
      .sort((a, b) => a.strength - b.strength || a.index - b.index);
    const widths = Array(14).fill(1);
    positions.slice(0, triples).forEach(({ index }) => widths[index] = 3);
    positions.slice(triples, triples + doubles).forEach(({ index }) => widths[index] = 2);
    return ranks.map((rank, index) => rank.slice(0, widths[index]).sort((a, b) => a - b)
      .map((signIndex) => SIGNS[signIndex]).join(""));
  }

  function coverageCounts(level) {
    if (!Number.isInteger(level) || level < 0 || level > 10) throw Error("El nivel de cobertura va de 0 a 10.");
    const [triples, doubles] = COVERAGE_LEVELS[level];
    return { triples, doubles, fixed: 14 - triples - doubles };
  }

  function baseSize(base, goals = ["0", "0"]) {
    const normalized = normalizeBase(base);
    const goalMasks = goals.map((mask) => [...new Set(String(mask))]);
    if (goalMasks.length !== 2 || goalMasks.some((mask) => !mask.length || mask.some((goal) => !"012M".includes(goal))))
      throw Error("Selecciona al menos un resultado 0/1/2/M para cada equipo del Pleno.");
    return normalized.reduce((size, row) => size * row.length, goalMasks[0].length * goalMasks[1].length);
  }

  function satisfiesFilters(column, filters = {}) {
    if (filters.accountEnabled) {
      const counts = {
        "1": [...column].filter((sign) => sign === "1").length,
        X: [...column].filter((sign) => sign === "X").length,
        "2": [...column].filter((sign) => sign === "2").length,
        V: [...column].filter((sign) => sign !== "1").length,
      };
      for (const sign of ["1", "X", "2", "V"]) {
        const minimum = Number(filters.minCounts?.[sign] ?? 0);
        const maximum = Number(filters.maxCounts?.[sign] ?? 14);
        if (counts[sign] < minimum || counts[sign] > maximum) return false;
      }
    }
    if (filters.streakEnabled) {
      let current = 0, longest = 0;
      for (const sign of column) {
        current = sign === "1" ? 0 : current + 1;
        longest = Math.max(longest, current);
      }
      if (longest > Number(filters.maxVariantRun || 14)) return false;
    }
    return true;
  }

  function generateBets(base, goals = ["0", "0"], filters = {}, limit = MAX_GENERATED) {
    const normalized = normalizeBase(base);
    const masks = goals.map((mask) => [...new Set(String(mask))]);
    // `baseSize` accepts the compact goal masks (e.g. "01"), while `masks`
    // here are already expanded arrays used by the generator below.
    const total = baseSize(normalized, masks.map((mask) => mask.join("")));
    if (total > limit) throw Error("El desarrollo tendría " + total.toLocaleString("es-ES")
      + " apuestas. Ajusta la base o el Pleno para no superar " + limit.toLocaleString("es-ES") + ".");
    const output = [];
    const column = Array(14);
    const visit = (position) => {
      if (position === 14) {
        const value = column.join("");
        if (satisfiesFilters(value, filters))
          for (const home of masks[0]) for (const away of masks[1]) output.push(value + home + away);
        return;
      }
      for (const sign of normalized[position]) { column[position] = sign; visit(position + 1); }
    };
    visit(0);
    return output;
  }

  function probabilityMass(bets, probabilities) {
    const rows = validateProbabilities(probabilities);
    let mass = 0;
    const seen = new Set();
    for (const bet of bets) {
      const column = bet.slice(0, 14);
      if (seen.has(column)) continue;
      seen.add(column);
      let value = 1;
      for (let i = 0; i < 14; i++) value *= rows[i][SIGNS.indexOf(column[i])];
      mass += value;
    }
    return mass;
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

  /** Count tickets that can still finish in each exact 10–15 prize category.
   * Only finalized 1X2 matches constrain the range; live scores may change.
   */
  function categoryPossibilities(bets, rows) {
    const categories = [15, 14, 13, 12, 11, 10];
    const counts = Object.fromEntries(categories.map((category) => [category, 0]));
    const evaluated = evaluate(bets, rows);
    evaluated.forEach(({ bet, confirmed, maximum }) => {
      for (const category of categories.slice(1)) {
        if (confirmed <= category && category <= maximum) counts[category]++;
      }
      if (bet.length === 16) {
        const noFinalSignMiss = rows.slice(0, 14).every((row, index) =>
          !row.final || bet[index] === row.sign,
        );
        const pleno = rows[14];
        const noFinalPlenoMiss = !pleno?.final || bet.slice(14) === pleno.pleno;
        if (noFinalSignMiss && noFinalPlenoMiss) counts[15]++;
      }
    });
    return categories.map((category) => ({ category, possibleBets: counts[category] }));
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
    normalizeTeam, sameTeamName,
    normalizeBase, validateProbabilities, coverageBase, coverageCounts, baseSize, satisfiesFilters,
    generateBets, probabilityMass, MAX_GENERATED,
    availableRounds, currentRound, scrutiny, live, evaluate, categoryPossibilities, awardBreakdown };
  if (typeof module !== "undefined") module.exports = root.EscrutinioEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
