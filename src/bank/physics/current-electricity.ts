import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

/** `x` has at most `dp` decimal places, so it prints exactly. */
function isTidy(x: number, dp = 2): boolean {
  const scaled = x * 10 ** dp;
  return Math.abs(scaled - Math.round(scaled)) < 1e-9;
}

/** `x` prints exactly with three significant figures. */
function exact3(x: number): boolean {
  return Number(x.toPrecision(3)) === Number(x.toPrecision(12));
}

/** A multiple of R as LaTeX: `R`, `4R`, `\frac{R}{2}`, `\frac{3R}{4}`. */
function factorR(f: Fraction): string {
  if (f.isInteger()) return f.toNumber() === 1 ? 'R' : `${f.toNumber()}R`;
  const [p, q] = f.toString().split('/');
  return `\\frac{${p === '1' ? '' : p}R}{${q}}`;
}

const ohms = (x: number): string => q$(x, U.ohm);

/** Balanced Wheatstone bridge: AB = P, BC = Q, AD = R, DC = X; galvanometer B-D; cell across A-C. */
function wheatstoneSvg(p: number, q: number, rr: number): string {
  const A = [50, 115];
  const B = [160, 35];
  const C = [270, 115];
  const D = [160, 195];
  const el: string[] = [];
  const line = (a: number[], b: number[]): void => {
    el.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#000" stroke-width="1.6"/>`);
  };
  // Four arms, each with a resistor box at its midpoint.
  const arm = (a: number[], b: number[], label: string, dx: number, dy: number): void => {
    line(a, b);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    el.push(
      `<rect x="${mx - 18}" y="${my - 7}" width="36" height="14" fill="#fff" stroke="#000" stroke-width="1.6" transform="rotate(${Math.round(ang)} ${mx} ${my})"/>`,
    );
    el.push(`<text x="${mx + dx}" y="${my + dy}" text-anchor="middle">${label}</text>`);
  };
  arm(A, B, `P = ${p} Ω`, -38, -12);
  arm(B, C, `Q = ${q} Ω`, 38, -12);
  arm(A, D, `R = ${rr} Ω`, -20, 30);
  arm(D, C, 'X', 30, 22);
  // Galvanometer between B and D.
  line(B, [160, 100]);
  line([160, 130], D);
  el.push('<circle cx="160" cy="115" r="15" fill="#fff" stroke="#000" stroke-width="1.6"/>');
  el.push('<text x="160" y="120" text-anchor="middle">G</text>');
  // Cell across A and C (below the bridge).
  line(A, [50, 235]);
  line([50, 235], [152, 235]);
  line([168, 235], [270, 235]);
  line([270, 235], C);
  el.push('<line x1="152" y1="222" x2="152" y2="248" stroke="#000" stroke-width="1.6"/>');
  el.push('<line x1="168" y1="228" x2="168" y2="242" stroke="#000" stroke-width="3"/>');
  for (const [name, pt, dx, dy] of [
    ['A', A, -14, 5],
    ['B', B, 0, -10],
    ['C', C, 14, 5],
    ['D', D, 0, 22],
  ] as const) {
    el.push(`<circle cx="${pt[0]}" cy="${pt[1]}" r="3" fill="#000"/>`);
    el.push(`<text x="${pt[0] + dx}" y="${pt[1] + dy}" text-anchor="middle" font-weight="bold">${name}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 260" width="330" height="260" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#000">${el.join('')}</svg>`;
}

// ---------------------------------------------------------------------------
// Pre-computed parameter sets (pure and deterministic)
// ---------------------------------------------------------------------------

/** Changes to a wire of fixed material: length factor p, radius factor q, so R' = (p / q^2) R. */
const WIRE_CHANGES: ReadonlyArray<{ text: string; p: Fraction; q: Fraction }> = [
  { text: 'both its length and its radius are doubled', p: frac(2), q: frac(2) },
  { text: 'its length is doubled and its radius is halved', p: frac(2), q: frac(1, 2) },
  { text: 'its length is halved and its radius is doubled', p: frac(1, 2), q: frac(2) },
  { text: 'its radius is doubled while its length is unchanged', p: frac(1), q: frac(2) },
  { text: 'its diameter is halved while its length is unchanged', p: frac(1), q: frac(1, 2) },
  { text: 'both its length and its diameter are tripled', p: frac(3), q: frac(3) },
  { text: 'its length is tripled and its radius is halved', p: frac(3), q: frac(1, 2) },
  { text: 'both its length and its radius are halved', p: frac(1, 2), q: frac(1, 2) },
  { text: 'its length is doubled and its diameter is tripled', p: frac(2), q: frac(3) },
];

/** Pairs of resistors (ohm) whose parallel combination is a whole number. */
const PARALLEL_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [3, 6], [4, 4], [4, 12], [6, 6], [6, 12], [10, 15], [12, 4], [20, 5], [8, 8], [10, 10],
  [12, 12], [10, 40], [30, 60], [20, 30], [6, 3], [12, 24], [15, 30], [8, 24], [24, 8], [20, 20],
];

const E_CHARGE = tex`(take $e = 1.6 \times 10^{-19}\,\mathrm{C}$)`;

export default defineBank('physics', 'current-electricity', (b) => [
  // =========================================================================
  // Ohm's law and current
  // =========================================================================
  b.dynamic('electrons-through-wire', { difficulty: 1, tags: ['Ohm law'] }, (r) => {
    const iMa = r.pick([16, 32, 48, 64, 80, 160, 320, 480, 800]);
    const t = r.pick([1, 2, 4, 5, 10, 20, 50]);
    const q = (iMa / 1000) * t;
    const n = q / 1.6e-19;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      // mA not converted to A; forgot the time; multiplied Q by e instead of dividing
      wrong: [n * 1000, n / t, q * 1.6e-19],
      format: (x) => `$${sci(x)}$`,
    });
    return {
      stem: tex`A steady current of $${qty(iMa, U.mA)}$ flows through a wire for $${qty(t, U.s)}$. The number of electrons that pass any cross-section of the wire in this time is ${E_CHARGE}:`,
      answer,
      distractors,
      explanation: tex`$Q = It = (${num(iMa / 1000)}\,\mathrm{A})(${t}\,\mathrm{s}) = ${num(q)}\,\mathrm{C}$, so $n = \frac{Q}{e} = \frac{${num(q)}}{1.6 \times 10^{-19}} = ${sci(n)}$.`,
    };
  }),

  // =========================================================================
  // Resistivity
  // =========================================================================
  b.dynamic('wire-resistance-scaling', { difficulty: 1, origin: 'past-paper', tags: ['resistivity'] }, (r) => {
    if (r.chance(0.4)) {
      const n = r.pick([2, 3, 4]);
      const r0 = r.int(2, 25);
      const { answer, distractors } = numericOptions(r, {
        correct: n * n * r0,
        // ignored the thinning of the wire; unchanged; inverted the factor; cubed
        wrong: [n * r0, r0, r0 / n, n * n * n * r0],
        format: ohms,
      });
      return {
        stem: tex`A uniform wire of resistance $${qty(r0, U.ohm)}$ is stretched until its length becomes ${n} times its original length. Assuming its volume and resistivity do not change, its new resistance is:`,
        answer,
        distractors,
        explanation: tex`With volume fixed, $A$ falls to $\frac{A}{${n}}$ as $L$ rises to $${n}L$. So $R' = \rho\frac{${n}L}{A/${n}} = ${n}^2 R = ${n * n} \times ${r0} = ${n * n * r0}\,\Omega$.`,
      };
    }
    const c = r.pick(WIRE_CHANGES);
    const f = c.p.div(c.q.pow(2));
    const answer = `$${factorR(f)}$`;
    const candidates = [
      c.p.div(c.q), // forgot to square the radius factor
      c.p.mul(c.q.pow(2)), // multiplied by the area factor instead of dividing
      f.inv(), // inverted the result
      c.p, // considered the length only
      f.mul(2),
      f.div(2),
    ].map((x) => `$${factorR(x)}$`);
    return {
      stem: tex`A metal wire has resistance $R$. If ${c.text}, its resistance becomes:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$R = \rho\frac{L}{A} = \rho\frac{L}{\pi r^2}$. ${c.p.equals(1) ? '$L$ is unchanged' : `$L$ is multiplied by $${c.p.toTex()}$`} and $r^2$ is multiplied by $${c.q.pow(2).toTex()}$, so $R' = ${c.p.equals(1) ? '' : `${c.p.toTex()} \\times `}${c.q.pow(2).inv().toTex()} \times R = ${factorR(f)}$. Resistivity is unchanged because the material and temperature are the same.`,
    };
  }),

  // =========================================================================
  // Series and parallel
  // =========================================================================
  b.dynamic('series-parallel-equivalent', { difficulty: 2, tags: ['series and parallel'] }, (r) => {
    if (r.chance(0.35)) {
      const n = r.pick([2, 3, 4]);
      const k = r.int(1, 8);
      const each = n * n * k;
      const series = n * each;
      const par = each / n;
      const { answer, distractors } = numericOptions(r, {
        correct: par,
        // took one resistor's value; series value unchanged; multiplied by n^2 instead of dividing
        wrong: [each, series, series * n * n],
        format: ohms,
      });
      return {
        stem: tex`${n === 2 ? 'Two' : n === 3 ? 'Three' : 'Four'} identical resistors connected in series have an equivalent resistance of $${qty(series, U.ohm)}$. If they are connected in parallel instead, the equivalent resistance is:`,
        answer,
        distractors,
        explanation: tex`Each resistor is $R = \frac{${series}}{${n}} = ${each}\,\Omega$. In parallel, $R_p = \frac{R}{n} = \frac{${each}}{${n}} = ${num(par)}\,\Omega$ (in general $R_s = n^2 R_p$).`,
      };
    }
    const [r1, r2] = r.pick(PARALLEL_PAIRS);
    const r3 = r.int(1, 20);
    const rp = (r1 * r2) / (r1 + r2);
    const total = rp + r3;
    const allPar = 1 / (1 / r1 + 1 / r2 + 1 / r3);
    const { answer, distractors } = numericOptions(r, {
      correct: total,
      // all in series; forgot the series resistor; all in parallel; added instead of combining in parallel
      wrong: [r1 + r2 + r3, rp, allPar, ((r1 + r2) * r3) / (r1 + r2 + r3)],
      format: ohms,
    });
    return {
      stem: tex`Resistors of $${qty(r1, U.ohm)}$ and $${qty(r2, U.ohm)}$ are connected in parallel, and this combination is connected in series with a $${qty(r3, U.ohm)}$ resistor. The equivalent resistance of the arrangement is:`,
      answer,
      distractors,
      explanation: tex`$R_p = \frac{R_1R_2}{R_1 + R_2} = \frac{(${r1})(${r2})}{${r1 + r2}} = ${num(rp)}\,\Omega$, then $R_{eq} = R_p + R_3 = ${num(rp)} + ${r3} = ${num(total)}\,\Omega$.`,
    };
  }),

  // =========================================================================
  // Power
  // =========================================================================
  b.dynamic('kwh-energy-cost', { difficulty: 1, origin: 'past-paper', tags: ['power'] }, (r) => {
    const p = r.pick([40, 60, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000]);
    const days = 30;
    // Only hours that keep the energy exact at 3 significant figures (750 W x odd hours gives 112.5 kWh, etc.).
    const h = r.pick([2, 3, 4, 5, 6, 7, 8, 9, 10].filter((hh) => exact3((p * hh * days) / 1000)));
    const e = (p * h * days) / 1000;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: e,
        // one day only; left the power in watts; forgot the hours per day
        wrong: [e / days, e * 1000, (p * days) / 1000],
        format: (x) => q$(x, 'kWh'),
      });
      return {
        stem: tex`A $${qty(p, U.W)}$ appliance is used for ${h} hours every day. The electrical energy it consumes in ${days} days is:`,
        answer,
        distractors,
        explanation: tex`$E = Pt = (${num(p / 1000)}\,\mathrm{kW})(${h} \times ${days}\,\mathrm{h}) = ${num(e)}\,\mathrm{kWh}$.`,
      };
    }
    const prices = [10, 15, 20, 25, 30, 40, 50].filter((c) => isTidy(e * c, 0));
    const price = prices.length ? r.pick(prices) : 50;
    const cost = e * price;
    const { answer, distractors } = numericOptions(r, {
      correct: cost,
      // one day only; left the power in watts; forgot the hours per day
      wrong: [cost / days, cost * 1000, (p * days * price) / 1000],
      format: (x) => tex`Rs. $${num(x, { autoSci: false, sig: 6 })}$`,
    });
    return {
      stem: tex`A $${qty(p, U.W)}$ appliance runs for ${h} hours a day. If electricity costs Rs. ${price} per unit (kWh), the cost of running it for ${days} days is:`,
      answer,
      distractors,
      explanation: tex`Energy $= (${num(p / 1000)}\,\mathrm{kW})(${h} \times ${days}\,\mathrm{h}) = ${num(e)}\,\mathrm{kWh}$; cost $= ${num(e)} \times ${price} = $ Rs. $${num(cost, { autoSci: false, sig: 6 })}$.`,
    };
  }),

  b.dynamic('bulb-power-at-lower-voltage', { difficulty: 2, tags: ['power'] }, (r) => {
    const v0 = r.pick([220, 240, 200, 120]);
    const p = r.pick([40, 60, 100, 200, 500, 1000]);
    const ratios = (
      [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10]] as const
    ).filter(([a, d]) => (v0 * a) % d === 0 && isTidy((p * a * a) / (d * d), 2) && exact3((p * a * a) / (d * d)));
    const [a, d] = ratios.length ? r.pick(ratios) : ([1, 2] as const);
    const v = (v0 * a) / d;
    const pNew = (p * a * a) / (d * d);
    const { answer, distractors } = numericOptions(r, {
      correct: pNew,
      // power taken proportional to V; assumed power stays at the rating; inverted the ratio
      wrong: [(p * a) / d, p, (p * d) / a],
      format: (x) => q$(x, U.W),
    });
    return {
      stem: tex`A bulb is rated $${qty(p, U.W)}$, $${qty(v0, U.V)}$. Assuming its resistance stays constant, the power it consumes when connected to a $${qty(v, U.V)}$ supply is:`,
      answer,
      distractors,
      explanation: tex`$R = \frac{V_0^2}{P_0}$ is fixed, so $P = \frac{V^2}{R} = P_0\left(\frac{V}{V_0}\right)^2 = ${p}\left(\frac{${v}}{${v0}}\right)^2 = ${num(pNew)}\,\mathrm{W}$.`,
    };
  }),

  b.dynamic('heater-coil-shortened', { difficulty: 2, origin: 'past-paper', tags: ['power', 'resistivity'] }, (r) => {
    const fracs = [[1, 2], [3, 4], [2, 3], [4, 5], [3, 5]] as const;
    let p0 = 1000;
    let [a, d]: readonly [number, number] = fracs[0];
    for (let k = 0; k < 40; k++) {
      const pp = r.pick([400, 500, 600, 800, 900, 1000, 1200, 1500, 1800, 2000]);
      const ff = r.pick(fracs);
      if (isTidy((pp * ff[1]) / ff[0], 0)) {
        p0 = pp;
        [a, d] = ff;
        break;
      }
    }
    const pNew = (p0 * d) / a;
    const kept = frac(a, d).toTex();
    const { answer, distractors } = numericOptions(r, {
      correct: pNew,
      // took power proportional to resistance; assumed power unchanged; squared the factor
      wrong: [(p0 * a) / d, p0, (p0 * d * d) / (a * a)],
      format: (x) => q$(x, U.W),
    });
    return {
      stem: tex`An electric heater rated $${qty(p0, U.W)}$ on the mains has its coil shortened so that only $${kept}$ of the original length remains. Connected to the same mains supply, its power is now:`,
      answer,
      distractors,
      explanation: tex`$R \propto L$, so $R' = ${kept}R$. At fixed $V$, $P = \frac{V^2}{R}$, so $P' = \frac{P}{${kept}} = ${p0} \times \frac{${d}}{${a}} = ${num(pNew)}\,\mathrm{W}$: a shorter coil draws more current and gives more power.`,
    };
  }),

  // =========================================================================
  // EMF and internal resistance
  // =========================================================================
  b.dynamic('terminal-voltage', { difficulty: 2, origin: 'past-paper', tags: ['EMF and internal resistance'] }, (r) => {
    let i = 2;
    let ri = 1;
    let rl = 5;
    for (let k = 0; k < 40; k++) {
      const ii = r.pick([0.5, 1, 1.5, 2, 2.5, 3]);
      const rr = r.pick([0.5, 1, 1.5, 2]);
      const rload = r.int(2, 12);
      const e = ii * (rload + rr);
      if (isTidy(e, 1) && e <= 24 && rload > rr) {
        i = ii;
        ri = rr;
        rl = rload;
        break;
      }
    }
    const e = i * (rl + ri);
    const v = i * rl;
    const given = tex`A battery of emf $${qty(e, U.V)}$ and internal resistance $${qty(ri, U.ohm)}$ is connected to an external resistor of $${qty(rl, U.ohm)}$.`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: v,
        // ignored internal resistance; gave the lost volts; added the lost volts
        wrong: [e, i * ri, e + i * ri],
        format: (x) => q$(x, U.V),
      });
      return {
        stem: tex`${given} The potential difference across the terminals of the battery is:`,
        answer,
        distractors,
        explanation: tex`$I = \frac{E}{R + r} = \frac{${num(e)}}{${rl} + ${num(ri)}} = ${num(i)}\,\mathrm{A}$, so $V = E - Ir = ${num(e)} - (${num(i)})(${num(ri)}) = ${num(v)}\,\mathrm{V}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: i,
      // ignored internal resistance; short-circuit current; subtracted r
      wrong: [e / rl, e / ri, e / (rl - ri)],
      format: (x) => q$(x, U.A),
    });
    return {
      stem: tex`${given} The current in the circuit is:`,
      answer,
      distractors,
      explanation: tex`$I = \frac{E}{R + r} = \frac{${num(e)}}{${rl} + ${num(ri)}} = ${num(i)}\,\mathrm{A}$. The internal resistance is in series with the external resistor.`,
    };
  }),

  // =========================================================================
  // Wheatstone bridge
  // =========================================================================
  b.dynamic('wheatstone-unknown', { difficulty: 1, tags: ['Wheatstone bridge'] }, (r) => {
    if (r.chance(0.5)) {
      const pairs = [
        [10, 20], [20, 10], [10, 30], [30, 10], [50, 100], [100, 50], [100, 10], [10, 100],
        [20, 50], [50, 20], [40, 10], [10, 40], [100, 200], [200, 100],
      ] as const;
      let [p, q]: readonly number[] = pairs[0];
      let rr = 6;
      for (let k = 0; k < 40; k++) {
        const pq = r.pick(pairs);
        const cand = r.int(2, 60);
        if (isTidy((pq[1] * cand) / pq[0], 1) && exact3((pq[1] * cand) / pq[0])) {
          [p, q] = pq;
          rr = cand;
          break;
        }
      }
      const x = (q * rr) / p;
      const { answer, distractors } = numericOptions(r, {
        correct: x,
        // inverted the ratio; assumed X equals R; used Q in place of the ratio
        wrong: [(p * rr) / q, rr, (q * rr) / (p + q)],
        format: ohms,
      });
      return {
        stem: tex`The Wheatstone bridge shown is balanced: the galvanometer G shows no deflection. The unknown resistance $X$ is:`,
        answer,
        distractors,
        figure: wheatstoneSvg(p, q, rr),
        explanation: tex`At balance $V_B = V_D$, so $\frac{P}{Q} = \frac{R}{X}$ and $X = \frac{QR}{P} = \frac{(${q})(${rr})}{${p}} = ${num(x)}\,\Omega$.`,
      };
    }
    let l = 40;
    let rk = 6;
    for (let k = 0; k < 40; k++) {
      const ll = r.pick([20, 25, 30, 40, 60, 70, 75, 80]);
      const cand = r.int(2, 40);
      const x = (cand * ll) / (100 - ll);
      if (isTidy(x, 1) && exact3(x)) {
        l = ll;
        rk = cand;
        break;
      }
    }
    const x = (rk * l) / (100 - l);
    const { answer, distractors } = numericOptions(r, {
      correct: x,
      // swapped the two lengths; divided by the whole wire; assumed X = R
      wrong: [(rk * (100 - l)) / l, (rk * l) / 100, rk],
      format: ohms,
    });
    return {
      stem: tex`In a metre bridge, an unknown resistance $X$ is in the left gap and a known $${qty(rk, U.ohm)}$ resistor is in the right gap. The null point is found $${qty(l, U.cm)}$ from the left end of the wire. The value of $X$ is:`,
      answer,
      distractors,
      explanation: tex`The metre bridge is a Wheatstone bridge with the wire as ratio arms: $\frac{X}{R} = \frac{l}{100 - l}$, so $X = ${rk} \times \frac{${l}}{${100 - l}} = ${num(x)}\,\Omega$.`,
    };
  }),

  // =========================================================================
  // Potentiometer
  // =========================================================================
  b.dynamic('potentiometer-compare-emf', { difficulty: 2, tags: ['potentiometer'] }, (r) => {
    let e1 = 1.5;
    let l1 = 60;
    let l2 = 80;
    for (let k = 0; k < 60; k++) {
      const ee = r.pick([1.5, 2, 1.1, 1.2]);
      const a = r.multiple(40, 150, 5);
      const c = r.multiple(20, 180, 5);
      const e2 = (ee * c) / a;
      if (c !== a && isTidy(e2, 2) && exact3(e2) && e2 >= 0.3 && e2 <= 4) {
        e1 = ee;
        l1 = a;
        l2 = c;
        break;
      }
    }
    const e2 = (e1 * l2) / l1;
    const { answer, distractors } = numericOptions(r, {
      correct: e2,
      // inverted the length ratio; used the difference of lengths; assumed the emfs equal
      wrong: [(e1 * l1) / l2, (e1 * Math.abs(l2 - l1)) / l1, e1],
      format: (x) => q$(x, U.V),
    });
    return {
      stem: tex`On a potentiometer, a cell of emf $${qty(e1, U.V)}$ is balanced against $${qty(l1, U.cm)}$ of the wire. With the same current in the potentiometer wire, a second cell is balanced against $${qty(l2, U.cm)}$. The emf of the second cell is:`,
      answer,
      distractors,
      explanation: tex`At balance $E = kl$ (same potential gradient $k$), so $\frac{E_2}{E_1} = \frac{l_2}{l_1}$ and $E_2 = ${num(e1)} \times \frac{${l2}}{${l1}} = ${num(e2)}\,\mathrm{V}$.`,
    };
  }),

  // =========================================================================
  // Fixed conceptual items
  // =========================================================================
  ...b.mcqs([
    {
      id: 'kirchhoff-junction-rule', d: 1, o: 'past-paper', t: ['Kirchhoff rules'],
      q: "Kirchhoff's first rule (the junction rule) is a consequence of the conservation of:",
      a: 'charge',
      x: ['energy', 'linear momentum', 'mass'],
      e: 'Charge cannot pile up at or vanish from a junction, so the total current entering a junction equals the total current leaving it.',
    },
    {
      id: 'kirchhoff-loop-rule', d: 1, t: ['Kirchhoff rules'],
      q: "Kirchhoff's second rule (the loop rule) is a statement of the conservation of:",
      a: 'energy',
      x: ['charge', 'linear momentum', 'mass'],
      e: 'Around any closed loop the energy gained per unit charge from emfs equals the energy lost per unit charge in the resistors (sum of emfs = sum of IR drops), which is conservation of energy.',
    },
    {
      id: 'resistivity-depends-on', d: 1, o: 'past-paper', t: ['resistivity'],
      q: 'The resistivity of a metal wire depends on:',
      a: 'the material of the wire and its temperature',
      x: ['the length of the wire only', 'the cross-sectional area of the wire only', 'both the length and the cross-sectional area'],
      e: tex`Resistivity $\rho = \frac{RA}{L}$ is a property of the material at a given temperature. Changing the length or area changes the resistance $R$, not $\rho$.`,
    },
    {
      id: 'resistivity-si-unit', d: 1, t: ['resistivity'],
      q: 'The SI unit of resistivity is:',
      a: tex`$\Omega\,\mathrm{m}$`,
      x: [tex`$\Omega\,\mathrm{m^{-1}}$`, tex`$\Omega^{-1}\,\mathrm{m^{-1}}$`, tex`$\Omega\,\mathrm{m^{2}}$`],
      e: tex`$\rho = \frac{RA}{L}$ has units $\frac{\Omega\,\mathrm{m^2}}{\mathrm{m}} = \Omega\,\mathrm{m}$. $\Omega^{-1}\,\mathrm{m^{-1}}$ is the unit of conductivity.`,
    },
    {
      id: 'ohm-law-condition', d: 1, t: ['Ohm law'],
      q: tex`Ohm's law, $V \propto I$, holds for a metallic conductor provided that:`,
      a: 'its temperature and other physical conditions stay constant',
      x: ['the current through it is kept very large', 'the potential difference is alternating', 'its resistance rises steadily with the current'],
      e: 'Resistance of a metal rises with temperature, so V/I stays constant only if the temperature (and other physical conditions) do not change.',
    },
    {
      id: 'semiconductor-resistance-temperature', d: 1, t: ['resistivity'],
      q: 'When the temperature of a pure semiconductor such as silicon is raised, its resistance:',
      a: 'decreases',
      x: ['increases', 'remains unchanged', 'drops suddenly to zero'],
      e: 'Heating frees more charge carriers (electron-hole pairs), so the resistance falls: semiconductors have a negative temperature coefficient of resistance, unlike metals. A sudden drop to zero is superconductivity, which happens on cooling.',
    },
    {
      id: 'emf-definition', d: 1, t: ['EMF and internal resistance'],
      q: 'The emf of a cell is the:',
      a: 'energy it supplies per unit charge passing through it',
      x: ['force it exerts on each unit charge', 'charge it delivers per unit time', 'resistance it offers to the flow of charge'],
      e: tex`$E = \frac{W}{q}$: the energy converted into electrical form per coulomb, measured in $\mathrm{J\,C^{-1}} = \mathrm{V}$. Despite its name, emf is not a force.`,
    },
    {
      id: 'maximum-power-transfer', d: 2, o: 'past-paper', t: ['EMF and internal resistance', 'power'],
      q: 'A cell of emf E and internal resistance r delivers the maximum power to an external resistor R when:',
      a: tex`$R = r$`,
      x: [tex`$R = 2r$`, tex`$R = \frac{r}{2}$`, tex`$R \gg r$`],
      e: tex`$P = \frac{E^2R}{(R + r)^2}$ is greatest when $R = r$, giving $P_{max} = \frac{E^2}{4r}$. A very large $R$ draws almost no current, so the power is small.`,
    },
    {
      id: 'charging-terminal-voltage', d: 2, t: ['EMF and internal resistance'],
      q: 'A battery of emf E and internal resistance r is being charged with a current I. The potential difference across its terminals is:',
      a: tex`$E + Ir$`,
      x: [tex`$E - Ir$`, tex`$E$`, tex`$Ir$`],
      e: tex`When charging, the current enters at the positive terminal, so the charger must supply the emf plus the drop across $r$: $V = E + Ir$. ($V = E - Ir$ applies when the battery is discharging.)`,
    },
    {
      id: 'potentiometer-advantage', d: 2, t: ['potentiometer'],
      q: 'A potentiometer measures the emf of a cell more accurately than a moving-coil voltmeter because, at the balance point, it:',
      a: 'draws no current from the cell',
      x: ['has a very small resistance', 'draws a large current from the cell', 'works only with an alternating supply'],
      e: tex`At balance the galvanometer shows no current, so there is no drop across the internal resistance and the true emf is measured. A voltmeter always draws some current, so it reads the terminal voltage $E - Ir$.`,
    },
    {
      id: 'wheatstone-balance-independent', d: 2, t: ['Wheatstone bridge'],
      q: 'A Wheatstone bridge is balanced. Which change will NOT disturb the balance?',
      a: 'Replacing the cell by one of higher emf',
      x: ['Doubling the resistance of one arm only', 'Halving the resistance of one arm only', 'Adding a resistor in series with one arm only'],
      e: tex`Balance requires only $\frac{P}{Q} = \frac{R}{X}$, which does not involve the emf. Changing the resistance of any single arm alters one side of this equation and upsets the balance; a higher emf only increases all the currents in the same proportion.`,
    },
    {
      id: 'potentiometer-sensitivity', d: 2, t: ['potentiometer'],
      q: 'The sensitivity of a potentiometer (its ability to measure small potential differences) can be increased by:',
      a: 'using a longer wire with the same driving cell',
      x: ['using a shorter wire with the same driving cell', 'increasing the current in the potentiometer wire', 'using a driving cell of larger emf'],
      e: 'A potentiometer is more sensitive when its potential gradient (volts per metre) is small, so a given emf balances against a longer length. A longer wire lowers the gradient; a larger current or a larger driving emf raises it.',
    },
    {
      id: 'bulbs-in-series-brightness', d: 3, o: 'past-paper', t: ['power', 'series and parallel'],
      q: tex`Two bulbs rated $100\,\mathrm{W}, 220\,\mathrm{V}$ and $25\,\mathrm{W}, 220\,\mathrm{V}$ are connected in series across a $220\,\mathrm{V}$ supply. Which statement is correct?`,
      a: 'The 25 W bulb glows more brightly than the 100 W bulb',
      x: ['The 100 W bulb glows more brightly than the 25 W bulb', 'Both bulbs glow with equal brightness', 'Each bulb dissipates its rated power'],
      e: tex`$R = \frac{V^2}{P}$: $R_{100} = 484\,\Omega$, $R_{25} = 1936\,\Omega$. In series the current is the same, $I = \frac{220}{2420} = \frac{1}{11}\,\mathrm{A}$, so $P = I^2R$ gives $16\,\mathrm{W}$ for the 25 W bulb and only $4\,\mathrm{W}$ for the 100 W bulb.`,
    },
    {
      id: 'kirchhoff-zero-current-cell', d: 3, t: ['Kirchhoff rules'],
      q: tex`Three branches are joined in parallel between points A and B. Branch 1 is a $12\,\mathrm{V}$ cell in series with $2\,\Omega$; branch 2 is a $6\,\mathrm{V}$ cell in series with $2\,\Omega$; branch 3 is a $2\,\Omega$ resistor alone. The cells have negligible internal resistance and both positive terminals face A. The current through the $6\,\mathrm{V}$ cell is:`,
      a: tex`$0\,\mathrm{A}$`,
      x: [tex`$1\,\mathrm{A}$`, tex`$1.5\,\mathrm{A}$`, tex`$3\,\mathrm{A}$`],
      e: tex`Let $V = V_A - V_B$. Junction rule at A: $\frac{12 - V}{2} + \frac{6 - V}{2} = \frac{V}{2}$, so $18 - 2V = V$ and $V = 6\,\mathrm{V}$. The current in branch 2 is $\frac{6 - 6}{2} = 0$; the $12\,\mathrm{V}$ cell sends $3\,\mathrm{A}$ straight through the $2\,\Omega$ resistor.`,
    },
  ]),
]);
