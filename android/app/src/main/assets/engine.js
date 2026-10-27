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

  function automaticPleno(plenoValues) {
    if(!Array.isArray(plenoValues)||plenoValues.length!==2)throw Error("Faltan probabilidades del Pleno al 15.");
    return plenoValues.map((row,side)=>{
      if(!Array.isArray(row)||row.length!==4||row.some(x=>!Number.isFinite(Number(x))||Number(x)<0||Number(x)>1)||Math.abs(row.reduce((a,b)=>a+Number(b),0)-1)>0.02)throw Error("Probabilidades inválidas del Pleno para el equipo "+(side+1)+".");
      let best=0;for(let i=1;i<4;i++)if(Number(row[i])>Number(row[best]))best=i;
      return "012M"[best];
    });
  }

  function applySurprise(base, probabilities, level=0, locks=Array(14).fill(false), lockedBase=base) {
    const original=normalizeBase(base),rows=validateProbabilities(probabilities),previous=normalizeBase(lockedBase);
    if(!Number.isInteger(level)||level<0||level>10)throw Error("El factor sorpresa debe estar entre 0 y 10.");
    if(!Array.isArray(locks)||locks.length!==14||locks.some(x=>typeof x!=="boolean"))throw Error("Se requieren 14 estados de bloqueo válidos.");
    const widths=original.map(row=>row.length),targetTriples=widths.filter(w=>w===3).length,targetDoubles=widths.filter(w=>w===2).length;
    const riskOrder=surpriseOrder(rows).map(x=>x.index),preferred=riskOrder.slice(0,Math.min(14,4+level));
    const ranks=rows.map(row=>[0,1,2].sort((a,b)=>row[b]-row[a]||a-b));
    const assigned=Array(14).fill(1),used=new Set();
    locks.forEach((locked,i)=>{if(locked){assigned[i]=previous[i].length;used.add(i);}});
    const originalTriples=widths.map((w,i)=>w===3?i:-1).filter(i=>i>=0),originalDoubles=widths.map((w,i)=>w===2?i:-1).filter(i=>i>=0);
    const priority=(specific)=>[...preferred,...specific,...riskOrder];
    const fill=(width,target,specific)=>{
      const already=locks.reduce((n,locked,i)=>n+(locked&&assigned[i]===width?1:0),0),need=Math.max(0,target-already),candidates=[...new Set(priority(specific))].filter(i=>!used.has(i));
      if(candidates.length<need)throw Error("No hay suficientes partidos disponibles para distribuir la base.");
      candidates.slice(0,need).forEach(i=>{assigned[i]=width;used.add(i);});
    };
    fill(3,targetTriples,originalTriples);fill(2,targetDoubles,originalDoubles);
    const result=rows.map((_,i)=>locks[i]?previous[i]:SIGNS.filter((_,sign)=>ranks[i].slice(0,assigned[i]).includes(sign)).join(""));
    return {base:result,fixed:assigned.filter(w=>w===1).length,doubles:assigned.filter(w=>w===2).length,triples:assigned.filter(w=>w===3).length,columns:assigned.reduce((n,w)=>n*w,1)};
  }

  function parseProbabilitySource(text, filename, roundKey, matches, sourceKind="custom") {
    if(String(text).length>20*1024*1024)throw Error("La fuente supera el límite de 20 MiB.");
    const parseValues=(raw,index)=>{
      const values=raw.map(v=>Number(String(v??"").trim().replace("%","").replace(",",".")));
      const sum=values.reduce((a,b)=>a+b,0);
      if(values.length!==3||values.some(v=>!Number.isFinite(v)||v<0))throw Error("Porcentajes inválidos en el partido "+index+".");
      if(Math.abs(sum-1)<=1e-6)return values;
      if(sum>=99&&sum<=101&&values.every(v=>v<=100))return values.map(v=>v/sum);
      throw Error("Los porcentajes del partido "+index+" no suman 100% ni 1,0.");
    };
    let doc, name, captured, kind, rows;
    const body=String(text).replace(/^\uFEFF/,"").trim();
    if(body.startsWith("{")){
      try{doc=JSON.parse(body);}catch(error){throw Error("JSON inválido: "+error.message);}
      if(doc.schema!=="quiniela_ai_studio.probabilities"||doc.version!==1)throw Error("JSON no compatible: se requiere quiniela_ai_studio.probabilities v1.");
      if(doc.round_key!==roundKey)throw Error("La fuente es de otra temporada o jornada.");
      name=String(doc.source||"").trim();captured=String(doc.captured_at||"").trim();kind=String(doc.kind||sourceKind);
      if(!Array.isArray(doc.matches)||doc.matches.length!==14)throw Error("El JSON debe contener los 14 partidos de 1X2.");
      rows=doc.matches.map((entry,i)=>{
        if(entry.number!==i+1||!E_same(entry.home,matches[i].home)||!E_same(entry.away,matches[i].away))throw Error("Los equipos o el orden no coinciden en el partido "+(i+1)+".");
        return parseValues([entry.p1,entry.px,entry.p2],i+1);
      });
    }else{
      const delim=body.slice(0,4096).includes(";")?";":body.slice(0,4096).includes("\t")?"\t":",";
      const records=[];let row=[],cell="",quoted=false;
      for(let i=0;i<body.length;i++){const c=body[i];if(quoted){if(c==='"'&&body[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===delim){row.push(cell);cell="";}else if(c==="\n"){row.push(cell);records.push(row);row=[];cell="";}else if(c!=="\r")cell+=c;}
      if(cell||row.length){row.push(cell);records.push(row);}
      const headers=(records.shift()||[]).map(v=>v.trim().toLowerCase()),idx=Object.fromEntries(headers.map((v,i)=>[v,i]));
      if(records.length!==14||!["number","home","away","p1","px","p2","source","captured_at"].every(key=>idx[key]!==undefined))throw Error("CSV/TXT requiere 14 filas y columnas number,home,away,p1,px,p2,source,captured_at.");
      const read=(r,key)=>r[idx[key]]||"";
      const names=new Set(),dates=new Set(),kinds=new Set();
      rows=records.map((r,i)=>{
        if(String(read(r,"number")).trim()!==String(i+1)||!E_same(read(r,"home"),matches[i].home)||!E_same(read(r,"away"),matches[i].away))throw Error("Los equipos o el orden no coinciden en el partido "+(i+1)+".");
        names.add(String(read(r,"source")).trim());dates.add(String(read(r,"captured_at")).trim());kinds.add(String(read(r,"kind")||sourceKind).trim());
        return parseValues([read(r,"p1"),read(r,"px"),read(r,"p2")],i+1);
      });
      if(names.size!==1||!([...names][0])||dates.size!==1||!([...dates][0])||kinds.size!==1)throw Error("Fuente, fecha y tipo deben ser iguales en todas las filas.");
      name=[...names][0];captured=[...dates][0];kind=[...kinds][0];
    }
    if(!name||!captured||!Number.isFinite(Date.parse(captured))||!captured.match(/[+-]\d\d:?\d\d|Z$/i))throw Error("La fuente debe incluir nombre y fecha ISO con zona horaria.");
    if(!["classification","form5","history","market","public","custom"].includes(kind))throw Error("Tipo de fuente local no reconocido.");
    return {source:name,capturedAt:captured,kind,values:validateProbabilities(rows),filename:String(filename||"")};
  }
  function E_same(a,b){return normalizeTeam(a)===normalizeTeam(b);}

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

  function configuredBase(probabilities, doubles, triples, maxColumns, locks = Array(14).fill(false), lockedBase = Array(14).fill("1")) {
    const rows = validateProbabilities(probabilities);
    doubles = Math.max(0, Math.min(14, Math.trunc(doubles)));
    triples = Math.max(0, Math.min(14 - doubles, Math.trunc(triples)));
    if (!Array.isArray(locks)||locks.length!==14||locks.some(x=>typeof x!=="boolean"))throw Error("Se requieren 14 estados de bloqueo válidos.");
    const previous=normalizeBase(lockedBase),fixedT=locks.filter((locked,i)=>locked&&previous[i].length===3).length,fixedD=locks.filter((locked,i)=>locked&&previous[i].length===2).length;
    if(fixedT>triples||fixedD>doubles)throw Error("Los bloqueos ya incluyen más triples o dobles que los solicitados.");
    if (2 ** doubles * 3 ** triples > maxColumns) throw Error("La cantidad elegida supera el máximo de columnas.");
    const ranks = rows.map((row) => [0, 1, 2].sort((a, b) => row[b] - row[a] || a - b));
    let states = new Map([["0,0", { score: 0, widths: [] }]]),needD=doubles-fixedD,needT=triples-fixedT;
    rows.forEach((row, i) => {
      if(locks[i])return;
      const next = new Map();
      for (const [key, path] of states) {
        const [usedT, usedD] = key.split(",").map(Number);
        for (const width of [1, 2, 3]) {
          const t = usedT + (width === 3 ? 1 : 0), d = usedD + (width === 2 ? 1 : 0);
          if (t > needT || d > needD) continue;
          const mass = ranks[i].slice(0, width).reduce((sum, sign) => sum + row[sign], 0);
          const candidate = { score: path.score + mass, widths: [...path.widths, width] }, target = t + "," + d, old = next.get(target);
          if (!old || candidate.score > old.score + 1e-15) next.set(target, candidate);
        }
      }
      states = next;
    });
    const best = states.get(needT + "," + needD);
    if (!best) throw Error("No se encontró una asignación compatible con las cantidades.");
    let cursor=0;
    return ranks.map((rank,i)=>locks[i]?previous[i]:rank.slice(0,best.widths[cursor++]).map(n=>SIGNS[n]).join(""));
  }

  function automaticBase(probabilities, maxColumns, locks = Array(14).fill(false), lockedBase = Array(14).fill("1")) {
    const rows=validateProbabilities(probabilities);
    if(!Number.isInteger(maxColumns)||maxColumns<1)throw Error("El máximo debe ser al menos una columna.");
    if(!Array.isArray(locks)||locks.length!==14||locks.some(x=>typeof x!=="boolean"))throw Error("Se requieren 14 estados de bloqueo válidos.");
    const previous=normalizeBase(lockedBase);
    const orders=rows.map(row=>[0,1,2].sort((a,b)=>row[b]-row[a]||a-b));
    let states=new Map([[1,{score:0,widths:[]}]]);
    rows.forEach((row,i)=>{
      if(locks[i]){const signs=previous[i],mass=[...signs].reduce((n,s)=>n+row[SIGNS.indexOf(s)],0),width=signs.length;const next=new Map();for(const [columns,path] of states){const size=columns*width;if(size<=maxColumns){const candidate={score:path.score+Math.log(Math.max(mass,1e-300)),widths:[...path.widths,width]},old=next.get(size);if(!old||candidate.score>old.score+1e-15)next.set(size,candidate);}}states=next;return;}
      const next=new Map();
      for(const [columns,path] of states)for(const width of [1,2,3]){
        const size=columns*width;if(size>maxColumns)continue;
        const mass=orders[i].slice(0,width).reduce((n,sign)=>n+row[sign],0);
        const candidate={score:path.score+Math.log(Math.max(mass,1e-300)),widths:[...path.widths,width]},old=next.get(size);
        if(!old||candidate.score>old.score+1e-15||(Math.abs(candidate.score-old.score)<=1e-15&&candidate.widths.join("")<old.widths.join("")))next.set(size,candidate);
      }
      states=next;
    });
    if(!states.size)throw Error("El máximo de columnas no permite crear una base.");
    const [columns,best]=[...states].sort((a,b)=>b[1].score-a[1].score||a[0]-b[0]||a[1].widths.join("").localeCompare(b[1].widths.join("")))[0];
    const base=rows.map((_,i)=>locks[i]?previous[i]:orders[i].slice(0,best.widths[i]).map(n=>SIGNS[n]).join(""));
    return {base,doubles:best.widths.filter(x=>x===2).length,triples:best.widths.filter(x=>x===3).length,columns,score:best.score};
  }

  function weightedProbabilities(sources) {
    const active=sources.filter(item=>Number(item.weight)>0);
    if(!active.length)throw Error("Asigna un peso positivo a alguna fuente auxiliar.");
    const rows=active.map(item=>validateProbabilities(item.values)),total=active.reduce((n,item)=>n+Number(item.weight),0);
    return Array.from({length:14},(_,i)=>[0,1,2].map(s=>active.reduce((n,item,j)=>n+rows[j][i][s]*Number(item.weight),0)/total));
  }

  function differentiateProbabilities(sport, publicRows, level) {
    const p=validateProbabilities(sport),q=validateProbabilities(publicRows);
    if(!Number.isInteger(level)||level<0||level>10)throw Error("La diferenciación debe estar entre 0 y 10.");
    if(level===0)return p;
    const alpha=level/10;
    return p.map((row,i)=>{
      const logs=row.map((value,j)=>value>0?Math.log(value)-alpha*Math.log(Math.max(q[i][j],1e-6)):-Infinity),peak=Math.max(...logs),raw=logs.map(x=>Math.exp(x-peak)),total=raw.reduce((a,b)=>a+b,0);
      return raw.map(x=>x/total);
    });
  }

  // Sort matches by the estimated chance that the most likely sign fails.
  function surpriseOrder(probabilities) {
    return validateProbabilities(probabilities).map((row,index)=>({index,risk:1-Math.max(...row)}))
      .sort((a,b)=>b.risk-a.risk||a.index-b.index);
  }
  function surpriseEligiblePositions(probabilities, level=0) {
    if(!Number.isInteger(level)||level<0||level>10)throw Error("El factor sorpresa debe estar entre 0 y 10.");
    return surpriseOrder(probabilities).slice(0,Math.min(14,4+level)).map(item=>item.index);
  }

  function reducedTemplate(probabilities, table, selectedPositions = null) {
    const rows=validateProbabilities(probabilities),triples=table.widths.filter(w=>w===3).length,doubles=table.widths.filter(w=>w===2).length;
    const uncertainty=rows.map((row,index)=>({index,max:Math.max(...row)})).sort((a,b)=>a.max-b.max||a.index-b.index);
    const chosen=selectedPositions===null?uncertainty.slice(0,triples+doubles).map(x=>x.index):[...selectedPositions];
    if(chosen.length!==triples+doubles||new Set(chosen).size!==chosen.length)throw Error("Selecciona exactamente "+(triples+doubles)+" partidos para esta reducida.");
    if(chosen.some(i=>!Number.isInteger(i)||i<0||i>13))throw Error("Posición de partido inválida.");
    const ranked=rows.map(row=>[0,1,2].sort((a,b)=>row[b]-row[a]||a-b));
    const sortedChosen=chosen.map(i=>({index:i,max:Math.max(...rows[i])})).sort((a,b)=>a.max-b.max||a.index-b.index);
    const triplePositions=sortedChosen.slice(0,triples).map(x=>x.index).sort((a,b)=>a-b);
    const doublePositions=sortedChosen.slice(triples).map(x=>x.index).sort((a,b)=>a-b);
    const groups={3:triplePositions.slice(),2:doublePositions.slice()},positions=[];
    const base=rows.map((_,i)=>ranked[i].slice(0,1).sort((a,b)=>a-b).map(n=>SIGNS[n]).join(""));
    for(const width of table.widths){const i=groups[width].shift();positions.push(i);base[i]=ranked[i].slice(0,width).sort((a,b)=>a-b).map(n=>SIGNS[n]).join("");}
    return {base,positions,selectedPositions:chosen};
  }

  function historicalBase(probabilities, history, targetCoverage=0.7, columnLimit=MAX_GENERATED, locks=Array(14).fill(false), lockedBase=Array(14).fill("1"), eligiblePositions=null) {
    const rows=validateProbabilities(probabilities);
    if(!Array.isArray(history)||!history.length||history.some(result=>typeof result!=="string"||!/^([1X2]{14})$/.test(result)))throw Error("Selecciona temporadas con resultados históricos válidos.");
    if(!Number.isFinite(targetCoverage)||targetCoverage<=0||targetCoverage>1)throw Error("La cobertura histórica objetivo debe estar entre 1% y 100%.");
    if(!Array.isArray(locks)||locks.length!==14||locks.some(x=>typeof x!=="boolean"))throw Error("Se requieren 14 estados de bloqueo válidos.");
    const previous=normalizeBase(lockedBase);
    const eligible=new Set(eligiblePositions===null?Array.from({length:14},(_,i)=>i):eligiblePositions);
    const ranks=rows.map(row=>[0,1,2].sort((a,b)=>row[b]-row[a]||a-b));
    let base=ranks.map((rank,i)=>locks[i]?previous[i]:SIGNS[rank[0]]),widths=base.map(row=>row.length),columns=widths.reduce((n,w)=>n*w,1);
    if(columns>columnLimit)throw Error("Los partidos bloqueados superan el límite técnico de columnas.");
    const measure=signs=>{let covered=0;for(const result of history){let ok=true;for(let i=0;i<14;i++)if(!signs[i].includes(result[i])){ok=false;break;}if(ok)covered++;}return covered;};
    // A small soft score lets the greedy search progress through bases where
    // no single added sign immediately covers a complete historical row.
    const potential=signs=>history.reduce((sum,result)=>sum+signs.reduce((weight,row,i)=>weight*(row.includes(result[i])?1:0.1),1),0);
    let covered=measure(base),score=potential(base);
    while(covered/history.length+1e-12<targetCoverage){
      let choice=null;
      for(let i=0;i<14;i++){
        const width=widths[i];if(locks[i]||!eligible.has(i)||width>=3)continue;
        const nextColumns=columns*(width+1)/width;if(nextColumns>columnLimit)continue;
        const candidate=base.slice(),added=SIGNS[ranks[i][width]];candidate[i]=SIGNS.filter(s=>candidate[i].includes(s)||s===added).join("");
        const candidateCovered=measure(candidate),candidateScore=potential(candidate),gain=candidateScore-score,cost=nextColumns-columns;
        const ratio=gain/cost;
        if(!choice||ratio>choice.ratio+1e-15||(Math.abs(ratio-choice.ratio)<=1e-15&&(gain>choice.gain||(gain===choice.gain&&i<choice.index))))choice={index:i,ratio,gain,covered:candidateCovered,score:candidateScore,base:candidate,columns:nextColumns};
      }
      if(!choice||choice.gain<=0)break;
      base=choice.base;widths[choice.index]++;columns=choice.columns;covered=choice.covered;score=choice.score;
    }
    return {base,doubles:widths.filter(w=>w===2).length,triples:widths.filter(w=>w===3).length,fixed:widths.filter(w=>w===1).length,columns,historicalCoverage:covered/history.length,historyRows:history.length,targetCoverage,targetReached:covered/history.length+1e-12>=targetCoverage};
  }

  function reduceByTable(base, goals, table, positions) {
    const normalized=normalizeBase(base),masks=goals.map(g=>[...new Set(String(g))]);
    if(table.widths.length!==table.patterns[0]?.length||positions.length!==table.widths.length||new Set(positions).size!==positions.length)throw Error("Las posiciones no coinciden con la tabla elegida.");
    positions.forEach((index,j)=>{if(!Number.isInteger(index)||index<0||index>13||normalized[index].length!==table.widths[j])throw Error("Elige posiciones con las anchuras requeridas por esta reducida.");});
    const other=Array.from({length:14},(_,i)=>i).filter(i=>!positions.includes(i)),bets=[];
    for(const pattern of table.patterns){
      const column=Array(14).fill("");
      positions.forEach((index,j)=>{column[index]=normalized[index][pattern[j]];});
      for(const i of other){if(normalized[i].length!==1)throw Error("La base de la reducida exige fijos fuera de las posiciones de la tabla.");column[i]=normalized[i];}
      for(const home of masks[0])for(const away of masks[1])bets.push(column.join("")+home+away);
    }
    return bets;
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
        if (Array.isArray(filters.allowedCounts?.[sign])) {
          if (!filters.allowedCounts[sign][counts[sign]]) return false;
          continue;
        }
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
      if (Array.isArray(filters.allowedVariantRuns)) {
        if (!filters.allowedVariantRuns[longest]) return false;
      } else if (longest > Number(filters.maxVariantRun ?? 14)) return false;
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
    normalizeBase, validateProbabilities, automaticPleno, parseProbabilitySource, coverageBase, configuredBase, automaticBase, historicalBase, applySurprise, weightedProbabilities, differentiateProbabilities, surpriseOrder, surpriseEligiblePositions, reducedTemplate, reduceByTable, coverageCounts, baseSize, satisfiesFilters,
    generateBets, probabilityMass, MAX_GENERATED,
    availableRounds, currentRound, scrutiny, live, evaluate, categoryPossibilities, awardBreakdown };
  if (typeof module !== "undefined") module.exports = root.EscrutinioEngine;
})(typeof globalThis !== "undefined" ? globalThis : this);
