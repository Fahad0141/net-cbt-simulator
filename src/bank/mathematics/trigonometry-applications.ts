/**
 * Application of Trigonometry (FSc Part I): solution of triangles with the law of
 * sines and the law of cosines, the ambiguous (SSA) case, area of a triangle
 * ((1/2)ab sin C and Hero's formula), circum-radius, in-radius and escribed radii,
 * half-angle formulas and heights and distances (angles of elevation and depression).
 */
import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { frac, num, numericOptions, pickDistractors, simplifySurd, surdTex, tex } from '@/engine/helpers';
import type { Rng } from '@/engine/rng';

// --------------------------------------------------------------------------- helpers

/** An exact value c * sqrt(r) with r square-free. */
interface Surd {
  c: Fraction;
  r: number;
}

function sd(c: Fraction, r = 1): Surd {
  if (c.isZero()) return { c, r: 1 };
  const s = simplifySurd(1, r);
  return { c: c.mul(s.c), r: s.r };
}
/** c1 sqrt(r1) / (c2 sqrt(r2)) = c1 sqrt(r1 r2) / (c2 r2). */
const sdiv = (x: Surd, y: Surd): Surd => sd(x.c.div(y.c).div(y.r), x.r * y.r);
const sscale = (x: Surd, k: Fraction | number): Surd => sd(x.c.mul(k), x.r);
const sabs = (x: Surd): Surd => sd(x.c.abs(), x.r);

/** LaTeX for an exact surd: `4\sqrt{2}`, `\frac{5\sqrt{3}}{3}`, `\frac{7}{2}`. */
function stex(x: Surd): string {
  if (x.c.isZero()) return '0';
  if (x.r === 1) return x.c.toTex();
  const sign = x.c.sign() < 0 ? '-' : '';
  const n = Math.abs(x.c.n);
  const top = n === 1 ? `\\sqrt{${x.r}}` : `${n}\\sqrt{${x.r}}`;
  return x.c.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${x.c.d}}`;
}

const half = frac(1, 2);
/** Exact sines and cosines of the standard angles used in this chapter. */
const SIN: Record<number, Surd> = {
  30: sd(half),
  45: sd(half, 2),
  60: sd(half, 3),
  90: sd(frac(1)),
  120: sd(half, 3),
  135: sd(half, 2),
  150: sd(half),
};
const COS: Record<number, Surd> = {
  30: sd(half, 3),
  45: sd(half, 2),
  60: sd(half),
  90: sd(frac(0)),
  120: sd(frac(-1, 2)),
  135: sd(frac(-1, 2), 2),
  150: sd(frac(-1, 2), 3),
};
const TAN: Record<number, Surd> = { 30: sd(frac(1, 3), 3), 45: sd(frac(1)), 60: sd(frac(1), 3) };
const COT: Record<number, Surd> = { 30: sd(frac(1), 3), 45: sd(frac(1)), 60: sd(frac(1, 3), 3) };

const deg = (d: number): string => `${d}^{\\circ}`;
const m$ = (latex: string): string => `$${latex}$`;
const metres = (latex: string): string => `$${latex}\\,\\mathrm{m}$`;

/** Side/angle labels: [first given side, second given side, included angle, side opposite it]. */
const SAS_LABELS: readonly (readonly [string, string, string, string])[] = [
  ['a', 'b', 'C', 'c'],
  ['b', 'c', 'A', 'a'],
  ['c', 'a', 'B', 'b'],
];

/** Integer-sided triangles with integer area: [a, b, c, area]. */
const HERONIAN: readonly (readonly [number, number, number, number])[] = [
  [5, 5, 6, 12],
  [5, 5, 8, 12],
  [13, 14, 15, 84],
  [9, 10, 17, 36],
  [10, 13, 13, 60],
  [7, 15, 20, 42],
  [4, 13, 15, 24],
  [11, 13, 20, 66],
  [10, 17, 21, 84],
  [13, 20, 21, 126],
  [6, 25, 29, 60],
  [3, 25, 26, 36],
  [5, 29, 30, 72],
];
const RIGHT_HERONIAN: readonly (readonly [number, number, number, number])[] = [
  [3, 4, 5, 6],
  [5, 12, 13, 30],
  [8, 15, 17, 60],
  [7, 24, 25, 84],
];

function pickHeronian(r: Rng, includeRight: boolean): [number, number, number, number] {
  const pool = includeRight ? [...HERONIAN, ...RIGHT_HERONIAN] : HERONIAN;
  const [a, b, c, area] = r.pick(pool);
  const k = c <= 15 ? r.pick([1, 1, 2]) : 1;
  return [a * k, b * k, c * k, area * k * k];
}

/** `k(inner)` with k = 1 printed as just `inner`. */
const kTimes = (k: number, inner: string): string => (k === 1 ? inner : `${k}(${inner})`);

// --------------------------------------------------------------------------- bank

export default defineBank('mathematics', 'trigonometry-applications', (b) => [
  // ----------------------------------------------------------------- law of cosines
  b.dynamic(
    'law-of-cosines-third-side',
    { difficulty: 2, origin: 'past-paper', tags: ['law of cosines', 'solution of triangles'] },
    (r) => {
      const C = r.pick([60, 120]);
      const x = r.int(2, 9);
      const y = r.intExcept(2, 9, [x]);
      const [s1, s2, ang, opp] = r.pick(SAS_LABELS);
      const sq = x * x + y * y;
      const c2 = C === 60 ? sq - x * y : sq + x * y;
      const answer = m$(surdTex(1, c2));
      const distractors = pickDistractors(answer, [
        m$(surdTex(1, C === 60 ? sq + x * y : sq - x * y)), // sign slip in cos C
        m$(surdTex(1, sq)), // dropped the 2ab cos term
        m$(surdTex(1, C === 60 ? sq - 2 * x * y : sq + 2 * x * y)), // forgot the cos factor
        m$(String(c2)), // forgot the square root
      ]);
      const cosC = C === 60 ? '\\left(\\frac{1}{2}\\right)' : '\\left(-\\frac{1}{2}\\right)';
      return {
        stem: tex`In triangle $ABC$, $${s1} = ${x}$, $${s2} = ${y}$ and $\angle ${ang} = ${deg(C)}$. Then $${opp}$ equals:`,
        answer,
        distractors,
        explanation: tex`By the law of cosines, $${opp}^2 = ${s1}^2 + ${s2}^2 - 2${s1}${s2}\cos ${ang} = ${x * x} + ${y * y} - 2(${x})(${y})${cosC} = ${c2}$, so $${opp} = ${surdTex(1, c2)}$.`,
      };
    },
  ),

  b.dynamic(
    'angle-from-three-sides',
    { difficulty: 2, origin: 'past-paper', tags: ['law of cosines', 'solution of triangles'] },
    (r) => {
      // [p, q, side opposite the required angle, angle]
      const triples: readonly (readonly [number, number, number, number])[] = [
        [3, 5, 7, 120],
        [7, 8, 13, 120],
        [5, 16, 19, 120],
        [11, 24, 31, 120],
        [3, 8, 7, 60],
        [5, 8, 7, 60],
        [7, 15, 13, 60],
        [8, 15, 13, 60],
        [5, 21, 19, 60],
        [16, 21, 19, 60],
      ];
      const [p0, q0, c0, angle] = r.pick(triples);
      const k = Math.max(p0, q0, c0) <= 13 ? r.pick([1, 1, 2, 3]) : 1;
      const [p, q, c] = [p0 * k, q0 * k, c0 * k];
      const sides = r.shuffle([p, q, c]);
      const askLargest = angle === 120 && r.chance(0.5);
      const supplement = 180 - angle;
      const others = angle === 60 ? [30, 45, 90] : [150, 135, 90];
      const answer = m$(deg(angle));
      const distractors = pickDistractors(answer, [m$(deg(supplement)), ...r.sample(others, 2).map((v) => m$(deg(v)))]);
      const numer = p * p + q * q - c * c;
      const den = 2 * p * q;
      const cosText = angle === 60 ? '\\frac{1}{2}' : '-\\frac{1}{2}';
      return {
        stem: askLargest
          ? tex`The sides of a triangle are $${sides[0]}$, $${sides[1]}$ and $${sides[2]}$. Its largest angle is:`
          : tex`The sides of a triangle are $${sides[0]}$, $${sides[1]}$ and $${sides[2]}$. The angle opposite the side of length $${c}$ is:`,
        answer,
        distractors,
        explanation: tex`${askLargest ? `The largest angle $\\theta$ is opposite the longest side $${c}$. ` : `Let $\\theta$ be the angle opposite the side $${c}$. `}$\cos\theta = \frac{${p}^2 + ${q}^2 - ${c}^2}{2(${p})(${q})} = \frac{${numer}}{${den}} = ${cosText}$, so $\theta = ${deg(angle)}$ (not $${deg(supplement)}$, whose cosine has the opposite sign).`,
      };
    },
  ),

  // ----------------------------------------------------------------- law of sines
  b.dynamic('law-of-sines-side', { difficulty: 1, origin: 'past-paper', tags: ['law of sines', 'solution of triangles'] }, (r) => {
    const angles = [30, 45, 60, 120, 135];
    let A = 0;
    let B = 0;
    do {
      [A, B] = r.sample(angles, 2) as [number, number];
    } while (A + B >= 180);
    const ratio = sdiv(SIN[B] as Surd, SIN[A] as Surd);
    const a = ratio.c.d * r.int(1, 6) * (ratio.c.d === 1 ? 2 : 1);
    const bVal = sscale(ratio, a);
    const answer = m$(stex(bVal));
    const distractors = pickDistractors(answer, [
      m$(stex(sscale(sdiv(SIN[A] as Surd, SIN[B] as Surd), a))), // inverted ratio
      m$(stex(sd(frac(a * B, A)))), // sides proportional to the angles
      m$(stex(sscale(SIN[B] as Surd, a))), // a sin B, forgot to divide
      m$(stex(sdiv(sd(frac(a)), SIN[A] as Surd))), // a / sin A = 2R
    ]);
    return {
      stem: tex`In triangle $ABC$, $\angle A = ${deg(A)}$, $\angle B = ${deg(B)}$ and $a = ${a}$. Then $b$ equals:`,
      answer,
      distractors,
      explanation: tex`By the law of sines, $\frac{b}{\sin B} = \frac{a}{\sin A}$, so $b = \frac{a\sin B}{\sin A} = \frac{${a}\left(${stex(SIN[B] as Surd)}\right)}{${stex(SIN[A] as Surd)}} = ${stex(bVal)}$.`,
    };
  }),

  b.dynamic('ambiguous-case-count', { difficulty: 3, tags: ['solution of triangles', 'law of sines'] }, (r) => {
    const obtuse = r.chance(0.25);
    const A = obtuse ? 150 : 30;
    const bSide = r.multiple(8, 24, 2);
    const h = bSide / 2; // b sin A
    let a: number;
    let count: 0 | 1 | 2;
    let reason: string;
    const NONE = 'No triangle';
    const ONE = 'Exactly one triangle';
    const TWO = 'Exactly two triangles';
    if (obtuse) {
      if (r.chance(0.5)) {
        a = r.int(bSide + 1, bSide + 8);
        count = 1;
        reason = tex`Since $A$ is obtuse, a triangle exists only if $a > b$. Here $${a} > ${bSide}$, so $B$ is acute and unique: exactly one triangle.`;
      } else {
        a = r.int(h, bSide);
        count = 0;
        reason = tex`Since $A$ is obtuse, it must be the largest angle, so $a$ must exceed $b$. Here $a = ${a} \le b = ${bSide}$, so no triangle exists.`;
      }
    } else {
      const kind = r.weighted(['two', 'right', 'none', 'one'] as const, [35, 15, 25, 25]);
      if (kind === 'two') {
        a = r.int(h + 1, bSide - 1);
        count = 2;
        reason = tex`$b\sin A = ${bSide}\left(\frac{1}{2}\right) = ${h}$. Since $${h} < a = ${a} < b = ${bSide}$, $\sin B = \frac{b\sin A}{a} = \frac{${h}}{${a}} < 1$ gives an acute and an obtuse value of $B$, both valid: two triangles.`;
      } else if (kind === 'right') {
        a = h;
        count = 1;
        reason = tex`$b\sin A = ${bSide}\left(\frac{1}{2}\right) = ${h} = a$, so $\sin B = 1$ and $B = ${deg(90)}$: exactly one (right-angled) triangle.`;
      } else if (kind === 'none') {
        a = r.int(2, h - 1);
        count = 0;
        reason = tex`$b\sin A = ${bSide}\left(\frac{1}{2}\right) = ${h}$ and $a = ${a} < ${h}$, so $\sin B = \frac{${h}}{${a}} > 1$, which is impossible: no triangle.`;
      } else {
        a = r.int(bSide, bSide + 6);
        count = 1;
        reason = tex`Since $a = ${a} \ge b = ${bSide}$, we get $B \le A = ${deg(30)}$, so only the acute value of $B$ is possible: exactly one triangle.`;
      }
    }
    const labels = [NONE, ONE, TWO];
    const answer = labels[count] as string;
    return {
      stem: tex`In triangle $ABC$, $\angle A = ${deg(A)}$, $b = ${bSide}$ and $a = ${a}$. How many triangles satisfy these data?`,
      answer,
      distractors: [...labels.filter((l) => l !== answer), 'Infinitely many triangles'],
      explanation: reason,
    };
  }),

  // ----------------------------------------------------------------- area of triangle
  b.dynamic('area-two-sides-included-angle', { difficulty: 1, origin: 'past-paper', tags: ['area of triangle'] }, (r) => {
    const C = r.pick([30, 45, 60, 120, 135, 150]);
    const x = r.int(2, 12);
    const y = r.int(2, 12);
    const [s1, s2, ang] = r.pick(SAS_LABELS);
    const sinC = SIN[C] as Surd;
    const area = sscale(sinC, frac(x * y, 2));
    const answer = m$(`${stex(area)}\\text{ sq. units}`);
    const fmt = (v: Surd): string => m$(`${stex(v)}\\text{ sq. units}`);
    const distractors = pickDistractors(answer, [
      fmt(sscale(sinC, x * y)), // forgot the 1/2
      fmt(sscale(sabs(COS[C] as Surd), frac(x * y, 2))), // used cos instead of sin
      fmt(sd(frac(x * y, 2))), // ignored the angle
      fmt(sdiv(sd(frac(x * y, 2)), sinC)), // divided by sin C
      fmt(sscale(sinC, frac(x * y, 4))), // halved twice
    ]);
    return {
      stem: tex`In triangle $ABC$, $${s1} = ${x}$, $${s2} = ${y}$ and $\angle ${ang} = ${deg(C)}$. The area of the triangle is:`,
      answer,
      distractors,
      explanation: tex`$\angle ${ang}$ is the angle included between $${s1}$ and $${s2}$, so $\Delta = \frac{1}{2}${s1}${s2}\sin ${ang} = \frac{1}{2}(${x})(${y})\left(${stex(sinC)}\right) = ${stex(area)}$ sq. units.`,
    };
  }),

  b.dynamic('area-hero-formula', { difficulty: 2, tags: ['area of triangle'] }, (r) => {
    const [a, bb, c, area] = pickHeronian(r, false);
    const s = (a + bb + c) / 2;
    const sides = r.shuffle([a, bb, c]);
    const { answer, distractors } = numericOptions(r, {
      correct: area,
      wrong: [(a * bb) / 2, 2 * area, area / 2], // treated as right-angled; doubled; halved again
      format: (v) => m$(`${num(v)}\\text{ sq. units}`),
      fallback: 'integer',
    });
    return {
      stem: tex`The area of a triangle whose sides are $${sides[0]}$, $${sides[1]}$ and $${sides[2]}$ is:`,
      answer,
      distractors,
      explanation: tex`$s = \frac{${a} + ${bb} + ${c}}{2} = ${s}$. By Hero's formula, $\Delta = \sqrt{s(s-a)(s-b)(s-c)} = \sqrt{${s}(${s - a})(${s - bb})(${s - c})} = \sqrt{${area * area}} = ${area}$ sq. units.`,
    };
  }),

  // ----------------------------------------------------------------- circum-radius and in-radius
  b.dynamic(
    'inradius-circumradius-from-sides',
    { difficulty: 2, origin: 'past-paper', tags: ['circum-radius and in-radius', 'area of triangle'] },
    (r) => {
      const [a, bb, c, area] = pickHeronian(r, true);
      const s = (a + bb + c) / 2;
      const inr = frac(area, s);
      const circ = frac(a * bb * c, 4 * area);
      const askIn = r.chance(0.5);
      const ft = (v: Fraction): string => m$(v.toTex());
      const answer = ft(askIn ? inr : circ);
      const candidates = askIn
        ? [
            ft(frac(area, 2 * s)), // divided by the perimeter
            ft(frac(s, area)), // inverted
            ft(circ), // gave R
            ft(frac(2 * area, s)),
          ]
        : [
            ft(frac(a * bb * c, 2 * area)), // used 2 instead of 4
            ft(frac(4 * area, a * bb * c)), // inverted
            ft(inr), // gave r
            ft(frac(a * bb * c, area)),
          ];
      const sides = r.shuffle([a, bb, c]);
      const work = tex`$s = ${s}$ and $\Delta = \sqrt{${s}(${s - a})(${s - bb})(${s - c})} = ${area}$`;
      return {
        stem: tex`The ${askIn ? 'in-radius' : 'circum-radius'} of the triangle with sides $${sides[0]}$, $${sides[1]}$ and $${sides[2]}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: askIn
          ? tex`${work}, so $r = \frac{\Delta}{s} = \frac{${area}}{${s}} = ${inr.toTex()}$.`
          : tex`${work}, so $R = \frac{abc}{4\Delta} = \frac{${a}(${bb})(${c})}{4(${area})} = ${circ.toTex()}$.`,
      };
    },
  ),

  b.dynamic('circumradius-law-of-sines', { difficulty: 1, tags: ['circum-radius and in-radius', 'law of sines'] }, (r) => {
    const A = r.pick([30, 60, 120, 150]);
    const sinA = SIN[A] as Surd;
    const cosAbs = sabs(COS[A] as Surd);
    const findR = r.chance(0.6);
    if (findR) {
      const a = r.int(3, 20);
      const R = sdiv(sd(frac(a, 2)), sinA);
      const answer = m$(stex(R));
      const distractors = pickDistractors(answer, [
        m$(stex(sdiv(sd(frac(a)), sinA))), // a / sin A = 2R
        m$(stex(sscale(sinA, frac(a, 2)))), // a sin A / 2
        m$(stex(sdiv(sd(frac(a, 2)), cosAbs))), // used cos A
        m$(stex(sdiv(sd(frac(a, 4)), sinA))),
      ]);
      return {
        stem: tex`In triangle $ABC$, $a = ${a}$ and $\angle A = ${deg(A)}$. The circum-radius $R$ of the triangle is:`,
        answer,
        distractors,
        explanation: tex`From $\frac{a}{\sin A} = 2R$: $R = \frac{a}{2\sin A} = \frac{${a}}{2\left(${stex(sinA)}\right)} = ${stex(R)}$.`,
      };
    }
    const R = r.int(2, 12);
    const a = sscale(sinA, 2 * R);
    const answer = m$(stex(a));
    const distractors = pickDistractors(answer, [
      m$(stex(sscale(sinA, R))), // forgot the 2
      m$(stex(sscale(cosAbs, 2 * R))), // used cos A
      m$(stex(sdiv(sd(frac(2 * R)), sinA))), // divided by sin A
      m$(stex(sdiv(sd(frac(R, 2)), sinA))),
    ]);
    return {
      stem: tex`A triangle $ABC$ is inscribed in a circle of radius $${R}$. If $\angle A = ${deg(A)}$, then the side $a$ equals:`,
      answer,
      distractors,
      explanation: tex`By the extended law of sines, $a = 2R\sin A = 2(${R})\left(${stex(sinA)}\right) = ${stex(a)}$.`,
    };
  }),

  // ----------------------------------------------------------------- heights and distances
  b.dynamic('elevation-single-angle', { difficulty: 1, origin: 'past-paper', tags: ['heights and distances'] }, (r) => {
    const theta = r.pick([30, 60]);
    const given = r.multiple(10, 120, 10);
    const findHeight = r.chance(0.5);
    const main = findHeight ? (TAN[theta] as Surd) : (COT[theta] as Surd);
    const swapped = findHeight ? (COT[theta] as Surd) : (TAN[theta] as Surd);
    const value = sscale(main, given);
    const answer = metres(stex(value));
    const distractors = pickDistractors(answer, [
      metres(stex(sscale(swapped, given))), // tan and cot interchanged
      metres(stex(sscale(SIN[theta] as Surd, given))), // used sin
      metres(stex(sscale(COS[theta] as Surd, given))), // used cos
      metres(stex(sdiv(sd(frac(given)), (findHeight ? COS : SIN)[theta] as Surd))), // line of sight
    ]);
    const stem = findHeight
      ? tex`From a point on level ground $${given}\,\mathrm{m}$ away from the foot of a vertical tower, the angle of elevation of the top of the tower is $${deg(theta)}$. The height of the tower is:`
      : tex`The angle of elevation of the top of a vertical tower $${given}\,\mathrm{m}$ high, observed from a point $P$ on level ground, is $${deg(theta)}$. The distance of $P$ from the foot of the tower is:`;
    const explanation = findHeight
      ? tex`$\tan ${deg(theta)} = \frac{h}{${given}}$, so $h = ${given}\tan ${deg(theta)} = ${given}\left(${stex(TAN[theta] as Surd)}\right) = ${stex(value)}\,\mathrm{m}$.`
      : tex`$\tan ${deg(theta)} = \frac{${given}}{x}$, so $x = ${given}\cot ${deg(theta)} = ${given}\left(${stex(COT[theta] as Surd)}\right) = ${stex(value)}\,\mathrm{m}$.`;
    return { stem, answer, distractors, explanation };
  }),

  b.dynamic('elevation-two-angles', { difficulty: 3, origin: 'past-paper', tags: ['heights and distances'] }, (r) => {
    const [alpha, beta] = r.pick([
      [30, 60],
      [30, 60],
      [30, 45],
      [45, 60],
    ] as const);
    const d = r.multiple(20, 200, 10);
    const k = d / 2;
    const s3 = '\\sqrt{3}';
    let answerTex: string;
    let wrong: string[];
    let work: string;
    if (alpha === 30 && beta === 60) {
      answerTex = stex(sd(frac(k), 3));
      wrong = [stex(sd(frac(d), 3)), stex(sd(frac(d, 3), 3)), String(k)];
      work = tex`Let $x$ be the distance of the second point from the foot. Then $h = x\tan ${deg(60)} = ${s3}\,x$ and $h = (x + ${d})\tan ${deg(30)} = \frac{x + ${d}}{${s3}}$. So $3x = x + ${d}$, giving $x = ${k}$ and $h = ${answerTex}\,\mathrm{m}$.`;
    } else if (alpha === 30) {
      answerTex = kTimes(k, `${s3}+1`);
      wrong = [kTimes(k, `${s3}-1`), kTimes(d, `${s3}+1`), String(d)];
      work = tex`Let $x$ be the distance of the second point from the foot. Then $h = x\tan ${deg(45)} = x$ and $h = (x + ${d})\tan ${deg(30)}$, so $${s3}\,h = h + ${d}$ and $h = \frac{${d}}{${s3}-1} = \frac{${d}(${s3}+1)}{2} = ${answerTex}\,\mathrm{m}$.`;
    } else {
      answerTex = kTimes(k, `3+${s3}`);
      wrong = [kTimes(k, `3-${s3}`), stex(sd(frac(d), 3)), kTimes(k, `${s3}+1`)];
      work = tex`Let $x$ be the distance of the second point from the foot. Then $h = x\tan ${deg(60)}$, so $x = \frac{h}{${s3}}$, and $h = (x + ${d})\tan ${deg(45)} = x + ${d}$. So $h\left(1 - \frac{1}{${s3}}\right) = ${d}$, giving $h = \frac{${d}${s3}}{${s3}-1} = \frac{${d}${s3}(${s3}+1)}{2} = ${answerTex}\,\mathrm{m}$.`;
    }
    const answer = metres(answerTex);
    return {
      stem: tex`The angle of elevation of the top of a vertical tower from a point on level ground is $${deg(alpha)}$. After walking $${d}\,\mathrm{m}$ straight towards the tower, the angle of elevation becomes $${deg(beta)}$. The height of the tower is:`,
      answer,
      distractors: pickDistractors(answer, wrong.map(metres)),
      explanation: work,
    };
  }),

  // ----------------------------------------------------------------- fixed questions
  ...b.mcqs([
    {
      id: 'projection-formula',
      d: 1,
      t: ['solution of triangles'],
      q: tex`With the usual notation, in any triangle $ABC$, $b\cos C + c\cos B$ equals:`,
      a: tex`$a$`,
      x: [tex`$b + c$`, tex`$a\cos A$`, tex`$2R$`],
      e: tex`Drop the perpendicular from $A$ to $BC$: it divides $BC$ into parts $c\cos B$ and $b\cos C$ (signed when an angle is obtuse), so $a = b\cos C + c\cos B$ (projection formula).`,
    },
    {
      id: 'escribed-radius-formula',
      d: 2,
      t: ['circum-radius and in-radius'],
      q: tex`With the usual notation, the radius $r_1$ of the escribed circle opposite to vertex $A$ of triangle $ABC$ is:`,
      a: tex`$\dfrac{\Delta}{s-a}$`,
      x: [tex`$\dfrac{\Delta}{s}$`, tex`$\dfrac{s-a}{\Delta}$`, tex`$\dfrac{abc}{4\Delta}$`],
      e: tex`The escribed circle touching $BC$ gives $\Delta = r_1(s - a)$, so $r_1 = \frac{\Delta}{s-a}$. $\frac{\Delta}{s}$ is the in-radius and $\frac{abc}{4\Delta}$ the circum-radius.`,
    },
    {
      id: 'equilateral-r-to-r',
      d: 1,
      t: ['circum-radius and in-radius'],
      q: tex`In an equilateral triangle, the ratio of the circum-radius to the in-radius is:`,
      a: tex`$2 : 1$`,
      x: [tex`$1 : 2$`, tex`$\sqrt{3} : 1$`, tex`$3 : 1$`],
      e: tex`For side $a$: $R = \frac{a}{2\sin 60^{\circ}} = \frac{a}{\sqrt{3}}$ and $r = \frac{\Delta}{s} = \frac{\sqrt{3}a^2/4}{3a/2} = \frac{a}{2\sqrt{3}}$, so $R : r = 2 : 1$.`,
    },
    {
      id: 'depression-equals-elevation',
      d: 1,
      t: ['heights and distances'],
      q: tex`From the top of a vertical cliff, the angle of depression of a boat at sea is $40^{\circ}$. The angle of elevation of the top of the cliff as seen from the boat is:`,
      a: tex`$40^{\circ}$`,
      x: [tex`$50^{\circ}$`, tex`$140^{\circ}$`, tex`$80^{\circ}$`],
      e: tex`The horizontal at the top of the cliff is parallel to the sea level, so the angle of depression and the angle of elevation are alternate angles and are equal: $40^{\circ}$.`,
    },
    {
      id: 'half-angle-cosine',
      d: 2,
      t: ['solution of triangles'],
      q: tex`With the usual notation, in triangle $ABC$, $\cos\dfrac{A}{2}$ equals:`,
      a: tex`$\sqrt{\dfrac{s(s-a)}{bc}}$`,
      x: [
        tex`$\sqrt{\dfrac{(s-b)(s-c)}{bc}}$`,
        tex`$\sqrt{\dfrac{(s-b)(s-c)}{s(s-a)}}$`,
        tex`$\sqrt{\dfrac{s(s-a)}{ab}}$`,
      ],
      e: tex`$2\cos^2\frac{A}{2} = 1 + \cos A = 1 + \frac{b^2 + c^2 - a^2}{2bc} = \frac{(b+c)^2 - a^2}{2bc} = \frac{2s \cdot 2(s-a)}{2bc}$, so $\cos\frac{A}{2} = \sqrt{\frac{s(s-a)}{bc}}$. Note that $\sqrt{\frac{(s-b)(s-c)}{bc}}$ is $\sin\frac{A}{2}$ and $\sqrt{\frac{(s-b)(s-c)}{s(s-a)}}$ is $\tan\frac{A}{2}$.`,
    },
    {
      id: 'a-cos-a-equals-b-cos-b',
      d: 3,
      o: 'past-paper',
      t: ['law of sines', 'solution of triangles'],
      q: tex`If in triangle $ABC$, $a\cos A = b\cos B$, then the triangle is:`,
      a: 'either isosceles or right-angled',
      x: ['isosceles only', 'right-angled only', 'equilateral'],
      e: tex`With $a = 2R\sin A$ and $b = 2R\sin B$: $\sin A\cos A = \sin B\cos B$, so $\sin 2A = \sin 2B$. Hence $2A = 2B$ (isosceles, $A = B$) or $2A = 180^{\circ} - 2B$ (right-angled, $A + B = 90^{\circ}$). Either case is possible.`,
    },
  ]),
]);
