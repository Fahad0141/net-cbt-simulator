/**
 * Inverse Trigonometric Functions (FSc Part I): principal values, domains and ranges,
 * and the standard inverse identities (sin^-1 x + cos^-1 x = pi/2, the tan^-1 addition
 * formula, f^-1(f(x)) traps).
 *
 * Angles are handled in whole degrees internally and printed as multiples of pi, so every
 * option is an exact value. Since a principal value is unique, any angle other than the
 * marked one is definitely wrong; distractors are the angles students actually write
 * (wrong-quadrant angle with the same ratio, sign slip, complementary angle).
 */
import { defineBank } from '@/engine/authoring';
import { exactTrig, frac, gcd, m$, pickDistractors, radianTex, tex } from '@/engine/helpers';
import type { Fraction, TrigFn } from '@/engine/helpers';

// --------------------------------------------------------------------------- notation

const FN: Readonly<Record<TrigFn, string>> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  cot: '\\cot',
  sec: '\\sec',
  csc: '\\csc',
};

/** `\sin^{-1}` */
const inv = (fn: TrigFn): string => `${FN[fn]}^{-1}`;

/** Principal range of each inverse function (FSc convention). */
const RANGE: Readonly<Record<TrigFn, string>> = {
  sin: '\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right]',
  cos: '\\left[0, \\pi\\right]',
  tan: '\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)',
  cot: '\\left(0, \\pi\\right)',
  sec: '\\left[0, \\pi\\right] \\setminus \\left\\{\\frac{\\pi}{2}\\right\\}',
  csc: '\\left[-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right] \\setminus \\left\\{0\\right\\}',
};

const REALS = '\\mathbb{R}';
const UNIT = '\\left[-1, 1\\right]';
const OUTSIDE = '\\left(-\\infty, -1\\right] \\cup \\left[1, \\infty\\right)';
const OPEN_UNIT = '\\left(-1, 1\\right)';

const DOMAIN: Readonly<Record<TrigFn, string>> = {
  sin: UNIT,
  cos: UNIT,
  tan: REALS,
  cot: REALS,
  sec: OUTSIDE,
  csc: OUTSIDE,
};

/** Angle (degrees) as a multiple of pi. */
const ang = (d: number): string => radianTex(d);

/** Rational multiple of pi: 3/10 -> `\frac{3\pi}{10}`. */
function piTex(f: Fraction): string {
  if (f.isZero()) return '0';
  const sign = f.sign() < 0 ? '-' : '';
  const n = Math.abs(f.n);
  const top = n === 1 ? '\\pi' : `${n}\\pi`;
  return f.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${f.d}}`;
}

/** Exact value of a ratio at a standard angle. */
function val(fn: TrigFn, d: number): string {
  const v = exactTrig(fn, d);
  if (!v) throw new RangeError(`${fn} ${d} is undefined`);
  return v.tex;
}

/** `\tan^{-1} 2` or `\tan^{-1}\left(\frac{3}{7}\right)`. */
function tanInvOf(f: Fraction): string {
  return f.isInteger() && f.n >= 0 ? `\\tan^{-1} ${f.n}` : `\\tan^{-1}\\left(${f.toTex()}\\right)`;
}

/** Closed interval of two fractions. */
const closed = (l: Fraction, r: Fraction): string => `\\left[${l.toTex()}, ${r.toTex()}\\right]`;

/** Standard angles used as fallback distractors. */
const ANGLE_POOL: readonly number[] = [-90, -60, -45, -30, 0, 30, 45, 60, 90, 120, 135, 150, 180];

// --------------------------------------------------------------------------- bank

export default defineBank('mathematics', 'inverse-trigonometry', (b) => [
  // ------------------------------------------------------------ principal values
  b.dynamic(
    'principal-value',
    { difficulty: 1, origin: 'past-paper', tags: ['principal values'] },
    (r) => {
      const fn = r.weighted<TrigFn>(['sin', 'cos', 'tan', 'cot', 'sec', 'csc'], [3, 3, 3, 2, 1, 1]);
      const symmetric = [-60, -45, -30, 30, 45, 60];
      const upper = [30, 45, 60, 120, 135, 150];
      const theta = r.pick(fn === 'sin' || fn === 'tan' || fn === 'csc' ? symmetric : upper);
      const x = val(fn, theta);

      // Typical slips: another angle with the same ratio (wrong quadrant), sign slip,
      // complementary angle (confusing sin^-1 with cos^-1).
      let sameRatio: number;
      let signSlip: number;
      if (fn === 'sin' || fn === 'csc') {
        sameRatio = 180 - theta;
        signSlip = -theta;
      } else if (fn === 'cos' || fn === 'sec') {
        sameRatio = -theta;
        signSlip = 180 - theta;
      } else if (fn === 'tan') {
        sameRatio = theta + 180;
        signSlip = -theta;
      } else {
        sameRatio = theta - 180;
        signSlip = 180 - theta;
      }
      const candidates = [sameRatio, signSlip, 90 - theta, ...r.shuffle(ANGLE_POOL)]
        .filter((d) => d !== theta)
        .map((d) => m$(ang(d)));
      const answer = m$(ang(theta));
      return {
        stem: tex`The principal value of $${inv(fn)}\left(${x}\right)$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`The principal value of $${inv(fn)}$ lies in $${RANGE[fn]}$. Since $${FN[fn]}\left(${ang(theta)}\right) = ${x}$ and $${ang(theta)}$ lies in this range, $${inv(fn)}\left(${x}\right) = ${ang(theta)}$. (The angle $${ang(sameRatio)}$ has the same ratio but lies outside the principal range.)`,
      };
    },
  ),

  b.dynamic(
    'inverse-of-function-trap',
    { difficulty: 3, origin: 'past-paper', tags: ['principal values', 'inverse identities'] },
    (r) => {
      const fn = r.pick<'sin' | 'cos' | 'tan'>(['sin', 'cos', 'tan']);
      let alpha: number;
      let ans: number;
      if (fn === 'sin') {
        alpha = r.pick([120, 135, 150, 210, 225, 240]);
        ans = 180 - alpha;
      } else if (fn === 'cos') {
        alpha = r.pick([210, 225, 240, 300, 315, 330, -30, -45, -60, -120, -135]);
        ans = alpha < 0 ? -alpha : 360 - alpha;
      } else {
        alpha = r.pick([120, 135, 150, 210, 225, 240]);
        ans = alpha - 180;
      }
      const v = val(fn, alpha);
      const inner = alpha < 0 ? `${FN[fn]}\\left(${ang(alpha)}\\right)` : `${FN[fn]} ${ang(alpha)}`;
      const answer = m$(ang(ans));
      const candidates = [alpha, -ans, 180 - ans, 90 - ans, ...r.shuffle(ANGLE_POOL)]
        .filter((d) => d !== ans)
        .map((d) => m$(ang(d)));
      return {
        stem: tex`The value of $${inv(fn)}\left(${inner}\right)$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$${inv(fn)}(${FN[fn]}\,\theta) = \theta$ only when $\theta$ lies in the principal range $${RANGE[fn]}$, and $${ang(alpha)}$ does not. Now $${FN[fn]}\left(${ang(alpha)}\right) = ${v} = ${FN[fn]}\left(${ang(ans)}\right)$ with $${ang(ans)}$ in the range, so the value is $${ang(ans)}$.`,
      };
    },
  ),

  // ------------------------------------------------------------ domains and ranges
  b.dynamic('domain-or-range', { difficulty: 1, tags: ['domains and ranges'] }, (r) => {
    const fn = r.pick<TrigFn>(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);
    if (r.chance(0.5)) {
      const answer = m$(RANGE[fn]);
      const others = (Object.keys(RANGE) as TrigFn[]).filter((g) => RANGE[g] !== RANGE[fn]);
      const candidates = [...r.shuffle(others).map((g) => m$(RANGE[g])), m$('\\left[-\\pi, \\pi\\right]')];
      return {
        stem: tex`The range (set of principal values) of $y = ${inv(fn)} x$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`By the principal-value convention, $${inv(fn)} x$ takes values in $${RANGE[fn]}$, where $${FN[fn]}$ is one-one and takes each of its values exactly once.`,
      };
    }
    const answer = m$(DOMAIN[fn]);
    const candidates = r.shuffle([UNIT, REALS, OUTSIDE, OPEN_UNIT, '\\left[0, \\infty\\right)']).map(m$);
    return {
      stem: tex`The domain of $y = ${inv(fn)} x$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`The domain of $${inv(fn)}$ is the range of $${FN[fn]}$, which is $${DOMAIN[fn]}$.`,
    };
  }),

  b.dynamic('domain-of-shifted-argument', { difficulty: 2, tags: ['domains and ranges'] }, (r) => {
    const fn = r.pick<'sin' | 'cos'>(['sin', 'cos']);
    const a = r.int(2, 5);
    const c = r.nonZero(-5, 5);
    const arg = `${a}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
    const lo = frac(-1 - c, a);
    const hi = frac(1 - c, a);
    const answer = m$(closed(lo, hi));
    const candidates = [
      closed(frac(-1 + c, a), frac(1 + c, a)), // sign slip on the constant
      closed(frac(-1 - c), frac(1 - c)), // forgot to divide by a
      `\\left(${lo.toTex()}, ${hi.toTex()}\\right)`, // endpoints dropped
      UNIT,
    ].map(m$);
    return {
      stem: tex`The domain of $f(x) = ${inv(fn)}(${arg})$ is:`,
      answer,
      distractors: pickDistractors(answer, candidates),
      explanation: tex`$${inv(fn)} t$ is defined for $-1 \le t \le 1$, so $-1 \le ${arg} \le 1 \Rightarrow ${-1 - c} \le ${a}x \le ${1 - c} \Rightarrow ${lo.toTex()} \le x \le ${hi.toTex()}$.`,
    };
  }),

  // ------------------------------------------------------------ inverse identities
  b.dynamic(
    'complementary-inverse',
    { difficulty: 1, origin: 'past-paper', tags: ['inverse identities'] },
    (r) => {
      const [f, g] = r.pick<readonly [TrigFn, TrigFn]>([
        ['sin', 'cos'],
        ['cos', 'sin'],
        ['tan', 'cot'],
        ['cot', 'tan'],
        ['sec', 'csc'],
      ]);
      const n = r.pick([5, 7, 8, 9, 10, 12]);
      const ks: number[] = [];
      for (let k = 1; 2 * k < n; k++) if (gcd(k, n) === 1) ks.push(k);
      const theta = frac(r.pick(ks), n);
      const ans = frac(1, 2).sub(theta);
      const answer = m$(piTex(ans));
      const candidates = [frac(1).sub(theta), frac(1, 2).add(theta), theta, theta.mul(2)].map((t) => m$(piTex(t)));
      return {
        stem: tex`If $${inv(f)} x = ${piTex(theta)}$, then $${inv(g)} x$ equals:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`$${inv(f)} x + ${inv(g)} x = \frac{\pi}{2}$, so $${inv(g)} x = \frac{\pi}{2} - ${piTex(theta)} = ${piTex(ans)}$.`,
      };
    },
  ),

  b.dynamic(
    'ratio-of-inverse',
    { difficulty: 2, tags: ['inverse identities', 'principal values'] },
    (r) => {
      const [p, q, c] = r.pick([
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
        [20, 21, 29],
        [9, 40, 41],
      ] as const);
      const [o, h] = r.chance(0.5) ? [p, q] : [q, p];
      const ratio: Readonly<Record<'sin' | 'cos' | 'tan', Fraction>> = {
        sin: frac(o, c),
        cos: frac(h, c),
        tan: frac(o, h),
      };
      const g = r.pick<'sin' | 'cos' | 'tan'>(['sin', 'cos', 'tan']);
      const f = r.pick((['sin', 'cos', 'tan'] as const).filter((x) => x !== g));
      const given = ratio[g];
      const ans = ratio[f];
      const answer = m$(ans.toTex());
      const pool = [frac(o, c), frac(h, c), frac(o, h), frac(h, o), frac(c, o), frac(c, h)];
      const candidates = [ans.inv(), ...r.shuffle(pool)].map((x) => m$(x.toTex()));
      const sides =
        g === 'sin'
          ? tex`opposite $${o}$, hypotenuse $${c}$, so adjacent $= \sqrt{${c}^2 - ${o}^2} = ${h}$`
          : g === 'cos'
            ? tex`adjacent $${h}$, hypotenuse $${c}$, so opposite $= \sqrt{${c}^2 - ${h}^2} = ${o}$`
            : tex`opposite $${o}$, adjacent $${h}$, so hypotenuse $= \sqrt{${o}^2 + ${h}^2} = ${c}$`;
      return {
        stem: tex`The value of $${FN[f]}\left(${inv(g)} ${given.toTex()}\right)$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`Let $\theta = ${inv(g)} ${given.toTex()}$, an acute angle with $${FN[g]}\,\theta = ${given.toTex()}$. In a right triangle take ${sides}. Hence $${FN[f]}\,\theta = ${ans.toTex()}$.`,
      };
    },
  ),

  b.dynamic('tan-inverse-formula', { difficulty: 2, tags: ['inverse identities'] }, (r) => {
    const isSum = r.chance(0.5);
    let p = r.int(2, 9);
    let q = r.intExcept(2, 9, [p]);
    // Avoid p = 2, q = 3 in a sum: the result tan^-1 1 is better asked as pi/4.
    while (p === q || (isSum && p * q === 6)) {
      p = r.int(2, 9);
      q = r.int(2, 9);
    }
    if (!isSum && p > q) [p, q] = [q, p];
    const pq = p * q;
    const ans = isSum ? frac(p + q, pq - 1) : frac(q - p, pq + 1);
    const wrong = isSum
      ? [frac(p + q, pq + 1), frac(pq - 1, p + q), frac(p + q, pq), frac(1, p + q)]
      : [frac(q - p, pq - 1), frac(pq + 1, q - p), frac(q - p, pq), frac(1, q - p)];
    const answer = m$(tanInvOf(ans));
    const op = isSum ? '+' : '-';
    const work = isSum
      ? tex`\frac{\frac{1}{${p}} + \frac{1}{${q}}}{1 - \frac{1}{${p}} \cdot \frac{1}{${q}}} = \frac{${p} + ${q}}{${pq} - 1}`
      : tex`\frac{\frac{1}{${p}} - \frac{1}{${q}}}{1 + \frac{1}{${p}} \cdot \frac{1}{${q}}} = \frac{${q} - ${p}}{${pq} + 1}`;
    return {
      stem: tex`$\tan^{-1}\left(\frac{1}{${p}}\right) ${op} \tan^{-1}\left(\frac{1}{${q}}\right)$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, wrong.map((w) => m$(tanInvOf(w)))),
      explanation: isSum
        ? tex`$\tan^{-1} x + \tan^{-1} y = \tan^{-1}\frac{x + y}{1 - xy}$ for $xy < 1$. Here the argument is $${work} = ${ans.toTex()}$, so the sum is $${tanInvOf(ans)}$.`
        : tex`$\tan^{-1} x - \tan^{-1} y = \tan^{-1}\frac{x - y}{1 + xy}$. Here the argument is $${work} = ${ans.toTex()}$, so the difference is $${tanInvOf(ans)}$.`,
    };
  }),

  b.dynamic(
    'tan-inverse-sum-pi-by-4',
    { difficulty: 2, origin: 'past-paper', tags: ['inverse identities'] },
    (r) => {
      // 0 < x, y < 1 with (x + y)/(1 - xy) = 1  =>  y = (1 - x)/(1 + x); sum = pi/4.
      const x = r.pick([frac(1, 2), frac(1, 4), frac(1, 5), frac(1, 6), frac(1, 7), frac(2, 5), frac(2, 7), frac(3, 4), frac(3, 5)]);
      const y = frac(1).sub(x).div(frac(1).add(x));
      const top = x.add(y);
      const bottom = frac(1).sub(x.mul(y));
      const answer = m$(ang(45));
      const candidates = [135, 90, 60, -45].map((d) => m$(ang(d)));
      const [first, second] = r.chance(0.5) ? [x, y] : [y, x];
      return {
        stem: tex`The value of $${tanInvOf(first)} + ${tanInvOf(second)}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`With $x = ${first.toTex()}$ and $y = ${second.toTex()}$, $xy = ${x.mul(y).toTex()} < 1$, so $\tan^{-1} x + \tan^{-1} y = \tan^{-1}\frac{x + y}{1 - xy} = \tan^{-1}\frac{${top.toTex()}}{${bottom.toTex()}} = \tan^{-1} 1 = \frac{\pi}{4}$.`,
      };
    },
  ),

  b.dynamic(
    'tan-inverse-sum-special',
    { difficulty: 3, origin: 'past-paper', tags: ['inverse identities', 'principal values'] },
    (r) => {
      // x, y > 1 with (x + y)/(1 - xy) = -1  =>  y = (x + 1)/(x - 1); sum = 3pi/4.
      const x = r.pick([frac(2), frac(3), frac(4), frac(5), frac(6), frac(3, 2), frac(5, 2), frac(4, 3), frac(5, 3), frac(7, 3)]);
      const y = x.add(1).div(x.sub(1));
      const top = x.add(y);
      const bottom = frac(1).sub(x.mul(y));
      const answer = m$(ang(135));
      const candidates = [45, -45, 90, 120].map((d) => m$(ang(d)));
      const [first, second] = r.chance(0.5) ? [x, y] : [y, x];
      return {
        stem: tex`The value of $${tanInvOf(first)} + ${tanInvOf(second)}$ is:`,
        answer,
        distractors: pickDistractors(answer, candidates),
        explanation: tex`With $x = ${first.toTex()}$ and $y = ${second.toTex()}$, $\frac{x + y}{1 - xy} = \frac{${top.toTex()}}{${bottom.toTex()}} = -1$. But $xy = ${x.mul(y).toTex()} > 1$ with $x, y > 0$, so the sum lies in $\left(\frac{\pi}{2}, \pi\right)$, outside the principal range of $\tan^{-1}$. Hence the sum is $\pi - \frac{\pi}{4} = \frac{3\pi}{4}$ (not $-\frac{\pi}{4}$ or $\frac{\pi}{4}$).`,
      };
    },
  ),

  ...b.mcqs([
    {
      id: 'meaning-of-sin-inverse',
      d: 1,
      t: ['principal values'],
      q: tex`For $-1 \le x \le 1$, the symbol $\sin^{-1} x$ denotes:`,
      a: tex`the angle in $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$ whose sine is $x$`,
      x: [tex`the reciprocal $\frac{1}{\sin x}$`, tex`the angle in $\left[0, \pi\right]$ whose sine is $x$`, tex`the value $-\sin x$`],
      e: tex`The $-1$ is not an exponent: $\sin^{-1} x$ is the inverse sine, the unique angle in the principal range $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$ with sine $x$. The reciprocal $\frac{1}{\sin x}$ is $\csc x$; on $\left[0, \pi\right]$ sine is not one-one.`,
    },
    {
      id: 'undefined-inverse-value',
      d: 1,
      t: ['domains and ranges'],
      q: 'Which of the following is NOT defined?',
      a: tex`$\cos^{-1}\left(\frac{3}{2}\right)$`,
      x: [tex`$\sin^{-1}\left(-\frac{1}{2}\right)$`, tex`$\tan^{-1}(100)$`, tex`$\sec^{-1}(3)$`],
      e: tex`The domain of $\cos^{-1}$ is $\left[-1, 1\right]$ and $\frac{3}{2} > 1$. $\tan^{-1}$ is defined for all reals, $\sin^{-1}$ on $\left[-1, 1\right]$ and $\sec^{-1}$ for $|x| \ge 1$, so the other three exist.`,
    },
    {
      id: 'cos-inverse-of-negative',
      d: 1,
      t: ['inverse identities'],
      q: tex`For $-1 \le x \le 1$, $\cos^{-1}(-x)$ is equal to:`,
      a: tex`$\pi - \cos^{-1} x$`,
      x: [tex`$-\cos^{-1} x$`, tex`$\pi + \cos^{-1} x$`, tex`$\frac{\pi}{2} - \cos^{-1} x$`],
      e: tex`If $\theta = \cos^{-1} x \in \left[0, \pi\right]$ then $\cos(\pi - \theta) = -x$ and $\pi - \theta \in \left[0, \pi\right]$, so $\cos^{-1}(-x) = \pi - \cos^{-1} x$. (The rule $f^{-1}(-x) = -f^{-1}(x)$ holds for $\sin^{-1}$ and $\tan^{-1}$, not for $\cos^{-1}$.)`,
    },
    {
      id: 'sin-inverse-equals-cos-inverse',
      d: 2,
      o: 'past-paper',
      t: ['inverse identities'],
      q: tex`If $\sin^{-1} x = \cos^{-1} x$, then $x$ is equal to:`,
      a: tex`$\frac{1}{\sqrt{2}}$`,
      x: [tex`$\frac{1}{2}$`, tex`$\frac{\sqrt{3}}{2}$`, tex`$1$`],
      e: tex`Since $\sin^{-1} x + \cos^{-1} x = \frac{\pi}{2}$, equal parts give $\sin^{-1} x = \frac{\pi}{4}$, so $x = \sin\frac{\pi}{4} = \frac{1}{\sqrt{2}}$.`,
    },
    {
      id: 'difference-of-principal-values',
      d: 2,
      t: ['principal values'],
      q: tex`The value of $\cos^{-1}\left(-\frac{1}{2}\right) - \sin^{-1}\left(-\frac{1}{2}\right)$ is:`,
      a: tex`$\frac{5\pi}{6}$`,
      x: [tex`$\frac{\pi}{2}$`, tex`$-\frac{\pi}{6}$`, tex`$-\frac{\pi}{2}$`],
      e: tex`$\cos^{-1}\left(-\frac{1}{2}\right) = \frac{2\pi}{3}$ (range $\left[0, \pi\right]$) and $\sin^{-1}\left(-\frac{1}{2}\right) = -\frac{\pi}{6}$ (range $\left[-\frac{\pi}{2}, \frac{\pi}{2}\right]$). So the value is $\frac{2\pi}{3} + \frac{\pi}{6} = \frac{5\pi}{6}$.`,
    },
  ]),
]);
