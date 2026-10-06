import { defineBank } from '@/engine/authoring';
import { Fraction, frac, gcd, num, numericOptions, q$, qty, simplifySurd, surdTex, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places, so it prints exactly. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` prints exactly with three significant figures (num() would not round it). */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** LaTeX for the square root of n/d: 2, \frac{1}{2}, \sqrt{2}, \frac{1}{\sqrt{2}}, \sqrt{\frac{2}{3}}. */
function sqrtRatioTex(n: number, d: number): string {
  const g = gcd(n, d);
  const top = simplifySurd(1, n / g);
  const bottom = simplifySurd(1, d / g);
  const surd = (c: number, r: number): string => (r === 1 ? String(c) : `${c === 1 ? '' : c}\\sqrt{${r}}`);
  if (top.r === 1 && bottom.r === 1) return new Fraction(top.c, bottom.c).toTex();
  if (bottom.r === 1) return bottom.c === 1 ? surd(top.c, top.r) : `\\frac{${surd(top.c, top.r)}}{${bottom.c}}`;
  if (top.r === 1) return `\\frac{${top.c}}{${surd(bottom.c, bottom.r)}}`;
  return `\\sqrt{\\frac{${n / g}}{${d / g}}}`;
}

/** A multiple of a symbol, e.g. 4X, \frac{X}{4}, \frac{2X}{3}, X. */
function multipleTex(f: Fraction, sym: string): string {
  const top = f.n === 1 ? sym : `${f.n}${sym}`;
  return f.d === 1 ? top : `\\frac{${top}}{${f.d}}`;
}

/** Words for scaling a quantity by a factor. */
function scaleWords(f: Fraction): string {
  const key = `${f.n}/${f.d}`;
  const words: Record<string, string> = {
    '1/1': 'kept unchanged',
    '2/1': 'doubled',
    '3/1': 'tripled',
    '4/1': 'quadrupled',
    '1/2': 'halved',
    '1/3': 'reduced to one-third',
    '1/4': 'reduced to one-fourth',
  };
  return words[key] ?? `multiplied by ${f.toString()}`;
}

/** Pythagorean triples (a, b, c) with a^2 + b^2 = c^2. */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];

/** Reactance cases: angular frequency (rad/s), component value (mH or uF), reactance in ohm. */
const XL_CASES = (() => {
  const out: Array<{ w: number; c: number; x: number }> = [];
  for (const w of [100, 200, 250, 400, 500, 1000, 2000, 5000]) {
    for (const c of [2, 4, 5, 10, 20, 25, 40, 50, 100, 200, 500]) {
      const x = (w * c) / 1000;
      if (x >= 1 && x <= 1000 && isTidy(x, 1) && exact3(x)) out.push({ w, c, x });
    }
  }
  return out;
})();

const XC_CASES = (() => {
  const out: Array<{ w: number; c: number; x: number }> = [];
  for (const w of [100, 200, 250, 400, 500, 1000, 2000, 5000]) {
    for (const c of [1, 2, 4, 5, 10, 20, 25, 40, 50, 100, 200, 500]) {
      const x = 1e6 / (w * c);
      if (x >= 1 && x <= 5000 && isTidy(x, 1) && exact3(x)) out.push({ w, c, x });
    }
  }
  return out;
})();

/** LC resonance cases: L in mH, C in uF, angular resonant frequency in rad/s. */
const LC_CASES = (() => {
  const out: Array<{ l: number; c: number; w: number }> = [];
  for (const l of [1, 2, 4, 5, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500]) {
    for (const c of [1, 2, 4, 5, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500]) {
      const w = 1 / Math.sqrt(l * c * 1e-9);
      const wr = Math.round(w);
      if (Math.abs(w - wr) < 1e-6 && wr % 2 === 0 && exact3(wr)) out.push({ l, c, w: wr });
    }
  }
  return out;
})();

/** Peak voltage (V) across a resistor (ohm) with average power (W). */
const PEAK_POWER_CASES = (() => {
  const out: Array<{ v0: number; r: number; p: number }> = [];
  for (const v0 of [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200, 240, 300]) {
    for (const r of [2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 200]) {
      const p = (v0 * v0) / (2 * r);
      if (p >= 1 && p <= 20000 && isTidy(p, 1) && exact3(p)) out.push({ v0, r, p });
    }
  }
  return out;
})();

const SCALES: readonly Fraction[] = [frac(1), frac(2), frac(3), frac(4), frac(1, 2), frac(1, 3), frac(1, 4)];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export default defineBank('physics', 'alternating-current', (b) => [
  b.dynamic('rms-peak-conversion', { difficulty: 1, origin: 'past-paper', tags: ['rms values'] }, (r) => {
    const V = (c: number): string => `$${surdTex(c, 2)}\\,\\mathrm{V}$`;
    if (r.chance(0.5)) {
      // Peak given, rms wanted.
      const k = r.multiple(10, 200, 5);
      const v0 = 2 * k;
      return {
        stem: tex`The peak value of a sinusoidal alternating voltage is $${qty(v0, U.V)}$. Its root-mean-square value is:`,
        answer: V(k),
        distractors: [V(v0), q$(k, U.V), q$(v0, U.V)],
        explanation: tex`$V_{rms} = \frac{V_0}{\sqrt{2}} = \frac{${v0}}{\sqrt{2}} = ${surdTex(k, 2)}\,\mathrm{V}$.`,
      };
    }
    // rms given, peak-to-peak wanted.
    const v = r.multiple(10, 240, 10);
    return {
      stem: tex`An AC voltmeter reads $${qty(v, U.V)}$ across a sinusoidal supply. The peak-to-peak value of the voltage is:`,
      answer: V(2 * v),
      distractors: [V(v), q$(2 * v, U.V), `$${surdTex(v / 2, 2)}\\,\\mathrm{V}$`],
      explanation: tex`A meter reads the rms value, so $V_0 = \sqrt{2}\,V_{rms} = ${surdTex(v, 2)}\,\mathrm{V}$ and the peak-to-peak value is $2V_0 = 2\sqrt{2}(${v}) = ${surdTex(2 * v, 2)}\,\mathrm{V}$.`,
    };
  }),

  b.dynamic('reactance-value', { difficulty: 2, tags: ['reactance'] }, (r) => {
    if (r.chance(0.5)) {
      const { w, c, x } = r.pick(XL_CASES);
      const { answer, distractors } = numericOptions(r, {
        correct: x,
        wrong: [x * 1000, 1000 / (w * c), 2 * x], // mH not converted, used 1/(omega L), extra factor 2
        format: (v) => q$(v, U.ohm),
      });
      return {
        stem: tex`A pure inductor of inductance $${qty(c, 'mH')}$ is connected to an AC source of angular frequency $${qty(w, U.radps)}$. Its inductive reactance is:`,
        answer,
        distractors,
        explanation: tex`$X_L = \omega L = (${w})(${c} \times 10^{-3}) = ${num(x)}\,\Omega$.`,
      };
    }
    const { w, c, x } = r.pick(XC_CASES);
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      wrong: [x / 1e6, w * c * 1e-6, 2 * x], // uF not converted, used omega C, extra factor 2
      format: (v) => q$(v, U.ohm),
    });
    return {
      stem: tex`A capacitor of capacitance $${qty(c, U.muF)}$ is connected to an AC source of angular frequency $${qty(w, U.radps)}$. Its capacitive reactance is:`,
      answer,
      distractors,
      explanation: tex`$X_C = \frac{1}{\omega C} = \frac{1}{(${w})(${c} \times 10^{-6})} = ${num(x)}\,\Omega$.`,
    };
  }),

  b.dynamic('reactance-scaling', { difficulty: 1, origin: 'past-paper', tags: ['reactance'] }, (r) => {
    const inductor = r.chance(0.5);
    const a = r.pick(SCALES.filter((s) => s.n !== s.d));
    const k = r.chance(0.5) ? frac(1) : r.pick(SCALES.filter((s) => s.n !== s.d));
    const sym = inductor ? 'X_L' : 'X_C';
    const net = a.mul(k);
    const correct = inductor ? net : net.inv();
    // Inverted relation, squared relation, ignored the second change, ignored all changes. When the
    // changes cancel (correct = 1) the first three collapse onto the answer, so the powers of `a` keep
    // at least three distinct distractors available.
    const candidates = [correct.inv(), correct.pow(2), correct.inv().pow(2), a, a.inv(), frac(1), a.pow(2), a.inv().pow(2)];
    const wrong: Fraction[] = [];
    for (const c of r.shuffle(candidates)) {
      if (!c.equals(correct) && !wrong.some((w) => w.equals(c)) && wrong.length < 3) wrong.push(c);
    }
    const part = inductor ? 'inductance' : 'capacitance';
    const change =
      k.n === k.d
        ? tex`the frequency of the supply is ${scaleWords(a)}`
        : tex`the frequency of the supply is ${scaleWords(a)} and the ${part} is ${scaleWords(k)}`;
    const formula = inductor ? tex`X_L = 2\pi f L` : tex`X_C = \frac{1}{2\pi f C}`;
    return {
      stem: tex`A ${inductor ? 'pure inductor' : 'capacitor'} has reactance $${sym}$ in an AC circuit. If ${change}, its reactance becomes:`,
      answer: `$${multipleTex(correct, sym)}$`,
      distractors: wrong.map((w) => `$${multipleTex(w, sym)}$`),
      explanation: tex`$${formula}$, so the reactance is ${inductor ? 'directly' : 'inversely'} proportional to $f${inductor ? 'L' : 'C'}$. Here $f${inductor ? 'L' : 'C'}$ is multiplied by $${net.toTex()}$, so the reactance becomes $${multipleTex(correct, sym)}$.`,
    };
  }),

  b.dynamic('series-impedance', { difficulty: 2, tags: ['impedance', 'RLC circuits'] }, (r) => {
    const [p, q, h] = r.pick(TRIPLES);
    const s = r.pick([1, 2, 3, 4, 5, 10].filter((m) => h * m <= 300));
    const [a, d] = r.chance(0.5) ? [p, q] : [q, p];
    const R = a * s;
    const diff = d * s;
    const Z = h * s;
    if (r.chance(0.3)) {
      // R-L series only.
      const { answer, distractors } = numericOptions(r, {
        correct: Z,
        wrong: [R + diff, Math.abs(diff - R), R * R + diff * diff],
        format: (v) => q$(v, U.ohm),
      });
      return {
        stem: tex`A resistor of $${qty(R, U.ohm)}$ is connected in series with a pure inductor of reactance $${qty(diff, U.ohm)}$ across an AC supply. The impedance of the circuit is:`,
        answer,
        distractors,
        explanation: tex`$Z = \sqrt{R^2 + X_L^2} = \sqrt{(${R})^2 + (${diff})^2} = ${Z}\,\Omega$. Resistance and reactance add as perpendicular phasors, not as plain numbers.`,
      };
    }
    const small = r.int(1, 6) * s;
    const inductive = r.chance(0.5);
    const XL = inductive ? small + diff : small;
    const XC = inductive ? small : small + diff;
    const { answer, distractors } = numericOptions(r, {
      correct: Z,
      wrong: [R + diff, R + XL + XC, XL + XC],
      format: (v) => q$(v, U.ohm),
    });
    return {
      stem: tex`A series RLC circuit has $R = ${qty(R, U.ohm)}$, $X_L = ${qty(XL, U.ohm)}$ and $X_C = ${qty(XC, U.ohm)}$. The impedance of the circuit is:`,
      answer,
      distractors,
      explanation: tex`$Z = \sqrt{R^2 + (X_L - X_C)^2} = \sqrt{(${R})^2 + (${XL - XC})^2} = ${Z}\,\Omega$. The reactances are $180^{\circ}$ out of phase, so they subtract.`,
    };
  }),

  b.dynamic('power-factor-from-circuit', { difficulty: 2, tags: ['power factor', 'impedance'] }, (r) => {
    const [p, q, h] = r.pick(TRIPLES);
    const s = r.pick([1, 2, 3, 4, 5, 10].filter((m) => h * m <= 300));
    const [a, d] = r.chance(0.5) ? [p, q] : [q, p];
    const R = a * s;
    const X = d * s;
    const Z = h * s;
    const correct = frac(a, h);
    // sin(phi); R and X added as plain numbers; tan or cot of phi (whichever is below 1, so no option
    // can be ruled out merely for exceeding 1). All four values are distinct for every triple used.
    const wrong = [frac(d, h), frac(a, a + d), frac(Math.min(a, d), Math.max(a, d))];
    let stem: string;
    let work: string;
    if (r.chance(0.5)) {
      const XC = r.int(1, 6) * s;
      const XL = XC + X;
      stem = tex`A series RLC circuit has $R = ${qty(R, U.ohm)}$, $X_L = ${qty(XL, U.ohm)}$ and $X_C = ${qty(XC, U.ohm)}$. The power factor of the circuit is:`;
      work = tex`$Z = \sqrt{R^2 + (X_L - X_C)^2} = \sqrt{(${R})^2 + (${X})^2} = ${Z}\,\Omega$`;
    } else {
      const inductive = r.chance(0.5);
      const el = inductive ? 'X_L' : 'X_C';
      stem = tex`A resistor $R = ${qty(R, U.ohm)}$ is connected in series with a ${inductive ? 'pure inductor' : 'capacitor'} of reactance $${el} = ${qty(X, U.ohm)}$ across an AC supply. The power factor of the circuit is:`;
      work = tex`$Z = \sqrt{R^2 + ${el}^2} = \sqrt{(${R})^2 + (${X})^2} = ${Z}\,\Omega$`;
    }
    return {
      stem,
      answer: `$${correct.toTex()}$`,
      distractors: wrong.map((w) => `$${w.toTex()}$`),
      explanation: tex`${work}, so the power factor is $\cos\phi = \frac{R}{Z} = \frac{${R}}{${Z}}${gcd(R, Z) === 1 ? '' : ` = ${correct.toTex()}`}$.`,
    };
  }),

  b.dynamic('peak-voltage-power', { difficulty: 2, origin: 'past-paper', tags: ['rms values', 'power factor'] }, (r) => {
    const { v0, r: R, p } = r.pick(PEAK_POWER_CASES);
    const { answer, distractors } = numericOptions(r, {
      correct: p,
      wrong: [2 * p, p / 2, 4 * p], // peak used as rms; halved twice; V0 multiplied by sqrt 2 instead of divided
      format: (v) => q$(v, U.W),
    });
    return {
      stem: tex`A sinusoidal voltage of peak value $${qty(v0, U.V)}$ is applied across a resistor of $${qty(R, U.ohm)}$. The average power dissipated in the resistor is:`,
      answer,
      distractors,
      explanation: tex`$P = \frac{V_{rms}^2}{R} = \frac{V_0^2}{2R} = \frac{(${v0})^2}{2(${R})} = ${num(p)}\,\mathrm{W}$. Using the peak value as if it were the rms value would double the answer.`,
    };
  }),

  b.dynamic('resonance-scaling', { difficulty: 2, origin: 'past-paper', tags: ['resonance'] }, (r) => {
    let p = frac(1);
    let q = frac(1);
    for (let i = 0; i < 50; i++) {
      p = r.pick(SCALES);
      q = r.pick(SCALES);
      if (!p.mul(q).equals(1)) break;
    }
    const pq = p.mul(q);
    const opt = (t: string): string => (t === '1' ? '$f_0$' : `$${t}\\,f_0$`);
    const factor = sqrtRatioTex(pq.d, pq.n);
    const rootOf = `\\sqrt{${pq.inv().toTex()}}`;
    const answer = opt(factor);
    const distractors = [opt(sqrtRatioTex(pq.n, pq.d)), opt(pq.inv().toTex()), opt(pq.toTex())];
    const parts: string[] = [];
    if (!p.equals(1)) parts.push(`the inductance is ${scaleWords(p)}`);
    if (!q.equals(1)) parts.push(`the capacitance is ${scaleWords(q)}`);
    return {
      stem: tex`The resonant frequency of an LC circuit is $f_0$. If ${parts.join(' and ')}, the resonant frequency becomes:`,
      answer,
      distractors,
      explanation: tex`$f_0 = \frac{1}{2\pi\sqrt{LC}}$, so $f_0 \propto \frac{1}{\sqrt{LC}}$. The product $LC$ is multiplied by $${pq.toTex()}$, so the frequency is multiplied by $${rootOf === factor ? factor : `${rootOf} = ${factor}`}$.`,
    };
  }),

  b.dynamic('resonant-frequency-value', { difficulty: 2, tags: ['resonance'] }, (r) => {
    const { l, c, w } = r.pick(LC_CASES);
    const given = tex`An inductor of $${qty(l, 'mH')}$ and a capacitor of $${qty(c, U.muF)}$ form a series LC circuit.`;
    const lcWork = tex`LC = (${l} \times 10^{-3})(${c} \times 10^{-6}) = ${num(l * c * 1e-9)}\,\mathrm{s^{2}}`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: w,
        wrong: [w * w, w / 2, 2 * w], // forgot the square root; spurious factors of 2
        format: (v) => q$(v, U.radps),
      });
      return {
        stem: tex`${given} Its resonant angular frequency is:`,
        answer,
        distractors,
        explanation: tex`$${lcWork}$, so $\omega_0 = \frac{1}{\sqrt{LC}} = ${num(w)}\,\mathrm{rad\,s^{-1}}$.`,
      };
    }
    const f = (n: number): string => `$\\frac{${num(n)}}{\\pi}\\,\\mathrm{Hz}$`;
    return {
      stem: tex`${given} Its resonant frequency is:`,
      answer: f(w / 2),
      distractors: [f(w), f(w / 4), f((w * w) / 2)],
      explanation: tex`$${lcWork}$, so $\omega_0 = \frac{1}{\sqrt{LC}} = ${num(w)}\,\mathrm{rad\,s^{-1}}$ and $f_0 = \frac{\omega_0}{2\pi} = \frac{${num(w / 2)}}{\pi}\,\mathrm{Hz}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'average-over-full-cycle', d: 1, t: ['rms values'],
      q: tex`The average value of a sinusoidal alternating voltage $V = V_0 \sin\omega t$ over one complete cycle is:`,
      a: 'zero',
      x: [tex`$\frac{V_0}{\sqrt{2}}$`, tex`$V_0$`, tex`$\frac{V_0}{2}$`],
      e: 'The positive and negative half-cycles are identical in shape, so they cancel over a full cycle. This is why AC is described by its rms value instead.',
    },
    {
      id: 'meters-read-rms', d: 1, o: 'past-paper', t: ['rms values'],
      q: 'An AC voltmeter connected across the domestic supply reads 220 V. This reading is the:',
      a: 'root-mean-square value',
      x: ['peak value', 'peak-to-peak value', 'average value over a cycle'],
      e: tex`AC meters are calibrated to show rms values; the corresponding peak value is $220\sqrt{2} \approx 311\,\mathrm{V}$.`,
    },
    {
      id: 'mains-peak-voltage', d: 1, t: ['rms values'],
      q: 'The domestic supply in Pakistan is 220 V (rms). The peak value of this voltage is about:',
      a: '311 V',
      x: ['156 V', '440 V', '622 V'],
      e: tex`$V_0 = \sqrt{2}\,V_{rms} = 1.414 \times 220 \approx 311\,\mathrm{V}$. 156 V is $220/\sqrt{2}$ and 622 V is the peak-to-peak value.`,
    },
    {
      id: 'capacitor-reactance-dc', d: 1, t: ['reactance'],
      q: 'The reactance offered by a capacitor to a steady direct current is:',
      a: 'infinitely large',
      x: ['zero', 'equal to its capacitance', 'equal to that for a 50 Hz supply'],
      e: tex`$X_C = \frac{1}{2\pi f C}$ and $f = 0$ for steady DC, so $X_C \to \infty$: a capacitor blocks DC once it is charged.`,
    },
    {
      id: 'inductor-phase', d: 1, t: ['reactance'],
      q: 'In a purely inductive AC circuit, the current:',
      a: tex`lags the voltage by $\frac{\pi}{2}$`,
      x: [tex`leads the voltage by $\frac{\pi}{2}$`, 'is in phase with the voltage', tex`lags the voltage by $\pi$`],
      e: tex`The self-induced emf opposes changes in current, so the current reaches its maximum a quarter-cycle ($90^{\circ}$) after the voltage. In a capacitor the current leads instead.`,
    },
    {
      id: 'wattless-current', d: 2, o: 'past-paper', t: ['power factor'],
      q: 'The average power consumed over a complete cycle by an ideal (resistanceless) inductor connected to an AC source is:',
      a: 'zero',
      x: [tex`$V_{rms} I_{rms}$`, tex`$V_0 I_0$`, tex`$\frac{V_0 I_0}{\sqrt{2}}$`],
      e: tex`$P = V_{rms} I_{rms} \cos\phi$ with $\phi = 90^{\circ}$, so $P = 0$; $V_{rms} I_{rms}$ is only the apparent power. Energy stored in the magnetic field in one quarter-cycle is returned to the source in the next.`,
    },
    {
      id: 'series-resonance-not-true', d: 2, o: 'past-paper', t: ['resonance', 'RLC circuits'],
      q: 'Which statement is NOT correct for a series RLC circuit at resonance?',
      a: 'The impedance of the circuit is maximum.',
      x: [
        'The current in the circuit is maximum.',
        'The inductive and capacitive reactances are equal.',
        'The power factor of the circuit is one.',
      ],
      e: tex`At series resonance $X_L = X_C$, so $Z = R$ is the minimum impedance; the current is then maximum and $\cos\phi = R/Z = 1$.`,
    },
    {
      id: 'capacitive-reactance-graph', d: 1, t: ['reactance'],
      q: 'A graph of capacitive reactance against the frequency of the supply is:',
      a: 'a hyperbola',
      x: ['a straight line through the origin', 'a straight line parallel to the frequency axis', 'a parabola'],
      e: tex`$X_C = \frac{1}{2\pi f C}$, so $X_C \propto \frac{1}{f}$, which is a hyperbola. A straight line through the origin is the graph of $X_L$ against $f$.`,
    },
    {
      id: 'choke-coil', d: 2, t: ['power factor', 'reactance'],
      q: 'A choke coil is preferred to a resistor for limiting alternating current because the choke:',
      a: 'wastes very little electrical energy as heat',
      x: ['raises the frequency of the supply', 'converts the alternating current into direct current', 'has a much larger resistance than the resistor'],
      e: tex`A choke has a large inductive reactance but very small resistance. Its power factor is nearly zero, so it limits the current while dissipating almost no power.`,
    },
    {
      id: 'rlc-above-resonance', d: 3, t: ['RLC circuits', 'resonance'],
      q: 'A series RLC circuit is driven at a frequency higher than its resonant frequency. The circuit behaves as:',
      a: 'inductive, with the current lagging the voltage',
      x: [
        'capacitive, with the current leading the voltage',
        'purely resistive, with the current in phase with the voltage',
        'inductive, with the current leading the voltage',
      ],
      e: tex`Above resonance $X_L = 2\pi f L$ has grown and $X_C = \frac{1}{2\pi f C}$ has shrunk, so $X_L > X_C$. The net reactance is inductive and the current lags the voltage.`,
    },
    {
      id: 'parallel-lc-resonance', d: 3, t: ['resonance', 'impedance'],
      q: 'At resonance, an ideal parallel LC circuit connected to an AC source offers an impedance that is:',
      a: 'maximum (ideally infinite)',
      x: ['minimum (ideally zero)', tex`equal to $X_L + X_C$`, tex`equal to $X_L$ alone`],
      e: tex`In the parallel circuit the branch currents are equal and $180^{\circ}$ out of phase, so the source current is (ideally) zero and the impedance is maximum. This is the opposite of series resonance, where the impedance is minimum.`,
    },
    {
      id: 'omega-l-unit', d: 1, o: 'past-paper', t: ['reactance'],
      q: tex`The quantity $\omega L$, where $\omega$ is angular frequency and $L$ is inductance, has the same SI unit as:`,
      a: 'resistance',
      x: ['inductance', 'capacitance', 'magnetic flux'],
      e: tex`$\omega L = X_L$ is the inductive reactance, measured in ohms: $\mathrm{s^{-1}} \times \mathrm{H} = \mathrm{s^{-1}} \times \Omega\,\mathrm{s} = \Omega$.`,
    },
    {
      id: 'three-phase-difference', d: 1, t: ['rms values'],
      q: 'In a three-phase AC supply, the phase difference between any two of the phase voltages is:',
      a: tex`$120^{\circ}$`,
      x: [tex`$90^{\circ}$`, tex`$180^{\circ}$`, tex`$60^{\circ}$`],
      e: tex`The three coils of the generator are set $120^{\circ}$ apart, so the three emfs are $120^{\circ}$ out of phase with each other.`,
    },
  ]),
]);
