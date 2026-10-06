import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { coefTex, frac, gcd, num, numericOptions, pickDistractors, polyTex, signed, signedSum, surdTex, tex } from '@/engine/helpers';

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

/** Wraps LaTeX in `$...$`. */
const m = (latex: string): string => `$${latex}$`;

/** Option for an indefinite integral: `$<expr> + C$`. */
const plusC = (latex: string): string => `$${latex} + C$`;

/** Exact rational option `$\frac{p}{q}$`. */
const fracOpt = (f: Fraction): string => `$${f.toTex()}$`;

/** Rational multiple of pi in LaTeX: 1/4 -> \frac{\pi}{4}, 2/3 -> \frac{2\pi}{3}, 2 -> 2\pi. */
function piTex(f: Fraction): string {
  if (f.isZero()) return '0';
  const sign = f.sign() < 0 ? '-' : '';
  const top = Math.abs(f.n) === 1 ? '\\pi' : `${Math.abs(f.n)}\\pi`;
  return f.d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${f.d}}`;
}

/** `x - 3`, `x + 2`, `x` (no parentheses) for the linear factor x - r. */
const lin = (r: number): string => (r === 0 ? 'x' : `x ${r > 0 ? '-' : '+'} ${Math.abs(r)}`);

/** `(x - 3)` / `x` for products. */
const par = (r: number): string => (r === 0 ? 'x' : `(${lin(r)})`);

/** `x`, `2x`, `-3x` style argument a·x. */
const ax = (a: number): string => coefTex(a, 'x');

/** Upper limit pi/n: n = 1 gives \pi. */
const piOver = (n: number): string => (n === 1 ? '\\pi' : `\\frac{\\pi}{${n}}`);

/** Multiplier in front of a bracket: 1 -> '', -1 -> '-', 1/3 -> '\frac{1}{3}'. */
const mult = (f: Fraction): string => (f.equals(1) ? '' : f.equals(-1) ? '-' : f.toTex());

export default defineBank('mathematics', 'integration', (b) => [
  /* ------------------------------ antiderivatives ------------------------------ */
  b.dynamic('power-rule-antiderivative', { difficulty: 1, tags: ['antiderivatives'] }, (r) => {
    const n = r.int(2, 6);
    const k = r.nonZero(-5, 5);
    const p = k * (n + 1);
    const q = r.nonZero(-9, 9);
    const up = `x^{${n + 1}}`;
    const integrand = signedSum([[p, `x^{${n}}`], [q, '']]);
    const answer = plusC(signedSum([[k, up], [q, 'x']]));
    const distractors = pickDistractors(answer, [
      plusC(signedSum([[p * n, n - 1 === 1 ? 'x' : `x^{${n - 1}}`]])), // differentiated instead
      plusC(signedSum([[p, up], [q, 'x']])), // forgot to divide by n + 1
      plusC(signedSum([[frac(p, n), up], [q, 'x']])), // divided by n instead of n + 1
      plusC(signedSum([[k, up], [q, '']])), // did not integrate the constant
    ]);
    return {
      stem: tex`$\int \left(${integrand}\right)dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Using $\int x^{n}\,dx = \frac{x^{n+1}}{n+1}$: $\int ${coefTex(p, `x^{${n}}`)}\,dx = \frac{${p}}{${n + 1}}x^{${n + 1}} = ${coefTex(k, up)}$ and $\int ${q}\,dx = ${coefTex(q, 'x')}$. Hence the integral is $${answer.slice(1, -1)}$.`,
    };
  }),

  b.dynamic('standard-results-sum', { difficulty: 1, tags: ['antiderivatives'] }, (r) => {
    const a = r.int(2, 9);
    const bb = r.int(2, 9);
    const c = r.intExcept(2, 9, [bb]);
    const integrand = tex`\frac{${a}}{x} + ${bb}e^{x} + ${c}\cos x`;
    const answer = plusC(tex`${a}\ln|x| + ${bb}e^{x} + ${c}\sin x`);
    const distractors = pickDistractors(answer, [
      plusC(tex`${a}\ln|x| + ${bb}e^{x} - ${c}\sin x`), // sign slip on the cosine
      plusC(tex`-\frac{${a}}{x^{2}} + ${bb}e^{x} - ${c}\sin x`), // differentiated instead
      plusC(tex`${a}\ln|x| + ${bb}xe^{x} + ${c}\sin x`), // treated e^x like a power
      plusC(tex`-\frac{${a}}{x^{2}} + ${bb}e^{x} + ${c}\sin x`),
    ]);
    return {
      stem: tex`$\int \left(${integrand}\right)dx$ equals:`,
      answer,
      distractors,
      explanation: tex`Integrate term by term: $\int \frac{dx}{x} = \ln|x|$, $\int e^{x}\,dx = e^{x}$ and $\int \cos x\,dx = \sin x$. So the result is $${answer.slice(1, -1)}$.`,
    };
  }),

  /* ------------------------------ substitution ------------------------------ */
  b.dynamic('linear-substitution-standard', { difficulty: 1, tags: ['substitution', 'antiderivatives'] }, (r) => {
    const a = r.int(2, 6);
    const c = r.nonZero(-5, 5);
    const inner = `${a}x${signed(c)}`;
    const kind = r.pick(['exp', 'sin', 'cos', 'sec2'] as const);
    const inv = frac(1, a);
    let integrand: string;
    let F: (k: number | Fraction) => string;
    let answer: string;
    let wrong: string[];
    let rule: string;
    if (kind === 'exp') {
      integrand = `e^{${inner}}`;
      F = (k) => coefTex(k, `e^{${inner}}`);
      answer = plusC(F(inv));
      wrong = [plusC(F(a)), plusC(F(1)), plusC(F(inv.neg()))];
      rule = tex`\int e^{t}\,dt = e^{t}`;
    } else if (kind === 'sin') {
      integrand = `\\sin(${inner})`;
      F = (k) => coefTex(k, `\\cos(${inner})`);
      answer = plusC(F(inv.neg()));
      wrong = [plusC(F(inv)), plusC(F(-a)), plusC(F(-1)), plusC(F(a))];
      rule = tex`\int \sin t\,dt = -\cos t`;
    } else if (kind === 'cos') {
      integrand = `\\cos(${inner})`;
      F = (k) => coefTex(k, `\\sin(${inner})`);
      answer = plusC(F(inv));
      wrong = [plusC(F(inv.neg())), plusC(F(a)), plusC(F(1)), plusC(F(-a))];
      rule = tex`\int \cos t\,dt = \sin t`;
    } else {
      integrand = `\\sec^{2}(${inner})`;
      F = (k) => coefTex(k, `\\tan(${inner})`);
      answer = plusC(F(inv));
      wrong = [plusC(F(a)), plusC(F(1)), plusC(F(inv.neg()))];
      rule = tex`\int \sec^{2} t\,dt = \tan t`;
    }
    return {
      stem: tex`$\int ${integrand}\,dx$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, wrong),
      explanation: tex`Put $t = ${inner}$, so $dt = ${a}\,dx$ and $dx = \frac{dt}{${a}}$. Then, since $${rule}$, the integral is $${answer.slice(1, -1)}$ (the factor $\frac{1}{${a}}$ comes from the inner derivative).`,
    };
  }),

  b.dynamic('log-substitution-quotient', { difficulty: 2, origin: 'past-paper', tags: ['substitution'] }, (r) => {
    const p = r.int(1, 6);
    const q = r.int(2, 5);
    const c = r.int(1, 9);
    const den = `${q}x^{2} + ${c}`;
    const L = `\\ln(${den})`;
    const answer = plusC(coefTex(frac(p, 2 * q), L));
    const distractors = pickDistractors(answer, [
      plusC(coefTex(frac(p, q), L)), // forgot the 1/2
      plusC(coefTex(frac(p, 2), L)), // forgot the 1/q
      plusC(coefTex(p, L)), // copied the numerator's coefficient
      plusC(coefTex(frac(2 * p, q), L)), // inverted the factor 2
      plusC(coefTex(frac(p, 4 * q), L)), // halved twice
    ]);
    return {
      stem: tex`$\int \frac{${coefTex(p, 'x')}}{${den}}\,dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Put $t = ${den}$, so $dt = ${2 * q}x\,dx$ and $x\,dx = \frac{dt}{${2 * q}}$. Then $\int \frac{${coefTex(p, 'x')}}{${den}}\,dx = \frac{${p}}{${2 * q}}\int \frac{dt}{t} = ${answer.slice(1, -1)}$ (no modulus needed since $${den} > 0$).`,
    };
  }),

  /* ------------------------------ integration by parts ------------------------------ */
  b.dynamic('by-parts-x-times', { difficulty: 2, origin: 'past-paper', tags: ['integration by parts'] }, (r) => {
    const a = r.int(1, 4);
    const kind = r.pick(['exp', 'sin', 'cos'] as const);
    const A = ax(a);
    const i1 = frac(1, a);
    const i2 = frac(1, a * a);
    let integrand: string;
    let answer: string;
    let wrong: string[];
    let steps: string;
    if (kind === 'exp') {
      const E = `e^{${A}}`;
      integrand = `x${E}`;
      answer = plusC(signedSum([[i1, `x${E}`], [i2.neg(), E]]));
      wrong = [
        plusC(signedSum([[i1, `x${E}`], [i2, E]])), // sign slip
        plusC(coefTex(i1, `x${E}`)), // dropped the second integral
        plusC(coefTex(frac(1, 2), `x^{2}${E}`)), // integrated both factors
        plusC(signedSum([[i1, `x${E}`], [i1.neg(), E]])), // forgot second 1/a
      ];
      steps = tex`Take $u = x$, $dv = ${E}\,dx$, so $v = ${coefTex(i1, E)}$. Then $\int x${E}\,dx = ${coefTex(i1, `x${E}`)} - \int ${coefTex(i1, E)}\,dx = ${answer.slice(1, -1)}$.`;
    } else if (kind === 'sin') {
      const S = `\\sin ${A}`;
      const Co = `\\cos ${A}`;
      integrand = `x${S}`;
      answer = plusC(signedSum([[i1.neg(), `x${Co}`], [i2, S]]));
      wrong = [
        plusC(signedSum([[i1.neg(), `x${Co}`], [i2.neg(), S]])), // sign slip in second term
        plusC(signedSum([[i1, `x${Co}`], [i2, S]])), // forgot that int sin = -cos
        plusC(coefTex(i1.neg(), `x${Co}`)), // dropped the second integral
        plusC(signedSum([[i1.neg(), `x${Co}`], [i1, S]])), // forgot second 1/a
      ];
      steps = tex`Take $u = x$, $dv = ${S}\,dx$, so $v = ${coefTex(i1.neg(), Co)}$. Then $\int x${S}\,dx = ${coefTex(i1.neg(), `x${Co}`)} + \int ${coefTex(i1, Co)}\,dx = ${answer.slice(1, -1)}$.`;
    } else {
      const S = `\\sin ${A}`;
      const Co = `\\cos ${A}`;
      integrand = `x${Co}`;
      answer = plusC(signedSum([[i1, `x${S}`], [i2, Co]]));
      wrong = [
        plusC(signedSum([[i1, `x${S}`], [i2.neg(), Co]])), // sign slip in second term
        plusC(signedSum([[i1.neg(), `x${S}`], [i2, Co]])),
        plusC(coefTex(i1, `x${S}`)), // dropped the second integral
        plusC(signedSum([[i1, `x${S}`], [i1, Co]])), // forgot second 1/a
      ];
      steps = tex`Take $u = x$, $dv = ${Co}\,dx$, so $v = ${coefTex(i1, S)}$. Then $\int x${Co}\,dx = ${coefTex(i1, `x${S}`)} - \int ${coefTex(i1, S)}\,dx = ${answer.slice(1, -1)}$.`;
    }
    return {
      stem: tex`$\int ${integrand}\,dx$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, wrong),
      explanation: tex`Integration by parts: $\int u\,dv = uv - \int v\,du$. ${steps}`,
    };
  }),

  /* ------------------------------ partial fractions ------------------------------ */
  b.dynamic('partial-fractions-quadratic', { difficulty: 2, tags: ['partial fractions in integration'] }, (r) => {
    const q = r.int(-5, 4);
    const d = r.int(1, 5);
    const p = q + d;
    const den = polyTex([1, -(p + q), p * q]);
    const L = `\\ln\\left|\\frac{${lin(p)}}{${lin(q)}}\\right|`;
    const Linv = `\\ln\\left|\\frac{${lin(q)}}{${lin(p)}}\\right|`;
    const Lprod = `\\ln\\left|${par(p)}${par(q)}\\right|`;
    const inv = frac(1, d);
    const scaled = (body: string): string => (d === 1 ? body : tex`${inv.toTex()}\left(${body}\right)`);
    const answer = plusC(coefTex(inv, L));
    const distractors = pickDistractors(answer, [
      plusC(coefTex(inv, Linv)), // fraction inside the log inverted
      plusC(coefTex(d, L)), // inverted the constant
      plusC(coefTex(inv, Lprod)), // added the logs instead of subtracting
      plusC(coefTex(frac(1, 2 * d), L)), // confused with the 1/(2a) formula
    ]);
    return {
      stem: tex`$\int \frac{dx}{${den}}$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$${den} = ${par(p)}${par(q)}$ and $\frac{1}{${par(p)}${par(q)}} = ${scaled(tex`\frac{1}{${lin(p)}} - \frac{1}{${lin(q)}}`)}$. Integrating, $${scaled(tex`\ln|${lin(p)}| - \ln|${lin(q)}|`)} = ${answer.slice(1, -1)}$.`,
    };
  }),

  /* ------------------------------ definite integrals ------------------------------ */
  b.dynamic('definite-polynomial', { difficulty: 1, origin: 'past-paper', tags: ['definite integrals'] }, (r) => {
    const a = r.int(1, 3);
    const bb = r.int(-4, 4);
    const c = r.int(-6, 6);
    const lo = r.pick([0, 0, 1, -1]);
    const hi = lo + r.int(1, 3);
    const F = (x: number): number => a * x ** 3 + bb * x ** 2 + c * x;
    const f = (x: number): number => 3 * a * x ** 2 + 2 * bb * x + c;
    const correct = F(hi) - F(lo);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [
        lo !== 0 ? F(hi) : NaN, // forgot the lower limit
        f(hi) - f(lo), // substituted into the integrand
        F(hi) + F(lo), // added instead of subtracting
        3 * a * (hi ** 3 - lo ** 3) + 2 * bb * (hi ** 2 - lo ** 2) + c * (hi - lo), // did not divide
      ],
      format: (v) => m(num(v)),
      allowNegative: true,
      allowZero: true,
    });
    const P = (x: number): string => (x < 0 ? `(${x})` : String(x));
    return {
      stem: tex`$\int_{${lo}}^{${hi}} \left(${polyTex([3 * a, 2 * bb, c])}\right)dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`An antiderivative is $F(x) = ${polyTex([a, bb, c, 0])}$. So the value is $F(${hi}) - F(${lo}) = ${num(F(hi))} - ${P(F(lo))} = ${num(correct)}$.`,
    };
  }),

  b.dynamic('definite-trig-standard', { difficulty: 1, tags: ['definite integrals'] }, (r) => {
    const a = r.int(1, 5);
    const kind = r.pick(['cos-half', 'sin-full', 'sin-half', 'sec2-quarter'] as const);
    let integrand: string;
    let upper: string;
    let k: number; // the value is k / a
    let work: string;
    const A = ax(a);
    if (kind === 'cos-half') {
      integrand = `\\cos ${A}`;
      upper = piOver(2 * a);
      k = 1;
      work = tex`\left[${coefTex(frac(1, a), `\\sin ${A}`)}\right]_{0}^{${upper}} = ${mult(frac(1, a))}\left(\sin\frac{\pi}{2} - \sin 0\right)`;
    } else if (kind === 'sin-full') {
      integrand = `\\sin ${A}`;
      upper = piOver(a);
      k = 2;
      work = tex`\left[${coefTex(frac(-1, a), `\\cos ${A}`)}\right]_{0}^{${upper}} = ${mult(frac(-1, a))}\left(\cos\pi - \cos 0\right) = ${mult(frac(-1, a))}(-2)`;
    } else if (kind === 'sin-half') {
      integrand = `\\sin ${A}`;
      upper = piOver(2 * a);
      k = 1;
      work = tex`\left[${coefTex(frac(-1, a), `\\cos ${A}`)}\right]_{0}^{${upper}} = ${mult(frac(-1, a))}\left(\cos\frac{\pi}{2} - \cos 0\right)`;
    } else {
      integrand = `\\sec^{2} ${A}`;
      upper = piOver(4 * a);
      k = 1;
      work = tex`\left[${coefTex(frac(1, a), `\\tan ${A}`)}\right]_{0}^{${upper}} = ${mult(frac(1, a))}\left(\tan\frac{\pi}{4} - \tan 0\right)`;
    }
    const v = frac(k, a);
    const answer = fracOpt(v);
    const distractors = pickDistractors(answer, [
      fracOpt(frac(k * a)), // multiplied by a instead of dividing
      fracOpt(v.neg()), // sign slip
      fracOpt(v.mul(2)),
      '$0$',
      fracOpt(frac(k)), // forgot the 1/a factor
    ]);
    return {
      stem: tex`$\int_{0}^{${upper}} ${integrand}\,dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$${work} = ${v.toTex()}$.`,
    };
  }),

  b.dynamic('definite-power-substitution', { difficulty: 2, tags: ['definite integrals', 'substitution'] }, (r) => {
    const n = r.int(1, 6);
    const kind = r.pick(['sin', 'cos', 'ln'] as const);
    const pw = n === 1 ? '' : `^{${n}}`;
    const v = frac(1, n + 1);
    let stem: string;
    let work: string;
    if (kind === 'sin') {
      stem = tex`$\int_{0}^{\frac{\pi}{2}} \sin${pw} x\cos x\,dx$ is equal to:`;
      work = tex`Put $t = \sin x$, $dt = \cos x\,dx$; the limits become $0$ and $1$: $\int_{0}^{1} t${pw}\,dt = \left[\frac{t^{${n + 1}}}{${n + 1}}\right]_{0}^{1}`;
    } else if (kind === 'cos') {
      stem = tex`$\int_{0}^{\frac{\pi}{2}} \cos${pw} x\sin x\,dx$ is equal to:`;
      work = tex`Put $t = \cos x$, $dt = -\sin x\,dx$; the limits become $1$ and $0$: $-\int_{1}^{0} t${pw}\,dt = \int_{0}^{1} t${pw}\,dt = \left[\frac{t^{${n + 1}}}{${n + 1}}\right]_{0}^{1}`;
    } else {
      const lnPow = n === 1 ? '\\ln x' : `(\\ln x)${pw}`;
      stem = tex`$\int_{1}^{e} \frac{${lnPow}}{x}\,dx$ is equal to:`;
      work = tex`Put $t = \ln x$, $dt = \frac{dx}{x}$; the limits become $0$ and $1$: $\int_{0}^{1} t${pw}\,dt = \left[\frac{t^{${n + 1}}}{${n + 1}}\right]_{0}^{1}`;
    }
    const answer = fracOpt(v);
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, [
        fracOpt(frac(1, n)), // lowered the power instead of raising it
        fracOpt(v.neg()), // sign slip / limits not swapped
        fracOpt(frac(1, n + 2)),
        '$0$',
      ]),
      explanation: tex`${work} = ${v.toTex()}$.`,
    };
  }),

  b.dynamic('definite-exp-log', { difficulty: 1, tags: ['definite integrals'] }, (r) => {
    if (r.chance(0.5)) {
      const k = r.int(2, 9);
      const answer = m(String(k - 1));
      return {
        stem: tex`$\int_{0}^{\ln ${k}} e^{x}\,dx$ is equal to:`,
        answer,
        distractors: pickDistractors(answer, [m(String(k)), m(String(k + 1)), m(`\\ln ${k}`), m(String(1 - k))]),
        explanation: tex`$\int_{0}^{\ln ${k}} e^{x}\,dx = \left[e^{x}\right]_{0}^{\ln ${k}} = e^{\ln ${k}} - e^{0} = ${k} - 1 = ${k - 1}$.`,
      };
    }
    const c = r.int(2, 6);
    const n = r.int(2, 5);
    const answer = m(String(c * n));
    const cands = [
      m(coefTex(c, `e^{${n}}`)), // integrated as c e^x
      m(String(c * (n - 1))), // took ln 1 = 1
      m(String(c * n + c)),
      m(String(n)), // forgot the constant c
      m(`-${c * n}`),
    ];
    return {
      stem: tex`$\int_{1}^{e^{${n}}} \frac{${c}}{x}\,dx$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, cands),
      explanation: tex`$\int_{1}^{e^{${n}}} \frac{${c}}{x}\,dx = ${c}\left[\ln x\right]_{1}^{e^{${n}}} = ${c}(${n} - 0) = ${c * n}$.`,
    };
  }),

  b.dynamic('inverse-trig-definite', { difficulty: 2, tags: ['definite integrals', 'antiderivatives'] }, (r) => {
    const a = r.int(2, 6);
    if (r.chance(0.6)) {
      const choice = r.pick([
        { up: `${a}`, n: 4, ang: '\\tan^{-1}1 = \\frac{\\pi}{4}' },
        { up: surdTex(a, 3), n: 3, ang: '\\tan^{-1}\\sqrt{3} = \\frac{\\pi}{3}' },
        // a/sqrt(3), written as a surd when a is a multiple of 3 (6/sqrt(3) = 2 sqrt(3))
        { up: a % 3 === 0 ? surdTex(a / 3, 3) : `\\frac{${a}}{\\sqrt{3}}`, n: 6, ang: '\\tan^{-1}\\frac{1}{\\sqrt{3}} = \\frac{\\pi}{6}' },
      ]);
      const v = frac(1, choice.n * a);
      const answer = m(piTex(v));
      return {
        stem: tex`$\int_{0}^{${choice.up}} \frac{dx}{${a * a} + x^{2}}$ is equal to:`,
        answer,
        distractors: pickDistractors(answer, [
          m(piTex(frac(1, choice.n))), // forgot the 1/a
          m(piTex(frac(a, choice.n))), // multiplied by a
          m(piTex(frac(1, choice.n * a * a))), // used 1/a^2
          m(piTex(frac(1, 2 * choice.n * a))),
        ]),
        explanation: tex`$\int \frac{dx}{a^{2} + x^{2}} = \frac{1}{a}\tan^{-1}\frac{x}{a}$ with $a = ${a}$. So the value is $\frac{1}{${a}}\left(${choice.ang.replace(/ = .*/, '')} - 0\right)$, and $${choice.ang}$, giving $${piTex(v)}$.`,
      };
    }
    // Upper limits a/2, a/sqrt(2), a sqrt(3)/2, simplified when a is even (4/sqrt(2) = 2 sqrt(2)).
    const choice = r.pick([
      { up: frac(a, 2).toTex(), ratio: '\\frac{1}{2}', n: 6, ang: '\\sin^{-1}\\frac{1}{2} = \\frac{\\pi}{6}', wrongN: 3 },
      {
        up: a % 2 === 0 ? surdTex(a / 2, 2) : `\\frac{${a}}{\\sqrt{2}}`,
        ratio: '\\frac{1}{\\sqrt{2}}',
        n: 4,
        ang: '\\sin^{-1}\\frac{1}{\\sqrt{2}} = \\frac{\\pi}{4}',
        wrongN: 2,
      },
      {
        up: a % 2 === 0 ? surdTex(a / 2, 3) : `\\frac{${a}\\sqrt{3}}{2}`,
        ratio: '\\frac{\\sqrt{3}}{2}',
        n: 3,
        ang: '\\sin^{-1}\\frac{\\sqrt{3}}{2} = \\frac{\\pi}{3}',
        wrongN: 6,
      },
    ]);
    const answer = m(piTex(frac(1, choice.n)));
    return {
      stem: tex`$\int_{0}^{${choice.up}} \frac{dx}{\sqrt{${a * a} - x^{2}}}$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, [
        m(piTex(frac(1, choice.n * a))), // inserted a spurious 1/a
        m(piTex(frac(1, choice.wrongN))),
        m(piTex(frac(a, choice.n))), // multiplied by a
        m(piTex(frac(2, choice.n))),
        m(piTex(frac(1, 2 * choice.n))),
        m(piTex(frac(1, 6))),
        m(piTex(frac(1, 3))),
        m(piTex(frac(1, 4))),
        m(piTex(frac(1, 2))),
      ]),
      explanation: tex`$\int \frac{dx}{\sqrt{a^{2} - x^{2}}} = \sin^{-1}\frac{x}{a}$ (no factor $\frac{1}{a}$). With $a = ${a}$, the upper limit $x = ${choice.up}$ gives $\frac{x}{a} = ${choice.ratio}$ and the lower limit gives $\sin^{-1}0 = 0$, so the value is $${choice.ang}$.`,
    };
  }),

  b.dynamic('definite-modulus', { difficulty: 2, tags: ['definite integrals'] }, (r) => {
    if (r.chance(0.5)) {
      const lo = r.int(1, 5);
      const hi = r.int(1, 5);
      const v = frac(lo * lo + hi * hi, 2);
      const answer = fracOpt(v);
      return {
        stem: tex`$\int_{-${lo}}^{${hi}} |x|\,dx$ is equal to:`,
        answer,
        distractors: pickDistractors(answer, [
          fracOpt(frac(hi * hi - lo * lo, 2)), // ignored the modulus
          fracOpt(frac(lo * lo + hi * hi)), // forgot the 1/2
          fracOpt(frac((lo + hi) ** 2, 2)), // squared the length
          fracOpt(frac(Math.abs(hi * hi - lo * lo) + 1, 2)),
          fracOpt(v.add(1)),
        ]),
        explanation: tex`Split at $0$: $\int_{-${lo}}^{0}(-x)\,dx + \int_{0}^{${hi}} x\,dx = \frac{${lo * lo}}{2} + \frac{${hi * hi}}{2} = ${v.toTex()}$.`,
      };
    }
    const k = r.int(1, 6);
    const answer = m(String(k * k));
    return {
      stem: tex`$\int_{0}^{${2 * k}} |x - ${k}|\,dx$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, [
        '$0$', // ignored the modulus
        m(String(2 * k * k)),
        fracOpt(frac(k * k, 2)),
        m(String(4 * k * k)),
      ]),
      explanation: tex`The graph is two triangles, each with base $${k}$ and height $${k}$: $2 \times \frac{1}{2}(${k})(${k}) = ${k * k}$. Ignoring the modulus gives the wrong value $0$ because the two parts cancel.`,
    };
  }),

  /* ------------------------------ area under curves ------------------------------ */
  b.dynamic('area-parabola-line', { difficulty: 2, origin: 'past-paper', tags: ['area under curves'] }, (r) => {
    const a = r.int(1, 6);
    const A = ax(a);
    const region = r.chance(0.5)
      ? { text: tex`the curve $y = ${A} - x^{2}$ and the $x$-axis`, set: tex`$${A} - x^{2} = 0$` }
      : { text: tex`the curve $y = x^{2}$ and the line $y = ${A}$`, set: tex`$x^{2} = ${A}$` };
    const a3 = a ** 3;
    const v = frac(a3, 6);
    const answer = fracOpt(v);
    return {
      stem: tex`The area (in square units) of the region bounded by ${region.text} is:`,
      answer,
      distractors: pickDistractors(answer, [
        fracOpt(frac(a3, 2)), // integrated only the linear term
        fracOpt(frac(a3, 3)), // integrated only the square term
        fracOpt(frac(5 * a3, 6)), // added instead of subtracting
        fracOpt(frac(a3, 12)),
      ]),
      explanation: tex`${region.set} gives $x = 0$ and $x = ${a}$. Area $= \int_{0}^{${a}} \left(${A} - x^{2}\right)dx = \frac{${a}(${a})^{2}}{2} - \frac{(${a})^{3}}{3} = \frac{${a3}}{2} - \frac{${a3}}{3} = ${v.toTex()}$.`,
    };
  }),

  b.dynamic('area-sign-trap', { difficulty: 3, tags: ['area under curves'] }, (r) => {
    const kind = r.pick(['cubic', 'below'] as const);
    if (kind === 'cubic') {
      const k = r.int(1, 4);
      const v = frac(k ** 4, 2);
      const answer = fracOpt(v);
      return {
        stem: tex`The area (in square units) bounded by $y = x^{3}$, the $x$-axis and the lines $x = -${k}$ and $x = ${k}$ is:`,
        answer,
        distractors: pickDistractors(answer, ['$0$', fracOpt(frac(k ** 4, 4)), fracOpt(frac(k ** 4)), fracOpt(frac(k ** 4, 8))]),
        explanation: tex`The curve is below the axis on $[-${k}, 0]$, so area $= 2\int_{0}^{${k}} x^{3}\,dx = 2 \cdot \frac{${k ** 4}}{4} = ${v.toTex()}$. The value $0$ is the definite integral, not the area.`,
      };
    }
    const k = r.int(1, 4);
    const v = frac(4 * k ** 3, 3);
    const answer = fracOpt(v);
    return {
      stem: tex`The area (in square units) of the region bounded by $y = x^{2} - ${k * k}$ and the $x$-axis is:`,
      answer,
      distractors: pickDistractors(answer, [
        fracOpt(v.neg()), // reported the signed integral
        fracOpt(frac(2 * k ** 3, 3)), // used only half the interval
        fracOpt(frac(8 * k ** 3, 3)),
        fracOpt(frac(2 * k ** 3)),
      ]),
      explanation: tex`The curve meets the axis at $x = \pm ${k}$ and lies below it in between. $\int_{-${k}}^{${k}} (x^{2} - ${k * k})\,dx = \frac{${2 * k ** 3}}{3} - ${2 * k ** 3} = -${v.toTex()}$, so the area is $${v.toTex()}$.`,
    };
  }),

  /* ------------------------------ differential equations ------------------------------ */
  b.dynamic('exponential-growth-de', { difficulty: 1, origin: 'past-paper', tags: ['differential equations'] }, (r) => {
    if (r.chance(0.5)) {
      const p = r.nonZero(-4, 4);
      const q = r.intExcept(2, 9, [Math.abs(p)]);
      const ex = (k: number): string => `e^{${ax(k)}}`;
      const answer = m(`y = ${q}${ex(p)}`);
      return {
        stem: tex`The solution of $\frac{dy}{dx} = ${coefTex(p, 'y')}$ with $y(0) = ${q}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m(`y = ${q}${ex(-p)}`), // sign slip
          m(`y = ${coefTex(p, `e^{${q}x}`)}`), // swapped the constants
          m(`y = ${ex(p)} + ${q - 1}`), // added the constant instead of multiplying
          m(`y = ${q} + ${coefTex(p, 'x')}`),
        ]),
        explanation: tex`Separate: $\frac{dy}{y} = ${p === 1 ? '' : p === -1 ? '-' : `${p}\\,`}dx \Rightarrow \ln|y| = ${ax(p)} + c \Rightarrow y = Ae^{${ax(p)}}$. From $y(0) = ${q}$, $A = ${q}$, so $y = ${q}e^{${ax(p)}}$.`,
      };
    }
    const p = r.int(1, 3);
    const q = r.int(2, 6);
    const correct = q * 2 ** p;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [q + 2 ** p - 1, 2 * p * q, 2 ** p, q * p],
      format: (v) => m(num(v)),
    });
    return {
      stem: tex`If $\frac{dy}{dx} = ${coefTex(p, 'y')}$ and $y = ${q}$ when $x = 0$, then the value of $y$ at $x = \ln 2$ is:`,
      answer,
      distractors,
      explanation: tex`The solution is $y = ${q}e^{${ax(p)}}$. At $x = \ln 2$: $y = ${q}e^{${p === 1 ? '' : p}\ln 2}${p === 1 ? '' : ` = ${q}e^{\\ln ${2 ** p}}`} = ${q} \times ${2 ** p} = ${correct}$.`,
    };
  }),

  b.dynamic('separable-de-general', { difficulty: 2, tags: ['differential equations'] }, (r) => {
    let a = r.int(1, 6);
    let bb = r.nonZero(-6, 6);
    while (a === Math.abs(bb) || gcd(a, Math.abs(bb)) !== 1) {
      a = r.int(1, 6);
      bb = r.nonZero(-6, 6);
    }
    const rhs = `${bb < 0 ? '-' : ''}\\frac{${coefTex(Math.abs(bb), 'x')}}{${coefTex(a, 'y')}}`;
    const eq = (terms: ReadonlyArray<readonly [number, string]>): string => m(`${signedSum(terms)} = c`);
    const answer = eq([[a, 'y^{2}'], [-bb, 'x^{2}']]);
    const swapped = bb > 0 ? eq([[bb, 'y^{2}'], [-a, 'x^{2}']]) : eq([[-bb, 'y^{2}'], [a, 'x^{2}']]);
    return {
      stem: tex`The general solution of the differential equation $\frac{dy}{dx} = ${rhs}$ is:`,
      answer,
      distractors: pickDistractors(answer, [
        eq([[a, 'y^{2}'], [bb, 'x^{2}']]), // sign slip when separating
        swapped, // coefficients swapped
        eq([[a, 'y'], [-bb, 'x']]), // forgot to integrate the powers
        eq([[2 * a, 'y^{2}'], [-bb, 'x^{2}']]), // halved only one side
      ]),
      explanation: tex`Separate variables: $${coefTex(a, 'y')}\,dy = ${coefTex(bb, 'x')}\,dx$. Integrating, $\frac{${coefTex(a, 'y^{2}')}}{2} = \frac{${coefTex(bb, 'x^{2}')}}{2} + c_{1}$; multiplying by $2$ and renaming the constant gives $${answer.slice(1, -1)}$.`,
    };
  }),

  /* ------------------------------ fixed items ------------------------------ */
  ...b.mcqs([
    {
      id: 'x-ln-x-by-parts',
      d: 2,
      t: ['integration by parts'],
      q: tex`$\int x\ln x\,dx$ is equal to:`,
      a: tex`$\frac{x^{2}}{2}\ln x - \frac{x^{2}}{4} + C$`,
      x: [
        tex`$\frac{x^{2}}{2}\ln x + \frac{x^{2}}{4} + C$`,
        tex`$\frac{x^{2}}{2}\ln x - \frac{x^{2}}{2} + C$`,
        tex`$x\ln x - x + C$`,
      ],
      e: tex`Take $u = \ln x$, $dv = x\,dx$, $v = \frac{x^{2}}{2}$: $\int x\ln x\,dx = \frac{x^{2}}{2}\ln x - \int \frac{x^{2}}{2}\cdot\frac{1}{x}\,dx = \frac{x^{2}}{2}\ln x - \frac{x^{2}}{4} + C$.`,
    },
  ]),
]);
