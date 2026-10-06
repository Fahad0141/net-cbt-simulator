import { defineBank } from '@/engine/authoring';
import {
  coefTex,
  factorial,
  type Fraction,
  frac,
  num,
  numericOptions,
  pickDistractors,
  polyTex,
  q$,
  signed,
  signedSum,
  tex,
  U,
} from '@/engine/helpers';

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;

export default defineBank('mathematics', 'differentiation', (b) => [
  b.dynamic('power-rule-at-point', { difficulty: 1, tags: ['derivative rules'] }, (r) => {
    const a = r.int(2, 6);
    const n = r.int(2, 4);
    const c1 = r.nonZero(-7, 7);
    const c0 = r.int(-9, 9);
    const k = r.nonZero(-3, 3);
    const f = polyTex([a, ...Array(n - 2).fill(0), c1, c0]);
    const correct = a * n * k ** (n - 1) + c1;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        a * n * k ** n + c1, // forgot to lower the power
        a * k ** (n - 1) + c1, // forgot to multiply by n
        a * k ** n + c1 * k + c0, // evaluated f(k) instead of f'(k)
      ],
      format: (v) => `$${num(v)}$`,
      allowNegative: true,
    });
    return {
      stem: tex`If $f(x) = ${f}$, then $f'(${k})$ equals:`,
      answer,
      distractors,
      explanation: tex`$f'(x) = ${polyTex([a * n, ...Array(n - 2).fill(0), c1].slice(0, n))}$ by the power rule, so $f'(${k}) = ${a * n}(${k})${n - 1 === 1 ? '' : `^{${n - 1}}`}${signed(c1)} = ${num(correct)}$.`,
    };
  }),

  b.dynamic('product-rule-at-point', { difficulty: 2, tags: ['derivative rules'] }, (r) => {
    const a = r.int(1, 3);
    const p = r.nonZero(-5, 5);
    const q = r.nonZero(-5, 5);
    const k = r.nonZero(-3, 3);
    const u = polyTex([a, 0, p]);
    const v = `x${signed(q)}`;
    const uk = a * k * k + p;
    const correct = 2 * a * k * (k + q) + uk;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        2 * a * k, // multiplied the two derivatives
        2 * a * k * (k + q), // kept only u'v
        uk * (k + q), // evaluated f(k)
        uk, // kept only uv'
      ],
      format: (val) => `$${num(val)}$`,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $f(x) = (${u})(${v})$, then $f'(${k})$ is:`,
      answer,
      distractors,
      explanation: tex`Product rule: $f'(x) = ${coefTex(2 * a, 'x')}(${v}) + (${u})(1)$. At $x = ${k}$: $f'(${k}) = ${2 * a}(${k})(${k + q}) + (${uk}) = ${correct}$.`,
    };
  }),

  b.dynamic('chain-rule-trig', { difficulty: 2, origin: 'past-paper', tags: ['chain rule', 'trigonometric and inverse derivatives'] }, (r) => {
    const a = r.int(2, 7);
    const c = r.nonZero(-5, 5);
    const fn = r.pick(['sin', 'cos'] as const);
    const inner = `${a}x^2${signed(c)}`;
    const k = 2 * a;
    const fnTex = fn === 'sin' ? '\\sin' : '\\cos';
    const outer = fn === 'sin' ? '\\cos' : '\\sin';
    const sign = fn === 'sin' ? '' : '-';
    const answer = `$${sign}${coefTex(k, 'x')}${outer}(${inner})$`;
    const distractors = pickDistractors(answer, [
      `$${sign}${outer}(${inner})$`, // forgot the inner derivative
      `$${sign === '-' ? '' : '-'}${coefTex(k, 'x')}${outer}(${inner})$`, // sign slip
      `$${sign}${coefTex(a, 'x')}${outer}(${inner})$`, // forgot the factor 2 from x^2
      `$${coefTex(k, 'x')}${fnTex}(${inner})$`, // did not differentiate the outer function
    ], r);
    return {
      stem: tex`The derivative of $y = ${fnTex}(${inner})$ with respect to $x$ is:`,
      answer,
      distractors,
      explanation: tex`By the chain rule, $\frac{dy}{dx} = ${fn === 'sin' ? '\\cos' : '-\\sin'}(${inner}) \cdot \frac{d}{dx}(${inner}) = ${answer.slice(1, -1)}$.`,
    };
  }),

  b.dynamic('log-exp-chain', { difficulty: 1, tags: ['exponential and logarithmic derivatives', 'chain rule'] }, (r) => {
    const a = r.int(1, 5);
    const c = r.nonZero(-9, 9);
    const inner = `${coefTex(a, 'x^{2}')}${signed(c)}`;
    const two = coefTex(2 * a, 'x');
    const half = coefTex(a, 'x');
    if (r.chance(0.5)) {
      const answer = m(tex`\frac{${two}}{${inner}}`);
      const distractors = pickDistractors(
        answer,
        [
          m(tex`\frac{1}{${inner}}`), // forgot the chain factor
          m(tex`\frac{${half}}{${inner}}`), // lost the 2 from x^2
          m(tex`${two}\ln(${inner})`), // multiplied by ln instead of dividing
          m(tex`\frac{${two}}{(${inner})^{2}}`), // quotient-rule confusion
        ],
        r,
      );
      return {
        stem: tex`If $y = \ln(${inner})$, then $\frac{dy}{dx}$ is:`,
        answer,
        distractors,
        explanation: tex`$\frac{d}{dx}\ln u = \frac{u'}{u}$ with $u = ${inner}$, $u' = ${two}$, so $\frac{dy}{dx} = \frac{${two}}{${inner}}$.`,
      };
    }
    const e = `e^{${inner}}`;
    const answer = m(`${two}${e}`);
    const distractors = pickDistractors(
      answer,
      [
        m(e), // forgot the chain factor
        m(`${half}${e}`), // lost the 2 from x^2
        m(`e^{${two}}`), // differentiated the exponent in place
        m(tex`\frac{${e}}{${two}}`), // divided instead of multiplied
      ],
      r,
    );
    return {
      stem: tex`If $y = ${e}$, then $\frac{dy}{dx}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{d}{dx}e^{u} = e^{u}u'$ with $u = ${inner}$, $u' = ${two}$, so $\frac{dy}{dx} = ${two}${e}$.`,
    };
  }),

  b.dynamic('inverse-trig-chain', { difficulty: 1, tags: ['trigonometric and inverse derivatives', 'chain rule'] }, (r) => {
    const a = r.int(2, 5);
    const a2 = a * a;
    const fn = r.pick(['sin', 'cos', 'tan'] as const);
    const fnTex = fn === 'sin' ? '\\sin^{-1}' : fn === 'cos' ? '\\cos^{-1}' : '\\tan^{-1}';
    const sq = tex`\sqrt{1 - ${a2}x^{2}}`;
    const sqBad = tex`\sqrt{1 - ${a}x^{2}}`;
    const tn = `1 + ${a2}x^{2}`;
    const tnBad = `1 + ${a}x^{2}`;
    const fr = (top: string | number, bottom: string, neg = false): string =>
      m(`${neg ? '-' : ''}\\frac{${top}}{${bottom}}`);
    let answer: string;
    let cands: string[];
    let rule: string;
    if (fn === 'tan') {
      answer = fr(a, tn);
      cands = [fr(1, tn), fr(a, tnBad), fr(a, sq), fr(a, tn, true)];
      rule = tex`\frac{d}{dx}\tan^{-1}u = \frac{u'}{1 + u^{2}}`;
    } else {
      const neg = fn === 'cos';
      answer = fr(a, sq, neg);
      cands = [fr(1, sq, neg), fr(a, sqBad, neg), fr(a, tn, neg), fr(a, sq, !neg)];
      rule = neg ? tex`\frac{d}{dx}\cos^{-1}u = -\frac{u'}{\sqrt{1 - u^{2}}}` : tex`\frac{d}{dx}\sin^{-1}u = \frac{u'}{\sqrt{1 - u^{2}}}`;
    }
    return {
      stem: tex`If $y = ${fnTex}(${a}x)$, then $\frac{dy}{dx}$ is:`,
      answer,
      distractors: pickDistractors(answer, cands, r),
      explanation: tex`$${rule}$ with $u = ${a}x$, $u' = ${a}$ and $u^{2} = ${a2}x^{2}$, giving ${answer}.`,
    };
  }),

  b.dynamic('second-derivative-log', { difficulty: 2, origin: 'past-paper', tags: ['higher derivatives', 'exponential and logarithmic derivatives'] }, (r) => {
    const a = r.int(2, 5);
    const c = r.nonZero(-9, 9);
    const inner = `${a}x${signed(c)}`;
    const sq = `(${inner})^{2}`;
    const answer = m(tex`-\frac{${a * a}}{${sq}}`);
    const distractors = pickDistractors(
      answer,
      [
        m(tex`-\frac{${a}}{${sq}}`), // used the chain factor only once
        m(tex`\frac{${a * a}}{${sq}}`), // sign slip
        m(tex`\frac{${a}}{${inner}}`), // stopped at the first derivative
        m(tex`-\frac{1}{${sq}}`), // ignored the chain rule
      ],
      r,
    );
    return {
      stem: tex`If $y = \ln(${inner})$, then $\frac{d^{2}y}{dx^{2}}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{dy}{dx} = \frac{${a}}{${inner}} = ${a}(${inner})^{-1}$, so $\frac{d^{2}y}{dx^{2}} = -${a}(${inner})^{-2} \cdot ${a} = -\frac{${a * a}}{${sq}}$.`,
    };
  }),

  b.dynamic('exponential-base-a', { difficulty: 1, tags: ['exponential and logarithmic derivatives'] }, (r) => {
    const p = r.pick([2, 3, 5, 7, 10]);
    const lnp = tex`\ln ${p}`;
    if (r.chance(0.6)) {
      const k = r.int(1, 4);
      const ex = `${p}^{${coefTex(k, 'x')}}`;
      const kDot = k === 1 ? '' : tex`${k} \cdot `;
      const answer = m(`${kDot}${ex}${lnp}`);
      const distractors = pickDistractors(
        answer,
        [
          m(tex`${coefTex(k, 'x')} \cdot ${p}^{${coefTex(k, 'x')} - 1}`), // treated it as a power of x
          m(`${kDot}${ex}`), // treated the base as e
          m(tex`\frac{${kDot}${ex}}{${lnp}}`), // divided by ln a
          m(`${ex}${lnp}`), // lost the chain factor
        ],
        r,
      );
      return {
        stem: tex`If $y = ${ex}$, then $\frac{dy}{dx}$ is:`,
        answer,
        distractors,
        explanation: tex`$\frac{d}{dx}a^{u} = a^{u}\ln a \cdot u'$. With $a = ${p}$ and $u = ${coefTex(k, 'x')}$: $\frac{dy}{dx} = ${kDot}${ex}${lnp}$.`,
      };
    }
    const answer = m(tex`\frac{1}{x${lnp}}`);
    const distractors = pickDistractors(
      answer,
      [
        m(tex`\frac{1}{x}`), // treated it as ln x
        m(tex`\frac{${lnp}}{x}`), // multiplied by ln a instead of dividing
        m(tex`\frac{1}{${p}x}`), // divided by the base
        m(tex`\frac{x}{${lnp}}`), // inverted
      ],
      r,
    );
    return {
      stem: tex`If $y = \log_{${p}} x$, then $\frac{dy}{dx}$ is:`,
      answer,
      distractors,
      explanation: tex`Change of base: $\log_{${p}} x = \frac{\ln x}{${lnp}}$, so $\frac{dy}{dx} = \frac{1}{x${lnp}}$.`,
    };
  }),

  b.dynamic('second-derivative-poly', { difficulty: 1, tags: ['higher derivatives'] }, (r) => {
    const a = r.nonZero(-4, 4);
    const bb = r.nonZero(-6, 6);
    const c = r.int(-9, 9);
    const d = r.int(-9, 9);
    const k = r.nonZero(-3, 3);
    const correct = 6 * a * k + 2 * bb;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        3 * a * k * k + 2 * bb * k + c, // stopped at the first derivative
        6 * a * k + bb, // forgot to double the x^2 coefficient
        3 * a * k + 2 * bb, // dropped the factor 2 from x^2 in the second step
        6 * a + 2 * bb, // did not substitute x
      ],
      format: (v) => `$${num(v)}$`,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $y = ${polyTex([a, bb, c, d])}$, then $\frac{d^{2}y}{dx^{2}}$ at $x = ${k}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{dy}{dx} = ${polyTex([3 * a, 2 * bb, c])}$ and $\frac{d^{2}y}{dx^{2}} = ${polyTex([6 * a, 2 * bb])}$. At $x = ${k}$: $${6 * a}(${k})${signed(2 * bb)} = ${correct}$.`,
    };
  }),

  b.dynamic('implicit-xy-slope', { difficulty: 3, origin: 'past-paper', tags: ['implicit differentiation'] }, (r) => {
    let mc: number;
    let x0: number;
    let y0: number;
    let C: number;
    let N: number;
    let D: number;
    do {
      mc = r.pick([1, -1, 3, -3, 4, -4]);
      x0 = r.nonZero(-3, 3);
      y0 = r.nonZero(-3, 3);
      C = x0 * x0 + mc * x0 * y0 + y0 * y0;
      N = 2 * x0 + mc * y0;
      D = mc * x0 + 2 * y0;
    } while (C <= 0 || N === 0 || D === 0 || Math.abs(N) === Math.abs(D));
    const ans = frac(-N, D);
    const answer = m(ans.toTex());
    const distractors = pickDistractors(answer, [
      m(frac(N, D).toTex()), // sign slip
      m(frac(-2 * x0, D).toTex()), // took d(xy)/dx as x dy/dx only
      m(frac(-N, 2 * y0).toTex()), // took d(xy)/dx as y only
      m(frac(-D, N).toTex()), // inverted the ratio
      m(frac(-x0, y0).toTex()), // ignored the xy term
    ]);
    const curve = signedSum([[1, 'x^{2}'], [mc, 'xy'], [1, 'y^{2}']]);
    const mTerm = mc === 1 ? ' + ' : mc === -1 ? ' - ' : signed(mc);
    const mCoef = mc === 1 ? '' : mc === -1 ? '-' : String(mc);
    return {
      stem: tex`For the curve $${curve} = ${C}$, the value of $\frac{dy}{dx}$ at the point $(${x0}, ${y0})$ is:`,
      answer,
      distractors,
      explanation: tex`Differentiate implicitly (product rule on $xy$): $2x${mTerm}\left(y + x\frac{dy}{dx}\right) + 2y\frac{dy}{dx} = 0$, so $\frac{dy}{dx} = -\frac{${signedSum([[2, 'x'], [mc, 'y']])}}{${signedSum([[mc, 'x'], [2, 'y']])}}$. At $(${x0}, ${y0})$: $-\frac{2(${x0})${mTerm}(${y0})}{${mCoef}(${x0}) + 2(${y0})} = ${ans.toTex()}$.`,
    };
  }),

  b.dynamic('parametric-slope', { difficulty: 2, origin: 'past-paper', tags: ['chain rule'] }, (r) => {
    const p = r.int(1, 4);
    const s = r.nonZero(-4, 4);
    const k = r.nonZero(-3, 3);
    const q = r.int(-5, 5);
    const ans = frac(3 * s * k, 2 * p);
    const answer = m(ans.toTex());
    const distractors = pickDistractors(answer, [
      m(frac(2 * p, 3 * s * k).toTex()), // inverted dx/dy
      m(frac(3 * s * k * k, 2 * p).toTex()), // took dx/dt as 2p (lost the t)
      m(frac(-3 * s * k, 2 * p).toTex()), // sign slip
      m(frac(3 * s * k, p).toTex()), // forgot the 2 in dx/dt
      m(frac(3 * s, 2 * p).toTex()), // forgot to substitute t
      m(frac(s * k, p).toTex()), // used y/x-style powers
    ]);
    return {
      stem: tex`If $x = ${polyTex([p, 0, q], 't')}$ and $y = ${coefTex(s, 't^{3}')}$, then $\frac{dy}{dx}$ at $t = ${k}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{dy}{dt} = ${coefTex(3 * s, 't^{2}')}$ and $\frac{dx}{dt} = ${coefTex(2 * p, 't')}$, so $\frac{dy}{dx} = \frac{dy/dt}{dx/dt} = ${coefTex(frac(3 * s, 2 * p), 't')}$. At $t = ${k}$: $\frac{dy}{dx} = ${ans.toTex()}$.`,
    };
  }),

  b.dynamic('tangent-slope-quadratic', { difficulty: 1, tags: ['tangents and normals'] }, (r) => {
    const p = r.nonZero(-6, 6);
    const q = r.int(-9, 9);
    const k = r.nonZero(-4, 4);
    const slope = 2 * k + p;
    const { answer, distractors } = numericOptions(r, {
      correct: slope,
      wrong: [k * k + p * k + q, 2 * k, k + p, 2 * k - p],
      format: (v) => `$${num(v)}$`,
      allowNegative: true,
    });
    return {
      stem: tex`The slope of the tangent to the curve $y = ${polyTex([1, p, q])}$ at $x = ${k}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{dy}{dx} = 2x${signed(p)}$; at $x = ${k}$ the slope is $2(${k})${signed(p)} = ${slope}$.`,
    };
  }),

  b.dynamic('normal-slope', { difficulty: 1, origin: 'past-paper', tags: ['tangents and normals'] }, (r) => {
    const cubic = r.chance(0.5);
    let a: number;
    let bb: number;
    let k: number;
    let slope: number;
    do {
      a = r.nonZero(-3, 3);
      bb = r.int(-6, 6);
      k = r.nonZero(-3, 3);
      slope = cubic ? 3 * a * k * k + bb : 2 * a * k + bb;
    } while (Math.abs(slope) < 2);
    const c = r.int(-9, 9);
    const curve = cubic ? polyTex([a, 0, bb, c]) : polyTex([a, bb, c]);
    const deriv = cubic ? polyTex([3 * a, 0, bb]) : polyTex([2 * a, bb]);
    const bbTerm = bb === 0 ? '' : signed(bb);
    const sub = cubic ? `${3 * a}(${k})^{2}${bbTerm}` : `${2 * a}(${k})${bbTerm}`;
    const ans = frac(-1, slope);
    const answer = m(ans.toTex());
    const distractors = pickDistractors(answer, [
      m(String(slope)), // tangent slope
      m(frac(1, slope).toTex()), // reciprocal without the sign change
      m(String(-slope)), // sign change without the reciprocal
    ]);
    return {
      stem: tex`The slope of the normal to the curve $y = ${curve}$ at $x = ${k}$ is:`,
      answer,
      distractors,
      explanation: tex`$\frac{dy}{dx} = ${deriv}$, so the tangent slope at $x = ${k}$ is $${sub} = ${slope}$. The normal is perpendicular, so its slope is $-\frac{1}{${slope < 0 ? `(${slope})` : slope}}${slope < 0 ? ` = ${ans.toTex()}` : ''}$.`,
    };
  }),

  b.dynamic('local-maximum-value', { difficulty: 3, tags: ['maxima and minima'] }, (r) => {
    const k = r.int(1, 4);
    const mm = r.nonZero(-6, 9);
    const f = polyTex([1, 0, -3 * k * k, mm]);
    const maxValue = 2 * k ** 3 + mm;
    const { answer, distractors } = numericOptions(r, {
      correct: maxValue,
      wrong: [
        -2 * k ** 3 + mm, // local minimum value f(k)
        4 * k ** 3 + mm, // took (-k)^3 as +k^3
        2 * k ** 3, // dropped the constant term
      ],
      format: (v) => `$${num(v)}$`,
      allowNegative: true,
    });
    return {
      stem: tex`The local maximum value of $f(x) = ${f}$ is:`,
      answer,
      distractors,
      explanation: tex`$f'(x) = 3x^2 - ${3 * k * k} = 0 \Rightarrow x = \pm ${k}$. Since $f''(x) = 6x < 0$ at $x = -${k}$, the maximum is $f(-${k}) = -${k ** 3} + ${3 * k ** 3}${signed(mm)} = ${maxValue}$.`,
    };
  }),

  b.dynamic('open-box-maximum', { difficulty: 3, tags: ['maxima and minima'] }, (r) => {
    const k = r.int(2, 8);
    const L = 6 * k;
    const setup = tex`A square sheet of side $${L}\,\mathrm{cm}$ is made into an open box by cutting equal squares of side $x$ from its corners and folding up the sides.`;
    const work = tex`$V = x(${L} - 2x)^{2}$, $\frac{dV}{dx} = (${L} - 2x)(${L} - 6x) = 0 \Rightarrow x = ${3 * k}$ or $x = ${k}$. $x = ${3 * k}$ gives $V = 0$ (minimum); $x = ${k}$ gives the maximum`;
    if (r.chance(0.5)) {
      const { answer, distractors } = numericOptions(r, {
        correct: k,
        wrong: [3 * k, 1.5 * k, 2 * k], // other root L/2, L/4, L/3
        format: (v) => q$(v, U.cm),
      });
      return {
        stem: tex`${setup} The volume is greatest when $x$ equals:`,
        answer,
        distractors,
        explanation: tex`${work}, i.e. $x = \frac{${L}}{6} = ${k}\,\mathrm{cm}$.`,
      };
    }
    const vol = 16 * k ** 3;
    const { answer, distractors } = numericOptions(r, {
      correct: vol,
      wrong: [8 * k ** 3, 25 * k ** 3, 36 * k ** 3], // x = L/3; (L - x)^2 x; L^2 x
      format: (v) => q$(v, U.cm3),
    });
    return {
      stem: tex`${setup} The greatest possible volume of the box is:`,
      answer,
      distractors,
      explanation: tex`${work}: $V = ${k}(${L} - ${2 * k})^{2} = ${k}(${4 * k})^{2} = ${vol}\,\mathrm{cm^{3}}$.`,
    };
  }),

  b.dynamic('maclaurin-first-terms', { difficulty: 2, tags: ['Maclaurin series'] }, (r) => {
    const kind = r.pick(['exp', 'cos', 'sin', 'ln'] as const);
    const a = kind === 'cos' ? r.pick([2, 3]) : kind === 'sin' ? r.pick([2, -2]) : r.pick([2, 3, -2, -3]);
    const ax = coefTex(a, 'x');
    const S = {
      exp: { powers: [0, 1, 2], den: factorial, alt: () => 1, f: `e^{${ax}}`, base: tex`e^{u} = 1 + u + \frac{u^{2}}{2!} + \cdots` },
      cos: { powers: [0, 2, 4], den: factorial, alt: (p: number) => (p % 4 === 0 ? 1 : -1), f: tex`\cos(${ax})`, base: tex`\cos u = 1 - \frac{u^{2}}{2!} + \frac{u^{4}}{4!} - \cdots` },
      sin: { powers: [1, 3, 5], den: factorial, alt: (p: number) => (p % 4 === 1 ? 1 : -1), f: tex`\sin(${ax})`, base: tex`\sin u = u - \frac{u^{3}}{3!} + \frac{u^{5}}{5!} - \cdots` },
      ln: { powers: [1, 2, 3], den: (p: number) => p, alt: (p: number) => (p % 2 === 1 ? 1 : -1), f: tex`\ln(1${signed(a)}x)`, base: tex`\ln(1 + u) = u - \frac{u^{2}}{2} + \frac{u^{3}}{3} - \cdots` },
    }[kind];
    const series = (coef: (p: number) => Fraction): string =>
      m(signedSum(S.powers.map((p) => [coef(p), p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`] as const)));
    const answer = series((p) => frac(S.alt(p) * a ** p, S.den(p)));
    const distractors = pickDistractors(
      answer,
      [
        series((p) => frac(S.alt(p) * a ** p, 1)), // left out the denominators
        series((p) => frac(S.alt(p) * (p === 0 ? 1 : a), S.den(p))), // did not raise a to the powers
        series((p) => (kind === 'exp' ? frac((-a) ** p, S.den(p)) : frac(a ** p, S.den(p)))), // sign pattern wrong
        series((p) => frac(S.alt(p), S.den(p))), // forgot the factor a
        series((p) => frac(S.alt(p) * a ** p, kind === 'ln' ? factorial(p) : Math.max(p, 1))), // mixed up p and p!
      ],
      r,
    );
    return {
      stem: tex`The first three non-zero terms of the Maclaurin series of $${S.f}$ are:`,
      answer,
      distractors,
      explanation: tex`$${S.base}$. Put $u = ${ax}$ (so each $u^{p}$ becomes $(${a})^{p}x^{p}$): ${answer}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'x-to-the-x',
      d: 2,
      o: 'past-paper',
      t: ['exponential and logarithmic derivatives'],
      q: tex`If $y = x^{x}$ $(x > 0)$, then $\frac{dy}{dx}$ is:`,
      a: tex`$x^{x}(1 + \ln x)$`,
      x: [tex`$x \cdot x^{x-1}$`, tex`$x^{x}\ln x$`, tex`$x^{x}(1 - \ln x)$`],
      e: tex`Take logs: $\ln y = x\ln x$. Differentiating, $\frac{1}{y}\frac{dy}{dx} = \ln x + 1$, so $\frac{dy}{dx} = x^{x}(1 + \ln x)$.`,
    },
    {
      id: 'inverse-sin-plus-cos',
      d: 1,
      o: 'past-paper',
      t: ['trigonometric and inverse derivatives'],
      q: tex`$\frac{d}{dx}\left(\sin^{-1}x + \cos^{-1}x\right)$ is equal to:`,
      a: '$0$',
      x: [tex`$\frac{2}{\sqrt{1-x^{2}}}$`, tex`$\frac{\pi}{2}$`, '$1$'],
      e: tex`$\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}$ is a constant, so its derivative is $0$.`,
    },
    {
      id: 'ln-sec-plus-tan',
      d: 2,
      t: ['exponential and logarithmic derivatives', 'trigonometric and inverse derivatives'],
      q: tex`If $y = \ln(\sec x + \tan x)$, then $\frac{dy}{dx}$ equals:`,
      a: tex`$\sec x$`,
      x: [tex`$\tan x$`, tex`$\sec x \tan x$`, tex`$\frac{1}{\sec x + \tan x}$`],
      e: tex`$\frac{dy}{dx} = \frac{\sec x\tan x + \sec^{2}x}{\sec x + \tan x} = \frac{\sec x(\tan x + \sec x)}{\sec x + \tan x} = \sec x$.`,
    },
    {
      id: 'abs-x-at-zero',
      d: 1,
      t: ['derivative rules'],
      q: tex`For $f(x) = |x|$, the derivative $f'(0)$:`,
      a: 'does not exist',
      x: ['is $0$', 'is $1$', 'is $-1$'],
      e: tex`The left-hand derivative at $0$ is $-1$ and the right-hand derivative is $1$; they differ, so $f$ is not differentiable at $x = 0$.`,
    },
  ]),
]);
