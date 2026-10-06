import { defineBank } from '@/engine/authoring';
import { frac, gcd, m$, paren, pickDistractors, signedSum, statementQuestion, tex } from '@/engine/helpers';

/**
 * Introduction to Analytic Geometry, part B: conceptual understanding, definitions,
 * properties and classic NET-style results. Every local id starts with `c-` so it never
 * collides with part A (`analytic-geometry.ts`, computational items).
 */

const deg = (a: number): string => `$${a}^{\\circ}$`;
const neg = (s: string): string => (s === '0' ? '0' : s.startsWith('-') ? s.slice(1) : `-${s}`);
const mod360 = (a: number): number => ((a % 360) + 360) % 360;

/** `ax + by + c = 0` with a positive leading coefficient. Returns the displayed coefficients too. */
function line(a: number, b: number, c: number): { tex: string; a: number; b: number; c: number } {
  const s = a < 0 || (a === 0 && b < 0) ? -1 : 1;
  const [A, B, C] = [s * a + 0, s * b + 0, s * c + 0];
  return { tex: `${signedSum([[A, 'x'], [B, 'y'], [C, '']])} = 0`, a: A, b: B, c: C };
}

// ---------------------------------------------------------------------------------------
// Statement pool: basic facts about slopes and equations of lines.
// ---------------------------------------------------------------------------------------
const LINE_TRUTHS: ReadonlyArray<readonly [string, string]> = [
  [
    tex`The slope of every line parallel to the $x$-axis is $0$.`,
    tex`Such a line has inclination $0^{\circ}$, so its slope is $\tan 0^{\circ} = 0$.`,
  ],
  [
    tex`A line parallel to the $y$-axis has an undefined slope.`,
    tex`Its inclination is $90^{\circ}$ and $\tan 90^{\circ}$ is undefined.`,
  ],
  [
    tex`Two non-vertical lines are perpendicular if and only if $m_1 m_2 = -1$.`,
    tex`Perpendicular slopes are negative reciprocals: $m_2 = -\frac{1}{m_1}$, so $m_1 m_2 = -1$.`,
  ],
  [
    'Two non-vertical lines are parallel if and only if their slopes are equal.',
    'Parallel lines have the same inclination, hence the same slope.',
  ],
  [tex`The equation of the $y$-axis is $x = 0$.`, tex`Every point of the $y$-axis has $x$-coordinate $0$.`],
  [
    tex`The line $\frac{x}{a} + \frac{y}{b} = 1$ $(a, b \neq 0)$ meets the $x$-axis at $(a, 0)$.`,
    tex`Putting $y = 0$ gives $x = a$; this is the two-intercept form.`,
  ],
];

const LINE_FALSEHOODS: ReadonlyArray<readonly [string, string]> = [
  [
    tex`The slope of a line parallel to the $y$-axis is $0$.`,
    tex`A vertical line has an undefined slope; slope $0$ belongs to horizontal lines.`,
  ],
  [tex`The equation of the $x$-axis is $x = 0$.`, tex`$x = 0$ is the $y$-axis; the $x$-axis is $y = 0$.`],
  [
    'Two lines with equal slopes are perpendicular.',
    'Equal slopes make lines parallel (or coincident), not perpendicular.',
  ],
  [
    tex`Two non-vertical lines are perpendicular if and only if $m_1 m_2 = 1$.`,
    tex`The condition is $m_1 m_2 = -1$, not $+1$.`,
  ],
  [
    tex`Every straight line can be written in the form $y = mx + c$.`,
    tex`A vertical line $x = k$ has no slope, so it cannot be written as $y = mx + c$.`,
  ],
  [
    tex`The slope of the line through $(x_1, y_1)$ and $(x_2, y_2)$ is $\frac{x_2 - x_1}{y_2 - y_1}$.`,
    tex`The slope is $\frac{y_2 - y_1}{x_2 - x_1}$ (rise over run); the given ratio is inverted.`,
  ],
  [
    tex`The line $\frac{x}{a} + \frac{y}{b} = 1$ $(a, b \neq 0)$ meets the $y$-axis at $(0, a)$.`,
    tex`Putting $x = 0$ gives $y = b$, so the $y$-intercept is $(0, b)$.`,
  ],
];

const LINE_REASONS = new Map<string, string>([...LINE_TRUTHS, ...LINE_FALSEHOODS]);

// ---------------------------------------------------------------------------------------
// Exact trigonometric values for standard inclinations.
// ---------------------------------------------------------------------------------------
const R3 = tex`\sqrt{3}`;
const INV_R3 = tex`\frac{1}{\sqrt{3}}`;
const INV_R2 = tex`\frac{1}{\sqrt{2}}`;
const HALF = tex`\frac{1}{2}`;
const R3_2 = tex`\frac{\sqrt{3}}{2}`;
const TRIG: Record<number, { tan: string; cot: string; sin: string; cos: string }> = {
  30: { tan: INV_R3, cot: R3, sin: HALF, cos: R3_2 },
  45: { tan: '1', cot: '1', sin: INV_R2, cos: INV_R2 },
  60: { tan: R3, cot: INV_R3, sin: R3_2, cos: HALF },
  120: { tan: `-${R3}`, cot: `-${INV_R3}`, sin: R3_2, cos: `-${HALF}` },
  135: { tan: '-1', cot: '-1', sin: INV_R2, cos: `-${INV_R2}` },
  150: { tan: `-${INV_R3}`, cot: `-${R3}`, sin: HALF, cos: `-${R3_2}` },
};
const STD_ANGLES = [30, 45, 60, 120, 135, 150];

// ---------------------------------------------------------------------------------------
// Normal form x cos(alpha) + y sin(alpha) = p: (k cos alpha, k sin alpha) with k = 2 or sqrt 2.
// Each coefficient is [sign, has sqrt(3)].
// ---------------------------------------------------------------------------------------
type Coef = readonly [1 | -1, boolean];
const NORMAL: Record<number, { u: Coef; v: Coef; k: 2 | 'r2' }> = {
  30: { u: [1, true], v: [1, false], k: 2 },
  60: { u: [1, false], v: [1, true], k: 2 },
  120: { u: [-1, false], v: [1, true], k: 2 },
  150: { u: [-1, true], v: [1, false], k: 2 },
  210: { u: [-1, true], v: [-1, false], k: 2 },
  240: { u: [-1, false], v: [-1, true], k: 2 },
  300: { u: [1, false], v: [-1, true], k: 2 },
  330: { u: [1, true], v: [-1, false], k: 2 },
  45: { u: [1, false], v: [1, false], k: 'r2' },
  135: { u: [-1, false], v: [1, false], k: 'r2' },
  225: { u: [-1, false], v: [-1, false], k: 'r2' },
  315: { u: [1, false], v: [-1, false], k: 'r2' },
};

/** Term such as `\sqrt{3}x`, `- y`, `+ \sqrt{3}y` (first term without a leading '+'). */
function term(c: Coef, flip: 1 | -1, v: string, first: boolean): string {
  const s = c[0] * flip;
  const body = `${c[1] ? R3 : ''}${v}`;
  if (first) return s < 0 ? `-${body}` : body;
  return s < 0 ? ` - ${body}` : ` + ${body}`;
}

/** Value tex for (sign * (sqrt3 or 1)) / k. */
function unitTex(c: Coef, k: 2 | 'r2'): string {
  const body = k === 'r2' ? INV_R2 : c[1] ? R3_2 : HALF;
  return c[0] < 0 ? `-${body}` : body;
}

// ---------------------------------------------------------------------------------------
// Pair of lines through the origin.
// ---------------------------------------------------------------------------------------
const PAIR_OPTIONS = {
  perp: 'a pair of perpendicular lines through the origin',
  coin: 'a pair of coincident lines through the origin',
  imag: 'two imaginary lines (the origin is the only real point)',
  real: 'two real, distinct, non-perpendicular lines through the origin',
} as const;
type PairKind = keyof typeof PAIR_OPTIONS;

export default defineBank('mathematics', 'analytic-geometry', (b) => [
  b.dynamic('c-line-statements', { difficulty: 1, tags: ['slope', 'equations of lines'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements is correct?',
      negativeStem: 'Which of the following statements is **incorrect**?',
      truths: LINE_TRUTHS.map(([s]) => s),
      falsehoods: LINE_FALSEHOODS.map(([s]) => s),
      explain: (answer, inverted) => {
        const reason = LINE_REASONS.get(answer) ?? '';
        return inverted ? `This statement is false. ${reason} The other three statements are true.` : `${reason} Each of the other statements is false.`;
      },
    }),
  ),

  b.dynamic('c-slope-inclination', { difficulty: 1, origin: 'past-paper', tags: ['slope'] }, (r) => {
    const t = r.pick(STD_ANGLES);
    const v = TRIG[t] as (typeof TRIG)[number];
    if (r.chance(0.5)) {
      const answer = m$(v.tan);
      return {
        stem: tex`A straight line is inclined at $${t}^{\circ}$ to the positive direction of the $x$-axis. Its slope is:`,
        answer,
        distractors: pickDistractors(answer, [neg(v.tan), v.cot, neg(v.cot), v.sin, v.cos, '0'].map(m$)),
        explanation: tex`Slope $m = \tan\theta = \tan ${t}^{\circ} = ${v.tan}$. (Using $\cot\theta$, $\sin\theta$ or $\cos\theta$ instead of $\tan\theta$, or taking the wrong sign, gives the distractors.)`,
      };
    }
    const c = r.nonZero(-9, 9);
    const mx = v.tan === '1' ? 'x' : v.tan === '-1' ? '-x' : `${v.tan}x`;
    const answer = deg(t);
    return {
      stem: tex`The inclination of the line $y = ${mx}${c < 0 ? ` - ${-c}` : ` + ${c}`}$ is:`,
      answer,
      distractors: pickDistractors(answer, [180 - t, ...r.shuffle(STD_ANGLES)].map(deg)),
      explanation: tex`The slope is $m = ${v.tan}$. The inclination $\theta$ satisfies $0^{\circ} \le \theta < 180^{\circ}$ and $\tan\theta = ${v.tan}$, so $\theta = ${t}^{\circ}$. (An inclination of $${180 - t}^{\circ}$ would give slope $${neg(v.tan)}$; the intercept does not affect the inclination.)`,
    };
  }),

  b.dynamic('c-perpendicular-line-pick', { difficulty: 1, tags: ['slope', 'equations of lines'] }, (r) => {
    let a = 1;
    let bb = 1;
    do {
      a = r.int(1, 6);
      bb = r.nonZero(-6, 6);
    } while (Math.abs(a) === Math.abs(bb) || frac(a, bb).d !== Math.abs(bb));
    const c = r.nonZero(-9, 9);
    const L = line(a, bb, c);
    const ks = r.sample([-9, -8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => k !== c), 4);
    const [k0, k1, k2, k3] = ks as [number, number, number, number];
    const perp = line(bb, -a, k0);
    const par = line(a, bb, k1);
    const swap = line(bb, a, k2);
    const signSlip = line(a, -bb, k3);
    const slope = frac(-a, bb);
    const perpSlope = frac(bb, a);
    if (r.chance(0.6)) {
      return {
        stem: tex`Which of the following lines is perpendicular to $${L.tex}$?`,
        answer: m$(perp.tex),
        distractors: [par, swap, signSlip].map((x) => m$(x.tex)),
        explanation: tex`The slope of $ax + by + c = 0$ is $-\frac{a}{b}$, so the given line has slope $${slope.toTex()}$. A perpendicular line has slope $${perpSlope.toTex()}$ (product $-1$); swapping the coefficients and changing one sign, $bx - ay + k = 0$, does this: $${perp.tex}$.`,
      };
    }
    return {
      stem: tex`Which of the following lines is parallel to $${L.tex}$?`,
      answer: m$(par.tex),
      distractors: [perp, swap, signSlip].map((x) => m$(x.tex)),
      explanation: tex`Parallel lines have equal slopes. The given line has slope $-\frac{a}{b} = ${slope.toTex()}$, and only $${par.tex}$ keeps the same $x$ and $y$ coefficients, so its slope is also $${slope.toTex()}$. (Swapping or changing the sign of a coefficient changes the slope.)`,
    };
  }),

  b.dynamic('c-triangle-centres', { difficulty: 1, origin: 'past-paper', tags: ['concurrency'] }, (r) => {
    const PAIRS: ReadonlyArray<readonly [string, string]> = [
      ['medians', 'centroid'],
      ['altitudes', 'orthocentre'],
      ['right bisectors of the sides', 'circumcentre'],
      ['bisectors of the interior angles', 'incentre'],
    ];
    const kind = r.pick(['name', 'name', 'lines', 'lines', 'ratio', 'right'] as const);
    if (kind === 'ratio') {
      return {
        stem: 'The centroid of a triangle divides each median, measured from the vertex, in the ratio:',
        answer: '$2:1$',
        distractors: ['$1:2$', '$1:1$', '$3:1$'],
        explanation: tex`The centroid $\left(\frac{x_1 + x_2 + x_3}{3}, \frac{y_1 + y_2 + y_3}{3}\right)$ lies two-thirds of the way from a vertex to the midpoint of the opposite side, i.e. it divides each median in the ratio $2:1$ from the vertex ($1:2$ is the ratio measured from the midpoint).`,
      };
    }
    if (kind === 'right') {
      const askOrtho = r.chance(0.5);
      const opts = ['the midpoint of the hypotenuse', 'the vertex of the right angle', 'the centroid of the triangle', 'a point outside the triangle'];
      const answer = askOrtho ? (opts[1] as string) : (opts[0] as string);
      return {
        stem: `In a right-angled triangle, the ${askOrtho ? 'orthocentre' : 'circumcentre'} lies at:`,
        answer,
        distractors: opts.filter((o) => o !== answer),
        explanation: askOrtho
          ? 'The two legs are themselves altitudes and they meet at the right-angled vertex, so the orthocentre is that vertex.'
          : 'The hypotenuse subtends a right angle at the opposite vertex, so it is a diameter of the circumcircle; the circumcentre is the midpoint of the hypotenuse.',
      };
    }
    const [lines, centre] = r.pick(PAIRS);
    if (kind === 'name') {
      return {
        stem: `The point of concurrency of the ${lines} of a triangle is called its:`,
        answer: centre,
        distractors: PAIRS.filter(([, c]) => c !== centre).map(([, c]) => c),
        explanation: `Medians meet at the centroid, altitudes at the orthocentre, right (perpendicular) bisectors of the sides at the circumcentre, and interior angle bisectors at the incentre. Hence the ${lines} meet at the ${centre}.`,
      };
    }
    return {
      stem: `The ${centre} of a triangle is the point of intersection of its:`,
      answer: lines,
      distractors: PAIRS.filter(([l]) => l !== lines).map(([l]) => l),
      explanation: `The ${centre} is, by definition, the point of concurrency of the ${lines}. (Medians: centroid; altitudes: orthocentre; right bisectors of the sides: circumcentre; interior angle bisectors: incentre.)`,
    };
  }),

  b.dynamic('c-reflection-of-point', { difficulty: 1, tags: ['distance and section formula'] }, (r) => {
    let x = 1;
    let y = 1;
    do {
      x = r.nonZero(-9, 9);
      y = r.nonZero(-9, 9);
    } while (Math.abs(x) === Math.abs(y));
    const pt = (p: number, q: number): string => `$(${p}, ${q})$`;
    const MIRRORS: ReadonlyArray<readonly [string, string, string]> = [
      [tex`$x$-axis`, pt(x, -y), tex`the $y$-coordinate changes sign: $(x, y) \to (x, -y)$`],
      [tex`$y$-axis`, pt(-x, y), tex`the $x$-coordinate changes sign: $(x, y) \to (-x, y)$`],
      ['origin', pt(-x, -y), tex`both coordinates change sign: $(x, y) \to (-x, -y)$`],
      [tex`line $y = x$`, pt(y, x), tex`the coordinates are interchanged: $(x, y) \to (y, x)$`],
      [tex`line $y = -x$`, pt(-y, -x), tex`the coordinates are interchanged and both change sign: $(x, y) \to (-y, -x)$`],
    ];
    const idx = r.int(0, MIRRORS.length - 1);
    const [mirror, answer, rule] = MIRRORS[idx] as readonly [string, string, string];
    return {
      stem: `The image (reflection) of the point $P(${x}, ${y})$ in the ${mirror} is:`,
      answer,
      distractors: r.sample(
        MIRRORS.filter((_, i) => i !== idx).map((m) => m[1]),
        3,
      ),
      explanation: `On reflection in the ${mirror}, ${rule}. So $P(${x}, ${y})$ maps to ${answer}.`,
    };
  }),

  b.dynamic('c-pair-of-lines-nature', { difficulty: 2, origin: 'past-paper', tags: ['pair of lines'] }, (r) => {
    const kind = r.pick(['perp', 'coin', 'imag', 'real'] as const satisfies readonly PairKind[]);
    let A = 1;
    let M = 0;
    let B = 1;
    if (kind === 'perp') {
      A = r.int(1, 6) * r.sign();
      B = -A;
      M = r.int(-8, 8);
    } else if (kind === 'coin') {
      const p = r.int(1, 4);
      const q = r.pick([1, 2, 3, 4].filter((v) => gcd(v, p) === 1)) * r.sign();
      const s = r.pick([1, 1, 2]);
      A = s * p * p;
      M = 2 * s * p * q;
      B = s * q * q;
    } else if (kind === 'imag') {
      A = r.int(1, 6);
      B = r.int(1, 6);
      const lim = Math.floor(Math.sqrt(4 * A * B - 1));
      M = r.int(-lim, lim);
    } else {
      let p1 = 1;
      let q1 = 1;
      let p2 = 1;
      let q2 = 1;
      do {
        p1 = r.int(1, 4);
        p2 = r.int(1, 4);
        q1 = r.nonZero(-4, 4);
        q2 = r.nonZero(-4, 4);
      } while (p1 * q2 === p2 * q1 || p1 * p2 + q1 * q2 === 0);
      A = p1 * p2;
      M = p1 * q2 + p2 * q1;
      B = q1 * q2;
    }
    const eq = `${signedSum([[A, 'x^{2}'], [M, 'xy'], [B, 'y^{2}']])} = 0`;
    const h = frac(M, 2);
    const disc = h.mul(h).sub(A * B);
    const cmp = disc.sign() > 0 ? ' > 0' : disc.sign() < 0 ? ' < 0' : '';
    const verdict: Record<PairKind, string> = {
      perp: tex`Since $h^2 - ab > 0$ the lines are real and distinct, and since $a + b = ${A} + ${paren(B)} = 0$ they are perpendicular.`,
      coin: tex`Since $h^2 = ab$ the two lines coincide (the left side is a perfect square).`,
      imag: tex`Since $h^2 < ab$ the lines are imaginary; only $(0, 0)$ satisfies the equation.`,
      real: tex`Since $h^2 > ab$ the lines are real and distinct, and $a + b = ${A + B} \neq 0$, so they are not perpendicular.`,
    };
    return {
      stem: tex`The equation $${eq}$ represents:`,
      answer: PAIR_OPTIONS[kind],
      distractors: (Object.keys(PAIR_OPTIONS) as PairKind[]).filter((k) => k !== kind).map((k) => PAIR_OPTIONS[k]),
      explanation: tex`For $ax^2 + 2hxy + by^2 = 0$: real and distinct lines if $h^2 > ab$, coincident if $h^2 = ab$, imaginary if $h^2 < ab$; perpendicular if $a + b = 0$. Here $a = ${A}$, $h = ${h.toTex()}$, $b = ${B}$, so $h^2 - ab = ${disc.toTex()}${cmp}$. ${verdict[kind]}`,
    };
  }),

  b.dynamic('c-point-side-of-line', { difficulty: 2, tags: ['distance from a point to a line'] }, (r) => {
    const target = r.weighted(['same', 'opposite', 'on'] as const, [2, 2, 1]);
    const withOrigin = r.chance(0.4);
    for (;;) {
      const L = line(r.nonZero(-5, 5), r.nonZero(-5, 5), r.nonZero(-9, 9));
      if (gcd(gcd(L.a, L.b), L.c) !== 1) continue;
      const val = (x: number, y: number): number => L.a * x + L.b * y + L.c;
      const randPt = (): [number, number] => [r.int(-6, 6), r.int(-6, 6)];
      const P: [number, number] | null = (() => {
        if (target === 'on') {
          const xs = r.shuffle([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]);
          for (const x of xs) {
            const y = -(L.a * x + L.c) / L.b;
            if (Number.isInteger(y) && Math.abs(y) <= 9) return [x, y + 0];
          }
          return null;
        }
        return randPt();
      })();
      if (!P) continue;
      const Q: [number, number] = withOrigin ? [0, 0] : randPt();
      const v1 = val(P[0], P[1]);
      const v2 = val(Q[0], Q[1]);
      if (v2 === 0) continue;
      if (target === 'on' ? v1 !== 0 : v1 === 0) continue;
      if (target === 'same' && v1 * v2 < 0) continue;
      if (target === 'opposite' && v1 * v2 > 0) continue;
      if (P[0] === Q[0] && P[1] === Q[1]) continue;

      const second = withOrigin ? 'the origin' : `$Q(${Q[0]}, ${Q[1]})$`;
      const opts = {
        same: `$P$ and ${second} lie on the same side of the line`,
        opposite: `$P$ and ${second} lie on opposite sides of the line`,
        on: '$P$ lies on the line',
        fourth: withOrigin ? 'the line passes through the origin' : '$Q$ lies on the line',
      };
      const sub = (x: number, y: number): string =>
        `${L.a}(${x}) ${L.b < 0 ? '-' : '+'} ${Math.abs(L.b)}(${y}) ${L.c < 0 ? '-' : '+'} ${Math.abs(L.c)} = ${val(x, y)}`;
      const answer = opts[target];
      const reason =
        target === 'on'
          ? tex`$P$ satisfies the equation, so it lies on the line.`
          : target === 'same'
            ? 'Both values have the same sign, so the points are on the same side.'
            : 'The values have opposite signs, so the points are on opposite sides.';
      return {
        stem: withOrigin
          ? tex`For the line $${L.tex}$ and the point $P(${P[0]}, ${P[1]})$, which statement is true?`
          : tex`For the line $${L.tex}$ and the points $P(${P[0]}, ${P[1]})$ and $Q(${Q[0]}, ${Q[1]})$, which statement is true?`,
        answer,
        distractors: [opts.same, opts.opposite, opts.on, opts.fourth].filter((o) => o !== answer),
        explanation: tex`Substitute each point into $f(x, y) = ${L.tex.replace(' = 0', '')}$. Points with $f$ of the same sign lie on the same side, opposite signs on opposite sides, and $f = 0$ means on the line. $f(P) = ${sub(P[0], P[1])}$ and $f(${withOrigin ? 'O' : 'Q'}) = ${sub(Q[0], Q[1])}$. ${reason}`,
      };
    }
  }),

  b.dynamic('c-normal-form-angle', { difficulty: 2, tags: ['equations of lines', 'distance from a point to a line'] }, (r) => {
    const alpha = r.pick(Object.keys(NORMAL).map(Number));
    const n = NORMAL[alpha] as (typeof NORMAL)[number];
    const p = r.int(2, 9);
    const flip = r.sign();
    // Displayed: flip * (u x + v y - p) = 0
    const shown = `${term(n.u, flip, 'x', true)}${term(n.v, flip, 'y', false)} ${flip > 0 ? '-' : '+'} ${p} = 0`;
    const positive = `${term(n.u, 1, 'x', true)}${term(n.v, 1, 'y', false)} = ${p}`;
    const kTex = n.k === 2 ? '2' : tex`\sqrt{2}`;
    const pTex = n.k === 2 ? frac(p, 2).toTex() : tex`\frac{${p}}{\sqrt{2}}`;
    const answer = deg(alpha);
    return {
      stem: tex`When the line $${shown}$ is written in the normal form $x\cos\alpha + y\sin\alpha = p$ (with $p > 0$ and $0^{\circ} \le \alpha < 360^{\circ}$), the value of $\alpha$ is:`,
      answer,
      distractors: pickDistractors(
        answer,
        [alpha + 180, 90 - alpha, 180 - alpha, 360 - alpha, alpha + 90].map((a) => deg(mod360(a))),
      ),
      explanation: tex`First make the constant on the right positive: $${positive}$. Divide by $\sqrt{a^2 + b^2} = ${kTex}$: $\cos\alpha = ${unitTex(n.u, n.k)}$, $\sin\alpha = ${unitTex(n.v, n.k)}$ and $p = ${pTex}$. Both signs together fix the quadrant, so $\alpha = ${alpha}^{\circ}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'c-concurrency-condition', d: 1, o: 'past-paper', t: ['concurrency'],
      q: tex`Three lines $a_i x + b_i y + c_i = 0$ $(i = 1, 2, 3)$, no two of which are parallel, are concurrent if:`,
      a: tex`$\begin{vmatrix} a_1 & b_1 & c_1 \\ a_2 & b_2 & c_2 \\ a_3 & b_3 & c_3 \end{vmatrix} = 0$`,
      x: [
        tex`$\begin{vmatrix} a_1 & b_1 & c_1 \\ a_2 & b_2 & c_2 \\ a_3 & b_3 & c_3 \end{vmatrix} \neq 0$`,
        tex`$\frac{a_1}{b_1} = \frac{a_2}{b_2} = \frac{a_3}{b_3}$`,
        tex`$c_1 + c_2 + c_3 = 0$`,
      ],
      e: tex`Three lines (no two parallel) pass through one point exactly when they have a common solution, i.e. when the determinant of their coefficients (including the constants) is zero. A non-zero determinant means they are not concurrent; equal ratios $\frac{a_i}{b_i}$ would make the lines parallel, and $c_1 + c_2 + c_3 = 0$ does not guarantee a common point.`,
    },
    {
      id: 'c-homogeneous-through-origin', d: 1, t: ['pair of lines'],
      q: tex`The homogeneous equation $ax^2 + 2hxy + by^2 = 0$ (with $h^2 > ab$) represents a pair of straight lines passing through:`,
      a: 'the origin',
      x: [tex`the point $(a, b)$`, tex`the point $(h, h)$`, tex`the point $(-a, -b)$`],
      e: tex`Every term has degree two, so the expression factorises as $(l_1x + m_1y)(l_2x + m_2y) = 0$; each factor is a line through $(0, 0)$. Indeed $x = y = 0$ always satisfies the equation.`,
    },
    {
      id: 'c-xy-equals-zero', d: 1, o: 'past-paper', t: ['pair of lines'],
      q: tex`The equation $xy = 0$ represents:`,
      a: 'the pair of coordinate axes',
      x: ['the origin only', tex`the lines $y = x$ and $y = -x$`, tex`two lines parallel to the $x$-axis`],
      e: tex`$xy = 0$ means $x = 0$ (the $y$-axis) or $y = 0$ (the $x$-axis). The origin alone is $x^2 + y^2 = 0$, and $y = \pm x$ is $x^2 - y^2 = 0$.`,
    },
    {
      id: 'c-pair-angle-formula', d: 2, o: 'past-paper', t: ['pair of lines', 'angle between lines'],
      q: tex`If $\theta$ is the acute angle between the lines $ax^2 + 2hxy + by^2 = 0$, then $\tan\theta$ equals:`,
      a: tex`$\dfrac{2\sqrt{h^2 - ab}}{|a + b|}$`,
      x: [tex`$\dfrac{\sqrt{h^2 - ab}}{|a + b|}$`, tex`$\dfrac{2\sqrt{h^2 + ab}}{|a + b|}$`, tex`$\dfrac{2\sqrt{h^2 - ab}}{|a - b|}$`],
      e: tex`With $m_1 + m_2 = -\frac{2h}{b}$ and $m_1 m_2 = \frac{a}{b}$, $\tan\theta = \left|\frac{m_1 - m_2}{1 + m_1 m_2}\right| = \frac{\sqrt{(m_1 + m_2)^2 - 4m_1m_2}}{|1 + m_1m_2|} = \frac{2\sqrt{h^2 - ab}}{|a + b|}$. Note the factor $2$ and that $a + b = 0$ gives $\theta = 90^{\circ}$.`,
    },
    {
      id: 'c-parallel-lines-distance-formula', d: 2, t: ['distance from a point to a line'],
      q: tex`The distance between the parallel lines $ax + by + c_1 = 0$ and $ax + by + c_2 = 0$ is:`,
      a: tex`$\dfrac{|c_1 - c_2|}{\sqrt{a^2 + b^2}}$`,
      x: [tex`$\dfrac{|c_1 + c_2|}{\sqrt{a^2 + b^2}}$`, tex`$\dfrac{|c_1 - c_2|}{a^2 + b^2}$`, tex`$\dfrac{|c_1 - c_2|}{|a| + |b|}$`],
      e: tex`Take a point $(x_1, y_1)$ on the first line, so $ax_1 + by_1 = -c_1$. Its distance from the second line is $\frac{|ax_1 + by_1 + c_2|}{\sqrt{a^2 + b^2}} = \frac{|c_2 - c_1|}{\sqrt{a^2 + b^2}}$.`,
    },
    {
      id: 'c-angle-from-l1-to-l2', d: 2, t: ['angle between lines'],
      q: tex`If $\theta$ is the angle from the line $l_1$ (slope $m_1$) to the line $l_2$ (slope $m_2$), measured anticlockwise, then $\tan\theta$ equals:`,
      a: tex`$\dfrac{m_2 - m_1}{1 + m_1 m_2}$`,
      x: [tex`$\dfrac{m_1 - m_2}{1 + m_1 m_2}$`, tex`$\dfrac{m_2 - m_1}{1 - m_1 m_2}$`, tex`$\dfrac{m_1 + m_2}{1 - m_1 m_2}$`],
      e: tex`If the inclinations are $\alpha_1$ and $\alpha_2$, then $\theta = \alpha_2 - \alpha_1$ and $\tan\theta = \frac{\tan\alpha_2 - \tan\alpha_1}{1 + \tan\alpha_1\tan\alpha_2} = \frac{m_2 - m_1}{1 + m_1 m_2}$. Reversing the numerator gives the angle from $l_2$ to $l_1$; $\frac{m_1 + m_2}{1 - m_1 m_2}$ is $\tan(\alpha_1 + \alpha_2)$.`,
    },
    {
      id: 'c-perpendicular-pair-joint-equation', d: 3, t: ['pair of lines'],
      q: tex`The joint equation of the pair of lines through the origin that are perpendicular to the lines $ax^2 + 2hxy + by^2 = 0$ is:`,
      a: tex`$bx^2 - 2hxy + ay^2 = 0$`,
      x: [tex`$bx^2 + 2hxy + ay^2 = 0$`, tex`$ax^2 - 2hxy + by^2 = 0$`, tex`$bx^2 + 2hxy - ay^2 = 0$`],
      e: tex`Let the given lines be $y = m_1x$ and $y = m_2x$, so $m_1 + m_2 = -\frac{2h}{b}$ and $m_1m_2 = \frac{a}{b}$. The perpendicular lines through the origin are $x + m_1y = 0$ and $x + m_2y = 0$; their product is $x^2 + (m_1 + m_2)xy + m_1m_2y^2 = 0$, i.e. $x^2 - \frac{2h}{b}xy + \frac{a}{b}y^2 = 0$, or $bx^2 - 2hxy + ay^2 = 0$: swap $a$ and $b$ and change the sign of the $xy$-term. (Keeping the sign of $2h$ gives the slopes $\frac{1}{m}$ instead of $-\frac{1}{m}$; not swapping $a$ and $b$ gives the slopes $-m$.)`,
    },
    {
      id: 'c-line-divides-join-ratio', d: 3, t: ['distance and section formula', 'equations of lines'],
      q: tex`The line $ax + by + c = 0$ divides the join of $P(x_1, y_1)$ and $Q(x_2, y_2)$ at the point $R$. The ratio $PR : RQ$ is:`,
      a: tex`$-(ax_1 + by_1 + c) : (ax_2 + by_2 + c)$`,
      x: [
        tex`$(ax_1 + by_1 + c) : (ax_2 + by_2 + c)$`,
        tex`$-(ax_2 + by_2 + c) : (ax_1 + by_1 + c)$`,
        tex`$-(ax_1 + by_1) : (ax_2 + by_2)$`,
      ],
      e: tex`Let $R$ divide $PQ$ in the ratio $k:1$, so $R = \left(\frac{kx_2 + x_1}{k + 1}, \frac{ky_2 + y_1}{k + 1}\right)$. Putting $R$ in the line: $k(ax_2 + by_2 + c) + (ax_1 + by_1 + c) = 0$, so $k = -\frac{ax_1 + by_1 + c}{ax_2 + by_2 + c}$. A positive ratio means internal division (points on opposite sides).`,
    },
  ]),
]);
