/**
 * Linear Inequalities and Linear Programming (FSc Part II).
 *
 * Coverage
 * - linear inequalities: testing points (strict vs non-strict boundary trap), writing the
 *   inequality of a half-plane from its boundary intercepts, dashed/solid boundaries;
 * - feasible region: points of a system, non-negativity constraints, counting corners;
 * - corner points: the intersection corner versus the infeasible axis intercepts (classic trap);
 * - optimal solution: corner-point evaluation for max/min, full two-constraint problems,
 *   minimisation over an unbounded (>=) region, alternative optima and unbounded regions.
 *
 * Two-constraint regions are built backwards from an integer intersection point and integer
 * axis intercepts (see `region`), so every corner point and every objective value is exact.
 */
import { defineBank } from '@/engine/authoring';
import { Fraction, frac, gcd, num, numericOptions, pickDistractors, signedSum, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// ------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------

type Pt = readonly [number, number];

/** `(2, -3)` (LaTeX, no delimiters). */
const ptTex = ([x, y]: Pt): string => `(${x}, ${y})`;

/** `$(2, -3)$`. */
const pt$ = (p: Pt): string => `$${ptTex(p)}$`;

const samePt = (p: Pt, q: Pt): boolean => p[0] === q[0] && p[1] === q[1];

/** `3x - 2y` from coefficients. */
const lhs = (a: number, b: number): string => signedSum([[a, 'x'], [b, 'y']]);

/** Value of `ax + by` at a point. */
const at = (a: number, b: number, [x, y]: Pt): number => a * x + b * y;

/** `3(2) + 4(-1)`: an explicit substitution display. */
const subst = (a: number, b: number, [x, y]: Pt): string => {
  const term = (c: number, v: number, first: boolean): string => {
    const body = Math.abs(c) === 1 ? `(${v})` : `${Math.abs(c)}(${v})`;
    if (first) return c < 0 ? `-${body}` : body;
    return c < 0 ? ` - ${body}` : ` + ${body}`;
  };
  return term(a, x, true) + term(b, y, false);
};

const LE = '\\le';
const GE = '\\ge';
const IMPLIES = '\\Rightarrow';

/** Boundary line a x + b y = c with positive coefficients (reduced by their gcd). */
interface Line {
  a: number;
  b: number;
  c: number;
}

/**
 * Two constraints a_i x + b_i y (<= or >=) c_i in the first quadrant whose boundary lines cross
 * at the integer point (p, q) and meet the axes at integer points. For the `<=` region the
 * corners are (0, 0), (xs, 0), (p, q), (0, ys); for the `>=` region they are (xb, 0), (p, q),
 * (0, yb). The larger intercepts xb, yb are NOT feasible for the `<=` region (and the smaller
 * ones are not feasible for the `>=` region).
 */
interface Region {
  l1: Line;
  l2: Line;
  p: number;
  q: number;
  xs: number;
  ys: number;
  xb: number;
  yb: number;
}

function reduceLine(a: number, b: number, c: number): Line {
  const g = gcd(gcd(a, b), c);
  return { a: a / g, b: b / g, c: c / g };
}

function region(r: Rng): Region {
  for (let i = 0; i < 4000; i++) {
    const p = r.int(1, 6);
    const q = r.int(1, 6);
    const a1 = r.int(1, 5);
    const b1 = r.int(1, 5);
    const a2 = r.int(1, 5);
    const b2 = r.int(1, 5);
    const c1 = a1 * p + b1 * q;
    const c2 = a2 * p + b2 * q;
    if (c1 % a1 !== 0 || c1 % b1 !== 0 || c2 % a2 !== 0 || c2 % b2 !== 0) continue;
    const x1 = c1 / a1;
    const y1 = c1 / b1;
    const x2 = c2 / a2;
    const y2 = c2 / b2;
    if (!((x1 < x2 && y1 > y2) || (x1 > x2 && y1 < y2))) continue;
    if (Math.max(x1, x2, y1, y2) > 16) continue;
    return {
      l1: reduceLine(a1, b1, c1),
      l2: reduceLine(a2, b2, c2),
      p,
      q,
      xs: Math.min(x1, x2),
      ys: Math.min(y1, y2),
      xb: Math.max(x1, x2),
      yb: Math.max(y1, y2),
    };
  }
  // Safe fallback: x + 2y <= 8 and 3x + y <= 9 cross at (2, 3).
  return { l1: { a: 1, b: 2, c: 8 }, l2: { a: 3, b: 1, c: 9 }, p: 2, q: 3, xs: 3, ys: 4, xb: 8, yb: 9 };
}

/** `x + 2y \le 8,\; 3x + y \le 9,\; x \ge 0,\; y \ge 0`. */
const systemTex = (g: Region, rel: string): string =>
  tex`${lhs(g.l1.a, g.l1.b)} ${rel} ${g.l1.c},\; ${lhs(g.l2.a, g.l2.b)} ${rel} ${g.l2.c},\; x ${GE} 0,\; y ${GE} 0`;

/** `z(0, 0) = 0,\; z(3, 0) = 6, ...` for an explanation. */
const valuesTex = (a: number, b: number, corners: readonly Pt[]): string =>
  corners.map((c) => `z${ptTex(c)} = ${num(at(a, b, c))}`).join(tex`,\; `);

const intOptions = (r: Rng, correct: number, wrong: readonly number[]): { answer: string; distractors: string[] } =>
  numericOptions(r, { correct, wrong, format: (v) => `$${num(v)}$`, allowNegative: true, fallback: 'integer' });

// ------------------------------------------------------------------------------------------
// Bank
// ------------------------------------------------------------------------------------------

export default defineBank('mathematics', 'linear-programming', (b) => [
  // ---------------------------------------------------------------- linear inequalities
  b.dynamic('point-satisfies-inequality', { difficulty: 1, tags: ['linear inequalities'] }, (r) => {
    for (;;) {
      // Positive leading coefficient and coprime coefficients, so the inequality is in lowest terms
      // (no `-2x + 2y > -4` or `-5x - 3y \ge 0`).
      const a = r.int(1, 5);
      const bb = r.nonZero(-5, 5);
      if (gcd(a, Math.abs(bb)) !== 1) continue;
      const on: Pt = [r.int(-3, 3), r.int(-3, 3)];
      const c = at(a, bb, on);
      const kind = r.pick(['<', '>', LE, GE] as const);
      const strict = kind === '<' || kind === '>';
      const holds = (v: number): boolean =>
        kind === '<' ? v < c : kind === '>' ? v > c : kind === LE ? v <= c : v >= c;
      const sat: Pt[] = [];
      const viol: Pt[] = [];
      for (let x = -4; x <= 4; x++) {
        for (let y = -4; y <= 4; y++) {
          const v = at(a, bb, [x, y]);
          if (v === c) continue;
          (holds(v) ? sat : viol).push([x, y]);
        }
      }
      if (sat.length < 1 || viol.length < 3) continue;
      const useBoundary = !strict && r.chance(0.4);
      const ans: Pt = useBoundary ? on : r.pick(sat);
      const wrong: Pt[] = strict ? [on, ...r.sample(viol, 2)] : r.sample(viol, 3);
      const ineq = tex`${lhs(a, bb)} ${kind} ${c}`;
      const check = (p: Pt): string => tex`$${ptTex(p)}$: $${subst(a, bb, p)} = ${at(a, bb, p)}$`;
      return {
        stem: tex`Which of the following points satisfies the inequality $${ineq}$?`,
        answer: pt$(ans),
        distractors: wrong.map(pt$),
        explanation:
          tex`Substitute each point into $${lhs(a, bb)}$ and compare with $${c}$. ${check(ans)}, which satisfies $${ineq}$. ` +
          tex`The others fail: ${wrong.map(check).join('; ')}.` +
          (strict ? tex` A point on the boundary line does not satisfy a strict inequality.` : '') +
          (useBoundary ? tex` Equality is allowed in $${kind}$, so a point on the boundary line satisfies it.` : ''),
      };
    }
  }),

  b.dynamic('inequality-from-intercepts', { difficulty: 2, tags: ['linear inequalities'] }, (r) => {
    const h = r.int(2, 8);
    const k = r.intExcept(2, 8, [h]);
    const g = gcd(h, k);
    const A = k / g;
    const B = h / g;
    const C = (h * k) / g;
    const withOrigin = r.chance(0.5);
    const rel = withOrigin ? LE : GE;
    const anti = withOrigin ? GE : LE;
    return {
      stem: tex`The closed half-plane bounded by the line through $(${h}, 0)$ and $(0, ${k})$ that ${withOrigin ? 'contains' : 'does not contain'} the origin is the solution set of:`,
      answer: tex`$${lhs(A, B)} ${rel} ${C}$`,
      distractors: [tex`$${lhs(A, B)} ${anti} ${C}$`, tex`$${lhs(B, A)} ${rel} ${C}$`, tex`$${lhs(B, A)} ${anti} ${C}$`],
      explanation:
        tex`Intercept form: $\frac{x}{${h}} + \frac{y}{${k}} = 1$, i.e. $${lhs(A, B)} = ${C}$. ` +
        tex`At the origin $${lhs(A, B)} = 0 < ${C}$, so the side containing the origin is $${lhs(A, B)} ${LE} ${C}$; ` +
        tex`the required half-plane is therefore $${lhs(A, B)} ${rel} ${C}$. Swapping the coefficients gives a different line.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'strict-inequality-dashed-boundary',
      d: 1,
      t: ['linear inequalities'],
      q: tex`When the solution region of $2x + 3y < 6$ is shaded, the boundary line $2x + 3y = 6$ is drawn:`,
      a: 'broken (dashed), as it is not part of the region',
      x: [
        'solid, as it is part of the region',
        'solid, but it is not part of the region',
        'broken (dashed), as it is part of the region',
      ],
      e: tex`Points on $2x + 3y = 6$ give $2x + 3y = 6$, which is not less than $6$. The boundary is excluded, so it is drawn broken; a solid line is used for $\le$ or $\ge$.`,
    },
    {
      id: 'non-negativity-first-quadrant',
      d: 1,
      t: ['linear inequalities', 'feasible region'],
      q: tex`The non-negative constraints $x \ge 0$, $y \ge 0$ restrict the feasible region to:`,
      a: 'the first quadrant, including the axes',
      x: ['the second quadrant, including the axes', 'the third quadrant, including the axes', 'the region above the line $y = x$'],
      e: tex`$x \ge 0$ is the right half-plane (with the $y$-axis) and $y \ge 0$ the upper half-plane (with the $x$-axis); their intersection is the closed first quadrant.`,
    },
    {
      id: 'feasible-region-definition',
      d: 1,
      t: ['feasible region'],
      q: 'In a linear programming problem, the set of all points that satisfy every constraint simultaneously is called the:',
      a: 'feasible region',
      x: ['objective function', 'optimal solution', 'boundary line'],
      e: 'Points satisfying all the constraints are feasible solutions; together they form the feasible region. The optimal solution is only the feasible point that optimises the objective function.',
    },
    {
      id: 'count-corner-points',
      d: 2,
      t: ['feasible region', 'corner points'],
      q: tex`The number of corner points of the feasible region of $x + y \le 5$, $x \le 3$, $x \ge 0$, $y \ge 0$ is:`,
      a: '$4$',
      x: ['$3$', '$5$', '$2$'],
      e: tex`The corners are $(0, 0)$, $(3, 0)$, $(3, 2)$ (where $x = 3$ meets $x + y = 5$) and $(0, 5)$: four corner points. The point $(5, 0)$ violates $x \le 3$, so it is not a corner.`,
    },
  ]),

  // ---------------------------------------------------------------- feasible region
  b.dynamic('point-in-feasible-region', { difficulty: 2, tags: ['feasible region'] }, (r) => {
    const g = region(r);
    const { l1, l2 } = g;
    const s1 = (p: Pt): boolean => at(l1.a, l1.b, p) <= l1.c;
    const s2 = (p: Pt): boolean => at(l2.a, l2.b, p) <= l2.c;
    const nn = (p: Pt): boolean => p[0] >= 0 && p[1] >= 0;
    const feasible: Pt[] = [];
    const only1: Pt[] = [];
    const only2: Pt[] = [];
    const neg: Pt[] = [];
    const both: Pt[] = [];
    for (let x = -2; x <= g.xb; x++) {
      for (let y = -2; y <= g.yb; y++) {
        const p: Pt = [x, y];
        if (nn(p)) {
          if (s1(p) && s2(p)) {
            if (x >= 1 && y >= 1) feasible.push(p);
          } else if (!s1(p) && s2(p)) only1.push(p);
          else if (s1(p) && !s2(p)) only2.push(p);
          else both.push(p);
        } else if (s1(p) && s2(p) && x >= -2 && y >= -2 && (x !== 0 || y !== 0)) neg.push(p);
      }
    }
    const ans = r.pick(feasible);
    const pickOr = (list: Pt[]): Pt[] => (list.length > 0 ? [r.pick(list)] : []);
    const wrong = [...pickOr(only1), ...pickOr(only2), ...pickOr(neg), ...pickOr(both), ...r.sample(both, Math.min(2, both.length))];
    const distractors = pickDistractors(pt$(ans), wrong.map(pt$));
    const reason = (p: Pt): string => {
      if (!nn(p)) return tex`$${ptTex(p)}$ has a negative coordinate`;
      const v1 = at(l1.a, l1.b, p);
      const v2 = at(l2.a, l2.b, p);
      return v1 > l1.c
        ? tex`$${ptTex(p)}$ gives $${subst(l1.a, l1.b, p)} = ${v1} > ${l1.c}$`
        : tex`$${ptTex(p)}$ gives $${subst(l2.a, l2.b, p)} = ${v2} > ${l2.c}$`;
    };
    const wrongPts = wrong.filter((p) => distractors.includes(pt$(p)));
    const shown = wrongPts.filter((p, i) => wrongPts.findIndex((q2) => samePt(p, q2)) === i);
    return {
      stem: tex`Which point lies in the feasible region of $${systemTex(g, LE)}$?`,
      answer: pt$(ans),
      distractors,
      explanation:
        tex`For $${ptTex(ans)}$: $${subst(l1.a, l1.b, ans)} = ${at(l1.a, l1.b, ans)} ${LE} ${l1.c}$ and $${subst(l2.a, l2.b, ans)} = ${at(l2.a, l2.b, ans)} ${LE} ${l2.c}$, with both coordinates non-negative, so it is feasible. ` +
        tex`The others fail: ${shown.map(reason).join('; ')}.`,
    };
  }),

  // ---------------------------------------------------------------- corner points
  b.dynamic('corner-point-of-region', { difficulty: 2, origin: 'past-paper', tags: ['corner points', 'feasible region'] }, (r) => {
    const g = region(r);
    const corners: Pt[] = [[0, 0], [g.xs, 0], [g.p, g.q], [0, g.ys]];
    const ans: Pt = [g.p, g.q];
    const pool: Pt[] = [[g.xb, 0], [0, g.yb], [g.q, g.p], [g.xs, g.ys], [g.p + 1, g.q], [g.p, g.q + 1]];
    const valid = pool.filter((p) => !corners.some((c) => samePt(c, p)));
    const distractors = pickDistractors(pt$(ans), valid.map(pt$));
    const { l1, l2 } = g;
    return {
      stem: tex`Which of the following is a corner point of the feasible region of $${systemTex(g, LE)}$?`,
      answer: pt$(ans),
      distractors,
      explanation:
        tex`Solving $${lhs(l1.a, l1.b)} = ${l1.c}$ and $${lhs(l2.a, l2.b)} = ${l2.c}$ simultaneously gives $${ptTex(ans)}$. ` +
        tex`The corner points are $(0, 0)$, $(${g.xs}, 0)$, $${ptTex(ans)}$ and $(0, ${g.ys})$. ` +
        tex`The intercepts $(${g.xb}, 0)$ and $(0, ${g.yb})$ violate the other constraint, so they are not corners.`,
    };
  }),

  // ---------------------------------------------------------------- optimal solution
  b.dynamic('objective-at-corners', { difficulty: 1, origin: 'past-paper', tags: ['corner points', 'optimal solution'] }, (r) => {
    for (;;) {
      const g = region(r);
      const h = r.int(0, 3);
      const k = r.int(0, 3);
      const corners: Pt[] = [
        [h, k],
        [h + g.xs, k],
        [h + g.p, k + g.q],
        [h, k + g.ys],
      ];
      const a = r.int(1, 6);
      const bb = r.chance(0.35) ? -r.int(1, 4) : r.int(1, 6);
      const vals = corners.map((c) => at(a, bb, c));
      if (new Set(vals).size < 4) continue;
      const wantMax = r.chance(0.6);
      const best = wantMax ? Math.max(...vals) : Math.min(...vals);
      const bestPt = corners[vals.indexOf(best)] as Pt;
      const { answer, distractors } = intOptions(r, best, vals.filter((v) => v !== best));
      return {
        stem: tex`The corner points of a bounded feasible region are $${corners.map(ptTex).join(', ')}$. The ${wantMax ? 'maximum' : 'minimum'} value of $z = ${lhs(a, bb)}$ on this region is:`,
        answer,
        distractors,
        explanation: tex`The optimum of a linear objective over a bounded region occurs at a corner point: $${valuesTex(a, bb, corners)}$. The ${wantMax ? 'largest' : 'smallest'} value is $${best}$, at $${ptTex(bestPt)}$.`,
      };
    }
  }),

  b.dynamic('lp-maximum-value', { difficulty: 3, origin: 'past-paper', tags: ['corner points', 'optimal solution'] }, (r) => {
    for (;;) {
      const g = region(r);
      const a = r.int(1, 6);
      const bb = r.int(1, 6);
      const corners: Pt[] = [[0, 0], [g.xs, 0], [g.p, g.q], [0, g.ys]];
      const vals = corners.map((c) => at(a, bb, c));
      const best = Math.max(...vals);
      if (vals.filter((v) => v === best).length > 1) continue;
      const bestPt = corners[vals.indexOf(best)] as Pt;
      const { answer, distractors } = intOptions(r, best, [
        a * g.xb, // infeasible x-intercept treated as a corner
        bb * g.yb, // infeasible y-intercept treated as a corner
        ...vals.filter((v) => v !== best && v !== 0),
        a * g.q + bb * g.p, // swapped the intersection coordinates
      ]);
      return {
        stem: tex`The maximum value of $z = ${lhs(a, bb)}$ subject to $${systemTex(g, LE)}$ is:`,
        answer,
        distractors,
        explanation:
          tex`The boundary lines meet at $(${g.p}, ${g.q})$, so the corner points are $(0, 0)$, $(${g.xs}, 0)$, $(${g.p}, ${g.q})$, $(0, ${g.ys})$ ` +
          tex`(the intercepts $(${g.xb}, 0)$ and $(0, ${g.yb})$ are not feasible). Then $${valuesTex(a, bb, corners)}$, so $z_{\max} = ${best}$ at $${ptTex(bestPt)}$.`,
      };
    }
  }),

  b.dynamic('minimum-point-unbounded-region', { difficulty: 2, tags: ['corner points', 'optimal solution'] }, (r) => {
    for (;;) {
      const g = region(r);
      const a = r.int(1, 6);
      const bb = r.int(1, 6);
      const corners: Pt[] = [[g.xb, 0], [g.p, g.q], [0, g.yb]];
      const vals = corners.map((c) => at(a, bb, c));
      const best = Math.min(...vals);
      if (vals.filter((v) => v === best).length > 1) continue;
      const ans = corners[vals.indexOf(best)] as Pt;
      const pool: Pt[] = [...corners.filter((c) => !samePt(c, ans)), [g.xs, 0], [0, g.ys], [0, 0]];
      const distractors = pickDistractors(pt$(ans), pool.map(pt$));
      return {
        stem: tex`For $z = ${lhs(a, bb)}$ subject to $${systemTex(g, GE)}$, the minimum value of $z$ occurs at:`,
        answer: pt$(ans),
        distractors,
        explanation:
          tex`The feasible region is unbounded with corner points $(${g.xb}, 0)$, $(${g.p}, ${g.q})$, $(0, ${g.yb})$ (the points $(${g.xs}, 0)$, $(0, ${g.ys})$ and $(0, 0)$ violate a constraint). ` +
          tex`Since $z$ has positive coefficients, its minimum is at a corner: $${valuesTex(a, bb, corners)}$. The least value $${best}$ occurs at $${ptTex(ans)}$.`,
      };
    }
  }),

  b.dynamic('equal-value-at-two-corners', { difficulty: 2, tags: ['optimal solution', 'corner points'] }, (r) => {
    for (;;) {
      const k = r.int(1, 6);
      const c = r.int(2, 5);
      const step = c / gcd(k, c);
      const d = step * r.int(1, Math.max(1, Math.floor(6 / step)));
      const x2 = r.int(0, 3);
      const x1 = x2 + d;
      const y1 = r.int(0, 3);
      const y2 = y1 + (k * d) / c;
      if (y2 > 14 || x1 > 10) continue;
      const P: Pt = [x1, y1];
      const Q: Pt = [x2, y2];
      const kk = Fraction.of(k);
      const fmt = (f: Fraction): string => `$${f.toTex()}$`;
      const answer = fmt(kk);
      const pool = [
        kk.neg(), // sign slip
        frac(k, c), // forgot the coefficient c of y
        frac(c * c, k), // inverted ratio
        frac(-k, c),
        kk.add(1),
        kk.add(2),
      ].filter((f) => !f.equals(kk));
      const distractors = pickDistractors(answer, pool.map(fmt));
      return {
        stem: tex`The objective function $z = kx + ${c}y$ takes the same value at the corner points $${ptTex(P)}$ and $${ptTex(Q)}$ of a feasible region. The value of $k$ is:`,
        answer,
        distractors,
        explanation: tex`$k(${x1}) + ${c}(${y1}) = k(${x2}) + ${c}(${y2}) \Rightarrow ${d === 1 ? '' : `${d}k = ${c * (y2 - y1)} ${IMPLIES} `}k = ${k}$. (If this common value is the optimal value and the two corners are adjacent, every point of the edge joining them is also optimal.)`,
      };
    }
  }),

  ...b.mcqs([
    {
      id: 'optimum-at-corner-point',
      d: 1,
      o: 'past-paper',
      t: ['corner points', 'optimal solution'],
      q: 'If a non-constant linear objective function has a maximum value on a bounded feasible region (a convex polygon), this value is attained:',
      a: 'at a corner point of the region',
      x: ['at an interior point of the region', 'only at the origin', 'at the centre of the region'],
      e: 'By the corner-point theorem, the optimum of a linear function over a convex polygon occurs at a vertex. At an interior point one can always move in a direction that increases a non-constant linear function.',
    },
    {
      id: 'unbounded-region-min-only',
      d: 3,
      o: 'past-paper',
      t: ['feasible region', 'optimal solution'],
      q: tex`Subject to $x + y \ge 4$, $x \ge 0$, $y \ge 0$, the objective function $z = 2x + 3y$ has:`,
      a: tex`minimum value $8$ and no maximum value`,
      x: [tex`maximum value $12$ and no minimum value`, tex`minimum value $8$ and maximum value $12$`, tex`minimum value $0$ and no maximum value`],
      e: tex`The region is unbounded, with corners $(4, 0)$ and $(0, 4)$: $z(4, 0) = 8$, $z(0, 4) = 12$. As $x$ or $y$ grows, $z$ grows without bound, so there is no maximum; the minimum is $8$ at $(4, 0)$. The origin is not feasible, so $z = 0$ is impossible.`,
    },
  ]),
]);
