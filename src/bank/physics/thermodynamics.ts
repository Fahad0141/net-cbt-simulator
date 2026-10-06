import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, gcd, lcm, num, numericOptions, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** Percentage option such as `$25\%$`. */
const pct = (x: number): string => `$${num(x)}\\%$`;

/** LaTeX for (n/d) times a symbol: `2v`, `\frac{1}{4}E`, `v`. */
function scaledTex(n: number, d: number, sym: string): string {
  const g = gcd(n, d);
  const a = n / g;
  const b = d / g;
  if (b === 1) return a === 1 ? sym : `${a}${sym}`;
  return `\\frac{${a}}{${b}}${sym}`;
}

/** Option `$2v$` style for a rational factor. */
const scaled$ = (n: number, d: number, sym: string): string => `$${scaledTex(n, d, sym)}$`;

/** Ratio option `$4 : 1$`. */
const ratio$ = (a: number, b: number): string => `$${a} : ${b}$`;

/** Celsius temperature shown in a stem, e.g. `27^{\circ}C`. */
const degC = (kelvin: number): string => qty(kelvin - 273, U.degC);

/** Change of internal energy written in words. */
function deltaUText(x: number): string {
  if (x === 0) return 'no change';
  return x > 0 ? `an increase of $${qty(x, U.J)}$` : `a decrease of $${qty(-x, U.J)}$`;
}

// ---------------------------------------------------------------------------
// Pre-computed parameter sets (pure and deterministic)
// ---------------------------------------------------------------------------

/** Carnot engines: sink and source in K (both at or above 0 degC), efficiency an integer percent. */
const CARNOT_CASES = (() => {
  const out: Array<{ tc: number; th: number; eta: number }> = [];
  for (const tc of [273, 280, 290, 300, 320, 330, 350, 360, 373, 400, 450, 500, 550, 600]) {
    for (let eta = 10; eta <= 80; eta += 5) {
      const th = (tc * 100) / (100 - eta);
      if (Number.isInteger(th) && th <= 1400) {
        out.push({ tc, th, eta });
      }
    }
  }
  return out;
})();

/** Absolute temperature changed by a perfect-square ratio a^2/b^2 (for r.m.s. speed scaling). */
const RMS_CASES = (() => {
  const out: Array<{ t1: number; t2: number; a: number; b: number }> = [];
  const roots: ReadonlyArray<readonly [number, number]> = [[2, 1], [3, 1], [1, 2], [3, 2], [2, 3], [1, 3]];
  for (const t1 of [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200]) {
    for (const [a, b] of roots) {
      const t2 = (t1 * a * a) / (b * b);
      if (Number.isInteger(t2) && t2 >= 100 && t2 <= 2000 && t2 !== 273 && t1 !== 273) out.push({ t1, t2, a, b });
    }
  }
  return out;
})();

/** Charles's law: volume in cm^3 and temperatures in K (both above 0 degC) giving an integer new volume. */
const CHARLES_CASES = (() => {
  const out: Array<{ v1: number; t1: number; t2: number; v2: number }> = [];
  for (const t1 of [280, 290, 300, 310, 320, 330, 350, 360, 373, 400, 450, 500]) {
    for (const t2 of [280, 290, 300, 320, 330, 350, 360, 373, 400, 450, 500, 546, 600, 750, 900]) {
      if (t1 === t2) continue;
      for (const v1 of [100, 120, 150, 180, 200, 240, 250, 300, 360, 400, 450, 500, 600, 750, 800, 900]) {
        const v2 = (v1 * t2) / t1;
        if (Number.isInteger(v2) && v2 !== v1) out.push({ v1, t1, t2, v2 });
      }
    }
  }
  return out;
})();

/** Carnot engines whose efficiency is raised from e1 % to e2 % (source in K). */
const CARNOT_RAISE_CASES = (() => {
  const out: Array<{ t1: number; e1: number; e2: number; sinkDrop: number; sourceRise: number }> = [];
  const effs = [20, 25, 30, 40, 50, 60];
  for (const t1 of [400, 500, 600, 800, 900, 1000, 1200]) {
    for (const e1 of effs) {
      for (const e2 of effs) {
        if (e2 <= e1) continue;
        const t2 = (t1 * (100 - e1)) / 100;
        const sinkDrop = (t1 * (e2 - e1)) / 100;
        const sourceRise = (t2 * 100) / (100 - e2) - t1;
        if (Number.isInteger(t2) && Number.isInteger(sinkDrop) && Number.isInteger(sourceRise)) {
          out.push({ t1, e1, e2, sinkDrop, sourceRise });
        }
      }
    }
  }
  return out;
})();

/** Words for a scaling factor applied to a gas variable. */
const FACTORS: ReadonlyArray<{ n: number; d: number; word: string }> = [
  { n: 2, d: 1, word: 'doubled' },
  { n: 3, d: 1, word: 'tripled' },
  { n: 4, d: 1, word: 'quadrupled' },
  { n: 1, d: 2, word: 'halved' },
  { n: 1, d: 3, word: 'reduced to one-third' },
  { n: 1, d: 4, word: 'reduced to one-fourth' },
  { n: 3, d: 2, word: 'increased to 1.5 times its original value' },
];

/** Gas pairs (lighter first) whose molar-mass ratio is a perfect square. */
const GAS_PAIRS: ReadonlyArray<{ light: string; heavy: string; k: number }> = [
  { light: 'H_2', heavy: 'O_2', k: 4 },
  { light: 'He', heavy: 'CH_4', k: 2 },
  { light: 'CH_4', heavy: 'SO_2', k: 2 },
  { light: 'He', heavy: 'SO_2', k: 4 },
  { light: 'H_2', heavy: 'CH_4', k: 0 }, // ratio 8: used only for the kinetic-energy variant
];

const ENTROPY_TEMPS = [250, 300, 320, 350, 400, 450, 500, 600];

export default defineBank('physics', 'thermodynamics', (b) => [
  // =========================================================================
  // Dynamic (parametric) templates
  // =========================================================================
  b.dynamic('carnot-efficiency', { difficulty: 1, origin: 'past-paper', tags: ['Carnot cycle'] }, (r) => {
    const { tc, th, eta } = r.pick(CARNOT_CASES);
    const inCelsius = r.chance(0.7);
    const sinkC = tc - 273;
    const sourceC = th - 273;
    const wrong = [
      ...(inCelsius && sinkC > 0 ? [(1 - sinkC / sourceC) * 100] : []), // used Celsius temperatures
      100 - eta, // computed Tc/Th
      ((th - tc) / tc) * 100, // divided by the sink temperature
      ...(inCelsius ? [(sinkC / sourceC) * 100] : []),
      // near misses keep any fallback option below 100% (an efficiency above 100% is a give-away)
      eta + 5, eta - 5, eta + 10, eta - 10, eta + 15, eta - 15,
    ];
    const { answer, distractors } = numericOptions(r, { correct: eta, wrong: wrong.filter((x) => x >= 5 && x < 100), format: pct });
    const hot = inCelsius ? qty(sourceC, U.degC) : qty(th, U.K);
    const cold = inCelsius ? qty(sinkC, U.degC) : qty(tc, U.K);
    const convert = inCelsius ? tex`In kelvin, $T_1 = ${sourceC} + 273 = ${th}\,\mathrm{K}$ and $T_2 = ${sinkC} + 273 = ${tc}\,\mathrm{K}$. ` : '';
    return {
      stem: tex`A Carnot engine works between a source at $${hot}$ and a sink at $${cold}$. Its efficiency is:`,
      answer,
      distractors,
      explanation: tex`${convert}$\eta = 1 - \frac{T_2}{T_1} = 1 - \frac{${tc}}{${th}} = ${frac(th - tc, th).toTex()} = ${eta}\%$. Temperatures must be absolute (kelvin), never Celsius.`,
    };
  }),

  b.dynamic('first-law-numeric', { difficulty: 1, origin: 'past-paper', tags: ['first law'] }, (r) => {
    const kind = r.pick(['by-less', 'by-more', 'on'] as const);
    const q = r.multiple(200, 3000, 50);
    let w: number;
    if (kind === 'by-less') w = r.multiple(50, q - 50, 50);
    else if (kind === 'by-more') w = r.multiple(q + 50, q + 1500, 50);
    else w = r.multiple(50, 2000, 50);
    const byGas = kind !== 'on';
    const du = byGas ? q - w : q + w;
    const answer = deltaUText(du);
    const candidates = byGas
      ? [deltaUText(q + w), deltaUText(-du), deltaUText(w), deltaUText(q), 'no change']
      : [deltaUText(q - w), deltaUText(-du), deltaUText(w - q), deltaUText(q), 'no change'];
    const workPhrase = byGas
      ? tex`it does $${qty(w, U.J)}$ of work on its surroundings by expanding`
      : tex`$${qty(w, U.J)}$ of work is done on the gas to compress it`;
    const sub = byGas ? tex`${q} - ${w}` : tex`${q} - (-${w})`;
    return {
      stem: tex`A gas absorbs $${qty(q, U.J)}$ of heat while ${workPhrase}. The change in the internal energy of the gas is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`First law: $\Delta U = Q - W$, with $W$ the work done **by** the gas (negative when work is done on it). $\Delta U = ${sub} = ${du}\,\mathrm{J}$, i.e. ${answer}.`,
    };
  }),

  b.dynamic('isobaric-work', { difficulty: 1, tags: ['first law'] }, (r) => {
    const p = r.pick([100, 120, 150, 200, 250, 300, 400, 500]); // kPa
    const v1 = r.int(1, 15);
    const v2 = r.int(v1 + 1, v1 + 12);
    const dv = v2 - v1;
    const w = p * dv;
    const showKpa = r.chance(0.5);
    const pTex = showKpa ? qty(p, 'kPa') : qty(sci(p * 1000), U.Pa);
    const { answer, distractors } = numericOptions(r, {
      correct: w,
      // used the final volume; forgot litre -> m^3; kept kPa as Pa
      wrong: [p * v2, w * 1000, w / 1000, p * v1],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A gas at a constant pressure of $${pTex}$ expands from $${qty(v1, 'L')}$ to $${qty(v2, 'L')}$. The work done by the gas is:`,
      answer,
      distractors,
      explanation: tex`$W = P\Delta V$ with $\Delta V = ${v2} - ${v1} = ${dv}\,\mathrm{L} = ${dv} \times 10^{-3}\,\mathrm{m^{3}}$. So $W = (${p} \times 10^{3})(${dv} \times 10^{-3}) = ${w}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('engine-efficiency', { difficulty: 1, tags: ['heat engines'] }, (r) => {
    const eta = r.pick([20, 25, 30, 40, 50, 60, 75]);
    const step = 100 / gcd(100, eta);
    const q1 = r.multiple(Math.max(step, 400), 6000, Math.max(step, 100));
    const w = (q1 * eta) / 100;
    const q2 = q1 - w;
    const kind = r.pick(['efficiency', 'rejected', 'absorbed'] as const);
    if (kind === 'efficiency') {
      const { answer, distractors } = numericOptions(r, {
        correct: eta,
        // used Q2/Q1; divided W by Q2; divided Q2 by (Q1 + Q2); near misses (all kept below 100%)
        wrong: [100 - eta, (w / q2) * 100, (q2 / (q1 + q2)) * 100, eta + 5, eta - 5, eta + 10, eta - 10].filter((x) => x > 0 && x < 100),
        format: pct,
      });
      return {
        stem: tex`In each cycle a heat engine absorbs $${qty(q1, U.J)}$ of heat from the hot reservoir and rejects $${qty(q2, U.J)}$ to the cold reservoir. Its efficiency is:`,
        answer,
        distractors,
        explanation: tex`$W = Q_1 - Q_2 = ${q1} - ${q2} = ${w}\,\mathrm{J}$, so $\eta = \frac{W}{Q_1} = \frac{${w}}{${q1}} = ${eta}\%$.`,
      };
    }
    if (kind === 'rejected') {
      const { answer, distractors } = numericOptions(r, {
        correct: q2,
        // gave the work instead; added the work; ignored the efficiency
        wrong: [w, q1 + w, q1, q1 / 2],
        format: (x) => q$(x, U.J),
      });
      return {
        stem: tex`A heat engine of efficiency $${eta}\%$ absorbs $${qty(q1, U.J)}$ of heat per cycle. The heat it rejects to the sink per cycle is:`,
        answer,
        distractors,
        explanation: tex`$W = \eta Q_1 = ${num(eta / 100)} \times ${q1} = ${w}\,\mathrm{J}$, and $Q_2 = Q_1 - W = ${q1} - ${w} = ${q2}\,\mathrm{J}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: q1,
      // multiplied by the efficiency; gave the heat rejected; divided by (1 - eta)
      wrong: [(w * eta) / 100, q2, w / (1 - eta / 100), w + q1],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A heat engine of efficiency $${eta}\%$ delivers $${qty(w, U.J)}$ of work per cycle. The heat it absorbs from the source per cycle is:`,
      answer,
      distractors,
      explanation: tex`$\eta = \frac{W}{Q_1}$, so $Q_1 = \frac{W}{\eta} = \frac{${w}}{${num(eta / 100)}} = ${q1}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('rms-speed-scaling', { difficulty: 2, origin: 'past-paper', tags: ['kinetic theory'] }, (r) => {
    const variant = r.weighted(['temperature', 'gases', 'ke-gases'] as const, [3, 1.2, 0.8]);
    if (variant === 'temperature') {
      const { t1, t2, a, b: bb } = r.pick(RMS_CASES);
      const asksSpeed = r.chance(0.6);
      const m = [a * a, bb * bb] as const;
      if (asksSpeed) {
        const answer = scaled$(a, bb, 'v');
        const distractors = pickDistractors(answer, [
          scaled$(m[0], m[1], 'v'), // forgot the square root
          scaled$(bb, a, 'v'), // inverted
          scaled$(m[1], m[0], 'v'),
          scaled$(2 * a, bb, 'v'),
          scaled$(1, 1, 'v'),
        ]);
        return {
          stem: tex`The r.m.s. speed of the molecules of a gas at $${degC(t1)}$ is $v$. If the temperature is changed to $${degC(t2)}$, the r.m.s. speed becomes:`,
          answer,
          distractors,
          explanation: tex`$v_{\mathrm{rms}} = \sqrt{\frac{3RT}{M}} \propto \sqrt{T}$ with $T$ in kelvin: $T_1 = ${t1}\,\mathrm{K}$, $T_2 = ${t2}\,\mathrm{K}$. So $v' = \sqrt{\frac{${t2}}{${t1}}}\,v = ${scaledTex(a, bb, 'v')}$.`,
        };
      }
      const answer = scaled$(m[0], m[1], 'E');
      const distractors = pickDistractors(answer, [
        scaled$(a, bb, 'E'), // took a square root that is not there
        scaled$(m[1], m[0], 'E'), // inverted
        scaled$(m[0] * m[0], m[1] * m[1], 'E'),
        scaled$(bb, a, 'E'),
      ]);
      return {
        stem: tex`The average translational kinetic energy of a molecule of a gas at $${degC(t1)}$ is $E$. At $${degC(t2)}$ it becomes:`,
        answer,
        distractors,
        explanation: tex`$\langle K.E.\rangle = \frac{3}{2}kT \propto T$ with $T$ in kelvin: $T_1 = ${t1}\,\mathrm{K}$, $T_2 = ${t2}\,\mathrm{K}$, so the energy becomes $\frac{${t2}}{${t1}}E = ${scaledTex(m[0], m[1], 'E')}$.`,
      };
    }
    if (variant === 'gases') {
      const { light, heavy, k } = r.pick(GAS_PAIRS.filter((g) => g.k > 0));
      const answer = ratio$(k, 1);
      const distractors = pickDistractors(answer, [ratio$(1, k), ratio$(k * k, 1), ratio$(1, 1), ratio$(1, k * k)]);
      return {
        stem: tex`Samples of $\mathrm{${light}}$ and $\mathrm{${heavy}}$ are at the same temperature. The ratio of the r.m.s. speed of $\mathrm{${light}}$ molecules to that of $\mathrm{${heavy}}$ molecules is:`,
        answer,
        distractors,
        explanation: tex`$v_{\mathrm{rms}} = \sqrt{\frac{3RT}{M}} \propto \frac{1}{\sqrt{M}}$ at a fixed temperature. The molar masses are in the ratio $1 : ${k * k}$, so the speeds are in the ratio $\sqrt{${k * k}} : 1 = ${k} : 1$; the lighter molecules move faster.`,
      };
    }
    const { light, heavy } = r.pick(GAS_PAIRS);
    const answer = ratio$(1, 1);
    const pairs = [[1, 16], [16, 1], [1, 4], [4, 1], [1, 8], [8, 1], [1, 2], [2, 1]] as const;
    const ratioMass: Record<string, number> = { H_2: 2, He: 4, CH_4: 16, O_2: 32, SO_2: 64 };
    const mr = (ratioMass[heavy] ?? 2) / (ratioMass[light] ?? 1);
    const mrSqrt = Math.sqrt(mr);
    const preferred = [ratio$(1, mr), ratio$(mr, 1)];
    if (Number.isInteger(mrSqrt)) preferred.push(ratio$(1, mrSqrt));
    const distractors = pickDistractors(answer, [...preferred, ...pairs.map(([x, y]) => ratio$(x, y))]);
    return {
      stem: tex`Samples of $\mathrm{${light}}$ and $\mathrm{${heavy}}$ are at the same temperature. The ratio of the average translational kinetic energy of a molecule of $\mathrm{${light}}$ to that of a molecule of $\mathrm{${heavy}}$ is:`,
      answer,
      distractors,
      explanation: tex`$\langle K.E.\rangle = \frac{3}{2}kT$ depends only on the absolute temperature, not on the molecular mass. At the same temperature the ratio is $1 : 1$ (the lighter molecules simply move faster).`,
    };
  }),

  b.dynamic('gas-law-scaling', { difficulty: 2, tags: ['gas laws'] }, (r) => {
    if (r.chance(0.6)) {
      const askVolume = r.chance(0.5);
      const [fa, fb] = r.sample(FACTORS, 2) as [(typeof FACTORS)[number], (typeof FACTORS)[number]];
      // askVolume: fa scales P, fb scales T, V' = V * T/P. Otherwise fa scales V, fb scales T, P' = P * T/V.
      const sym = askVolume ? 'V' : 'P';
      const ans = frac(fb.n * fa.d, fb.d * fa.n);
      const opt = (f: Fraction): string => scaled$(f.n, f.d, sym);
      const answer = opt(ans);
      const candidates = [
        opt(frac(fb.n * fa.n, fb.d * fa.d)), // multiplied the two factors
        opt(frac(fa.n * fb.d, fa.d * fb.n)), // inverted the ratio
        opt(frac(fa.d * fb.d, fa.n * fb.n)),
        opt(frac(fb.n, fb.d)), // ignored the first change
        opt(frac(fa.d, fa.n)),
        opt(frac(2, 1)),
        opt(frac(1, 2)),
        opt(frac(4, 1)),
      ];
      const first = askVolume ? 'pressure' : 'volume';
      return {
        stem: tex`The ${first} of a fixed mass of an ideal gas is ${fa.word} and its absolute temperature is ${fb.word}. If its original ${askVolume ? 'volume' : 'pressure'} was $${sym}$, its new ${askVolume ? 'volume' : 'pressure'} is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: askVolume
          ? tex`From $\frac{PV}{T} = \text{constant}$, $V \propto \frac{T}{P}$. So $V' = \frac{${frac(fb.n, fb.d).toTex()}}{${frac(fa.n, fa.d).toTex()}}V = ${scaledTex(ans.n, ans.d, 'V')}$.`
          : tex`From $\frac{PV}{T} = \text{constant}$, $P \propto \frac{T}{V}$. So $P' = \frac{${frac(fb.n, fb.d).toTex()}}{${frac(fa.n, fa.d).toTex()}}P = ${scaledTex(ans.n, ans.d, 'P')}$.`,
      };
    }
    const { v1, t1, t2, v2 } = r.pick(CHARLES_CASES);
    const c1 = t1 - 273;
    const c2 = t2 - 273;
    const { answer, distractors } = numericOptions(r, {
      correct: v2,
      // used Celsius temperatures; inverted the ratio; used Celsius and inverted
      wrong: [(v1 * c2) / c1, (v1 * t1) / t2, (v1 * c1) / c2],
      format: (x) => q$(x, U.cm3),
    });
    return {
      stem: tex`A gas occupies $${qty(v1, U.cm3)}$ at $${qty(c1, U.degC)}$. If its pressure is kept constant, its volume at $${qty(c2, U.degC)}$ is:`,
      answer,
      distractors,
      explanation: tex`Charles's law with absolute temperatures: $\frac{V_1}{T_1} = \frac{V_2}{T_2}$, $T_1 = ${t1}\,\mathrm{K}$, $T_2 = ${t2}\,\mathrm{K}$. $V_2 = ${v1} \times \frac{${t2}}{${t1}} = ${v2}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('entropy-change', { difficulty: 2, tags: ['entropy'] }, (r) => {
    if (r.chance(0.55)) {
      const t = r.pick(ENTROPY_TEMPS);
      const k = r.int(2, 30);
      const q = k * t;
      const c = t - 273;
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        // used Celsius; used 273 K; added 273 to a kelvin value
        wrong: [q / c, q / 273, q / (t + 273)],
        format: (x) => q$(x, U.JK),
      });
      return {
        stem: tex`A system absorbs $${qty(q, U.J)}$ of heat reversibly at a constant temperature of $${qty(c, U.degC)}$. Its change in entropy is:`,
        answer,
        distractors,
        explanation: tex`$\Delta S = \frac{\Delta Q}{T}$ with $T$ in kelvin: $T = ${c} + 273 = ${t}\,\mathrm{K}$, so $\Delta S = \frac{${q}}{${t}} = ${k}\,\mathrm{J\,K^{-1}}$.`,
      };
    }
    const [hot, cold] = r.sample(ENTROPY_TEMPS, 2).sort((x, y) => y - x) as [number, number];
    const base = lcm(hot, cold);
    const kMax = Math.max(1, Math.floor(30000 / base));
    const q = base * r.int(1, Math.min(kMax, 12));
    const sCold = q / cold;
    const sHot = q / hot;
    const net = sCold - sHot;
    const { answer, distractors } = numericOptions(r, {
      correct: net,
      // added the two; took only the cold body's gain; signs reversed; used the temperature difference
      wrong: [sCold + sHot, sCold, -net, q / (hot - cold), sHot],
      format: (x) => q$(x, U.JK),
      allowNegative: true,
    });
    return {
      stem: tex`$${qty(q, U.J)}$ of heat flows by conduction from a large reservoir at $${qty(hot, U.K)}$ to another at $${qty(cold, U.K)}$. The net change in entropy of the two reservoirs is:`,
      answer,
      distractors,
      explanation: tex`$\Delta S = \frac{Q}{T_{\text{cold}}} - \frac{Q}{T_{\text{hot}}} = \frac{${q}}{${cold}} - \frac{${q}}{${hot}} = ${num(sCold)} - ${num(sHot)} = ${num(net)}\,\mathrm{J\,K^{-1}}$. It is positive, as for every irreversible process.`,
    };
  }),

  b.dynamic('carnot-sink-change', { difficulty: 3, origin: 'past-paper', tags: ['Carnot cycle'] }, (r) => {
    const { t1, e1, e2, sinkDrop, sourceRise } = r.pick(CARNOT_RAISE_CASES);
    const t2 = (t1 * (100 - e1)) / 100;
    const newSink = t2 - sinkDrop;
    const newSource = t1 + sourceRise;
    if (r.chance(0.6)) {
      const { answer, distractors } = numericOptions(r, {
        correct: sinkDrop,
        // gave the new sink temperature; applied the change to the sink; gave the source change
        wrong: [newSink, (t2 * (e2 - e1)) / 100, sourceRise, (t1 * e2) / 100],
        format: (x) => q$(x, U.K),
      });
      return {
        stem: tex`A Carnot engine with its source at $${qty(t1, U.K)}$ has an efficiency of $${e1}\%$. With the source temperature kept fixed, to raise the efficiency to $${e2}\%$ the sink temperature must be lowered by:`,
        answer,
        distractors,
        explanation: tex`$T_2 = T_1(1 - \eta)$. Initially $T_2 = ${t1}(1 - ${num(e1 / 100)}) = ${t2}\,\mathrm{K}$; finally $T_2' = ${t1}(1 - ${num(e2 / 100)}) = ${newSink}\,\mathrm{K}$. Decrease $= ${t2} - ${newSink} = ${sinkDrop}\,\mathrm{K}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: sourceRise,
      // gave the new source temperature; gave the sink change; used T2 * (e2 - e1); used T1' * (e2 - e1)
      wrong: [newSource, sinkDrop, (t2 * (e2 - e1)) / 100, (newSource * (e2 - e1)) / 100],
      format: (x) => q$(x, U.K),
    });
    return {
      stem: tex`A Carnot engine with its source at $${qty(t1, U.K)}$ has an efficiency of $${e1}\%$. With the sink temperature kept fixed, to raise the efficiency to $${e2}\%$ the source temperature must be increased by:`,
      answer,
      distractors,
      explanation: tex`Sink: $T_2 = T_1(1 - \eta) = ${t1}(1 - ${num(e1 / 100)}) = ${t2}\,\mathrm{K}$. New source: $T_1' = \frac{T_2}{1 - \eta'} = \frac{${t2}}{${num(1 - e2 / 100)}} = ${newSource}\,\mathrm{K}$. Increase $= ${newSource} - ${t1} = ${sourceRise}\,\mathrm{K}$.`,
    };
  }),

  // =========================================================================
  // Fixed (conceptual) questions
  // =========================================================================
  ...b.mcqs([
    {
      id: 'isothermal-heat-to-work',
      d: 1,
      o: 'past-paper',
      t: ['first law'],
      q: 'When an ideal gas expands isothermally, the heat it absorbs:',
      a: 'is used entirely in doing external work',
      x: [
        'is used entirely to increase its internal energy',
        'is partly used to raise its temperature',
        'is zero, as its temperature stays constant',
      ],
      e: tex`The internal energy of an ideal gas depends only on its temperature, so in an isothermal change $\Delta U = 0$ and the first law gives $Q = W$: all the heat absorbed goes into work done by the gas. Constant temperature does not mean no heat flows.`,
    },
    {
      id: 'isochoric-heat',
      d: 1,
      t: ['first law'],
      q: 'Heat is supplied to a gas kept at constant volume. The heat supplied:',
      a: 'all goes into increasing the internal energy of the gas',
      x: [
        'all goes into work done by the gas',
        'is shared equally between work and internal energy',
        'leaves the internal energy of the gas unchanged',
      ],
      e: tex`At constant volume $\Delta V = 0$, so $W = P\Delta V = 0$ and the first law gives $\Delta U = Q$: the gas only gets hotter.`,
    },
    {
      id: 'cp-minus-cv',
      d: 1,
      o: 'past-paper',
      t: ['molar specific heats'],
      q: tex`For an ideal gas, the difference between the molar specific heats, $C_p - C_v$, is equal to:`,
      a: tex`$R$`,
      x: [tex`$\frac{3}{2}R$`, tex`$\frac{R}{2}$`, tex`$\gamma R$`],
      e: tex`Heating one mole by $1\,\mathrm{K}$ at constant pressure needs the same $\Delta U$ as at constant volume plus the work $P\Delta V = R\Delta T = R$. Hence $C_p - C_v = R$ (Mayer's relation), about $8.31\,\mathrm{J\,mol^{-1}\,K^{-1}}$.`,
    },
    {
      id: 'mean-ke-depends-on-temperature',
      d: 1,
      t: ['kinetic theory'],
      q: 'The average translational kinetic energy of a molecule of an ideal gas depends only on:',
      a: 'the absolute temperature of the gas',
      x: ['the mass of the molecule', 'the pressure of the gas', 'the volume of the gas'],
      e: tex`Kinetic theory gives $\langle\frac{1}{2}mv^2\rangle = \frac{3}{2}kT$, where $k$ is Boltzmann's constant, so it depends on the absolute temperature alone. Heavier molecules simply move more slowly at the same temperature.`,
    },
    {
      id: 'second-law-statement',
      d: 1,
      o: 'past-paper',
      t: ['heat engines'],
      q: 'Which of the following agrees with the second law of thermodynamics?',
      a: 'No engine working in a cycle can convert all the heat it absorbs into work',
      x: [
        'Heat can flow by itself from a colder body to a hotter body',
        'A frictionless heat engine can have an efficiency of 100%',
        'The entropy of an isolated system decreases with time',
      ],
      e: 'Kelvin statement: a cyclic engine must reject some heat to a colder sink, so no engine (even a frictionless, ideal one) is 100% efficient. Heat flows by itself only from hot to cold, and the entropy of an isolated system never decreases.',
    },
    {
      id: 'carnot-working-substance',
      d: 1,
      t: ['Carnot cycle'],
      q: 'The efficiency of a Carnot engine depends on:',
      a: 'the temperatures of the source and the sink only',
      x: [
        'the nature of the working substance',
        'the quantity of working substance used',
        'the pressure of the working substance',
      ],
      e: tex`$\eta = 1 - \frac{T_2}{T_1}$ involves only the absolute temperatures of the source ($T_1$) and sink ($T_2$); every reversible engine between the same two temperatures has the same efficiency, whatever its working substance.`,
    },
    {
      id: 'adiabatic-expansion',
      d: 2,
      t: ['first law'],
      q: 'When an ideal gas expands adiabatically:',
      a: 'it does work at the expense of its internal energy, so it cools',
      x: [
        'heat flows into it, so its temperature stays constant',
        'its internal energy increases because it does work',
        'its pressure stays constant while its volume increases',
      ],
      e: tex`Adiabatic means $Q = 0$, so the first law gives $\Delta U = -W$. The gas does positive work in expanding, its internal energy falls and its temperature drops (as in the cooling of air rising in the atmosphere).`,
    },
    {
      id: 'gamma-monatomic',
      d: 2,
      t: ['molar specific heats'],
      q: tex`The ratio $\gamma = \frac{C_p}{C_v}$ for a monatomic ideal gas is:`,
      a: tex`$\frac{5}{3}$`,
      x: [tex`$\frac{7}{5}$`, tex`$\frac{4}{3}$`, tex`$\frac{3}{2}$`],
      e: tex`A monatomic molecule has only translational energy, so $C_v = \frac{3}{2}R$ and $C_p = C_v + R = \frac{5}{2}R$. Then $\gamma = \frac{5/2}{3/2} = \frac{5}{3} \approx 1.67$. The value $\frac{7}{5}$ belongs to a diatomic gas.`,
    },
    {
      id: 'cp-greater-than-cv',
      d: 2,
      t: ['molar specific heats'],
      q: tex`The molar specific heat of a gas at constant pressure, $C_p$, is greater than that at constant volume, $C_v$, because at constant pressure:`,
      a: 'part of the heat supplied is used in doing work as the gas expands',
      x: [
        'the molecules gain more kinetic energy for the same rise in temperature',
        'part of the heat supplied is absorbed by the walls of the container',
        'the heat supplied increases the attraction between the molecules',
      ],
      e: tex`For the same rise in temperature, $\Delta U$ is the same in both cases (it depends only on $T$). At constant pressure the gas also expands and does work $P\Delta V$, so extra heat is needed: $C_p = C_v + R$.`,
    },
    {
      id: 'kinetic-theory-pressure',
      d: 2,
      t: ['kinetic theory'],
      q: tex`According to kinetic theory, the pressure of an ideal gas having $N_0$ molecules per unit volume, each of mass $m$, with mean square speed $\langle v^2\rangle$, is:`,
      a: tex`$P = \frac{1}{3}N_0 m\langle v^2\rangle$`,
      x: [tex`$P = \frac{2}{3}N_0 m\langle v^2\rangle$`, tex`$P = \frac{3}{2}N_0 m\langle v^2\rangle$`, tex`$P = 3N_0 m\langle v^2\rangle$`],
      e: tex`Molecular collisions with the walls give $P = \frac{1}{3}N_0 m\langle v^2\rangle = \frac{2}{3}N_0\langle\frac{1}{2}mv^2\rangle$. The factor $\frac{2}{3}$ appears only when the pressure is written in terms of the mean kinetic energy, not $m\langle v^2\rangle$.`,
    },
    {
      id: 'entropy-not-correct',
      d: 2,
      t: ['entropy'],
      q: 'Which of the following statements about entropy is **NOT** correct?',
      a: 'The entropy of an isolated system decreases in an irreversible process',
      x: [
        'Entropy is a measure of the disorder of a system',
        'The entropy of the universe increases in every natural process',
        'The entropy of a system stays constant in a reversible adiabatic process',
      ],
      e: tex`In any irreversible process in an isolated system entropy **increases**; it stays constant only for reversible processes. A reversible adiabatic process has $\Delta Q = 0$, so $\Delta S = \frac{\Delta Q}{T} = 0$.`,
    },
    {
      id: 'free-expansion',
      d: 3,
      t: ['entropy', 'first law'],
      q: 'An ideal gas in a thermally insulated container is allowed to expand freely into a vacuum. Which statement is correct?',
      a: 'Its temperature stays the same, but its entropy increases',
      x: [
        'It cools, because it does work in expanding',
        'Its temperature and its entropy both stay the same',
        'It warms up, because its internal energy increases',
      ],
      e: tex`Expanding into a vacuum the gas pushes against nothing, so $W = 0$; the container is insulated, so $Q = 0$. Hence $\Delta U = 0$ and, for an ideal gas, $T$ is unchanged. The process is irreversible (the gas never collects back by itself), so the entropy increases.`,
    },
  ]),
]);
