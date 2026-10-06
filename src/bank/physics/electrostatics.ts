import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, pickDistractors, q$, qty, sci, tex, U } from '@/engine/helpers';

/*
 * Electrostatics (FSc Part II): Coulomb's law, electric field, flux and Gauss's law,
 * potential, capacitors and dielectrics.
 *
 * Numerical templates draw parameters from pre-filtered tables so every answer is exact and
 * short. Constants are stated in the stem (k = 9 x 10^9 N m^2 C^-2, e = 1.6 x 10^-19 C).
 */

// ---------------------------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------------------------

/** Removes binary floating-point noise (0.1 * 3 -> 0.3). */
const clean = (x: number): number => Number(x.toPrecision(12));

/** Positive and printed exactly by `num` (at most three significant figures). */
const nice = (x: number): boolean => x > 0 && Number(x.toPrecision(3)) === clean(x);

const pairs = <A, B>(as: readonly A[], bs: readonly B[]): Array<[A, B]> =>
  as.flatMap((a) => bs.map((b): [A, B] => [a, b]));

const triples = <A, B, C>(as: readonly A[], bs: readonly B[], cs: readonly C[]): Array<[A, B, C]> =>
  as.flatMap((a) => pairs(bs, cs).map(([b, c]): [A, B, C] => [a, b, c]));

/** A positive rational multiple of a symbol: 8F, \frac{F}{4}, \frac{9F}{2}, F. */
function timesSym(f: Fraction, sym: string): string {
  if (f.d === 1) return f.n === 1 ? sym : `${f.n}${sym}`;
  return `\\frac{${f.n === 1 ? '' : f.n}${sym}}{${f.d}}`;
}

/** Words for scaling a quantity by f: 2 -> "doubled", 1/2 -> "halved". */
function scaledWord(f: Fraction): string {
  const words: Record<string, string> = {
    '2': 'doubled',
    '3': 'tripled',
    '4': 'made four times as large',
    '1/2': 'halved',
    '1/3': 'reduced to one-third',
    '1/4': 'reduced to one-fourth',
  };
  const key = f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
  const w = words[key];
  if (!w) throw new Error(`scaledWord: no wording for ${key}`);
  return w;
}

/** Joins clauses: "a", "a and b", "a, b and c". */
function joinClauses(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const UNIT = { mJ: 'mJ', kV: 'kV' } as const;

/** A quantity in scientific notation when it is 10^4 or more, so large fields read uniformly. */
function bigTex(x: number, unit: string, big = x >= 1e4): string {
  return big && x >= 1000 ? `${sci(x)}\\,\\mathrm{${unit}}` : qty(x, unit);
}

/**
 * Option formatter with one notation for every option. Pass big = (largest value shown >= 10^4), so
 * "12000" never sits beside "4 x 10^6" and the explanation can use the same notation.
 */
function bigFormat(big: boolean, unit: string): (x: number) => string {
  return (x) => `$${bigTex(x, unit, big)}$`;
}

// ---------------------------------------------------------------------------------------------
// Parameter tables (every entry gives an exact, short answer)
// ---------------------------------------------------------------------------------------------

/** [q1 uC, q2 uC, r cm]: F = k q1 q2 / r^2 = 90 q1 q2 / r_cm^2 newtons. */
const COULOMB = triples([1, 2, 3, 4, 5, 6, 8, 9], [1, 2, 3, 4, 5, 6, 8, 9], [3, 5, 6, 10, 15, 20, 30, 50, 60]).filter(
  ([a, b, r]) => {
    const f = clean((90 * a * b) / (r * r));
    return a <= b && nice(f) && f >= 0.01 && f <= 500;
  },
);

/**
 * [q uC, r m]: E = k q / r^2 = 9000 q / r^2 N/C. No r = 1 m: there r = r^2, so forgetting to square
 * (or ignoring r altogether) would still give the keyed answer.
 */
const POINT_FIELD = pairs([1, 2, 3, 4, 5, 6, 8, 10], [0.1, 0.2, 0.3, 0.5, 2, 3]).filter(([q, r]) => {
  const e = clean((9000 * q) / (r * r));
  return nice(e) && nice(clean(e * r));
});

/** [C1 uF, C2 uF] whose series combination is a short exact number. */
const CAP_PAIRS = pairs([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40], [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60]).filter(
  ([a, b]) => {
    const s = clean((a * b) / (a + b));
    return a <= b && Number.isInteger(clean(s * 10)) && s >= 0.5;
  },
);

/** [C uF, V volts]: U = C V^2 / 2000 mJ. */
const CAP_ENERGY = pairs([1, 2, 4, 5, 10, 20, 25, 40, 50, 100], [6, 10, 12, 20, 30, 40, 50, 100, 200, 300]).filter(([c, v]) => {
  const u = clean((c * v * v) / 2000);
  return nice(u) && u >= 0.1 && u <= 900;
});

/** [V volts, d mm]: E = 1000 V / d V/m. */
const PLATE_FIELD = pairs([12, 20, 50, 100, 120, 150, 200, 300, 400, 500, 600, 1000, 1500, 2000], [1, 2, 3, 4, 5, 8, 10, 20, 25]).filter(
  ([v, d]) => nice(clean((1000 * v) / d)) && nice(clean(v / d)),
);

const PARTICLES = [
  { name: 'An electron', charge: 1 },
  { name: 'A proton', charge: 1 },
  { name: 'An alpha particle', charge: 2 },
] as const;

// ---------------------------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------------------------

export default defineBank('physics', 'electrostatics', (b) => [
  // ---- Coulomb's law -------------------------------------------------------------------------
  b.dynamic('coulomb-force-scaling', { difficulty: 2, origin: 'past-paper', tags: ['Coulomb law'] }, (r) => {
    const fa = frac(r.pick([1, 2, 3, 4]));
    const fb = frac(r.pick([1, 2, 3]));
    const fc = r.pick([frac(2), frac(3), frac(1, 2), frac(1, 3), frac(4)]);
    const changes: string[] = [];
    if (!fa.equals(1)) changes.push(tex`$q_1$ is ${scaledWord(fa)}`);
    if (!fb.equals(1)) changes.push(tex`$q_2$ is ${scaledWord(fb)}`);
    changes.push(`the separation is ${scaledWord(fc)}`);
    const q = fa.mul(fb);
    const answerF = q.div(fc.pow(2));
    const opt = (f: Fraction): string => `$${timesSym(f, 'F')}$`;
    const answer = opt(answerF);
    const distractors = pickDistractors(answer, [
      opt(q.div(fc)), // forgot to square the distance
      opt(q.mul(fc.pow(2))), // force taken proportional to r^2
      opt(fc.pow(2).div(q)), // inverted the whole ratio
      opt(answerF.mul(2)),
      opt(answerF.div(2)),
      opt(answerF.mul(4)),
    ]);
    return {
      stem: tex`Two point charges $q_1$ and $q_2$ a distance $r$ apart exert a force $F$ on each other. If ${joinClauses(changes)}, the new force is:`,
      answer,
      distractors,
      explanation: tex`$F \propto \frac{q_1 q_2}{r^{2}}$, so $F' = \frac{(${fa.toTex()})(${fb.toTex()})}{(${fc.toTex()})^{2}}\,F = ${timesSym(answerF, 'F')}$.`,
    };
  }),

  b.dynamic('coulomb-force-numeric', { difficulty: 2, tags: ['Coulomb law'] }, (r) => {
    const [q1, q2, rc] = r.pick(COULOMB);
    const f = clean((90 * q1 * q2) / (rc * rc));
    const { answer, distractors } = numericOptions(r, {
      correct: f,
      wrong: [
        clean((f * rc) / 100), // forgot to square r
        clean(f * 1e-4), // left r in centimetres
        clean(f / 100), // converted cm^2 to m^2 with 10^-2
      ],
      format: (x) => q$(x, U.N),
    });
    return {
      stem: tex`Two point charges of $${qty(q1, U.muC)}$ and $${qty(q2, U.muC)}$ are placed $${qty(rc, U.cm)}$ apart in air. Taking $k = 9 \times 10^{9}\,\mathrm{N\,m^{2}\,C^{-2}}$, the force between them is:`,
      answer,
      distractors,
      explanation: tex`$F = \frac{k q_1 q_2}{r^{2}} = \frac{(9 \times 10^{9})(${q1} \times 10^{-6})(${q2} \times 10^{-6})}{(${num(rc / 100)})^{2}} = ${qty(f, U.N)}$.`,
    };
  }),

  // ---- Electric field ------------------------------------------------------------------------
  b.dynamic('field-of-point-charge', { difficulty: 1, tags: ['electric field'] }, (r) => {
    const [q, d] = r.pick(POINT_FIELD);
    const e = clean((9000 * q) / (d * d));
    const wrong = [
      clean(e * d), // used r instead of r^2
      clean(e * 1000), // took micro as milli
      clean(9000 * q), // ignored the distance
    ];
    const big = Math.max(e, ...wrong) >= 1e4;
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      wrong,
      format: bigFormat(big, U.NpC),
    });
    return {
      stem: tex`The magnitude of the electric field at a distance of $${qty(d, U.m)}$ from a point charge of $${qty(q, U.muC)}$ in air is (take $k = 9 \times 10^{9}\,\mathrm{N\,m^{2}\,C^{-2}}$):`,
      answer,
      distractors,
      explanation: tex`$E = \frac{kq}{r^{2}} = \frac{(9 \times 10^{9})(${q} \times 10^{-6})}{(${num(d)})^{2}} = ${bigTex(e, U.NpC, big)}$.`,
    };
  }),

  b.dynamic('field-between-plates', { difficulty: 1, tags: ['electric field', 'potential'] }, (r) => {
    const [v, d] = r.pick(PLATE_FIELD);
    const e = clean((1000 * v) / d);
    const wrong = [
      clean(v / d), // left d in millimetres
      clean((v * d) / 1000), // multiplied instead of divided
      clean(e / 10), // treated mm as cm
    ];
    const big = Math.max(e, ...wrong) >= 1e4;
    const { answer, distractors } = numericOptions(r, {
      correct: e,
      wrong,
      format: bigFormat(big, U.Vpm),
    });
    return {
      stem: tex`Two large parallel plates $${qty(d, U.mm)}$ apart are connected to a $${qty(v, U.V)}$ supply. The electric field between the plates is:`,
      answer,
      distractors,
      explanation: tex`For a uniform field $E = \frac{V}{d} = \frac{${v}}{${num(d / 1000)}} = ${bigTex(e, U.Vpm, big)}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'field-unit-equivalent',
      d: 1,
      t: ['electric field', 'potential'],
      q: tex`The unit $\mathrm{N\,C^{-1}}$ of electric field intensity is equivalent to:`,
      a: tex`$\mathrm{V\,m^{-1}}$`,
      x: [tex`$\mathrm{V\,m}$`, tex`$\mathrm{J\,C^{-1}}$`, tex`$\mathrm{C\,V^{-1}}$`],
      e: tex`$\mathrm{N\,C^{-1}} = \frac{\mathrm{J\,m^{-1}}}{\mathrm{C}} = \frac{\mathrm{J}}{\mathrm{C}}\cdot\frac{1}{\mathrm{m}} = \mathrm{V\,m^{-1}}$. $\mathrm{J\,C^{-1}}$ is the volt itself and $\mathrm{C\,V^{-1}}$ is the farad.`,
    },
    {
      id: 'field-lines-not-property',
      d: 1,
      t: ['electric field'],
      q: 'Which of the following is NOT a property of electric field lines?',
      a: 'Two field lines can cross each other at a point',
      x: [
        'They start on positive charges and end on negative charges',
        'They are crowded together where the field is strong',
        'They meet a conductor surface at right angles',
      ],
      e: 'At any point the field has only one direction. If two lines crossed, the field would have two directions at the crossing point, which is impossible.',
    },
    {
      id: 'four-charges-square-centre',
      d: 3,
      t: ['electric field', 'potential'],
      q: tex`Four equal positive charges $q$ sit at the corners of a square of side $a$. At the centre of the square, the electric field $E$ and potential $V$ are:`,
      a: tex`$E = 0$ and $V = \frac{4\sqrt{2}\,kq}{a}$`,
      x: [
        tex`$E = 0$ and $V = 0$`,
        tex`$E = \frac{8kq}{a^{2}}$ and $V = 0$`,
        tex`$E = \frac{8kq}{a^{2}}$ and $V = \frac{4\sqrt{2}\,kq}{a}$`,
      ],
      e: tex`Each corner is $\frac{a}{\sqrt{2}}$ from the centre. The field vectors of opposite charges cancel in pairs, so $E = 0$. Potential is a scalar and adds: $V = 4\cdot\frac{kq}{a/\sqrt{2}} = \frac{4\sqrt{2}\,kq}{a}$.`,
    },
  ]),

  // ---- Electric flux and Gauss's law -----------------------------------------------------
  ...b.mcqs([
    {
      id: 'gauss-sphere-radius-doubled',
      d: 1,
      o: 'past-paper',
      t: ['electric flux', 'Gauss law'],
      q: tex`A point charge $q$ is at the centre of a spherical surface. If the radius of the sphere is doubled, the electric flux through it:`,
      a: tex`remains $\frac{q}{\varepsilon_0}$`,
      x: [tex`becomes $\frac{2q}{\varepsilon_0}$`, tex`becomes $\frac{q}{2\varepsilon_0}$`, tex`becomes $\frac{q}{4\varepsilon_0}$`],
      e: tex`By Gauss's law, flux through a closed surface is $\frac{q_{\text{enclosed}}}{\varepsilon_0}$. The field falls as $\frac{1}{r^{2}}$ but the area grows as $r^{2}$, so the flux does not change.`,
    },
    {
      id: 'flux-charge-outside',
      d: 2,
      t: ['electric flux', 'Gauss law'],
      q: tex`A charge $q$ is placed just outside a closed surface that encloses no charge. The net electric flux through the closed surface is:`,
      a: 'zero',
      x: [tex`$\frac{q}{\varepsilon_0}$`, tex`$\frac{q}{2\varepsilon_0}$`, tex`$-\frac{q}{\varepsilon_0}$`],
      e: tex`Only enclosed charge contributes. Every field line from the outside charge that enters the surface also leaves it, so inward and outward flux cancel and $\Phi = \frac{0}{\varepsilon_0} = 0$.`,
    },
    {
      id: 'cube-face-flux',
      d: 2,
      o: 'past-paper',
      t: ['electric flux', 'Gauss law'],
      q: tex`A point charge $q$ is placed at the centre of a cube. The electric flux through any one face of the cube is:`,
      a: tex`$\frac{q}{6\varepsilon_0}$`,
      x: [tex`$\frac{q}{\varepsilon_0}$`, tex`$\frac{6q}{\varepsilon_0}$`, tex`$\frac{q}{4\varepsilon_0}$`],
      e: tex`Total flux through the cube is $\frac{q}{\varepsilon_0}$. By symmetry the six faces share it equally: $\frac{q}{6\varepsilon_0}$ per face.`,
    },
    {
      id: 'field-inside-charged-conductor',
      d: 1,
      t: ['Gauss law', 'electric field'],
      q: tex`A hollow metal sphere of radius $R$ carries a charge $Q$. The electric field at a point inside the sphere is:`,
      a: 'zero',
      x: [tex`$\frac{kQ}{R^{2}}$`, tex`$\frac{kQ}{R}$`, 'maximum at the centre'],
      e: tex`A Gaussian sphere drawn inside the shell encloses no charge (all of $Q$ resides on the outer surface), so $E \cdot 4\pi r^{2} = 0$ and $E = 0$ everywhere inside.`,
    },
  ]),

  // ---- Potential -----------------------------------------------------------------------------
  b.dynamic('work-accelerating-charge', { difficulty: 2, tags: ['potential'] }, (r) => {
    const p = r.pick(PARTICLES);
    const kv = r.pick([1, 2, 3, 4, 5, 10, 20, 25, 50]);
    // Worked in units of 10^-19 J so numericOptions compares sensible magnitudes.
    const w19 = clean(p.charge * 1.6 * kv * 1000);
    const w = w19 * 1e-19;
    const { answer, distractors } = numericOptions(r, {
      correct: w19,
      wrong: [
        clean(p.charge === 2 ? w19 / 2 : w19 * 2), // wrong charge for the particle
        clean(w19 / 1000), // forgot kV -> V
        clean(w19 * 1000), // treated kV as MV
      ],
      format: (x) => `$${sci(x * 1e-19)}\\,\\mathrm{J}$`,
      fallback: 'scale',
    });
    const qTex = p.charge === 2 ? '2(1.6 \\times 10^{-19})' : '(1.6 \\times 10^{-19})';
    return {
      stem: tex`${p.name} is accelerated from rest through a potential difference of $${qty(kv, UNIT.kV)}$. The kinetic energy it gains is (take $e = 1.6 \times 10^{-19}\,\mathrm{C}$):`,
      answer,
      distractors,
      explanation: tex`$K.E. = qV = ${qTex}(${kv} \times 10^{3}) = ${sci(w)}\,\mathrm{J}$${p.charge === 2 ? tex` (an alpha particle carries charge $2e$)` : ''}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'equipotential-work',
      d: 1,
      t: ['potential'],
      q: tex`The work done in moving a charge $q$ from one point to another on the same equipotential surface is:`,
      a: 'zero',
      x: [tex`$qV$, where $V$ is the potential of the surface`, 'positive and depends on the path', 'negative and depends on the distance'],
      e: tex`$W = q\,\Delta V$ and $\Delta V = 0$ between two points of an equipotential surface, so $W = 0$ whatever the path.`,
    },
    {
      id: 'electron-volt-in-joule',
      d: 1,
      t: ['potential'],
      q: 'One electron-volt (eV) is equal to:',
      a: tex`$1.6 \times 10^{-19}\,\mathrm{J}$`,
      x: [tex`$1.6 \times 10^{19}\,\mathrm{J}$`, tex`$9.1 \times 10^{-31}\,\mathrm{J}$`, tex`$6.25 \times 10^{18}\,\mathrm{J}$`],
      e: tex`1 eV is the energy gained by an electron accelerated through $1\,\mathrm{V}$: $W = eV = (1.6 \times 10^{-19}\,\mathrm{C})(1\,\mathrm{V}) = 1.6 \times 10^{-19}\,\mathrm{J}$.`,
    },
  ]),

  // ---- Capacitors ----------------------------------------------------------------------------
  b.dynamic('capacitor-series-parallel', { difficulty: 1, origin: 'past-paper', tags: ['capacitors'] }, (r) => {
    const [c1, c2] = r.pick(CAP_PAIRS);
    const series = r.chance(0.6);
    const s = clean((c1 * c2) / (c1 + c2));
    const p = c1 + c2;
    const correct = series ? s : p;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [series ? p : s, clean((c1 + c2) / 2), c1 * c2, Math.abs(c2 - c1)],
      format: (x) => q$(x, U.muF),
    });
    return {
      stem: tex`Two capacitors of $${qty(c1, U.muF)}$ and $${qty(c2, U.muF)}$ are connected in ${series ? 'series' : 'parallel'}. Their equivalent capacitance is:`,
      answer,
      distractors,
      explanation: series
        ? tex`In series $\frac{1}{C} = \frac{1}{${c1}} + \frac{1}{${c2}}$, so $C = \frac{(${c1})(${c2})}{${c1} + ${c2}} = ${qty(s, U.muF)}$ (smaller than either capacitor).`
        : tex`In parallel the capacitances add: $C = ${c1} + ${c2} = ${qty(p, U.muF)}$.`,
    };
  }),

  b.dynamic('capacitor-energy', { difficulty: 2, origin: 'past-paper', tags: ['capacitors'] }, (r) => {
    const [c, v] = r.pick(CAP_ENERGY);
    const u = clean((c * v * v) / 2000);
    const { answer, distractors } = numericOptions(r, {
      correct: u,
      wrong: [
        clean(2 * u), // forgot the 1/2
        clean((c * v) / 2000), // forgot to square V
        clean(u / 1000), // gave the joule value the unit mJ
      ],
      format: (x) => q$(x, UNIT.mJ),
    });
    return {
      stem: tex`A $${qty(c, U.muF)}$ capacitor is charged to a potential difference of $${qty(v, U.V)}$. The energy stored in it is:`,
      answer,
      distractors,
      explanation: tex`$U = \frac{1}{2}CV^{2} = \frac{1}{2}(${c} \times 10^{-6})(${v})^{2} = ${num(u / 1000)}\,\mathrm{J} = ${qty(u, UNIT.mJ)}$.`,
    };
  }),

  b.fixed('permittivity-si-unit', { difficulty: 1, origin: 'past-paper', tags: ['Coulomb law', 'capacitors'] }, {
    stem: tex`The SI unit of the permittivity of free space $\varepsilon_0$ is:`,
    answer: tex`$\mathrm{C^{2}\,N^{-1}\,m^{-2}}$`,
    distractors: [tex`$\mathrm{N\,m^{2}\,C^{-2}}$`, tex`$\mathrm{C^{2}\,N\,m^{-2}}$`, tex`$\mathrm{N\,C^{-1}\,m^{-1}}$`],
    explanation: tex`From $F = \frac{1}{4\pi\varepsilon_0}\frac{q_1 q_2}{r^{2}}$, $\varepsilon_0 = \frac{q_1 q_2}{4\pi F r^{2}}$, with unit $\frac{\mathrm{C^{2}}}{\mathrm{N\,m^{2}}} = \mathrm{C^{2}\,N^{-1}\,m^{-2}}$ (equivalently $\mathrm{F\,m^{-1}}$). $\mathrm{N\,m^{2}\,C^{-2}}$ is the unit of $k$.`,
  }),

  // ---- Dielectrics ---------------------------------------------------------------------------
  b.dynamic('capacitance-scaling-dielectric', { difficulty: 2, tags: ['capacitors', 'dielectrics'] }, (r) => {
    const fa = r.pick([frac(1), frac(2), frac(3), frac(1, 2)]);
    // At least one geometric change, so the item is more than "C becomes k C".
    const fd = fa.equals(1) ? r.pick([frac(2), frac(3), frac(1, 2)]) : r.pick([frac(1), frac(2), frac(3), frac(1, 2)]);
    const k = r.pick([2, 3, 4, 5, 6]);
    const changes: string[] = [];
    if (!fa.equals(1)) changes.push(`the plate area is ${scaledWord(fa)}`);
    if (!fd.equals(1)) changes.push(`the plate separation is ${scaledWord(fd)}`);
    changes.push(tex`the gap is completely filled with a dielectric of $\varepsilon_r = ${k}$`);
    const ans = fa.mul(k).div(fd);
    const opt = (f: Fraction): string => `$${timesSym(f, 'C')}$`;
    const answer = opt(ans);
    const distractors = pickDistractors(answer, [
      opt(fa.mul(k).mul(fd)), // capacitance taken proportional to d
      opt(fa.div(fd).div(k)), // dielectric divides C
      opt(fa.mul(k).div(fd.pow(2))), // inverse-square in d
      opt(fa.div(fd)), // ignored the dielectric
      opt(ans.mul(2)),
      opt(ans.div(2)),
    ]);
    return {
      stem: tex`A parallel-plate air capacitor has capacitance $C$. If ${joinClauses(changes)}, its capacitance becomes:`,
      answer,
      distractors,
      explanation: tex`$C = \frac{\varepsilon_r \varepsilon_0 A}{d}$, so $C' = \frac{(${k})(${fa.toTex()})}{${fd.toTex()}}\,C = ${timesSym(ans, 'C')}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'dielectric-isolated-capacitor',
      d: 3,
      o: 'past-paper',
      t: ['dielectrics', 'capacitors'],
      q: tex`A parallel-plate capacitor is charged to a potential difference $V$ (charge $Q$, stored energy $U$) and then disconnected from the battery. A dielectric of relative permittivity $\varepsilon_r$ is then made to fill the gap. Which statement is correct?`,
      a: tex`The potential difference falls to $\frac{V}{\varepsilon_r}$`,
      x: [
        tex`The potential difference rises to $\varepsilon_r V$`,
        tex`The charge on the plates rises to $\varepsilon_r Q$`,
        tex`The stored energy rises to $\varepsilon_r U$`,
      ],
      e: tex`Once disconnected, the charge $Q$ cannot change. $C$ becomes $\varepsilon_r C$, so $V' = \frac{Q}{\varepsilon_r C} = \frac{V}{\varepsilon_r}$ and the energy $\frac{Q^{2}}{2C}$ falls to $\frac{U}{\varepsilon_r}$.`,
    },
    {
      id: 'coulomb-force-in-water',
      d: 1,
      t: ['Coulomb law', 'dielectrics'],
      q: tex`Two charges exert a force $F$ on each other in air. If they are placed at the same separation in water ($\varepsilon_r = 80$), the force becomes:`,
      a: tex`$\frac{F}{80}$`,
      x: [tex`$80F$`, tex`$\frac{F}{6400}$`, tex`$\frac{F}{\sqrt{80}}$`],
      e: tex`In a medium $F_{\text{med}} = \frac{1}{4\pi\varepsilon_0\varepsilon_r}\frac{q_1 q_2}{r^{2}} = \frac{F}{\varepsilon_r} = \frac{F}{80}$.`,
    },
  ]),
]);
