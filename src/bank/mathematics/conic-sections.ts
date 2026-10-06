import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  Fraction,
  frac,
  gcd,
  linearFactor,
  paren,
  pickDistractors,
  signedSum,
  simplifySurd,
  surdTex,
  tex,
} from '@/engine/helpers';

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;

/** LaTeX of an integer or Fraction. */
const fx = (v: number | Fraction): string => Fraction.of(v).toTex();

/** A point `(x, y)`. */
const pt = (x: number | Fraction, y: number | Fraction): string => `(${fx(x)}, ${fx(y)})`;

/** `(x - h)^{2}` or `x^{2}` when h = 0. */
const sq = (v: string, h: number): string => (h === 0 ? `${v}^{2}` : `${linearFactor(h, v)}^{2}`);

/** `\frac{x^{2}}{d}` (or `x^{2}` when d = 1). */
const over = (v: string, d: number): string => (d === 1 ? `${v}^{2}` : tex`\frac{${v}^{2}}{${d}}`);

/** LaTeX for sqrt(radicand) / den, simplified (e.g. 2\sqrt{3}/3, \frac{3}{5}). */
function surdFrac(radicand: number, den: number): string {
  const { c, r } = simplifySurd(1, radicand);
  if (r === 1) return frac(c, den).toTex();
  const g = gcd(c, den);
  const cn = c / g;
  const dn = den / g;
  const top = cn === 1 ? tex`\sqrt{${r}}` : tex`${cn}\sqrt{${r}}`;
  return dn === 1 ? top : tex`\frac{${top}}{${dn}}`;
}

/** Line Ax + By = C in lowest terms with a positive leading coefficient. */
function lineEq(A: number, B: number, C: number): string {
  const g = gcd(gcd(Math.abs(A), Math.abs(B)), Math.abs(C)) || 1;
  const lead = A !== 0 ? A : B;
  const s = lead < 0 ? -1 : 1;
  const a = (s * A) / g;
  const b2 = (s * B) / g;
  const c = (s * C) / g + 0;
  return `${signedSum([
    [a, 'x'],
    [b2, 'y'],
  ])} = ${c}`;
}

/** Expanded circle x^2 + y^2 + Dx + Ey + F = 0. */
const circleTex = (D: number, E: number, F: number): string =>
  `${signedSum([
    [1, 'x^{2}'],
    [1, 'y^{2}'],
    [D, 'x'],
    [E, 'y'],
    [F, ''],
  ])} = 0`;

/** Ellipse (a, b^2, c) with a^2 = b^2 + c^2 and integer a, c. */
const ELLIPSE_SURD: ReadonlyArray<readonly [number, number, number]> = [
  [5, 16, 3], [5, 9, 4], [13, 144, 5], [13, 25, 12], [10, 64, 6], [10, 36, 8],
  [17, 225, 8], [17, 64, 15], [2, 3, 1], [3, 5, 2], [4, 7, 3], [3, 8, 1], [4, 12, 2],
  [6, 20, 4], [6, 27, 3], [4, 15, 1], [5, 21, 2],
];

/** Ellipse (a, b, c) with integer semi-axes and focal distance. */
const ELLIPSE_INT: ReadonlyArray<readonly [number, number, number]> = [
  [5, 4, 3], [5, 3, 4], [13, 12, 5], [13, 5, 12], [10, 8, 6], [10, 6, 8],
  [17, 15, 8], [17, 8, 15], [15, 12, 9], [15, 9, 12], [20, 16, 12], [20, 12, 16],
];

/** Hyperbola (a, b^2, c) with c^2 = a^2 + b^2 and integer a, c (a != b). */
const HYPERBOLA: ReadonlyArray<readonly [number, number, number]> = [
  [3, 16, 5], [4, 9, 5], [5, 144, 13], [12, 25, 13], [8, 225, 17], [15, 64, 17],
  [6, 64, 10], [8, 36, 10], [2, 5, 3], [1, 3, 2], [2, 12, 4], [3, 7, 4], [4, 20, 6],
  [2, 21, 5], [3, 40, 7],
];

export default defineBank('mathematics', 'conic-sections', (b) => [
  // ---------------------------------------------------------------- circle
  b.dynamic('circle-centre-radius', { difficulty: 1, origin: 'past-paper', tags: ['circle'] }, (r) => {
    const h = r.nonZero(-6, 6);
    const k = r.nonZero(-6, 6);
    const rad = r.int(2, 8);
    const F = h * h + k * k - rad * rad;
    const D = -2 * h;
    const E = -2 * k;
    const opt = (cx: number, cy: number, rr: string): string => `centre $${pt(cx, cy)}$, radius $${rr}$`;
    const answer = opt(h, k, String(rad));
    const wrongR2 = h * h + k * k + F; // sign slip on c: sqrt(g^2 + f^2 + c)
    const candidates = [
      opt(-h, -k, String(rad)), // sign of centre
      opt(h, k, String(rad * rad)), // forgot the square root
      opt(D, E, String(rad)), // took the coefficients of x and y as the centre
      ...(wrongR2 > 0 && wrongR2 !== rad * rad ? [opt(h, k, surdTex(1, wrongR2))] : []),
      opt(-h, -k, String(rad * rad)),
    ];
    return {
      stem: tex`The centre and radius of the circle $${circleTex(D, E, F)}$ are:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`Compare with $x^2 + y^2 + 2gx + 2fy + c = 0$: $g = ${-h}$, $f = ${-k}$, $c = ${F}$. Centre $(-g, -f) = ${pt(h, k)}$; radius $\sqrt{g^2 + f^2 - c} = \sqrt{${h * h} + ${k * k} ${F <= 0 ? '+' : '-'} ${Math.abs(F)}} = \sqrt{${rad * rad}} = ${rad}$.`,
    };
  }),

  b.dynamic('circle-diameter-endpoints', { difficulty: 2, tags: ['circle'] }, (r) => {
    // Distinct end points with x1 + x2 != 0 and y1 + y2 != 0, so the sign-slip options stay distinct.
    let [x1, y1, x2, y2] = [1, -2, 3, 4];
    for (let i = 0; i < 40; i++) {
      const [p1, q1, p2, q2] = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)];
      if (p1 + p2 !== 0 && q1 + q2 !== 0 && (p1 !== p2 || q1 !== q2)) {
        [x1, y1, x2, y2] = [p1, q1, p2, q2];
        break;
      }
    }
    const S = x1 + x2;
    const T = y1 + y2;
    const C = x1 * x2 + y1 * y2;
    const answer = m(circleTex(-S, -T, C));
    const candidates = [
      m(circleTex(S, T, C)), // signs of the linear terms flipped
      m(circleTex(-S, -T, -C)), // constant sign slip
      m(circleTex(S, T, -C)),
      m(circleTex(-S, T, C)),
      m(circleTex(S, -T, C)),
      m(circleTex(-S, -T, x1 * y2 + x2 * y1)), // mixed up the products
    ];
    return {
      stem: tex`The equation of the circle having the points $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$ as the end points of a diameter is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`Diameter form: $(x - x_1)(x - x_2) + (y - y_1)(y - y_2) = 0$, i.e. $${linearFactor(x1)}${linearFactor(x2)} + ${linearFactor(y1, 'y')}${linearFactor(y2, 'y')} = 0$. Expanding: $x^2 + y^2 - (x_1 + x_2)x - (y_1 + y_2)y + (x_1x_2 + y_1y_2) = 0$ with $x_1 + x_2 = ${S}$, $y_1 + y_2 = ${T}$ and $x_1x_2 + y_1y_2 = ${C}$, so $${circleTex(-S, -T, C)}$.`,
    };
  }),

  b.dynamic('circle-touching-axis', { difficulty: 1, tags: ['circle'] }, (r) => {
    const h = r.sign() * r.int(2, 7);
    let k = r.sign() * r.int(2, 7);
    if (Math.abs(k) === Math.abs(h)) k = k > 0 ? k + 1 : k - 1;
    const axis = r.pick(['x', 'y'] as const);
    const rad = axis === 'x' ? Math.abs(k) : Math.abs(h);
    const other = axis === 'x' ? Math.abs(h) : Math.abs(k);
    const eq = (hh: number, kk: number, rhs: number): string => m(`${sq('x', hh)} + ${sq('y', kk)} = ${rhs}`);
    const answer = eq(h, k, rad * rad);
    return {
      stem: tex`The equation of the circle with centre $${pt(h, k)}$ that touches the $${axis}$-axis is:`,
      answer,
      distractors: pickDistractors(answer, [
        eq(h, k, other * other), // used the distance to the other axis
        eq(h, k, rad), // forgot to square the radius
        eq(-h, -k, rad * rad), // sign slip in the centre
        eq(-h, -k, other * other),
      ]),
      explanation: tex`A circle touching the $${axis}$-axis has radius equal to the distance of its centre from that axis: $r = |${axis === 'x' ? k : h}| = ${rad}$. Hence $${sq('x', h)} + ${sq('y', k)} = ${rad}^2 = ${rad * rad}$.`,
    };
  }),

  // ------------------------------------------------------ tangents to circles
  b.dynamic('tangent-length', { difficulty: 1, origin: 'past-paper', tags: ['tangents to circles', 'circle'] }, (r) => {
    const h = r.int(-4, 4);
    const k = r.int(-4, 4);
    const rad = r.int(1, 4);
    const F = h * h + k * k - rad * rad;
    let p = 0;
    let q = 0;
    let d2 = 0;
    for (let i = 0; i < 40; i++) {
      p = r.int(-7, 7);
      q = r.int(-7, 7);
      d2 = (p - h) ** 2 + (q - k) ** 2;
      if (d2 - rad * rad >= 2) break;
    }
    if (d2 - rad * rad < 2) {
      p = h + rad + 2;
      q = k;
      d2 = (rad + 2) ** 2;
    }
    const S1 = d2 - rad * rad;
    const answer = m(surdTex(1, S1));
    const flipped = S1 - 2 * F; // used -c instead of +c
    return {
      stem: tex`The length of the tangent drawn from the point $${pt(p, q)}$ to the circle $${circleTex(-2 * h, -2 * k, F)}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m(String(S1)), // forgot the square root
        m(surdTex(1, d2)), // distance to the centre
        m(surdTex(1, d2 + rad * rad)), // Pythagoras the wrong way
        ...(flipped > 0 ? [m(surdTex(1, flipped))] : []),
        m(String(S1 + rad * rad)),
      ]),
      explanation: tex`Length of tangent $= \sqrt{S_1} = \sqrt{x_1^2 + y_1^2 + 2gx_1 + 2fy_1 + c}$. Substituting $${pt(p, q)}$: $S_1 = ${p * p} + ${q * q} + (${-2 * h})(${p}) + (${-2 * k})(${q}) + (${F}) = ${S1}$, so the length is $${surdTex(1, S1)}$.`,
    };
  }),

  b.dynamic('tangency-condition', { difficulty: 2, origin: 'past-paper', tags: ['tangents to circles', 'parabola'] }, (r) => {
    if (r.chance(0.5)) {
      const a = r.int(2, 6);
      const mm = r.sign() * r.int(1, 4);
      const s = 1 + mm * mm;
      const answer = m(surdTex(a, s));
      return {
        stem: tex`The line $y = ${mm === 1 ? '' : mm === -1 ? '-' : mm}x + c$ touches the circle $x^2 + y^2 = ${a * a}$. The positive value of $c$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m(String(a * s)), // forgot the square root
          m(tex`\frac{${a}}{\sqrt{${s}}}`), // divided instead of multiplied
          m(surdTex(1, a * a + mm * mm)), // c^2 = a^2 + m^2
          ...(Math.abs(mm) > 1 ? [m(surdTex(a, mm * mm - 1))] : []), // sign slip 1 - m^2
          m(surdTex(a * a, s)),
        ]),
        explanation: tex`Condition of tangency to $x^2 + y^2 = a^2$: $c^2 = a^2(1 + m^2) = ${a * a}(1 + ${mm * mm}) = ${a * a * s}$, so $c = ${surdTex(a, s)}$.`,
      };
    }
    const A = r.int(1, 6);
    const mm = r.pick([1, 2, 3, 4, -1, -2, -3]);
    const c = frac(A, mm);
    const answer = m(c.toTex());
    return {
      stem: tex`If the line $y = ${mm === 1 ? '' : mm === -1 ? '-' : mm}x + c$ is a tangent to the parabola $y^2 = ${4 * A}x$, then $c$ equals:`,
      answer,
      distractors: pickDistractors(answer, [
        m(fx(A * mm)), // c = am
        m(c.neg().toTex()), // sign slip
        m(frac(4 * A, mm).toTex()), // used 4a for a
        m(frac(mm, A).toTex()), // inverted
        m(frac(2 * A, mm).toTex()),
      ]),
      explanation: tex`Here $4a = ${4 * A}$, so $a = ${A}$. The line $y = mx + c$ touches $y^2 = 4ax$ when $c = \frac{a}{m} = \frac{${A}}{${mm}} = ${c.toTex()}$.`,
    };
  }),

  b.dynamic('tangent-at-point-circle', { difficulty: 2, tags: ['tangents to circles'] }, (r) => {
    const h = r.int(-4, 4);
    let k = r.int(-4, 4);
    if (h === 0 && k === 0) k = 2;
    const [bp, bq, rad] = r.pick([
      [3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13],
    ] as const);
    const p = r.sign() * bp;
    const q = r.sign() * bq;
    const x1 = h + p;
    const y1 = k + q;
    const answer = m(lineEq(p, q, p * x1 + q * y1));
    return {
      stem: tex`The equation of the tangent to the circle $${sq('x', h)} + ${sq('y', k)} = ${rad * rad}$ at the point $${pt(x1, y1)}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m(lineEq(q, -p, q * x1 - p * y1)), // normal (radius) through the point
        // used xx1 + yy1 = r^2 ignoring the centre (meaningless when the point is the origin)
        ...(x1 !== 0 || y1 !== 0 ? [m(lineEq(x1, y1, rad * rad))] : []),
        m(lineEq(p, q, p * h + q * k)), // parallel line through the centre
        m(lineEq(p, -q, p * x1 - q * y1)),
        m(lineEq(p, q, -(p * x1 + q * y1))),
      ]),
      explanation: tex`The tangent is perpendicular to the radius joining the centre $${pt(h, k)}$ to $${pt(x1, y1)}$, whose direction is $(${p}, ${q})$. So the tangent is $${p}(x - ${paren(x1)}) + ${paren(q)}(y - ${paren(y1)}) = 0$, i.e. $${lineEq(p, q, p * x1 + q * y1)}$.`,
    };
  }),

  // ---------------------------------------------------------------- parabola
  b.dynamic('parabola-focus-directrix', { difficulty: 1, origin: 'past-paper', tags: ['parabola', 'focus and directrix'] }, (r) => {
    const k = r.pick([2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32]);
    const axis = r.pick(['x', 'y'] as const);
    const other = axis === 'x' ? 'y' : 'x';
    const s = r.sign();
    const a = frac(k, 4).mul(s);
    const eq = `${other}^2 = ${s < 0 ? '-' : ''}${k}${axis}`;
    const onAxis = (v: Fraction | number): string => (axis === 'x' ? pt(v, 0) : pt(0, v));
    const offAxis = (v: Fraction | number): string => (axis === 'x' ? pt(0, v) : pt(v, 0));
    const ask = r.pick(['focus', 'directrix', 'latus'] as const);
    const base = tex`Compare with $${other}^2 = 4a${axis}$: $4a = ${s < 0 ? '-' : ''}${k}$, so $a = ${a.toTex()}$.`;
    if (ask === 'focus') {
      const answer = m(onAxis(a));
      return {
        stem: tex`The focus of the parabola $${eq}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m(onAxis(a.neg())),
          m(offAxis(a)),
          m(onAxis(k * s)),
          m(offAxis(a.neg())),
        ]),
        explanation: tex`${base} The focus lies on the $${axis}$-axis at $${onAxis(a)}$.`,
      };
    }
    if (ask === 'directrix') {
      const line = (v: Fraction | number, ax: string): string => m(`${ax} = ${fx(v)}`);
      const answer = line(a.neg(), axis);
      return {
        stem: tex`The equation of the directrix of the parabola $${eq}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          line(a, axis),
          line(a.neg(), other),
          line(-k * s, axis),
          line(a, other),
        ]),
        explanation: tex`${base} The directrix is the line $${axis} = -a$, i.e. $${axis} = ${a.neg().toTex()}$.`,
      };
    }
    const answer = m(String(k));
    return {
      stem: tex`The length of the latus rectum of the parabola $${eq}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m(frac(k, 4).toTex()),
        m(frac(k, 2).toTex()),
        m(String(2 * k)),
        m(String(4 * k)),
      ]),
      explanation: tex`${base} Length of latus rectum $= |4a| = ${k}$.`,
    };
  }),

  b.dynamic('parabola-expanded-focus', { difficulty: 2, tags: ['parabola', 'focus and directrix'] }, (r) => {
    const a = r.nonZero(-3, 3);
    const h = r.int(-5, 5);
    const k = r.int(-5, 5);
    const horizontal = r.chance(0.5);
    // horizontal: (y - k)^2 = 4a(x - h); vertical: (x - h)^2 = 4a(y - k)
    const eq = horizontal
      ? signedSum([[1, 'y^{2}'], [-2 * k, 'y'], [-4 * a, 'x'], [k * k + 4 * a * h, '']])
      : signedSum([[1, 'x^{2}'], [-2 * h, 'x'], [-4 * a, 'y'], [h * h + 4 * a * k, '']]);
    const focus = horizontal ? pt(h + a, k) : pt(h, k + a);
    const answer = m(focus);
    const candidates = horizontal
      ? [pt(h, k), pt(h - a, k), pt(h + 4 * a, k), pt(h + a, -k), pt(a, k)]
      : [pt(h, k), pt(h, k - a), pt(h, k + 4 * a), pt(-h, k + a), pt(h, a)];
    const std = horizontal ? `${sq('y', k)} = ${4 * a}${linearFactor(h)}` : `${sq('x', h)} = ${4 * a}${linearFactor(k, 'y')}`;
    return {
      stem: tex`The focus of the parabola $${eq} = 0$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates.map(m)),
      explanation: tex`Completing the square: $${std}$. Vertex $${pt(h, k)}$, $4a = ${4 * a}$ so $a = ${a}$. The focus is $a$ units from the vertex along the axis: $${focus}$.`,
    };
  }),

  // ---------------------------------------------------------------- ellipse
  b.dynamic('ellipse-eccentricity', { difficulty: 1, origin: 'past-paper', tags: ['ellipse', 'eccentricity'] }, (r) => {
    const [a, b2, c] = r.pick(ELLIPSE_SURD);
    const a2 = a * a;
    const xMajor = r.chance(0.5);
    const [dx, dy] = xMajor ? [a2, b2] : [b2, a2];
    const eq =
      r.chance(0.4) && a2 * b2 <= 3600
        ? `${dy}x^2 + ${dx}y^2 = ${dx * dy}`
        : `${over('x', dx)} + ${over('y', dy)} = 1`;
    const answer = m(frac(c, a).toTex());
    return {
      stem: tex`The eccentricity of the ellipse $${eq}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        m(surdFrac(a2 + b2, a)), // hyperbola formula
        m(surdFrac(b2, a)), // b/a
        m(frac(a, c).toTex()), // inverted
        m(frac(c * c, a2).toTex()), // forgot the square root
      ]),
      explanation: tex`In standard form $a^2 = ${a2}$ (larger denominator) and $b^2 = ${b2}$. Then $c^2 = a^2 - b^2 = ${c * c}$, $c = ${c}$, and $e = \frac{c}{a} = ${frac(c, a).toTex()}$.`,
    };
  }),

  b.dynamic('ellipse-foci-latus-rectum', { difficulty: 2, tags: ['ellipse', 'focus and directrix'] }, (r) => {
    const [a, bb, c] = r.pick(ELLIPSE_INT);
    const xMajor = r.chance(0.5);
    const [dx, dy] = xMajor ? [a * a, bb * bb] : [bb * bb, a * a];
    const eq =
      r.chance(0.4) && dx * dy <= 3600
        ? `${dy}x^2 + ${dx}y^2 = ${dx * dy}`
        : `${over('x', dx)} + ${over('y', dy)} = 1`;
    const intro = tex`Here $a^2 = ${a * a}$, $b^2 = ${bb * bb}$ (major axis along the $${xMajor ? 'x' : 'y'}$-axis).`;
    if (r.chance(0.5)) {
      const lr = frac(2 * bb * bb, a);
      const answer = m(lr.toTex());
      return {
        stem: tex`The length of the latus rectum of the ellipse $${eq}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m(frac(bb * bb, a).toTex()), // forgot the 2
          m(frac(2 * a * a, bb).toTex()), // swapped a and b
          m(frac(2 * bb, a).toTex()), // forgot to square
          m(frac(2 * c * c, a).toTex()),
        ]),
        explanation: tex`${intro} Latus rectum $= \frac{2b^2}{a} = \frac{2(${bb * bb})}{${a}} = ${lr.toTex()}$.`,
      };
    }
    const pm = (v: number, onX: boolean): string => (onX ? tex`(\pm ${v}, 0)` : tex`(0, \pm ${v})`);
    const answer = m(pm(c, xMajor));
    return {
      stem: tex`The foci of the ellipse $${eq}$ are:`,
      answer,
      distractors: pickDistractors(answer, [
        m(pm(c, !xMajor)), // wrong axis
        m(pm(a, xMajor)), // vertices
        m(pm(bb, !xMajor)), // ends of minor axis
        m(pm(c * c, xMajor)),
      ]),
      explanation: tex`${intro} $c = \sqrt{a^2 - b^2} = \sqrt{${a * a - bb * bb}} = ${c}$, so the foci are $${pm(c, xMajor)}$.`,
    };
  }),

  // -------------------------------------------------------------- hyperbola
  b.dynamic('hyperbola-asymptotes', { difficulty: 1, origin: 'past-paper', tags: ['hyperbola'] }, (r) => {
    const a = r.int(1, 8);
    const bb = r.intExcept(1, 8, [a]);
    const xTrans = r.chance(0.6);
    // x-transverse: x^2/a^2 - y^2/b^2 = 1 -> y = ±(b/a)x; y-transverse: y^2/a^2 - x^2/b^2 = 1 -> y = ±(a/b)x
    const eq =
      r.chance(0.4) && a * a * bb * bb <= 3600
        ? xTrans
          ? `${coefTex(bb * bb, 'x^2')} - ${coefTex(a * a, 'y^2')} = ${a * a * bb * bb}`
          : `${coefTex(bb * bb, 'y^2')} - ${coefTex(a * a, 'x^2')} = ${a * a * bb * bb}`
        : xTrans
          ? `${over('x', a * a)} - ${over('y', bb * bb)} = 1`
          : `${over('y', a * a)} - ${over('x', bb * bb)} = 1`;
    const slope = xTrans ? frac(bb, a) : frac(a, bb);
    const asym = (s: Fraction): string => m(tex`y = \pm ${s.equals(1) ? '' : s.toTex()}x`);
    const answer = asym(slope);
    return {
      stem: tex`The asymptotes of the hyperbola $${eq}$ are:`,
      answer,
      distractors: pickDistractors(answer, [
        asym(slope.inv()), // inverted ratio
        asym(slope.pow(2)), // forgot the square roots
        asym(slope.inv().pow(2)),
        asym(slope.mul(2)),
      ]),
      explanation: xTrans
        ? tex`For $\frac{x^2}{a^2} - \frac{y^2}{b^2} = 1$ the asymptotes are $y = \pm \frac{b}{a}x$. In standard form $a^2 = ${a * a}$ and $b^2 = ${bb * bb}$, so $a = ${a}$, $b = ${bb}$ and $y = \pm ${slope.equals(1) ? '' : slope.toTex()}x$.`
        : tex`For $\frac{y^2}{a^2} - \frac{x^2}{b^2} = 1$ the asymptotes are $y = \pm \frac{a}{b}x$. In standard form $a^2 = ${a * a}$ and $b^2 = ${bb * bb}$, so $a = ${a}$, $b = ${bb}$ and $y = \pm ${slope.equals(1) ? '' : slope.toTex()}x$.`,
    };
  }),

  b.dynamic('hyperbola-eccentricity', { difficulty: 2, origin: 'past-paper', tags: ['hyperbola', 'eccentricity'] }, (r) => {
    const xTrans = r.chance(0.6);
    const [pos, neg] = xTrans ? ['x', 'y'] : ['y', 'x'];
    if (r.chance(0.15)) {
      const a = r.int(1, 7);
      const eq = r.chance(0.5) ? `${pos}^2 - ${neg}^2 = ${a * a}` : `${over(pos, a * a)} - ${over(neg, a * a)} = 1`;
      const answer = m(tex`\sqrt{2}`);
      return {
        stem: tex`The eccentricity of the hyperbola $${eq}$ is:`,
        answer,
        distractors: pickDistractors(answer, [m('1'), m('2'), m(tex`\frac{1}{\sqrt{2}}`)]),
        explanation: tex`Here $a^2 = b^2 = ${a * a}$ (a rectangular hyperbola). $c^2 = a^2 + b^2 = ${2 * a * a}$, so $e = \frac{c}{a} = \sqrt{\frac{${2 * a * a}}{${a * a}}} = \sqrt{2}$.`,
      };
    }
    const [a, b2, c] = r.pick(HYPERBOLA);
    const a2 = a * a;
    const eq =
      r.chance(0.4) && a2 * b2 <= 3600
        ? `${coefTex(b2, `${pos}^2`)} - ${coefTex(a2, `${neg}^2`)} = ${a2 * b2}`
        : `${over(pos, a2)} - ${over(neg, b2)} = 1`;
    const answer = m(frac(c, a).toTex());
    return {
      stem: tex`The eccentricity of the hyperbola $${eq}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        ...(a2 > b2 ? [m(surdFrac(a2 - b2, a))] : []), // ellipse formula
        m(surdFrac(b2, a)), // b/a
        m(frac(a, c).toTex()), // inverted
        m(frac(c * c, a2).toTex()), // forgot the square root
        m(surdFrac(c * c * b2, b2)), // c/b
      ]),
      explanation: tex`In standard form $${over(pos, a2)} - ${over(neg, b2)} = 1$, so $a^2 = ${a2}$ (under the positive term) and $b^2 = ${b2}$. For a hyperbola $c^2 = a^2 + b^2 = ${c * c}$, so $c = ${c}$ and $e = \frac{c}{a} = ${frac(c, a).toTex()}$.`,
    };
  }),

  b.dynamic('conic-from-foci-eccentricity', { difficulty: 3, tags: ['ellipse', 'hyperbola', 'eccentricity'] }, (r) => {
    const ellipse = r.chance(0.5);
    const onX = r.chance(0.6);
    const [u, v] = onX ? ['x', 'y'] : ['y', 'x'];
    let a: number;
    let c: number;
    if (ellipse) {
      a = r.int(3, 8);
      c = r.int(1, a - 1);
    } else {
      a = r.int(1, 6);
      c = r.int(a + 1, a + 4);
    }
    const e = frac(c, a);
    const b2 = ellipse ? a * a - c * c : c * c - a * a;
    // ellipse terms written with x first
    const ell = (du: number, dv: number): string =>
      m(onX ? `${over('x', du)} + ${over('y', dv)} = 1` : `${over('x', dv)} + ${over('y', du)} = 1`);
    const hyp = (p: string, dp: number, q: string, dq: number): string => m(`${over(p, dp)} - ${over(q, dq)} = 1`);
    const foci = onX ? tex`(\pm ${c}, 0)` : tex`(0, \pm ${c})`;
    if (ellipse) {
      const answer = ell(a * a, b2);
      return {
        stem: tex`An ellipse centred at the origin has foci $${foci}$ and eccentricity $${e.toTex()}$. Its equation is:`,
        answer,
        distractors: pickDistractors(answer, [
          ell(a * a, a * a + c * c), // used b^2 = a^2 + c^2
          ell(b2, a * a), // major axis on the wrong line
          hyp(u, a * a, v, b2), // hyperbola form
          ell(c * c, b2),
        ]),
        explanation: tex`$c = ${c}$ and $e = \frac{c}{a}$ give $a = \frac{${c}}{${e.toTex()}} = ${a}$. Then $b^2 = a^2 - c^2 = ${a * a} - ${c * c} = ${b2}$, with the major axis along the $${u}$-axis.`,
      };
    }
    const answer = hyp(u, a * a, v, b2);
    return {
      stem: tex`A hyperbola centred at the origin has foci $${foci}$ and eccentricity $${e.toTex()}$. Its equation is:`,
      answer,
      distractors: pickDistractors(answer, [
        hyp(u, a * a, v, a * a + c * c), // used b^2 = a^2 + c^2
        ell(a * a, b2), // ellipse form
        hyp(v, a * a, u, b2), // transverse axis on the wrong line
        hyp(u, c * c, v, b2),
      ]),
      explanation: tex`$c = ${c}$ and $e = \frac{c}{a}$ give $a = \frac{${c}}{${e.toTex()}} = ${a}$. For a hyperbola $b^2 = c^2 - a^2 = ${c * c} - ${a * a} = ${b2}$, with the transverse axis along the $${u}$-axis.`,
    };
  }),

  // ------------------------------------------------------------ fixed items
  ...b.mcqs([
    {
      id: 'circle-x-intercept',
      d: 2,
      t: ['circle'],
      q: tex`The length of the intercept cut off on the $x$-axis by the circle $x^2 + y^2 - 4x - 6y - 12 = 0$ is:`,
      a: '$8$',
      x: ['$10$', tex`$2\sqrt{21}$`, '$4$'],
      e: tex`Put $y = 0$: $x^2 - 4x - 12 = 0 \Rightarrow (x - 6)(x + 2) = 0$, so $x = 6$ or $x = -2$. Intercept $= 6 - (-2) = 8$. ($10$ is the diameter; $2\sqrt{21}$ is the $y$-intercept.)`,
    },
    {
      id: 'parabola-focal-distance',
      d: 1,
      t: ['parabola', 'focus and directrix'],
      q: tex`The distance of the point $(9, 6)$ on the parabola $y^2 = 4x$ from its focus is:`,
      a: '$10$',
      x: ['$9$', '$8$', tex`$3\sqrt{13}$`],
      e: tex`For $y^2 = 4ax$, the focal distance of $(x_1, y_1)$ equals its distance from the directrix: $x_1 + a = 9 + 1 = 10$.`,
    },
    {
      id: 'ellipse-major-axis',
      d: 2,
      o: 'past-paper',
      t: ['ellipse'],
      q: tex`For the ellipse $9x^2 + 4y^2 = 36$, the length and direction of the major axis are:`,
      a: '$6$, along the $y$-axis',
      x: ['$6$, along the $x$-axis', '$4$, along the $x$-axis', '$3$, along the $y$-axis'],
      e: tex`Dividing by $36$: $\frac{x^2}{4} + \frac{y^2}{9} = 1$. The larger denominator $9$ is under $y^2$, so $a = 3$ and the major axis has length $2a = 6$ along the $y$-axis.`,
    },
    {
      id: 'hyperbola-directrix-distance',
      d: 3,
      t: ['hyperbola', 'focus and directrix', 'eccentricity'],
      q: tex`The distance between the directrices of the hyperbola $\frac{x^2}{16} - \frac{y^2}{9} = 1$ is:`,
      a: tex`$\frac{32}{5}$`,
      x: [tex`$\frac{16}{5}$`, '$8$', '$10$'],
      e: tex`$a = 4$, $b = 3$, $c = \sqrt{16 + 9} = 5$, $e = \frac{5}{4}$. Directrices: $x = \pm \frac{a}{e} = \pm \frac{16}{5}$, so the distance is $\frac{32}{5}$. ($8$ is between the vertices, $10$ between the foci.)`,
    },
  ]),
]);
