const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../android/app/src/main/assets/engine.js");
global.window = {};
require("../android/app/src/main/assets/reduction-tables.js");
const tables = global.window.QuinielaReductionTables;
const matches = Array.from({ length: 14 }, (_, i) => ({ home: `Local ${i + 1}`, away: `Visitante ${i + 1}` }));
const probabilities = Array.from({ length: 14 }, (_, i) => {
  const a = 0.7 - i * 0.005;
  return [a, (1 - a) * 0.65, (1 - a) * 0.35];
});

test("manual base chooses exactly requested double/triple widths within column budget", () => {
  const base = E.configuredBase(probabilities, 2, 1, Number.MAX_SAFE_INTEGER);
  assert.equal(base.filter(x => x.length === 2).length, 2);
  assert.equal(base.filter(x => x.length === 3).length, 1);
  assert.equal(base.reduce((n, x) => n * x.length, 1), 12);
  assert.throws(() => E.configuredBase(probabilities, 2, 1, 6), /supera/);
});

test("automatic base is the exact maximum joint probability within the cap", () => {
  const chosen = E.automaticBase(probabilities, 6);
  assert.ok(chosen.columns <= 6);
  assert.equal(chosen.columns, chosen.doubles === 0 ? 3 ** chosen.triples : 2 ** chosen.doubles * 3 ** chosen.triples);
  assert.equal(chosen.base.filter(x => x.length === 2).length, chosen.doubles);
  assert.equal(chosen.base.filter(x => x.length === 3).length, chosen.triples);
  const mass = chosen.base.reduce((product, signs, i) => product * [...signs].reduce((sum, sign) => sum + probabilities[i]["1X2".indexOf(sign)], 0), 1);
  assert.ok(Math.abs(Math.exp(chosen.score) - mass) < 1e-12);
  assert.deepEqual(E.automaticBase(Array.from({length:14},()=>[1/3,1/3,1/3]),1).base, Array(14).fill("1"));
});

test("base algorithms preserve locked rows and reject incompatible locked widths", () => {
  const locks=Array(14).fill(false), previous=Array(14).fill("1");
  locks[0]=true; previous[0]="1X";
  const manual=E.configuredBase(probabilities,2,1,100,locks,previous);
  assert.equal(manual[0],"1X");
  assert.equal(manual.filter(row=>row.length===2).length,2);
  const automatic=E.automaticBase(probabilities,12,locks,previous);
  assert.equal(automatic.base[0],"1X");
  assert.ok(automatic.columns<=12);
  assert.throws(()=>E.configuredBase(probabilities,0,1,100,locks,previous),/bloqueos/);
});

test("auxiliary sources are combined by configured weights and normalized per row", () => {
  const first = Array.from({length:14},()=>[0.8,0.1,0.1]);
  const second = Array.from({length:14},()=>[0.1,0.2,0.7]);
  const result = E.weightedProbabilities([{values:first,weight:3},{values:second,weight:1}]);
  assert.ok(Math.abs(result[0][0]-0.625)<1e-12);
  assert.ok(Math.abs(result[0][2]-0.25)<1e-12);
  assert.ok(Math.abs(result[0].reduce((a,b)=>a+b,0)-1)<1e-12);
});

test("surprise factor ranks matches by estimated favorite-failure probability", () => {
  const rows=Array.from({length:14},(_,i)=>[0.9-i*0.02,0.08+i*0.01,0.02+i*0.01]);
  const order=E.surpriseOrder(rows);
  assert.equal(order[0].index,13);
  assert.equal(order[13].index,0);
  assert.equal(E.surpriseEligiblePositions(rows,0).length,4);
  assert.deepEqual(E.surpriseEligiblePositions(rows,0),order.slice(0,4).map(x=>x.index));
  assert.equal(E.surpriseEligiblePositions(rows,10).length,14);
  assert.throws(()=>E.surpriseEligiblePositions(rows,11),/entre 0 y 10/);
});

test("historical automatic base grows signs to sample coverage and respects surprise scope", () => {
  const history=Array.from({length:30},(_,i)=>"1"+(i<10?"1":i<20?"X":"2")+"1".repeat(12));
  const rows=Array.from({length:14},()=>[0.6,0.25,0.15]);
  const choice=E.historicalBase(rows,history,0.6,50000);
  assert.ok(choice.historicalCoverage>=0.6);
  assert.ok(choice.columns<=50000);
  const constrained=E.historicalBase(rows,history,0.35,50000,Array(14).fill(false),Array(14).fill("1"),[0]);
  assert.equal(constrained.base.slice(1).every(x=>x==="1"),true);
  assert.ok(constrained.historicalCoverage<=1);
});

test("public differentiation level zero leaves sport probabilities unchanged", () => {
  const market=Array.from({length:14},()=>[0.6,0.25,0.15]);
  const crowd=Array.from({length:14},()=>[0.7,0.2,0.1]);
  assert.deepEqual(E.differentiateProbabilities(market,crowd,0),market);
  const adjusted=E.differentiateProbabilities(market,crowd,10);
  assert.ok(adjusted[0][2]>market[0][2]);
});

test("automatic Pleno picks each team's most probable goal from market marginals", () => {
  assert.deepEqual(E.automaticPleno([[0.1,0.5,0.3,0.1],[0.4,0.1,0.2,0.3]]),["1","0"]);
  assert.deepEqual(E.automaticPleno([[0.25,0.25,0.25,0.25],[0.1,0.1,0.1,0.7]]),["0","M"]);
  assert.throws(()=>E.automaticPleno([[0.5,0.5],[0.25,0.25,0.25,0.25]]),/inválidas/);
});

test("probability JSON import checks round, ordered matches, type and capture time", () => {
  const doc = {schema:"quiniela_ai_studio.probabilities",version:1,round_key:"26-27/J13",source:"Fixture",captured_at:"2026-10-27T10:00:00+01:00",kind:"form5",
    matches: matches.map((m,i)=>({number:i+1,...m,p1:40,px:30,p2:30}))};
  const parsed = E.parseProbabilitySource(JSON.stringify(doc),"form.json","26-27/J13",matches,"custom");
  assert.equal(parsed.kind,"form5"); assert.equal(parsed.values.length,14);
  assert.throws(()=>E.parseProbabilitySource(JSON.stringify({...doc,round_key:"25-26/J13"}),"form.json","26-27/J13",matches),/otra temporada/);
  assert.throws(()=>E.parseProbabilitySource(JSON.stringify({...doc,matches:doc.matches.map((x,i)=>i?x:{...x,home:"Otro club"})}),"form.json","26-27/J13",matches),/no coinciden/);
});

test("probability CSV import accepts desktop exports with quoted team names", () => {
  const lines=["number,home,away,p1,px,p2,source,captured_at,kind"];
  matches.forEach((m,i)=>lines.push(`${i+1},\"${m.home}\",\"${m.away}\",40,30,30,Fixture,2026-10-27T10:00:00+01:00,history`));
  const parsed=E.parseProbabilitySource(lines.join("\n"),"source.csv","26-27/J13",matches);
  assert.equal(parsed.kind,"history");assert.equal(parsed.source,"Fixture");assert.deepEqual(parsed.values[0],[0.4,0.3,0.3]);
});

test("all six official reductions reproduce their table widths and column counts", () => {
  assert.equal(tables.length,6);
  for (const table of tables) {
    const template=E.reducedTemplate(probabilities,table);
    assert.equal(template.positions.length,table.widths.length);
    assert.deepEqual(template.positions.map(i=>template.base[i].length),table.widths);
    const bets=E.reduceByTable(template.base,["0","0"],table,template.positions);
    assert.equal(bets.length,table.patterns.length);
    assert.ok(bets.every(b=>b.length===16));
    const universe=[];const walk=(i,prefix)=>{if(i===14){universe.push(prefix);return;}for(const sign of template.base[i])walk(i+1,prefix+sign);};walk(0,"");
    for(const outcome of universe){const best=Math.max(...bets.map(b=>[...outcome].reduce((n,s,i)=>n+(s===b[i]),0)));assert.ok(best>=table.minimumHits,`tabla ${table.number} asegura ${best}, requiere ${table.minimumHits}`);}
  }
});


test("surprise changes double/triple placement without changing their counts", () => {
  const base=Array.from({length:14},(_,i)=>i<3?"1X":i<5?"1X2":"1");
  const locks=Array(14).fill(false);
  const zero=E.applySurprise(base,probabilities,0,locks,base);
  const high=E.applySurprise(base,probabilities,10,locks,base);
  for(const result of [zero,high]){
    assert.equal(result.doubles,3);assert.equal(result.triples,2);
    assert.equal(result.columns,3**2*2**3);
  }
  assert.notDeepEqual(zero.base,high.base);
});

test("condition filters accept independent exact sign counts and run lengths", () => {
  const filters={accountEnabled:true,allowedCounts:{"1":Array(15).fill(false),X:Array(15).fill(true),"2":Array(15).fill(true),V:Array(15).fill(true)},streakEnabled:true,allowedVariantRuns:Array(15).fill(false)};
  filters.allowedCounts["1"][2]=true;filters.allowedVariantRuns[12]=true;
  assert.equal(E.satisfiesFilters("11XXXXXXXXXXXX",filters),true);
  assert.equal(E.satisfiesFilters("111XXXXXXXXXXX",filters),false);
  filters.allowedVariantRuns[13]=true;filters.allowedCounts["1"][1]=true;
  assert.equal(E.satisfiesFilters("1XXXXXXXXXXXXX",filters),true);
});

test("generating with active conditions changes the bet set", () => {
  const base=Array(14).fill("1X"),goals=["0","0"];
  const all=E.generateBets(base,goals,{},E.MAX_GENERATED);
  const allowedCounts=Object.fromEntries(["1","X","2","V"].map(sign=>[sign,Array(15).fill(false)]));
  allowedCounts["1"][14]=true;allowedCounts.X[0]=true;allowedCounts["2"][0]=true;allowedCounts.V[0]=true;
  const filtered=E.generateBets(base,goals,{accountEnabled:true,allowedCounts},E.MAX_GENERATED);
  assert.equal(all.length,2**14);
  assert.deepEqual(filtered,["1111111111111100"]);
  assert.equal(E.countGeneratedBets(base,goals,{accountEnabled:true,allowedCounts}),filtered.length);
  assert.ok(filtered.length<all.length);
});

test("historical conditions select count and run values covering the requested sample share", () => {
  const rows=["11111111111111","1111111111111X","111111111111XX","X2222222222222"];
  const result=E.historicalConditionFilters(rows,0.75);
  assert.equal(result.sample,4);
  for(const sign of ["1","X","2","V"]) {
    assert.equal(result.allowedCounts[sign].length,15);
    assert.ok(result.coverage[sign]>=0.75);
  }
  assert.equal(result.allowedVariantRuns.length,15);
  assert.ok(result.coverage.runs>=0.75);
  assert.throws(()=>E.historicalConditionFilters([],0.7),/Selecciona temporadas/);
});

test("condition risk levels progressively narrow historical coverage and raise exclusion risk", () => {
  const coverage=["minimo","bajo","medio","alto","muy-alto"].map(E.conditionRiskCoverage);
  assert.deepEqual(coverage,[0.97,0.9,0.8,0.65,0.5]);
  assert.ok(coverage.every((value,index)=>index===0||value<coverage[index-1]));
  assert.throws(()=>E.conditionRiskCoverage("extremo"),/nivel de riesgo/);
});
