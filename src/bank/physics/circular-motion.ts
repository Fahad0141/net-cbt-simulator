import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  frac,
  Fraction,
  listText,
  num,
  numericOptions,
  pickDistractors,
  q$,
  qty,
  sci,
  simplifySurd,
  tex,
  U,
} from '@/engine/helpers';

/*
 * Circular Motion (FSc Part I): angular quantities, centripetal force, moment of inertia,
 * angular momentum, rotational kinetic energy, satellites and artificial gravity.
 *
 * Numerical templates draw their parameters from tables that are pre-filtered so that every
 * answer is exact and short (at most three significant figures, or an exact multiple of pi).
 * Every stem that needs gravity states g = 10 m s^-2.
 */

const G = 10;

// ---------------------------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------------------------

/** Removes binary floating-point noise (0.1 * 3 -> 0.3). */
const clean = (x: number): number => Number(x.toPrecision(12));

/** Positive and printed exactly by `num` (at most three significant figures). */
const nice = (x: number): boolean => x > 0 && Number(x.toPrecision(3)) === clean(x);

/** Has at most two decimal places. */
const twoDp = (x: number): boolean => Number.isInteger(clean(x * 100));

const pairs = <A, B>(as: readonly A[], bs: readonly B[]): Array<[A, B]> =>
  as.flatMap((a) => bs.map((b): [A, B] => [a, b]));

const triples = <A, B, C>(as: readonly A[], bs: readonly B[], cs: readonly C[]): Array<[A, B, C]> =>
  as.flatMap((a) => pairs(bs, cs).map(([b, c]): [A, B, C] => [a, b, c]));

/** Units that `U` does not provide. */
const UNIT = {
  radps2: 'rad\\,s^{-2}',
  radpmin: 'rad\\,min^{-1}',
  radph: 'rad\\,h^{-1}',
  kmps: 'km\\,s^{-1}',
} as const;

/** A positive rational multiple of pi: 1/30 -> \frac{\pi}{30}, 2 -> 2\pi, 3/2 -> \frac{3\pi}{2}. */
function piFrac(f: Fraction): string {
  const top = f.n === 1 ? '\\pi' : `${f.n}\\pi`;
  return f.d === 1 ? top : `\\frac{${top}}{${f.d}}`;
}

/** A decimal multiple of pi: 0.3 -> 0.3\pi, 1 -> \pi. */
const piDec = (k: number): string => (clean(k) === 1 ? '\\pi' : `${num(k)}\\pi`);

/** A positive rational multiple of 1/pi: 1/4 -> \frac{1}{4\pi}, 5 -> \frac{5}{\pi}. */
function perPi(f: Fraction): string {
  return f.d === 1 ? `\\frac{${f.n}}{\\pi}` : `\\frac{${f.n}}{${f.d}\\pi}`;
}

/** A positive rational multiple of a symbol: 8F, \frac{F}{4}, \frac{9F}{2}, F. */
function timesSym(f: Fraction, sym: string): string {
  if (f.d === 1) return f.n === 1 ? sym : `${f.n}${sym}`;
  return `\\frac{${f.n === 1 ? '' : f.n}${sym}}{${f.d}}`;
}

/**
 * `base` raised to the power `half / 2`, times a symbol, with surds simplified:
 * (4, 3, 'T') -> 8T, (4, -1, 'v') -> \frac{v}{2}, (2, 3, 'T_0') -> 2\sqrt{2}\,T_0,
 * (2, -1, 'v_0') -> \frac{v_0}{\sqrt{2}}, (1, 3, 'T') -> T.
 */
function powSym(base: number, half: number, sym: string): string {
  const h = Math.abs(half);
  const { c, r } = simplifySurd(base ** Math.floor(h / 2), h % 2 === 1 ? base : 1);
  if (c === 1 && r === 1) return sym;
  const coef = r === 1 ? String(c) : c === 1 ? `\\sqrt{${r}}` : `${c}\\sqrt{${r}}`;
  if (half < 0) return `\\frac{${sym}}{${coef}}`;
  return r === 1 ? `${coef}${sym}` : `${coef}\\,${sym}`;
}

// ---------------------------------------------------------------------------------------------
// Parameter tables (built once; every entry gives exact, short answers)
// ---------------------------------------------------------------------------------------------

const SPINNERS = [
  { key: 'second', name: 'the second hand of a clock', turns: 'The second hand turns once in', period: 60 },
  { key: 'minute', name: 'the minute hand of a clock', turns: 'The minute hand turns once in', period: 3600 },
  { key: 'hour', name: 'the hour hand of a clock', turns: 'The hour hand turns once in', period: 43200 },
  { key: 'earth', name: 'the Earth about its axis', turns: 'The Earth turns once in', period: 86400 },
] as const;
const [SECOND, MINUTE, HOUR, EARTH] = SPINNERS;

const PER = {
  s: { seconds: 1, symbol: 's', unit: U.radps },
  min: { seconds: 60, symbol: 'min', unit: UNIT.radpmin },
  h: { seconds: 3600, symbol: 'h', unit: UNIT.radph },
} as const;

/** Body/unit pairs that read naturally; rad s^-1 (the classic NET form) is weighted double. */
const CLOCK_CASES = [
  [SECOND, 's'], [SECOND, 's'], [SECOND, 'min'],
  [MINUTE, 's'], [MINUTE, 's'], [MINUTE, 'min'], [MINUTE, 'h'],
  [HOUR, 's'], [HOUR, 's'], [HOUR, 'h'],
  [EARTH, 's'], [EARTH, 's'], [EARTH, 'h'],
] as const;

/** [radius in cm, rev/min]: rim speed v = pi * cm * rpm / 3000 m/s has at most two decimals. */
const RIM_SPEED = pairs([10, 15, 20, 25, 30, 40, 50, 60], [60, 90, 120, 150, 180, 240, 300, 360, 450, 600, 900, 1200]).filter(
  ([cm, rpm]) => {
    const k = (cm * rpm) / 3000;
    return twoDp(k) && k >= 0.1 && k <= 30;
  },
);

/** [rev/min, stopping time in s]: deceleration pi * rpm / (30 t) rad/s^2. */
const SPIN_DOWN = pairs([300, 450, 600, 900, 1200, 1500, 1800, 2400, 3000], [4, 5, 6, 8, 10, 12, 15, 20, 25, 30]).filter(
  ([rpm, t]) => {
    const k = rpm / (30 * t);
    return twoDp(k) && k >= 0.2 && k <= 25;
  },
);

/** [final rev/min, time in s]: revolutions from rest n = rpm * t / 120 is a whole number. */
const SPIN_UP = pairs([120, 180, 240, 300, 360, 480, 600, 900, 1200], [4, 5, 6, 8, 10, 12, 15, 20]).filter(([rpm, t]) => {
  const n = (rpm * t) / 120;
  return Number.isInteger(n) && n >= 5 && n <= 300;
});

/** [mass kg, speed m/s, radius m] with a short exact mv^2/r. */
const CF_SPEED = triples([0.2, 0.5, 1, 2, 3, 4, 5], [2, 3, 4, 5, 6, 8, 10, 12], [0.25, 0.5, 2, 4, 5, 10]).filter(
  ([m, v, rad]) => {
    const f = clean((m * v * v) / rad);
    return nice(f) && f >= 1 && f <= 2000;
  },
);

/** [mass kg, radius m, angular speed rad/s] with a short exact m r w^2. */
const CF_OMEGA = triples([0.1, 0.2, 0.5, 1, 2, 5], [0.2, 0.5, 2, 4], [2, 3, 4, 5, 6, 10]).filter(([m, rad, w]) => {
  const f = clean(m * rad * w * w);
  return nice(f) && f >= 0.5 && f <= 1000;
});

/** [mass kg, radius m, speed m/s] for a stone on a string in a vertical circle. */
const VC_ALL = triples([0.1, 0.2, 0.25, 0.5, 1, 2], [0.4, 0.5, 0.8, 1, 1.6, 2], [3, 4, 5, 6, 8, 10, 12]);
const VC_BOTTOM = VC_ALL.filter(([m, rad, v]) => {
  const a = clean((v * v) / rad);
  // v^2 >= 5gr at the lowest point, so the stone really can complete the vertical circle.
  return nice(clean(m * (G + a))) && a >= 5 * G && a <= 200;
});
const VC_TOP = VC_ALL.filter(([m, rad, v]) => {
  const a = clean((v * v) / rad);
  // String clearly taut (v^2/r >= 1.5 g) and T != mg so the "weight only" slip stays wrong.
  return nice(clean(m * (a - G))) && a >= 1.5 * G && a !== 2 * G && a <= 120;
});
/** Minimum speeds at the top; the radius v^2/g is then exact (0.4 m to 3.6 m, a realistic string). */
const VC_MIN = [2, 3, 4, 5, 6];

interface Solid {
  name: string;
  axis: string;
  /** I = k m s^2 */
  k: number;
  kTex: string;
  /** true: s is a length L (rod); false: s is a radius r. */
  length: boolean;
  /** Coefficients of formulas for other bodies or axes (confusions), best first. */
  wrongK: readonly [number, number, number];
}
const SOLIDS: readonly Solid[] = [
  { name: 'a thin uniform ring', axis: 'an axis through its centre perpendicular to its plane', k: 1, kTex: '', length: false, wrongK: [1 / 2, 2 / 5, 2] },
  { name: 'a uniform disc', axis: 'an axis through its centre perpendicular to its plane', k: 1 / 2, kTex: '\\frac{1}{2}', length: false, wrongK: [1, 2 / 5, 1 / 4] },
  { name: 'a uniform solid cylinder', axis: 'its own axis of symmetry', k: 1 / 2, kTex: '\\frac{1}{2}', length: false, wrongK: [1, 2 / 5, 1 / 4] },
  { name: 'a uniform solid sphere', axis: 'a diameter', k: 2 / 5, kTex: '\\frac{2}{5}', length: false, wrongK: [2 / 3, 1 / 2, 1] },
  { name: 'a thin uniform rod', axis: 'an axis through its midpoint perpendicular to its length', k: 1 / 12, kTex: '\\frac{1}{12}', length: true, wrongK: [1 / 3, 1 / 2, 1] },
];
const MI_CASES = SOLIDS.map((solid) => ({
  solid,
  combos: pairs(
    [1, 2, 3, 4, 5, 6, 8, 10, 12, 20],
    solid.length ? [0.3, 0.6, 1, 1.2, 1.5, 2, 3, 6] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2],
  ).filter(([m, s]) => {
    const i = clean(solid.k * m * s * s);
    return nice(i) && i >= 0.01 && i <= 100;
  }),
}));

/** Bodies that roll; k = I / (m r^2). */
const ROLLERS = [
  { name: 'thin ring', k: frac(1), iTex: 'mr^2' },
  { name: 'uniform disc', k: frac(1, 2), iTex: '\\frac{1}{2}mr^2' },
  { name: 'uniform solid cylinder', k: frac(1, 2), iTex: '\\frac{1}{2}mr^2' },
  { name: 'uniform solid sphere', k: frac(2, 5), iTex: '\\frac{2}{5}mr^2' },
] as const;
/** Rotational and total kinetic energy of a rolling body, as multiples of m v^2. */
const shares = (k: Fraction): { rot: Fraction; total: Fraction } => ({ rot: k.div(2), total: k.add(1).div(2) });
const ROLL_CASES = ROLLERS.map((body) => {
  const { rot, total } = shares(body.k);
  return {
    body,
    combos: pairs([2, 4, 5, 6, 8, 10], [1, 2, 3, 4, 5, 6]).filter(
      ([m, v]) => nice(rot.mul(m * v * v).toNumber()) && nice(total.mul(m * v * v).toNumber()),
    ),
  };
});

/** Bodies rolling down an incline, with speeds at the bottom that give an exact height. */
const INCLINERS = [
  { name: 'uniform disc', k: frac(1, 2), iTex: '\\frac{1}{2}mr^2', speeds: [2, 3, 4, 6, 8, 10, 12] },
  { name: 'uniform solid cylinder', k: frac(1, 2), iTex: '\\frac{1}{2}mr^2', speeds: [2, 4, 6, 8, 10] },
  { name: 'thin ring', k: frac(1), iTex: 'mr^2', speeds: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
] as const;

/** [final moment of inertia, ratio I1/I2, initial angular speed] for pulling mass inwards. */
const AM_PULL_IN = triples([1, 1.2, 1.5, 2, 2.5, 3, 4], [1.5, 2, 2.5, 3, 4], [1, 1.5, 2, 2.4, 3, 4, 5, 6]).filter(
  ([i2, q, w1]) => nice(clean(i2 * q)) && nice(clean(w1 * q)) && i2 * q <= 12 && w1 * q <= 30,
);
const PULL_IN_STORIES: ReadonlyArray<(i1: string, w1: string, i2: string) => string> = [
  (i1, w1, i2) =>
    tex`An ice skater spins on smooth ice with her arms stretched out; her moment of inertia is $${i1}$ and her angular speed is $${w1}$. She pulls her arms in, reducing her moment of inertia to $${i2}$. Her new angular speed is:`,
  (i1, w1, i2) =>
    tex`A diver leaves the springboard rotating at $${w1}$ with a moment of inertia of $${i1}$ about his centre of mass. In the air he tucks in his arms and legs, reducing his moment of inertia to $${i2}$. His angular speed in the tucked position is:`,
  (i1, w1, i2) =>
    tex`A student sits on a freely rotating stool holding two dumbbells at arm's length. The system has a moment of inertia of $${i1}$ and turns at $${w1}$. When he pulls the dumbbells to his chest, the moment of inertia becomes $${i2}$. The new angular speed is:`,
];

/** A lump of clay dropped onto a freely rotating turntable. */
const AM_CLAY = triples([0.5, 1, 1.5, 2, 3, 4], pairs([0.1, 0.2, 0.25, 0.5, 1], [0.5, 1, 2]), [2, 3, 4, 5, 6, 8, 10, 12])
  .map(([i, [m, rad], w]) => ({ i, m, rad, w, mr2: clean(m * rad * rad), w2: clean((i * w) / (i + m * rad * rad)) }))
  .filter(({ i, mr2, w2 }) => nice(w2) && nice(clean(i + mr2)) && mr2 <= i);

/** [orbital speed km/s, surface g, planet radius km] with v = sqrt(gR) exact. */
const PLANETS = pairs([3, 4, 5, 6, 8], [2.5, 4, 5, 8, 10])
  .map(([v, g]): [number, number, number] => [v, g, clean((v * v * 1000) / g)])
  .filter(([, , km]) => Number.isInteger(km) && km >= 800 && km <= 16000);

const RADIUS_WORDS: Record<number, readonly [string, string]> = {
  4: ['four times', 'one-fourth of'],
  9: ['nine times', 'one-ninth of'],
  16: ['sixteen times', 'one-sixteenth of'],
};

/** Angular speeds (rad/s) for a space station; R = g / w^2 is then exact. */
const STATIONS = [0.05, 0.1, 0.125, 0.2, 0.25, 0.4, 0.5].map((w) => ({ w, rad: clean(G / (w * w)) }));

const CHANGE_WORDS: Record<string, string> = {
  '2': 'doubled',
  '3': 'tripled',
  '4': 'made four times as large',
  '1/2': 'halved',
  '1/4': 'reduced to one-fourth',
};
const changed = (f: Fraction): string => CHANGE_WORDS[f.toString()] ?? `multiplied by ${f.toString()}`;

const G_NOTE = tex`(take $g = 10\,\mathrm{m\,s^{-2}}$)`;

export default defineBank('physics', 'circular-motion', (b) => [
  // ------------------------------------------------------------------ angular quantities
  b.dynamic('clock-hand-angular-speed', { difficulty: 1, origin: 'past-paper', tags: ['angular quantities'] }, (r) => {
    const [body, unitKey] = r.pick(CLOCK_CASES);
    const per = PER[unitKey];
    /** omega / pi in the chosen unit for something that turns once in `period` seconds. */
    const omega = (period: number): Fraction => frac(2 * per.seconds, period);
    const show = (f: Fraction): string => `$${qty(piFrac(f), per.unit)}$`;
    const correct = omega(body.period);
    const answer = show(correct);
    const slips = [frac(per.seconds, body.period)]; // used pi instead of 2 pi
    if (body.key === 'hour') slips.push(omega(EARTH.period)); // took 24 h for one turn of the hour hand
    if (body.key === 'earth') slips.push(omega(HOUR.period)); // took 12 h for one day
    const others = r.shuffle(SPINNERS.filter((s) => s.key !== body.key)).map((s) => omega(s.period));
    const t = body.period / per.seconds;
    const step = t === 1 ? '' : tex`\frac{2\pi}{${t}} = `;
    return {
      stem:
        body.key === 'earth'
          ? tex`Taking the period of the Earth's rotation about its axis as $24\,\mathrm{h}$, the angular speed of the Earth is:`
          : `The angular speed of ${body.name} is:`,
      answer,
      distractors: pickDistractors(answer, [...slips, ...others].map(show)),
      explanation: tex`$\omega = \frac{2\pi}{T}$. ${body.turns} $T = ${qty(t, per.symbol)}$, so $\omega = ${step}${piFrac(correct)}\,\mathrm{${per.unit}}$.`,
    };
  }),

  b.dynamic('wheel-rotation', { difficulty: 2, tags: ['angular quantities'] }, (r) => {
    const mode = r.pick(['rim-speed', 'spin-down', 'spin-up'] as const);
    if (mode === 'rim-speed') {
      const [cm, rpm] = r.pick(RIM_SPEED);
      const w = rpm / 30; // omega / pi in rad s^-1
      const k = clean((cm * rpm) / 3000); // v / pi in m s^-1
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        // pi instead of 2 pi; diameter used for radius; radius left in cm; rev/min used as rev/s
        wrong: [k / 2, 2 * k, 100 * k, 60 * k],
        format: (x) => `$${qty(piDec(x), U.mps)}$`,
      });
      return {
        stem: tex`A wheel of radius $${qty(cm, U.cm)}$ turns at $${rpm}$ revolutions per minute. The linear speed of a point on its rim is:`,
        answer,
        distractors,
        explanation: tex`$\omega = 2\pi f = 2\pi \times \frac{${rpm}}{60} = ${piDec(w)}\,\mathrm{rad\,s^{-1}}$ and $r = ${num(cm / 100)}\,\mathrm{m}$, so $v = r\omega = (${num(cm / 100)})(${piDec(w)}) = ${piDec(k)}\,\mathrm{m\,s^{-1}}$.`,
      };
    }
    if (mode === 'spin-down') {
      const [rpm, t] = r.pick(SPIN_DOWN);
      const w0 = rpm / 30; // initial omega / pi in rad s^-1
      const k = clean(w0 / t); // alpha / pi in rad s^-2
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        // pi instead of 2 pi; rev/min used as rev/s; gave the initial angular speed instead
        wrong: [k / 2, 60 * k, w0, 2 * k],
        format: (x) => `$${qty(piDec(x), UNIT.radps2)}$`,
      });
      return {
        stem: tex`A flywheel rotating at $${rpm}$ revolutions per minute is brought to rest with uniform deceleration in $${qty(t, U.s)}$. The magnitude of its angular deceleration is:`,
        answer,
        distractors,
        explanation: tex`$\omega_i = 2\pi \times \frac{${rpm}}{60} = ${piDec(w0)}\,\mathrm{rad\,s^{-1}}$ and $\omega_f = 0$, so $|\alpha| = \frac{\omega_i - \omega_f}{t} = \frac{${piDec(w0)}}{${t}} = ${piDec(k)}\,\mathrm{rad\,s^{-2}}$.`,
      };
    }
    const [rpm, t] = r.pick(SPIN_UP);
    const f = rpm / 60; // final rate in rev s^-1
    const n = (f * t) / 2;
    const { answer, distractors } = numericOptions(r, {
      correct: n,
      // used the final rate throughout; halved twice; left rev/min unconverted; gave radians
      wrong: [2 * n, n / 2, 60 * n, 2 * Math.PI * n],
      format: (x) => `$${num(x)}$`,
    });
    return {
      stem: tex`A wheel starts from rest and its rate of rotation increases uniformly to $${rpm}$ revolutions per minute in $${qty(t, U.s)}$. The number of revolutions it makes in this time is:`,
      answer,
      distractors,
      explanation: tex`The final rate is $f = \frac{${rpm}}{60} = ${num(f)}\,\mathrm{rev\,s^{-1}}$. For uniform acceleration from rest the average rate is $\frac{f}{2}$, so $n = \frac{f}{2}\,t = \frac{${num(f)}}{2} \times ${t} = ${num(n)}$ revolutions.`,
    };
  }),

  // ------------------------------------------------------------------ centripetal force
  b.dynamic('centripetal-force', { difficulty: 1, tags: ['centripetal force'] }, (r) => {
    if (r.chance(0.6)) {
      const [m, v, rad] = r.pick(CF_SPEED);
      const f = clean((m * v * v) / rad);
      const { answer, distractors } = numericOptions(r, {
        correct: f,
        // forgot to square v; multiplied by r; computed (1/2)mv^2; divided by r^2
        wrong: [(m * v) / rad, m * v * v * rad, 0.5 * m * v * v, (m * v * v) / (rad * rad)],
        format: (x) => q$(x, U.N),
      });
      return {
        stem: tex`A body of mass $${qty(m, U.kg)}$ moves in a circle of radius $${qty(rad, U.m)}$ with a constant speed of $${qty(v, U.mps)}$. The centripetal force acting on it is:`,
        answer,
        distractors,
        explanation: tex`$F_c = \frac{mv^2}{r} = \frac{(${num(m)})(${v})^2}{${num(rad)}} = ${num(f)}\,\mathrm{N}$, directed towards the centre of the circle.`,
      };
    }
    const [m, rad, w] = r.pick(CF_OMEGA);
    const f = clean(m * rad * w * w);
    const { answer, distractors } = numericOptions(r, {
      correct: f,
      // forgot to square omega; divided by r; squared r; ignored r
      wrong: [m * rad * w, (m * w * w) / rad, m * rad * rad * w * w, m * w * w],
      format: (x) => q$(x, U.N),
    });
    return {
      stem: tex`A particle of mass $${qty(m, U.kg)}$ moves in a circle of radius $${qty(rad, U.m)}$ with a uniform angular speed of $${qty(w, U.radps)}$. The centripetal force on it is:`,
      answer,
      distractors,
      explanation: tex`With $v = r\omega$, $F_c = \frac{mv^2}{r} = mr\omega^2 = (${num(m)})(${num(rad)})(${w})^2 = ${num(f)}\,\mathrm{N}$.`,
    };
  }),

  b.dynamic('centripetal-force-scaling', { difficulty: 2, origin: 'past-paper', tags: ['centripetal force'] }, (r) => {
    const angular = r.chance(0.4);
    const a = r.pick([frac(2), frac(2), frac(3), frac(1, 2)]); // factor on the speed (or angular speed)
    const k = r.pick([frac(2), frac(1, 2), frac(4), frac(1, 4)]); // factor on the radius
    const c = r.chance(0.3) ? r.pick([frac(2), frac(1, 2)]) : frac(1); // factor on the mass
    const a2 = a.pow(2);
    const correct = angular ? c.mul(a2).mul(k) : c.mul(a2).div(k);
    const show = (f: Fraction): string => `$${timesSym(f, 'F')}$`;
    const answer = show(correct);
    const candidates = [
      angular ? c.mul(a2).div(k) : c.mul(a2).mul(k), // used the other formula (the classic trap)
      angular ? c.mul(a).mul(k) : c.mul(a).div(k), // forgot to square the speed
      c.mul(a2), // ignored the change of radius
      angular ? c.mul(a2).mul(k.pow(2)) : c.mul(a2).div(k.pow(2)), // squared the radius factor
      ...[2, 4, 8, 16, 1, 0.5, 0.25, 0.125].map((x) => Fraction.of(x)),
    ];
    const speed = angular ? 'angular speed' : 'speed';
    const clauses = [`its ${speed} is ${changed(a)}`, `the radius of the circle is ${changed(k)}`];
    if (!c.equals(1)) clauses.push(`its mass is ${changed(c)}`);
    const mass = coefTex(c, 'm');
    const middle = correct.equals(1) ? '' : `${correct.toTex()}\\,`;
    return {
      stem: tex`A body moving in a circle with uniform ${speed} experiences a centripetal force $F$. If ${listText(clauses)}, the centripetal force becomes:`,
      answer,
      distractors: pickDistractors(answer, candidates.map(show)),
      explanation: angular
        ? tex`With the angular speed given, use $F = mr\omega^2$: $F' = (${mass})(${coefTex(k, 'r')})(${coefTex(a, '\\omega')})^2 = ${middle}mr\omega^2 = ${timesSym(correct, 'F')}$. At fixed $\omega$ the force grows with $r$; it is only at fixed speed that $F = \frac{mv^2}{r}$ falls as $r$ grows.`
        : tex`With the speed given, use $F = \frac{mv^2}{r}$: $F' = \frac{${mass}(${coefTex(a, 'v')})^2}{${coefTex(k, 'r')}} = ${middle}\frac{mv^2}{r} = ${timesSym(correct, 'F')}$.`,
    };
  }),

  b.dynamic('vertical-circle', { difficulty: 2, tags: ['centripetal force'] }, (r) => {
    const mode = r.pick(['bottom', 'top', 'minimum'] as const);
    if (mode === 'minimum') {
      const v = r.pick(VC_MIN);
      const rad = clean((v * v) / G);
      // A bucket is whirled at arm's length, so only use it for realistic radii (at most 1.6 m).
      const bucket = v <= 4 && r.chance(0.5);
      const { answer, distractors } = numericOptions(r, {
        correct: v,
        // sqrt(5gr) is the minimum speed at the LOWEST point; sqrt(4gr) from mg(2r) = mv^2/2; v^2 forgets the root
        wrong: [Math.sqrt(5) * v, 2 * v, v * v, Math.SQRT2 * v],
        format: (x) => q$(x, U.mps),
      });
      return {
        stem: bucket
          ? tex`A bucket of water is whirled in a vertical circle of radius $${qty(rad, U.m)}$. The minimum speed of the bucket at the highest point, so that no water spills, is ${G_NOTE}:`
          : tex`A stone tied to a string is whirled in a vertical circle of radius $${qty(rad, U.m)}$. The minimum speed of the stone at the highest point, for the string to stay taut, is ${G_NOTE}:`,
        answer,
        distractors,
        explanation: tex`At the minimum speed the ${bucket ? 'bucket just stops pushing on the water' : 'tension just becomes zero'} at the top, so the weight alone supplies the centripetal force: $mg = \frac{mv^2}{r} \Rightarrow v = \sqrt{gr} = \sqrt{(10)(${num(rad)})} = ${v}\,\mathrm{m\,s^{-1}}$.`,
      };
    }
    const bottom = mode === 'bottom';
    const [m, rad, v] = r.pick(bottom ? VC_BOTTOM : VC_TOP);
    const a = clean((v * v) / rad);
    const t = clean(bottom ? m * (G + a) : m * (a - G));
    const { answer, distractors } = numericOptions(r, {
      correct: t,
      wrong: bottom
        ? // forgot the weight; used the top-point equation; weight only; forgot to square v
          [m * a, m * (a - G), m * G, m * (G + v / rad)]
        : // used the lowest-point equation; forgot the weight; weight only; forgot to divide by r
          [m * (G + a), m * a, m * G, m * (v * v - G)],
      format: (x) => q$(x, U.N),
    });
    return {
      stem: tex`A stone of mass $${qty(m, U.kg)}$ tied to a string is whirled in a vertical circle of radius $${qty(rad, U.m)}$. As it passes through the ${bottom ? 'lowest' : 'highest'} point with a speed of $${qty(v, U.mps)}$, the tension in the string is ${G_NOTE}:`,
      answer,
      distractors,
      explanation: bottom
        ? tex`At the lowest point the tension acts upward (towards the centre) and the weight downward, so $T - mg = \frac{mv^2}{r}$. Hence $T = m\left(g + \frac{v^2}{r}\right) = (${num(m)})\left(10 + \frac{(${v})^2}{${num(rad)}}\right) = (${num(m)})(10 + ${num(a)}) = ${num(t)}\,\mathrm{N}$.`
        : tex`At the highest point the tension and the weight both act downward, towards the centre, so $T + mg = \frac{mv^2}{r}$. Hence $T = m\left(\frac{v^2}{r} - g\right) = (${num(m)})\left(\frac{(${v})^2}{${num(rad)}} - 10\right) = (${num(m)})(${num(a)} - 10) = ${num(t)}\,\mathrm{N}$.`,
    };
  }),

  // ------------------------------------------------------------------ moment of inertia, rotational KE
  b.dynamic('moment-of-inertia', { difficulty: 1, tags: ['moment of inertia'] }, (r) => {
    const { solid, combos } = r.pick(MI_CASES);
    const [m, s] = r.pick(combos);
    const i = clean(solid.k * m * s * s);
    const [w1, w2, w3] = solid.wrongK;
    const { answer, distractors } = numericOptions(r, {
      correct: i,
      // another body's formula; forgot to square the size; two more formula confusions
      wrong: [w1 * m * s * s, solid.k * m * s, w2 * m * s * s, w3 * m * s * s],
      format: (x) => q$(x, U.kgm2),
    });
    const sym = solid.length ? 'L' : 'r';
    return {
      stem: tex`The moment of inertia of ${solid.name} of mass $${qty(m, U.kg)}$ and ${solid.length ? 'length' : 'radius'} $${qty(s, U.m)}$ about ${solid.axis} is:`,
      answer,
      distractors,
      explanation: tex`$I = ${solid.kTex}m${sym}^2 = ${solid.kTex}(${m})(${num(s)})^2 = ${num(i)}\,\mathrm{kg\,m^{2}}$.`,
    };
  }),

  b.dynamic('rolling-kinetic-energy', { difficulty: 2, tags: ['rotational kinetic energy', 'moment of inertia'] }, (r) => {
    const { body, combos } = r.pick(ROLL_CASES);
    const { rot, total } = shares(body.k);
    const ring = body.k.equals(1);
    // For a ring half the energy is rotational, which makes the "fraction" variant too easy.
    const mode = ring ? r.pick(['total', 'rotational'] as const) : r.pick(['total', 'total', 'rotational', 'fraction'] as const);
    const withI = tex`For rolling without slipping $\omega = \frac{v}{r}$, and for a ${body.name} $I = ${body.iTex}$.`;
    if (mode === 'fraction') {
      const share = rot.div(total);
      const show = (f: Fraction): string => `$${f.toTex()}$`;
      const answer = show(share);
      // rotational/translational ratio; translational fraction; coefficient of mv^2; another body's fraction
      const candidates = [rot.div(frac(1, 2)), frac(1).sub(share), rot, frac(1, 2), frac(1, 3), frac(2, 3)];
      return {
        stem: `A ${body.name} rolls without slipping on a level surface. The fraction of its total kinetic energy that is rotational is:`,
        answer,
        distractors: pickDistractors(answer, candidates.map(show)),
        explanation: tex`${withI} So $K_{rot} = \frac{1}{2}I\omega^2 = ${coefTex(rot, 'mv^2')}$ and $K_{total} = \frac{1}{2}mv^2 + ${coefTex(rot, 'mv^2')} = ${coefTex(total, 'mv^2')}$. The rotational fraction is $\frac{${rot.toTex()}}{${total.toTex()}} = ${share.toTex()}$.`,
      };
    }
    const [m, v] = r.pick(combos);
    const mv2 = m * v * v;
    const ke = (f: Fraction): number => f.mul(mv2).toNumber();
    const others = ROLLERS.filter((o) => !o.k.equals(body.k)).map((o) => shares(o.k));
    if (mode === 'total') {
      const { answer, distractors } = numericOptions(r, {
        correct: ke(total),
        // ignored rotation; gave only the rotational part; used another body's moment of inertia
        wrong: [mv2 / 2, ke(rot), ...others.map((o) => ke(o.total))],
        format: (x) => q$(x, U.J),
      });
      const lead = total.equals(1) ? '' : total.toTex();
      return {
        stem: tex`A ${body.name} of mass $${qty(m, U.kg)}$ rolls without slipping on a level floor with a speed of $${qty(v, U.mps)}$. Its total kinetic energy is:`,
        answer,
        distractors,
        explanation: tex`${withI} So $K = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2 = \frac{1}{2}mv^2 + ${coefTex(rot, 'mv^2')} = ${coefTex(total, 'mv^2')} = ${lead}(${m})(${v})^2 = ${num(ke(total))}\,\mathrm{J}$.`,
      };
    }
    const { answer, distractors } = numericOptions(r, {
      correct: ke(rot),
      // gave the total; gave the translational part; used another body's moment of inertia
      wrong: [ke(total), mv2 / 2, ...others.map((o) => ke(o.rot))],
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A ${body.name} of mass $${qty(m, U.kg)}$ rolls without slipping on a level floor with a speed of $${qty(v, U.mps)}$. Its rotational kinetic energy is:`,
      answer,
      distractors,
      explanation: tex`${withI} So $K_{rot} = \frac{1}{2}I\omega^2 = \frac{1}{2}\left(${body.iTex}\right)\frac{v^2}{r^2} = ${coefTex(rot, 'mv^2')} = ${rot.toTex()}(${m})(${v})^2 = ${num(ke(rot))}\,\mathrm{J}$.`,
    };
  }),

  b.dynamic('rolling-down-incline', { difficulty: 3, origin: 'past-paper', tags: ['rotational kinetic energy'] }, (r) => {
    const body = r.pick(INCLINERS);
    const v = r.pick(body.speeds);
    const total = body.k.add(1).div(2);
    const h = clean((total.toNumber() * v * v) / G);
    const ring = body.k.equals(1);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      wrong: [
        Math.sqrt(2 * G * h), // slid without rolling
        ring ? Math.sqrt((4 * G * h) / 3) : Math.sqrt(G * h), // used the other body's result
        Math.sqrt((2 * G * h) / body.k.toNumber()), // put all the energy into rotation
        v * v, // forgot the square root
      ],
      format: (x) => q$(x, U.mps),
    });
    const formula = ring ? tex`\sqrt{gh}` : tex`\sqrt{\frac{4gh}{3}}`;
    const sub = ring ? tex`\sqrt{(10)(${num(h)})}` : tex`\sqrt{\frac{4(10)(${num(h)})}{3}}`;
    return {
      stem: tex`A ${body.name} is released from rest at the top of an inclined plane of vertical height $${qty(h, U.m)}$ and rolls down without slipping. Its speed at the bottom is ${G_NOTE}:`,
      answer,
      distractors,
      explanation: tex`Energy is conserved: $mgh = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2$ with $I = ${body.iTex}$ and $\omega = \frac{v}{r}$, so $mgh = ${coefTex(total, 'mv^2')}$ and $v = ${formula} = ${sub} = ${v}\,\mathrm{m\,s^{-1}}$. A body sliding without friction would reach $\sqrt{2gh}$; a rolling body is slower because part of its energy goes into rotation.`,
    };
  }),

  // ------------------------------------------------------------------ angular momentum
  b.dynamic('angular-momentum-conservation', { difficulty: 2, origin: 'past-paper', tags: ['angular momentum'] }, (r) => {
    if (r.chance(0.65)) {
      const [i2, q, w1] = r.pick(AM_PULL_IN);
      const i1 = clean(i2 * q);
      const w2 = clean(w1 * q);
      const { answer, distractors } = numericOptions(r, {
        correct: w2,
        // inverted the ratio; assumed no change; conserved kinetic energy instead; squared the ratio
        wrong: [w1 / q, w1, w1 * Math.sqrt(q), w1 * q * q],
        format: (x) => q$(x, U.radps),
      });
      return {
        stem: r.pick(PULL_IN_STORIES)(qty(i1, U.kgm2), qty(w1, U.radps), qty(i2, U.kgm2)),
        answer,
        distractors,
        explanation: tex`No external torque acts about the axis of rotation, so angular momentum is conserved: $I_1\omega_1 = I_2\omega_2 \Rightarrow \omega_2 = \frac{I_1\omega_1}{I_2} = \frac{(${num(i1)})(${num(w1)})}{${num(i2)}} = ${num(w2)}\,\mathrm{rad\,s^{-1}}$. Pulling mass towards the axis lowers $I$, so $\omega$ rises.`,
      };
    }
    const { i, m, rad, w, mr2, w2 } = r.pick(AM_CLAY);
    const { answer, distractors } = numericOptions(r, {
      correct: w2,
      // assumed no change; inverted; conserved kinetic energy; forgot to square r; ignored the turntable
      wrong: [w, ((i + mr2) * w) / i, w * Math.sqrt(i / (i + mr2)), (i * w) / (i + m * rad), (i * w) / mr2],
      format: (x) => q$(x, U.radps),
    });
    return {
      stem: tex`A horizontal turntable with moment of inertia $${qty(i, U.kgm2)}$ about its vertical axis rotates freely at $${qty(w, U.radps)}$. A small lump of clay of mass $${qty(m, U.kg)}$ is dropped vertically onto it and sticks at a distance of $${qty(rad, U.m)}$ from the axis. The new angular speed of the turntable is:`,
      answer,
      distractors,
      explanation: tex`The clay falls vertically, so it brings no angular momentum about the axis, and no external torque acts about that axis. Hence $I\omega = (I + mr^2)\omega'$, giving $\omega' = \frac{(${num(i)})(${w})}{${num(i)} + (${num(m)})(${num(rad)})^2} = \frac{${num(clean(i * w))}}{${num(clean(i + mr2))}} = ${num(w2)}\,\mathrm{rad\,s^{-1}}$.`,
    };
  }),

  // ------------------------------------------------------------------ satellites
  b.dynamic('orbital-speed', { difficulty: 2, tags: ['satellites'] }, (r) => {
    const earth = r.chance(0.3);
    const [v, g, km] = earth ? [8, 10, 6400] : r.pick(PLANETS);
    const { answer, distractors } = numericOptions(r, {
      correct: v,
      // escape speed sqrt(2gR); divided by sqrt 2; radius left in km; doubled
      wrong: [Math.SQRT2 * v, v / Math.SQRT2, v / Math.sqrt(1000), 2 * v],
      format: (x) => q$(x, UNIT.kmps),
    });
    return {
      stem: earth
        ? tex`The orbital speed of a satellite revolving just above the Earth's surface is (take $R = 6400\,\mathrm{km}$ and $g = 10\,\mathrm{m\,s^{-2}}$):`
        : tex`A planet has a radius of $${qty(km, U.km)}$ and the acceleration due to gravity at its surface is $${qty(g, U.mps2)}$. The orbital speed of a satellite revolving just above its surface is:`,
      answer,
      distractors,
      explanation: tex`Gravity provides the centripetal force, $mg = \frac{mv^2}{R}$, so $v = \sqrt{gR} = \sqrt{(${num(g)})(${sci(km * 1000, 4)})} = ${num(v * 1000)}\,\mathrm{m\,s^{-1}} = ${v}\,\mathrm{km\,s^{-1}}$. (The escape speed $\sqrt{2gR}$ is $\sqrt{2}$ times larger.)`,
    };
  }),

  b.dynamic('orbit-scaling', { difficulty: 3, origin: 'past-paper', tags: ['satellites'] }, (r) => {
    const mode = r.pick(['period-radius', 'speed-radius', 'speed-height', 'period-height'] as const);
    const opt = (base: number, half: number, sym: string): string => `$${powSym(base, half, sym)}$`;

    if (mode === 'period-radius' || mode === 'speed-radius') {
      const k = r.pick([4, 9, 16]);
      const dir = r.chance(0.75) ? 1 : -1; // +1: B's orbit is k times larger; -1: k times smaller
      const [up, down] = RADIUS_WORDS[k] ?? ['', ''];
      const ratio = dir > 0 ? String(k) : `\\frac{1}{${k}}`;
      const intro = `Two satellites revolve around the same planet in circular orbits. The orbital radius of satellite B is ${dir > 0 ? up : down} that of satellite A.`;
      if (mode === 'period-radius') {
        const answer = opt(k, 3 * dir, 'T');
        return {
          stem: tex`${intro} If the period of A is $T$, the period of B is:`,
          answer,
          // linear; squared; square root; inverted; unchanged
          distractors: pickDistractors(answer, [opt(k, 2 * dir, 'T'), opt(k, 4 * dir, 'T'), opt(k, dir, 'T'), opt(k, -3 * dir, 'T'), '$T$']),
          explanation: tex`Gravity supplies the centripetal force: $\frac{GMm}{r^2} = mr\left(\frac{2\pi}{T}\right)^2$, so $T^2 = \frac{4\pi^2}{GM}\,r^3$ (Kepler's third law) and $T \propto r^{3/2}$. Hence $T_B = \left(${ratio}\right)^{3/2}T = ${powSym(k, 3 * dir, 'T')}$.`,
        };
      }
      const answer = opt(k, -dir, 'v');
      return {
        stem: tex`${intro} If the orbital speed of A is $v$, the orbital speed of B is:`,
        answer,
        // inverted; linear; three-halves power; unchanged
        distractors: pickDistractors(answer, [opt(k, dir, 'v'), opt(k, -2 * dir, 'v'), opt(k, -3 * dir, 'v'), '$v$']),
        explanation: tex`Gravity supplies the centripetal force: $\frac{GMm}{r^2} = \frac{mv^2}{r}$, so $v = \sqrt{\frac{GM}{r}}$ and $v \propto r^{-1/2}$. Hence $v_B = \left(${ratio}\right)^{-1/2}v = ${powSym(k, -dir, 'v')}$: ${dir > 0 ? 'a larger orbit means a smaller speed' : 'a smaller orbit means a larger speed'}.`,
      };
    }

    const n = mode === 'speed-height' ? r.pick([1, 3, 8, 15]) : r.pick([1, 3, 8]);
    const hTex = n === 1 ? 'R' : `${n}R`;
    const radiusStep = tex`with $r$ measured from the centre of the Earth. Near the surface $r = R$; at height $h = ${hTex}$, $r = R + h = ${n + 1}R$`;
    if (mode === 'speed-height') {
      const answer = opt(n + 1, -1, 'v_0');
      const raw = tex`\frac{v_0}{\sqrt{${n + 1}}}`;
      const simplified = powSym(n + 1, -1, 'v_0');
      return {
        stem: tex`A satellite orbiting just above the Earth's surface has orbital speed $v_0$. Another satellite moves in a circular orbit at a height $h = ${hTex}$ above the surface, where $R$ is the radius of the Earth. Its orbital speed is:`,
        answer,
        // took h as the orbital radius; forgot the square root; inverted; three-halves power
        distractors: pickDistractors(answer, [opt(n, -1, 'v_0'), opt(n + 1, -2, 'v_0'), opt(n + 1, 1, 'v_0'), opt(n + 1, -3, 'v_0')]),
        explanation: tex`$v = \sqrt{\frac{GM}{r}}$ ${radiusStep}. So $v = ${raw === simplified ? raw : `${raw} = ${simplified}`}$.`,
      };
    }
    const answer = opt(n + 1, 3, 'T_0');
    return {
      stem: tex`A satellite orbiting just above the Earth's surface has period $T_0$. The period of a satellite in a circular orbit at a height $h = ${hTex}$ above the surface, where $R$ is the radius of the Earth, is:`,
      answer,
      // took h as the orbital radius; linear; squared; square root
      distractors: pickDistractors(answer, [opt(n, 3, 'T_0'), opt(n + 1, 2, 'T_0'), opt(n + 1, 4, 'T_0'), opt(n + 1, 1, 'T_0')]),
      explanation: tex`$T \propto r^{3/2}$ (Kepler's third law), ${radiusStep}. So $T = (${n + 1})^{3/2}T_0 = ${powSym(n + 1, 3, 'T_0')}$.`,
    };
  }),

  // ------------------------------------------------------------------ artificial gravity
  b.dynamic('artificial-gravity', { difficulty: 2, tags: ['artificial gravity'] }, (r) => {
    const { w, rad } = r.pick(STATIONS);
    const mode = r.pick(['omega', 'period', 'frequency'] as const);
    const what = { omega: 'angular speed', period: 'period of rotation', frequency: 'frequency of rotation' }[mode];
    const stem = tex`A space station is a large ring of radius $${qty(rad, U.m)}$ that spins about its central axis. For astronauts standing on the inner surface of the rim to feel their normal weight ${G_NOTE}, the ${what} of the station must be:`;
    const base = tex`The rim pushes each astronaut towards the centre, supplying the centripetal force; this feels like normal weight when $mR\omega^2 = mg$, i.e. $\omega = \sqrt{\frac{g}{R}} = \sqrt{\frac{10}{${num(rad)}}} = ${num(w)}\,\mathrm{rad\,s^{-1}}$.`;
    if (mode === 'omega') {
      const { answer, distractors } = numericOptions(r, {
        correct: w,
        // forgot the root (g/R); inverted (sqrt(R/g)); gave the rim speed sqrt(gR)
        wrong: [w * w, 1 / w, w * rad],
        format: (x) => q$(x, U.radps),
      });
      return { stem, answer, distractors, explanation: base };
    }
    if (mode === 'period') {
      const k = clean(2 / w); // T / pi
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        // dropped the 2; inverted g/R; forgot the root
        wrong: [1 / w, 2 * w, 2 / (w * w)],
        format: (x) => `$${qty(piDec(x), U.s)}$`,
      });
      return {
        stem,
        answer,
        distractors,
        explanation: tex`${base} Then $T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{R}{g}} = \frac{2\pi}{${num(w)}} = ${piDec(k)}\,\mathrm{s}$.`,
      };
    }
    const wf = Fraction.of(w);
    const correct = wf.div(2); // f * pi
    const show = (f: Fraction): string => `$${qty(perPi(f), U.Hz)}$`;
    const answer = show(correct);
    return {
      stem,
      answer,
      // dropped the 2; forgot the root; inverted; inverted and dropped the 2
      distractors: pickDistractors(answer, [wf, wf.mul(wf).div(2), wf.mul(2).inv(), wf.inv()].map(show)),
      explanation: tex`${base} Then $f = \frac{\omega}{2\pi} = \frac{1}{2\pi}\sqrt{\frac{g}{R}} = \frac{${num(w)}}{2\pi} = ${perPi(correct)}\,\mathrm{Hz}$.`,
    };
  }),

  // ------------------------------------------------------------------ concepts
  ...b.mcqs([
    {
      id: 'angular-velocity-direction',
      d: 1,
      t: ['angular quantities'],
      q: 'For a wheel rotating about a fixed axle, the direction of its angular velocity is:',
      a: 'along the axis of rotation',
      x: ['along the tangent to the rim', 'towards the centre of the wheel', 'radially outward from the axle'],
      e: tex`Angular velocity is an axial vector. Curl the fingers of the right hand in the sense of rotation; the thumb then points along the axis of rotation, which is the direction of $\vec{\omega}$.`,
    },
    {
      id: 'moment-of-inertia-independent-of',
      d: 2,
      t: ['moment of inertia'],
      q: 'The moment of inertia of a rigid body does **not** depend on:',
      a: 'its angular velocity',
      x: ['its mass', 'how its mass is distributed about the axis', 'the position of the axis of rotation'],
      e: tex`$I = \sum m_i r_i^2$ depends on the masses and on their distances $r_i$ from the chosen axis, so it changes with the mass, its distribution and the choice of axis. It does not change with how fast the body rotates.`,
    },
    {
      id: 'angular-momentum-unit',
      d: 2,
      t: ['angular momentum'],
      q: 'Angular momentum has the same SI unit as:',
      a: "Planck's constant",
      x: ['torque', 'linear momentum', 'power'],
      e: tex`$L = mvr$ has the unit $\mathrm{kg\,m^{2}\,s^{-1}} = (\mathrm{kg\,m^{2}\,s^{-2}})\,\mathrm{s} = \mathrm{J\,s}$, the unit of Planck's constant. Torque is measured in $\mathrm{N\,m}$, linear momentum in $\mathrm{kg\,m\,s^{-1}}$ and power in $\mathrm{W}$.`,
    },
    {
      id: 'disc-and-ring-race',
      d: 2,
      t: ['rotational kinetic energy'],
      q: 'A uniform disc and a thin ring of the same mass and radius are released together from rest at the top of the same inclined plane and roll down without slipping. Which one reaches the bottom first?',
      a: 'The disc',
      x: ['The ring', 'Both reach the bottom together', 'It depends on the angle of the incline'],
      e: tex`From $mgh = \frac{1}{2}mv^2 + \frac{1}{2}I\omega^2$ with $\omega = \frac{v}{r}$, the disc ($I = \frac{1}{2}mr^2$) reaches $v = \sqrt{\frac{4gh}{3}}$, while the ring ($I = mr^2$) reaches only $v = \sqrt{gh}$. The disc keeps a smaller share of its energy as rotation, so it is faster at every height and wins for any angle of incline.`,
    },
    {
      id: 'skater-energy-change',
      d: 3,
      t: ['angular momentum', 'rotational kinetic energy'],
      q: 'A skater spinning freely on smooth ice pulls her arms in towards her body. What happens to her angular momentum $L$ and her rotational kinetic energy $K$?',
      a: '$L$ stays constant and $K$ increases',
      x: ['$L$ stays constant and $K$ stays constant', '$L$ increases and $K$ increases', '$L$ stays constant and $K$ decreases'],
      e: tex`No external torque acts, so $L = I\omega$ is conserved. Since $K = \frac{L^2}{2I}$, a smaller $I$ with the same $L$ gives a larger $K$. The extra energy comes from the work her muscles do in pulling her arms inward.`,
    },
    {
      id: 'geostationary-height',
      d: 1,
      o: 'past-paper',
      t: ['satellites'],
      q: "The height of a geostationary satellite above the Earth's surface is about:",
      a: tex`$36\,000\,\mathrm{km}$`,
      x: [tex`$6400\,\mathrm{km}$`, tex`$42\,000\,\mathrm{km}$`, tex`$3600\,\mathrm{km}$`],
      e: tex`A geostationary satellite has a period of $24\,\mathrm{h}$. From $\frac{GM}{r^2} = \frac{4\pi^2 r}{T^2}$, $r = \left(\frac{GMT^2}{4\pi^2}\right)^{1/3} \approx 4.23 \times 10^{4}\,\mathrm{km}$ from the Earth's centre. Subtracting the Earth's radius ($6.4 \times 10^{3}\,\mathrm{km}$) leaves a height of about $3.6 \times 10^{4}\,\mathrm{km}$; $42\,000\,\mathrm{km}$ is the orbital radius, not the height.`,
    },
    {
      id: 'communication-satellites',
      d: 1,
      o: 'past-paper',
      t: ['satellites'],
      q: 'The minimum number of geostationary satellites needed to relay signals around the whole Earth (except the polar regions) is:',
      a: '$3$',
      x: ['$2$', '$4$', '$6$'],
      e: tex`Each geostationary satellite can see a region spanning about $160^{\circ}$ of longitude. Two satellites cannot cover all $360^{\circ}$, but three placed $120^{\circ}$ apart above the equator give overlapping coverage of the whole globe except near the poles.`,
    },
    {
      id: 'weightlessness-in-orbit',
      d: 2,
      t: ['satellites'],
      q: 'An astronaut inside a satellite orbiting the Earth feels weightless because:',
      a: 'both the astronaut and the satellite are in free fall',
      x: [
        'no gravitational force acts on the astronaut there',
        "the Moon's gravity cancels the Earth's gravity there",
        "the satellite is outside the Earth's atmosphere",
      ],
      e: tex`Gravity still acts at orbital heights; it provides the centripetal force that keeps the satellite in orbit. The satellite and everything in it fall freely with the same acceleration, so the floor exerts no reaction on the astronaut and the apparent weight is zero.`,
    },
    {
      id: 'rpm-to-rad-per-second',
      d: 1,
      t: ['angular quantities'],
      q: 'An angular speed of one revolution per minute is equal to:',
      a: tex`$\frac{\pi}{30}\,\mathrm{rad\,s^{-1}}$`,
      x: [tex`$\frac{\pi}{60}\,\mathrm{rad\,s^{-1}}$`, tex`$2\pi\,\mathrm{rad\,s^{-1}}$`, tex`$120\pi\,\mathrm{rad\,s^{-1}}$`],
      e: tex`One revolution is $2\pi\,\mathrm{rad}$ and one minute is $60\,\mathrm{s}$, so $1\,\mathrm{rev\,min^{-1}} = \frac{2\pi}{60}\,\mathrm{rad\,s^{-1}} = \frac{\pi}{30}\,\mathrm{rad\,s^{-1}}$. Taking one revolution as $\pi\,\mathrm{rad}$ gives $\frac{\pi}{60}$, forgetting the minute-to-second conversion gives $2\pi$, and multiplying by $60$ instead of dividing gives $120\pi$.`,
    },
    {
      id: 'same-angular-velocity',
      d: 1,
      t: ['angular quantities'],
      q: 'All points on a rigid wheel rotating about a fixed axle have the same:',
      a: 'angular velocity',
      x: ['linear speed', 'centripetal acceleration', 'distance travelled in one revolution'],
      e: tex`Every point turns through the same angle in the same time, so $\omega$ is common to the whole wheel. The linear speed $v = r\omega$, the centripetal acceleration $r\omega^2$ and the distance $2\pi r$ covered in one revolution all grow with the distance $r$ from the axle.`,
    },
    {
      id: 'uniform-circular-motion-constant',
      d: 1,
      t: ['centripetal force'],
      q: 'For a body in uniform circular motion, which of the following quantities remains constant?',
      a: 'its kinetic energy',
      x: ['its velocity', 'its acceleration vector', 'its linear momentum'],
      e: tex`The speed is constant, so $K = \frac{1}{2}mv^2$ is constant. The velocity and the linear momentum keep changing direction along the tangent, and the centripetal acceleration keeps changing direction because it always points towards the centre.`,
    },
    {
      id: 'uniform-circular-motion-accelerations',
      d: 1,
      o: 'past-paper',
      t: ['centripetal force'],
      q: tex`A particle moves in a circle of radius $r$ with a constant speed $v$. Its tangential acceleration and its centripetal acceleration are, respectively:`,
      a: tex`$0$ and $\frac{v^2}{r}$`,
      x: [tex`$\frac{v^2}{r}$ and $0$`, tex`$0$ and $0$`, tex`$\frac{v^2}{r}$ and $\frac{v^2}{r}$`],
      e: tex`Tangential acceleration changes the speed; since the speed is constant it is zero. The direction of the velocity still changes continuously, which needs a centripetal acceleration $\frac{v^2}{r}$ directed towards the centre.`,
    },
    {
      id: 'angular-momentum-conserved-when',
      d: 1,
      t: ['angular momentum'],
      q: 'The angular momentum of a system remains constant if:',
      a: 'the net external torque on it is zero',
      x: ['the net external force on it is zero', 'its moment of inertia remains constant', 'no internal forces act between its parts'],
      e: tex`Since $\vec{\tau} = \frac{\Delta\vec{L}}{\Delta t}$, $\vec{L}$ is conserved when the net external torque is zero. Zero net force is not enough (a couple has zero net force but a non-zero torque), and internal forces cannot change the total angular momentum.`,
    },
    {
      id: 'torque-rate-of-angular-momentum',
      d: 1,
      t: ['angular momentum'],
      q: 'The time rate of change of the angular momentum of a body is equal to the:',
      a: 'net torque acting on it',
      x: ['net force acting on it', 'power delivered to it', 'rotational kinetic energy of the body'],
      e: tex`$\vec{\tau} = \frac{\Delta\vec{L}}{\Delta t}$ is the rotational form of Newton's second law, just as $\vec{F} = \frac{\Delta\vec{p}}{\Delta t}$ gives the net force as the rate of change of linear momentum.`,
    },
    {
      id: 'flywheel-energy-doubled-speed',
      d: 1,
      o: 'past-paper',
      t: ['rotational kinetic energy'],
      q: 'The angular speed of a flywheel is doubled. Its rotational kinetic energy becomes:',
      a: 'four times as large',
      x: ['twice as large', 'eight times as large', 'half as large'],
      e: tex`For a rigid flywheel $I$ is fixed and $K = \frac{1}{2}I\omega^2 \propto \omega^2$, so doubling $\omega$ multiplies $K$ by $2^2 = 4$. (Its angular momentum $L = I\omega$ only doubles.)`,
    },
    {
      id: 'orbital-speed-independent-of',
      d: 1,
      o: 'past-paper',
      t: ['satellites'],
      q: 'The orbital speed of a satellite in a circular orbit about the Earth does **not** depend on:',
      a: 'the mass of the satellite',
      x: ['the mass of the Earth', 'the radius of the orbit', "the height of the satellite above the Earth's surface"],
      e: tex`Gravity supplies the centripetal force: $\frac{GMm}{r^2} = \frac{mv^2}{r}$, so $v = \sqrt{\frac{GM}{r}}$. The satellite's mass $m$ cancels; the speed depends only on the Earth's mass $M$ and the orbital radius $r = R + h$.`,
    },
    {
      id: 'geostationary-orbit-conditions',
      d: 2,
      t: ['satellites'],
      q: 'For a satellite to appear stationary to an observer on the Earth, its circular orbit must be:',
      a: "above the equator, with a period of about 24 h, in the same sense as the Earth's rotation",
      x: [
        'in a plane through the poles, with a period of about 24 h',
        "above the equator, with a period of about 12 h, in the same sense as the Earth's rotation",
        "above the equator, with a period of about 24 h, opposite to the Earth's rotation",
      ],
      e: tex`The satellite must keep pace with a point on the ground, so it must go round once per rotation of the Earth (about $24\,\mathrm{h}$), from west to east like the Earth, and in the equatorial plane. A polar orbit would carry it north and south, and an opposite sense of motion would make it sweep across the sky.`,
    },
    {
      id: 'free-fall-lift-reading',
      d: 1,
      t: ['satellites'],
      q: 'A person stands on a weighing machine in a lift. If the cable breaks and the lift falls freely under gravity, the reading of the machine becomes:',
      a: 'zero',
      x: ["equal to the person's weight", "twice the person's weight", "half the person's weight"],
      e: tex`The person and the machine both fall with acceleration $g$. Taking downward as positive, $mg - R = mg$, so the reaction $R = 0$: the apparent weight is zero, although the true weight $mg$ still acts. This is the same weightlessness that astronauts feel in an orbiting satellite.`,
    },
    {
      id: 'centripetal-force-no-work',
      d: 1,
      o: 'past-paper',
      t: ['centripetal force'],
      q: 'The work done by the centripetal force on a body moving in a circle with uniform speed is:',
      a: 'zero',
      x: [tex`$2\pi r F$ in each revolution`, tex`equal to its kinetic energy $\frac{1}{2}mv^2$`, tex`$Fr$ in each revolution`],
      e: tex`The centripetal force always points towards the centre while the displacement is along the tangent, so the angle between them is $90^{\circ}$ and $W = Fd\cos 90^{\circ} = 0$. This is why the speed (and the kinetic energy) of the body stays constant.`,
    },
    {
      id: 'radian-definition',
      d: 1,
      t: ['angular quantities'],
      q: 'One radian is the angle subtended at the centre of a circle by an arc whose length is equal to:',
      a: 'the radius of the circle',
      x: ['the diameter of the circle', 'the circumference of the circle', 'one-quarter of the circumference of the circle'],
      e: tex`From $S = r\theta$, $\theta = 1\,\mathrm{rad}$ when $S = r$. A full circle is $\frac{2\pi r}{r} = 2\pi\,\mathrm{rad} = 360^{\circ}$, so $1\,\mathrm{rad} \approx 57.3^{\circ}$.`,
    },
    {
      id: 'artificial-gravity-larger-station',
      d: 2,
      t: ['artificial gravity'],
      q: tex`A space station of radius $R$ rotates so that astronauts on its rim feel an artificial gravity equal to $g$. A second station of radius $4R$ is to give the same artificial gravity on its rim. Its frequency of rotation must be:`,
      a: 'half that of the first station',
      x: ['twice that of the first station', 'one-fourth that of the first station', 'four times that of the first station'],
      e: tex`The rim supplies the centripetal force: $mR\omega^2 = mg$, so $f = \frac{1}{2\pi}\sqrt{\frac{g}{R}} \propto \frac{1}{\sqrt{R}}$. Making the radius four times as large multiplies $f$ by $\frac{1}{\sqrt{4}} = \frac{1}{2}$: a larger station needs to turn more slowly.`,
    },
    {
      id: 'near-earth-orbital-speed-value',
      d: 1,
      o: 'past-paper',
      t: ['satellites'],
      q: "The orbital speed of a satellite revolving just above the Earth's surface is about:",
      a: tex`$7.9\,\mathrm{km\,s^{-1}}$`,
      x: [tex`$11.2\,\mathrm{km\,s^{-1}}$`, tex`$3.1\,\mathrm{km\,s^{-1}}$`, tex`$30\,\mathrm{km\,s^{-1}}$`],
      e: tex`$v = \sqrt{gR} = \sqrt{(9.8)(6.4 \times 10^{6})} \approx 7.9 \times 10^{3}\,\mathrm{m\,s^{-1}}$. The escape speed $\sqrt{2gR}$ is about $11.2\,\mathrm{km\,s^{-1}}$, a geostationary satellite moves at about $3.1\,\mathrm{km\,s^{-1}}$, and $30\,\mathrm{km\,s^{-1}}$ is roughly the Earth's own orbital speed around the Sun.`,
    },
  ]),
]);
