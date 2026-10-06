/**
 * Mathematics - Functions and Limits (FSc Part II, chapter 1).
 *
 * Domain and range, composite and inverse functions, even and odd functions, limits by
 * factorisation and at infinity, the standard limits (sin x / x, (1 - cos x) / x^2,
 * (1 + 1/n)^n -> e, (a^x - 1) / x -> ln a) and continuity of piecewise functions.
 *
 * Distractors come from typical slips: the sign of a root, the zero of the numerator taken as a
 * restriction, g(f(x)) for f(g(x)), the reciprocal for the inverse, the inverted ratio b/a for
 * a/b, a lost factor 1/2 or a lost square, e^(a/b) for e^(ab), and 1 for the indeterminate 1^inf.
 */
import { defineBank } from '@/engine/authoring';
import { frac, num, numericOptions, pickDistractors, polyTex, signed, signedSum, tex } from '@/engine/helpers';
import type { Fraction } from '@/engine/helpers';

/** `$\frac{a}{b}$` style option for a Fraction. */
const fx = (f: Fraction): string => `$${f.toTex()}$`;

/** Coefficient-free display: 1 -> '', otherwise the number. */
const coef = (k: number): string => (k === 1 ? '' : String(k));

/** `\frac{n}{d}`, followed by ` = <lowest terms>` when the fraction reduces. */
const ratio = (n: number, d: number): string => {
  const f = frac(n, d);
  const raw = tex`\frac{${n}}{${d}}`;
  return f.n === n && f.d === d ? raw : `${raw} = ${f.toTex()}`;
};

interface ParityItem {
  f: string;
  p: 'even' | 'odd' | 'neither';
  why: string;
}

const PARITY: readonly ParityItem[] = [
  { f: tex`x^{2}\cos x`, p: 'even', why: tex`f(-x) = (-x)^{2}\cos(-x) = x^{2}\cos x = f(x)` },
  { f: tex`x\sin x`, p: 'even', why: tex`f(-x) = (-x)\sin(-x) = (-x)(-\sin x) = x\sin x = f(x)` },
  { f: tex`x^{3}\sin x`, p: 'even', why: tex`f(-x) = (-x^{3})(-\sin x) = x^{3}\sin x = f(x)` },
  { f: tex`e^{x} + e^{-x}`, p: 'even', why: tex`f(-x) = e^{-x} + e^{x} = f(x)` },
  { f: tex`x^{4} - 3x^{2} + 1`, p: 'even', why: tex`f(-x) = (-x)^{4} - 3(-x)^{2} + 1 = x^{4} - 3x^{2} + 1 = f(x)` },
  { f: tex`\sin^{2}x + \cos x`, p: 'even', why: tex`f(-x) = (-\sin x)^{2} + \cos x = f(x)` },
  { f: tex`|x| - x^{2}`, p: 'even', why: tex`f(-x) = |-x| - (-x)^{2} = |x| - x^{2} = f(x)` },
  { f: tex`x^{3} + \sin x`, p: 'odd', why: tex`f(-x) = -x^{3} - \sin x = -f(x)` },
  { f: tex`x\cos x`, p: 'odd', why: tex`f(-x) = (-x)\cos x = -f(x)` },
  { f: tex`x^{2}\sin x`, p: 'odd', why: tex`f(-x) = x^{2}(-\sin x) = -f(x)` },
  { f: tex`x|x|`, p: 'odd', why: tex`f(-x) = (-x)|-x| = -x|x| = -f(x)` },
  { f: tex`e^{x} - e^{-x}`, p: 'odd', why: tex`f(-x) = e^{-x} - e^{x} = -f(x)` },
  { f: tex`\ln\left(\frac{1-x}{1+x}\right)`, p: 'odd', why: tex`f(-x) = \ln\left(\frac{1+x}{1-x}\right) = -\ln\left(\frac{1-x}{1+x}\right) = -f(x)` },
  { f: tex`\tan x - x`, p: 'odd', why: tex`f(-x) = -\tan x + x = -f(x)` },
  { f: tex`\frac{x}{x^{2} + 1}`, p: 'odd', why: tex`f(-x) = \frac{-x}{x^{2} + 1} = -f(x)` },
  { f: tex`x^{2} + x`, p: 'neither', why: tex`f(-x) = x^{2} - x$, which is neither $f(x)$ nor $-f(x) = -x^{2} - x` },
  { f: tex`e^{x}`, p: 'neither', why: tex`f(-x) = e^{-x}$, which equals neither $e^{x}$ nor $-e^{x}` },
  { f: tex`x + \cos x`, p: 'neither', why: tex`f(-x) = -x + \cos x$, which is neither $f(x)$ nor $-f(x) = -x - \cos x` },
  { f: tex`\sin x + \cos x`, p: 'neither', why: tex`f(-x) = -\sin x + \cos x$, which is neither $f(x)$ nor $-f(x)` },
  { f: tex`x^{3} - 2`, p: 'neither', why: tex`f(-x) = -x^{3} - 2$, which is neither $f(x)$ nor $-f(x) = -x^{3} + 2` },
];

const PARITY_TEXT = {
  even: 'an even function',
  odd: 'an odd function',
  neither: 'neither even nor odd',
  both: 'both even and odd',
} as const;

export default defineBank('mathematics', 'functions-limits', (b) => [
  // ---------------------------------------------------------------- domain and range
  b.dynamic('domain-rational', { difficulty: 2, origin: 'past-paper', tags: ['domain and range'] }, (r) => {
    let r1 = 0;
    let r2 = 0;
    let p = 0;
    do {
      r1 = r.nonZero(-6, 6);
      r2 = r.nonZero(-6, 6);
      p = r.nonZero(-7, 7);
    } while (r1 === r2 || r1 + r2 === 0 || p === -r1 || p === -r2);
    const lo = Math.min(r1, r2);
    const hi = Math.max(r1, r2);
    const set = (xs: number[]): string => {
      const s = [...xs].sort((u, v) => u - v);
      return tex`$\mathbb{R} - \{${s.join(', ')}\}$`;
    };
    const answer = set([lo, hi]);
    const distractors = pickDistractors(
      answer,
      [set([-lo, -hi]), set([-p]), set([r.pick([lo, hi])]), tex`$\mathbb{R}$`],
    );
    return {
      stem: tex`The domain of $f(x) = \dfrac{${polyTex([1, p])}}{${polyTex([1, -(r1 + r2), r1 * r2])}}$ is:`,
      answer,
      distractors,
      explanation: tex`$f$ is undefined only where the denominator vanishes: $${polyTex([1, -(r1 + r2), r1 * r2])} = (x${signed(-lo)})(x${signed(-hi)}) = 0 \Rightarrow x = ${lo}$ or $x = ${hi}$. Hence the domain is ${answer}. (The zero of the numerator, $x = ${-p}$, is allowed.)`,
    };
  }),

  b.dynamic('domain-square-root', { difficulty: 1, tags: ['domain and range'] }, (r) => {
    const k = r.int(2, 9);
    const reciprocal = r.chance(0.4);
    const closed = tex`$[-${k}, ${k}]$`;
    const open = tex`$(-${k}, ${k})$`;
    const outsideClosed = tex`$(-\infty, -${k}] \cup [${k}, \infty)$`;
    const outsideOpen = tex`$(-\infty, -${k}) \cup (${k}, \infty)$`;
    const answer = reciprocal ? open : closed;
    const distractors = [
      reciprocal ? closed : open,
      reciprocal ? outsideOpen : outsideClosed,
      reciprocal ? tex`$[0, ${k})$` : tex`$[0, ${k}]$`,
    ];
    const f = reciprocal ? tex`\dfrac{1}{\sqrt{${k * k} - x^{2}}}` : tex`\sqrt{${k * k} - x^{2}}`;
    return {
      stem: tex`The domain of $f(x) = ${f}$ is:`,
      answer,
      distractors,
      explanation: reciprocal
        ? tex`We need $${k * k} - x^{2} > 0$ (strictly, since the root is in the denominator), i.e. $x^{2} < ${k * k}$, so $-${k} < x < ${k}$: the domain is ${open}.`
        : tex`We need $${k * k} - x^{2} \ge 0$, i.e. $x^{2} \le ${k * k}$, so $-${k} \le x \le ${k}$: the domain is ${closed}.`,
    };
  }),

  b.dynamic('range-of-sinusoid', { difficulty: 1, tags: ['domain and range'] }, (r) => {
    const a = r.int(2, 6);
    const s = r.sign();
    const bb = r.nonZero(-5, 5);
    const c = r.int(2, 5);
    const fn = r.pick(['\\sin', '\\cos']);
    const interval = (lo: number, hi: number): string => `$[${lo}, ${hi}]$`;
    const answer = interval(bb - a, bb + a);
    const distractors = pickDistractors(answer, [
      interval(-a, a), // ignored the constant term
      interval(bb - 1, bb + 1), // ignored the amplitude
      interval(bb - c * a, bb + c * a), // multiplied by the frequency
      interval(-1, 1),
    ]);
    return {
      stem: tex`The range of $f(x) = ${bb}${s < 0 ? ' - ' : ' + '}${a}${fn} ${c}x$ is:`,
      answer,
      distractors,
      explanation: tex`Since $-1 \le ${fn} ${c}x \le 1$, the term $${s < 0 ? '-' : ''}${a}${fn} ${c}x$ lies in $[-${a}, ${a}]$; adding $${bb}$ gives the range ${answer}. The factor $${c}$ changes only the period, not the range.`,
    };
  }),

  // ------------------------------------------------------- composite and inverse functions
  b.dynamic('composite-value', { difficulty: 1, origin: 'past-paper', tags: ['composite and inverse functions'] }, (r) => {
    const a = r.int(2, 5);
    const bb = r.nonZero(-6, 6);
    const c = r.nonZero(-5, 5);
    const k = r.nonZero(-3, 3);
    const g = k * k + c;
    const correct = a * g + bb;
    const fk = a * k + bb;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        fk * fk + c, // computed g(f(k))
        a * k * k + c + bb, // forgot to multiply c by a
        fk * g, // multiplied f(k) by g(k)
      ],
      format: (v) => `$${num(v)}$`,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $f(x) = ${polyTex([a, bb])}$ and $g(x) = ${polyTex([1, 0, c])}$, then $(f \circ g)(${k})$ equals:`,
      answer,
      distractors,
      explanation: tex`$(f \circ g)(${k}) = f(g(${k}))$. First $g(${k}) = (${k})^{2}${signed(c)} = ${g}$, then $f(${g}) = ${a}(${g})${signed(bb)} = ${correct}$.`,
    };
  }),

  b.dynamic('composite-expression', { difficulty: 2, tags: ['composite and inverse functions'] }, (r) => {
    let a = 0;
    let bb = 0;
    let c = 0;
    let d = 0;
    do {
      a = r.sign() * r.int(2, 5);
      c = r.sign() * r.int(2, 5);
      bb = r.nonZero(-7, 7);
      d = r.nonZero(-7, 7);
      // a + c = ac (a = c = 2) would make "added the functions" coincide with another option.
    } while (a * d + bb === c * bb + d || a + c === 0 || a + c === a * c);
    const ac = a * c;
    const answer = `$${polyTex([ac, a * d + bb])}$`;
    const distractors = pickDistractors(answer, [
      `$${polyTex([ac, c * bb + d])}$`, // g(f(x))
      `$${polyTex([ac, d + bb])}$`, // forgot to multiply d by a
      `$${polyTex([a + c, bb + d])}$`, // added the functions
      `$${polyTex([ac, a * d])}$`, // dropped b
    ]);
    return {
      stem: tex`If $f(x) = ${polyTex([a, bb])}$ and $g(x) = ${polyTex([c, d])}$, then $f(g(x))$ is:`,
      answer,
      distractors,
      explanation: tex`Replace $x$ in $f$ by $g(x)$: $f(g(x)) = ${a}(${polyTex([c, d])})${signed(bb)} = ${polyTex([ac, a * d])}${signed(bb)} = ${polyTex([ac, a * d + bb])}$. (The option $${polyTex([ac, c * bb + d])}$ is $g(f(x))$.)`,
    };
  }),

  b.dynamic('inverse-linear-or-cubic', { difficulty: 1, origin: 'past-paper', tags: ['composite and inverse functions'] }, (r) => {
    const bb = r.nonZero(-9, 9);
    if (r.chance(0.35)) {
      const answer = tex`$\sqrt[3]{${polyTex([1, -bb])}}$`;
      const distractors = pickDistractors(
        answer,
        [
          tex`$\sqrt[3]{${polyTex([1, bb])}}$`,
          tex`$(${polyTex([1, -bb])})^{3}$`,
          tex`$\dfrac{1}{x^{3}${signed(bb)}}$`,
        ],
        r,
      );
      return {
        stem: tex`If $f(x) = x^{3}${signed(bb)}$, then $f^{-1}(x)$ is:`,
        answer,
        distractors,
        explanation: tex`Put $y = x^{3}${signed(bb)}$, so $x^{3} = ${polyTex([1, -bb], 'y')}$ and $x = \sqrt[3]{${polyTex([1, -bb], 'y')}}$. Interchanging $x$ and $y$: $f^{-1}(x) = \sqrt[3]{${polyTex([1, -bb])}}$. Note $\frac{1}{f(x)}$ is the reciprocal, not the inverse.`,
      };
    }
    const a = r.int(2, 7);
    const answer = tex`$\dfrac{${polyTex([1, -bb])}}{${a}}$`;
    const distractors = pickDistractors(
      answer,
      [
        tex`$\dfrac{${polyTex([1, bb])}}{${a}}$`,
        tex`$\dfrac{1}{${polyTex([a, bb])}}$`,
        tex`$\dfrac{x}{${a}}${signed(-bb)}$`,
        tex`$${polyTex([a, -bb])}$`,
      ],
      r,
    );
    return {
      stem: tex`If $f(x) = ${polyTex([a, bb])}$, then $f^{-1}(x)$ is:`,
      answer,
      distractors,
      explanation: tex`Put $y = ${polyTex([a, bb])}$, so $x = \frac{${polyTex([1, -bb], 'y')}}{${a}}$. Interchanging $x$ and $y$: $f^{-1}(x) = \frac{${polyTex([1, -bb])}}{${a}}$. Check: $f\left(\frac{${polyTex([1, -bb])}}{${a}}\right) = ${polyTex([1, -bb])}${signed(bb)} = x$.`,
    };
  }),

  b.dynamic('inverse-mobius', { difficulty: 2, tags: ['composite and inverse functions'] }, (r) => {
    // f(x) = (ax + b)/(cx + d)  ->  f^-1(x) = (dx - b)/(a - cx)
    type Rat = { n: [number, number]; d: [number, number] }; // n[0] x + n[1] over d[0] x + d[1]
    const ev = (q: Rat, x: number): number => (q.n[0] * x + q.n[1]) / (q.d[0] * x + q.d[1]);
    const same = (p: Rat, q: Rat): boolean =>
      [0.37, 1.91, -2.3, 4.7].every((x) => Math.abs(ev(p, x) - ev(q, x)) < 1e-9);
    const show = (q: Rat): string =>
      tex`$\dfrac{${signedSum([[q.n[0], 'x'], [q.n[1], '']])}}{${signedSum([[q.d[0], 'x'], [q.d[1], '']])}}$`;
    const showRev = (q: Rat): string =>
      tex`$\dfrac{${signedSum([[q.n[0], 'x'], [q.n[1], '']])}}{${signedSum([[q.d[1], ''], [q.d[0], 'x']])}}$`;
    for (;;) {
      const a = r.nonZero(-5, 5);
      const bb = r.nonZero(-6, 6);
      const c = r.int(1, 4);
      const d = r.nonZero(-5, 5);
      if (a * d - bb * c === 0 || a === d || a === -d) continue;
      const correct: Rat = { n: [d, -bb], d: [-c, a] };
      const wrongs: Rat[] = [
        { n: [d, bb], d: [-c, a] }, // sign of b not changed
        { n: [c, d], d: [a, bb] }, // reciprocal
        { n: [a, -bb], d: [-c, d] }, // a and d not interchanged
      ];
      if (wrongs.some((w) => same(w, correct))) continue;
      const answer = showRev(correct);
      const distractors = pickDistractors(answer, [showRev(wrongs[0]!), show(wrongs[1]!), showRev(wrongs[2]!)]);
      const fTex = tex`\dfrac{${polyTex([a, bb])}}{${polyTex([c, d])}}`;
      return {
        stem: tex`If $f(x) = ${fTex}$, $x \ne ${frac(-d, c).toTex()}$, then $f^{-1}(x)$ is:`,
        answer,
        distractors,
        explanation: tex`Put $y = ${fTex}$: $y(${polyTex([c, d])}) = ${polyTex([a, bb])} \Rightarrow x(${coef(c)}y${signed(-a)}) = ${signedSum([[bb, ''], [-d, 'y']])} \Rightarrow x = \frac{${signedSum([[d, 'y'], [-bb, '']])}}{${signedSum([[a, ''], [-c, 'y']])}}$. Interchanging $x$ and $y$ gives ${answer}.`,
      };
    }
  }),

  // --------------------------------------------------------------- even and odd functions
  b.dynamic('even-odd-classify', { difficulty: 1, origin: 'past-paper', tags: ['even and odd functions'] }, (r) => {
    const item = r.pick(PARITY);
    const answer = PARITY_TEXT[item.p];
    const distractors = (['even', 'odd', 'neither', 'both'] as const)
      .filter((k) => k !== item.p)
      .map((k) => PARITY_TEXT[k]);
    return {
      stem: tex`The function $f(x) = ${item.f}$ is:`,
      answer,
      distractors,
      explanation: tex`$${item.why}$. Hence $f$ is ${answer}. (Only $f(x) = 0$ is both even and odd.)`,
    };
  }),

  // ---------------------------------------------------------------------------- limits
  b.dynamic('limit-by-factorising', { difficulty: 1, tags: ['limits'] }, (r) => {
    const n = r.pick([2, 3, 3, 4]);
    const a = n === 4 ? r.int(2, 3) : r.int(2, 5);
    const correct = n * a ** (n - 1);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        a ** (n - 1), // forgot the factor n
        n * a ** n, // wrong power
        (n - 1) * a ** (n - 1),
        0,
      ],
      format: (v) => `$${num(v)}$`,
      allowZero: true,
    });
    const terms = Array.from({ length: n }, (_, i) => `${coef(a ** i)}${n - 1 - i === 0 ? '' : n - 1 - i === 1 ? 'x' : `x^{${n - 1 - i}}`}`)
      .map((t) => (t === '' ? '1' : t))
      .join(' + ');
    return {
      stem: tex`$\displaystyle\lim_{x \to ${a}} \frac{x^{${n}} - ${a ** n}}{x - ${a}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Using $\lim_{x\to a}\frac{x^{n} - a^{n}}{x - a} = na^{n-1}$ (or factorising $x^{${n}} - ${a}^{${n}} = (x - ${a})(${terms})$ and cancelling): the limit is $${n}(${a})${n - 1 === 1 ? '' : `^{${n - 1}}`} = ${correct}$.`,
    };
  }),

  b.dynamic('limit-at-infinity-rational', { difficulty: 1, tags: ['limits'] }, (r) => {
    const a = r.int(1, 9);
    let d = r.int(2, 9);
    while (d === a) d = r.int(2, 9);
    const bb = r.int(-6, 6);
    const c = r.nonZero(-9, 9);
    const e = r.int(-6, 6);
    const f = r.nonZero(-9, 9);
    if (r.chance(0.3)) {
      const num1 = polyTex([bb === 0 ? 1 : bb, c]);
      const lead = bb === 0 ? 1 : bb;
      const answer = '$0$';
      // `$${lead}$` is a last resort for lead = d with c = f, when the first four collapse to {1, inf}.
      const distractors = pickDistractors(answer, [fx(frac(lead, d)), tex`$\infty$`, fx(frac(c, f)), '$1$', `$${lead}$`]);
      return {
        stem: tex`$\displaystyle\lim_{x \to \infty} \frac{${num1}}{${polyTex([d, e, f])}}$ is equal to:`,
        answer,
        distractors,
        explanation: tex`Divide numerator and denominator by $x^{2}$: the numerator becomes $\frac{${lead}}{x}${c < 0 ? ' - ' : ' + '}\frac{${Math.abs(c)}}{x^{2}} \to 0$ while the denominator tends to $${d}$, so the limit is $0$ (the numerator has lower degree than the denominator).`,
      };
    }
    const answer = fx(frac(a, d));
    const distractors = pickDistractors(answer, [fx(frac(d, a)), fx(frac(c, f)), tex`$\infty$`, '$0$', '$1$']);
    return {
      stem: tex`$\displaystyle\lim_{x \to \infty} \frac{${polyTex([a, bb, c])}}{${polyTex([d, e, f])}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Divide numerator and denominator by $x^{2}$; every term with $x$ in the denominator tends to $0$, leaving the ratio of leading coefficients: $${ratio(a, d)}$.`,
    };
  }),

  b.dynamic('limit-sqrt-difference-at-infinity', { difficulty: 3, tags: ['limits'] }, (r) => {
    const a = r.int(2, 10);
    const bb = r.nonZero(-9, 9);
    const half = frac(a, 2);
    const answer = fx(half);
    const distractors = pickDistractors(
      answer,
      [`$${a}$`, '$0$', tex`$\infty$`, `$${2 * a}$`, fx(frac(bb, 2))],
      r,
    );
    return {
      stem: tex`$\displaystyle\lim_{x \to \infty} \left(\sqrt{${polyTex([1, a, bb])}} - x\right)$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Rationalise: $\sqrt{${polyTex([1, a, bb])}} - x = \frac{${polyTex([a, bb])}}{\sqrt{${polyTex([1, a, bb])}} + x}$. Dividing above and below by $x$: $\frac{${a}${bb < 0 ? ' - ' : ' + '}${Math.abs(bb)}/x}{\sqrt{1 + ${a}/x${bb < 0 ? ' - ' : ' + '}${Math.abs(bb)}/x^{2}} + 1} \to ${ratio(a, 2)}$. It is not $0$: the form is $\infty - \infty$.`,
    };
  }),

  // ------------------------------------------------------------------- standard limits
  b.dynamic('limit-sin-ratio', { difficulty: 1, origin: 'past-paper', tags: ['standard limits'] }, (r) => {
    const a = r.int(2, 9);
    let bb = r.int(2, 9);
    while (bb === a) bb = r.int(2, 9);
    const form = r.pick(['sin-x', 'sin-sin', 'tan-x'] as const);
    const expr =
      form === 'sin-x'
        ? tex`\frac{\sin ${a}x}{${bb}x}`
        : form === 'sin-sin'
          ? tex`\frac{\sin ${a}x}{\sin ${bb}x}`
          : tex`\frac{\tan ${a}x}{${bb}x}`;
    const correct = frac(a, bb);
    const answer = fx(correct);
    const distractors = pickDistractors(answer, [fx(frac(bb, a)), '$1$', '$0$', `$${a}$`], r);
    const top = form === 'tan-x' ? '\\tan' : '\\sin';
    const steps =
      form === 'sin-sin'
        ? tex`\frac{\sin ${a}x}{${a}x}\cdot\frac{${bb}x}{\sin ${bb}x}\cdot\frac{${a}}{${bb}} \to 1 \cdot 1 \cdot \frac{${a}}{${bb}}`
        : tex`\frac{${top} ${a}x}{${a}x}\cdot\frac{${a}}{${bb}} \to 1 \cdot \frac{${a}}{${bb}}`;
    return {
      stem: tex`$\displaystyle\lim_{x \to 0} ${expr}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Using $\lim_{\theta\to 0}\frac{${top}\theta}{\theta} = 1$: $${steps} = ${correct.toTex()}$.`,
    };
  }),

  b.dynamic('limit-one-minus-cos', { difficulty: 2, tags: ['standard limits'] }, (r) => {
    const a = r.int(2, 8);
    const k = r.pick([1, 1, 2, 3]);
    const correct = frac(a * a, 2 * k);
    const answer = fx(correct);
    const distractors = pickDistractors(
      answer,
      [fx(frac(a * a, k)), fx(frac(a, 2 * k)), '$0$', fx(frac(a * a, 4 * k))],
      r,
    );
    const half = a % 2 === 0 ? `${a / 2}x` : tex`\frac{${a}x}{2}`;
    const pre = k === 2 ? '' : frac(2, k).toTex();
    return {
      stem: tex`$\displaystyle\lim_{x \to 0} \frac{1 - \cos ${a}x}{${coef(k)}x^{2}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$1 - \cos ${a}x = 2\sin^{2}${half}$, so the expression is $${pre}\left(\frac{\sin ${half}}{x}\right)^{2} \to ${pre}\left(${frac(a, 2).toTex()}\right)^{2} = ${ratio(a * a, 2 * k)}$.`,
    };
  }),

  b.dynamic('limit-e-form', { difficulty: 2, origin: 'past-paper', tags: ['standard limits'] }, (r) => {
    const a = r.int(2, 6);
    let bb = r.int(2, 5);
    while (bb === a) bb = r.int(2, 5);
    const form = r.pick(['inf-plus', 'zero', 'inf-minus'] as const);
    const sgn = form === 'inf-minus' ? -1 : 1;
    const eTo = (f: Fraction): string => `$e^{${f.toTex()}}$`;
    const answer = eTo(frac(sgn * a * bb));
    const distractors = pickDistractors(answer, [
      eTo(frac(sgn * a, bb)), // a/b instead of ab
      form === 'inf-minus' ? eTo(frac(a * bb)) : eTo(frac(a + bb)),
      '$1$', // treated 1^infinity as 1
      eTo(frac(sgn * bb, a)),
    ]);
    const expr =
      form === 'zero'
        ? tex`\lim_{x \to 0}\left(1 + ${a}x\right)^{${bb}/x}`
        : tex`\lim_{x \to \infty}\left(1 ${sgn < 0 ? '-' : '+'} \frac{${a}}{x}\right)^{${bb}x}`;
    const explanation =
      form === 'zero'
        ? tex`Write $(1 + ${a}x)^{${bb}/x} = \left[(1 + ${a}x)^{1/(${a}x)}\right]^{${a * bb}}$. Since $(1 + t)^{1/t} \to e$ as $t \to 0$, the limit is $e^{${a * bb}}$.`
        : tex`Write $\left(1 ${sgn < 0 ? '-' : '+'} \frac{${a}}{x}\right)^{${bb}x} = \left[\left(1 ${sgn < 0 ? '-' : '+'} \frac{${a}}{x}\right)^{${sgn < 0 ? '-' : ''}x/${a}}\right]^{${sgn * a * bb}}$. Since $\left(1 + \frac{1}{n}\right)^{n} \to e$, the limit is $e^{${sgn * a * bb}}$.`;
    return {
      stem: tex`$\displaystyle${expr}$ is equal to:`,
      answer,
      distractors,
      explanation,
    };
  }),

  b.dynamic('limit-exponential-log', { difficulty: 2, tags: ['standard limits'] }, (r) => {
    const bases = [2, 3, 5, 7];
    if (r.chance(0.5)) {
      const a = r.pick(bases);
      const k = r.int(2, 5);
      const answer = `$${k}\\ln ${a}$`;
      const distractors = [`$\\ln ${a}$`, tex`$\frac{\ln ${a}}{${k}}$`, tex`$\frac{${k}}{\ln ${a}}$`];
      return {
        stem: tex`$\displaystyle\lim_{x \to 0} \frac{${a}^{${k}x} - 1}{x}$ is equal to:`,
        answer,
        distractors,
        explanation: tex`Using $\lim_{t\to 0}\frac{a^{t} - 1}{t} = \ln a$ with $t = ${k}x$: $\frac{${a}^{${k}x} - 1}{x} = ${k}\cdot\frac{${a}^{${k}x} - 1}{${k}x} \to ${k}\ln ${a}$.`,
      };
    }
    const [p, q] = r.sample(bases, 2) as [number, number];
    const answer = tex`$\ln\frac{${p}}{${q}}$`;
    const distractors = [tex`$\ln\frac{${q}}{${p}}$`, `$\\ln ${p * q}$`, tex`$\frac{\ln ${p}}{\ln ${q}}$`];
    return {
      stem: tex`$\displaystyle\lim_{x \to 0} \frac{${p}^{x} - ${q}^{x}}{x}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Split: $\frac{${p}^{x} - 1}{x} - \frac{${q}^{x} - 1}{x} \to \ln ${p} - \ln ${q} = \ln\frac{${p}}{${q}}$, using $\lim_{x\to 0}\frac{a^{x} - 1}{x} = \ln a$.`,
    };
  }),

  // ------------------------------------------------------------------------ continuity
  b.dynamic('continuity-find-k', { difficulty: 2, tags: ['continuity'] }, (r) => {
    const c = r.pick([1, 2, 3, -1, -2, -3]);
    const k = r.nonZero(-5, 5);
    const q = r.nonZero(-6, 6);
    const p = k * c + q - c * c;
    const correct = frac(k);
    const answer = fx(correct);
    const distractors = pickDistractors(answer, [
      fx(frac(c * c + p + q, c)), // sign slip on q
      fx(frac(c * c + p - q)), // forgot to divide by c
      fx(frac(c + p - q, c)), // forgot to square c
      fx(frac(-k)),
      fx(frac(k + 1)),
      fx(frac(k - 1)),
      fx(frac(2 * k)),
    ]);
    return {
      stem: tex`The function $f(x) = \begin{cases} kx${signed(q)}, & x < ${c} \\ ${polyTex([1, 0, p])}, & x \ge ${c} \end{cases}$ is continuous at $x = ${c}$. The value of $k$ is:`,
      answer,
      distractors,
      explanation: tex`Continuity requires the left limit to equal $f(${c})$: $k(${c})${signed(q)} = (${c})^{2}${p === 0 ? '' : signed(p)} = ${c * c + p}$. So $${c}k = ${c * c + p - q}$ and $k = ${correct.toTex()}$.`,
    };
  }),

  // ------------------------------------------------------------------- fixed questions
  ...b.mcqs([
    {
      id: 'sin-x-over-x-at-infinity',
      d: 2,
      t: ['limits'],
      q: tex`$\displaystyle\lim_{x \to \infty} \frac{\sin x}{x}$ is equal to:`,
      a: '$0$',
      x: ['$1$', tex`$\infty$`, 'does not exist'],
      e: tex`$\left|\frac{\sin x}{x}\right| \le \frac{1}{x} \to 0$ as $x \to \infty$, so the limit is $0$. The standard result $\frac{\sin x}{x} \to 1$ holds only as $x \to 0$.`,
    },
    {
      id: 'abs-x-over-x-at-zero',
      d: 2,
      o: 'past-paper',
      t: ['limits', 'continuity'],
      q: tex`$\displaystyle\lim_{x \to 0} \frac{|x|}{x}$:`,
      a: 'does not exist',
      x: ['is $1$', 'is $-1$', 'is $0$'],
      e: tex`For $x > 0$, $\frac{|x|}{x} = 1$; for $x < 0$, $\frac{|x|}{x} = -1$. The right-hand limit $1$ and left-hand limit $-1$ differ, so the limit does not exist.`,
    },
    {
      id: 'x-sin-reciprocal-at-zero',
      d: 3,
      t: ['limits'],
      q: tex`$\displaystyle\lim_{x \to 0} x\sin\frac{1}{x}$ is equal to:`,
      a: '$0$',
      x: ['$1$', tex`$\infty$`, 'does not exist'],
      e: tex`$\left|x\sin\frac{1}{x}\right| \le |x| \to 0$, so by the squeeze (sandwich) theorem the limit is $0$. It is not $1$: the standard result needs the angle itself to tend to $0$, but here $\frac{1}{x} \to \infty$.`,
    },
    {
      id: 'triple-composition-identity',
      d: 3,
      t: ['composite and inverse functions'],
      q: tex`If $f(x) = \dfrac{1}{1 - x}$, $x \ne 0, 1$, then $f(f(f(x)))$ is:`,
      a: '$x$',
      x: [tex`$\dfrac{1}{1 - x}$`, tex`$\dfrac{x - 1}{x}$`, tex`$\dfrac{1}{(1 - x)^{3}}$`],
      e: tex`$f(f(x)) = \frac{1}{1 - \frac{1}{1-x}} = \frac{1 - x}{-x} = \frac{x - 1}{x}$, and then $f\left(\frac{x-1}{x}\right) = \frac{1}{1 - \frac{x-1}{x}} = \frac{1}{1/x} = x$.`,
    },
    {
      id: 'greatest-integer-discontinuity',
      d: 2,
      t: ['continuity'],
      q: tex`The greatest integer function $f(x) = [x]$ is discontinuous at:`,
      a: 'every integer',
      x: ['$x = 0$ only', 'no real number', 'every non-integer real number'],
      e: tex`At an integer $n$, $\lim_{x\to n^{-}}[x] = n - 1$ while $\lim_{x\to n^{+}}[x] = n$, so there is a jump. Between consecutive integers $[x]$ is constant, hence continuous.`,
    },
    {
      id: 'range-of-exponential',
      d: 1,
      t: ['domain and range'],
      q: tex`The range of $f(x) = e^{x}$, $x \in \mathbb{R}$, is:`,
      a: tex`$(0, \infty)$`,
      x: [tex`$(-\infty, \infty)$`, tex`$[0, \infty)$`, tex`$[1, \infty)$`],
      e: tex`$e^{x} > 0$ for every real $x$ and takes every positive value ($e^{x} \to 0$ as $x \to -\infty$ but never reaches $0$), so the range is $(0, \infty)$.`,
    },
    {
      id: 'e-as-a-limit',
      d: 1,
      o: 'past-paper',
      t: ['standard limits'],
      q: tex`$\displaystyle\lim_{n \to \infty} \left(1 + \frac{1}{n}\right)^{n}$ is equal to:`,
      a: '$e$',
      x: ['$1$', tex`$\infty$`, '$0$'],
      e: tex`This is the definition of $e \approx 2.718$. It is an indeterminate $1^{\infty}$ form, so the answer is not $1$.`,
    },
    {
      id: 'product-of-odd-functions',
      d: 1,
      t: ['even and odd functions'],
      q: tex`If $f$ and $g$ are both odd functions, then $h(x) = f(x)\,g(x)$ is:`,
      a: 'an even function',
      x: ['an odd function', 'neither even nor odd in general', 'a constant function'],
      e: tex`$h(-x) = f(-x)\,g(-x) = (-f(x))(-g(x)) = f(x)\,g(x) = h(x)$, so $h$ is even (for example $x \cdot \sin x$).`,
    },
    {
      id: 'sin-of-degrees-limit',
      d: 3,
      o: 'past-paper',
      t: ['standard limits'],
      q: tex`$\displaystyle\lim_{x \to 0} \frac{\sin x^{\circ}}{x}$ is equal to:`,
      a: tex`$\dfrac{\pi}{180}$`,
      x: ['$1$', tex`$\dfrac{180}{\pi}$`, '$0$'],
      e: tex`$x^{\circ} = \frac{\pi x}{180}$ radians, so $\frac{\sin x^{\circ}}{x} = \frac{\sin(\pi x/180)}{\pi x/180}\cdot\frac{\pi}{180} \to \frac{\pi}{180}$.`,
    },
    {
      id: 'log-one-plus-x-limit',
      d: 1,
      t: ['standard limits'],
      q: tex`$\displaystyle\lim_{x \to 0} \frac{\ln(1 + x)}{x}$ is equal to:`,
      a: '$1$',
      x: ['$0$', '$e$', 'does not exist'],
      e: tex`$\frac{\ln(1+x)}{x} = \ln\left[(1 + x)^{1/x}\right] \to \ln e = 1$, since $(1 + x)^{1/x} \to e$ as $x \to 0$.`,
    },
  ]),
]);
