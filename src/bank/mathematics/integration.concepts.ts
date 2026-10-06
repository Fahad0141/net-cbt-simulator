import { defineBank } from '@/engine/authoring';
import { frac, numericOptions, pickDistractors, polyTex, statementQuestion, tex, texOf } from '@/engine/helpers';

/**
 * Integration, part B: concepts, properties of definite integrals, standard results,
 * area interpretation and differential-equation basics. Every local id starts with `c-`
 * so it never collides with the computational part A (`integration.ts`).
 */

interface ExpPair {
  /** Integrand inside e^x( ... ), already including e^{x}. */
  integrand: string;
  /** Correct antiderivative e^x f(x). */
  ans: string;
  /** e^x f'(x): "integrated only the second part". */
  fpTerm: string;
  /** e^x (f - f'): sign slip. */
  diff: string;
}

const EXP_PAIRS: readonly ExpPair[] = [
  {
    integrand: tex`e^{x}(\sin x + \cos x)`,
    ans: tex`e^{x}\sin x`,
    fpTerm: tex`e^{x}\cos x`,
    diff: tex`e^{x}(\sin x - \cos x)`,
  },
  {
    integrand: tex`e^{x}(\cos x - \sin x)`,
    ans: tex`e^{x}\cos x`,
    fpTerm: tex`-e^{x}\sin x`,
    diff: tex`e^{x}(\cos x + \sin x)`,
  },
  {
    integrand: tex`e^{x}(\tan x + \sec^{2}x)`,
    ans: tex`e^{x}\tan x`,
    fpTerm: tex`e^{x}\sec^{2}x`,
    diff: tex`e^{x}(\tan x - \sec^{2}x)`,
  },
  {
    integrand: tex`e^{x}\sec x(1 + \tan x)`,
    ans: tex`e^{x}\sec x`,
    fpTerm: tex`e^{x}\sec x\tan x`,
    diff: tex`e^{x}\sec x(1 - \tan x)`,
  },
  {
    integrand: tex`e^{x}\left(\ln x + \frac{1}{x}\right)`,
    ans: tex`e^{x}\ln x`,
    fpTerm: tex`\frac{e^{x}}{x}`,
    diff: tex`e^{x}\left(\ln x - \frac{1}{x}\right)`,
  },
  {
    integrand: tex`e^{x}\left(\frac{1}{x} - \frac{1}{x^{2}}\right)`,
    ans: tex`\frac{e^{x}}{x}`,
    fpTerm: tex`-\frac{e^{x}}{x^{2}}`,
    diff: tex`e^{x}\left(\frac{1}{x} + \frac{1}{x^{2}}\right)`,
  },
  {
    integrand: tex`e^{x}\left(\sin^{-1}x + \frac{1}{\sqrt{1 - x^{2}}}\right)`,
    ans: tex`e^{x}\sin^{-1}x`,
    fpTerm: tex`\frac{e^{x}}{\sqrt{1 - x^{2}}}`,
    diff: tex`e^{x}\left(\sin^{-1}x - \frac{1}{\sqrt{1 - x^{2}}}\right)`,
  },
  ...[2, 3, 4].map(
    (n): ExpPair => ({
      integrand: `e^{x}(x^{${n}} + ${n}x${n - 1 === 1 ? '' : `^{${n - 1}}`})`,
      ans: `x^{${n}}e^{x}`,
      fpTerm: `${n}x${n - 1 === 1 ? '' : `^{${n - 1}}`}e^{x}`,
      diff: `e^{x}(x^{${n}} - ${n}x${n - 1 === 1 ? '' : `^{${n - 1}}`})`,
    }),
  ),
];

interface FtcFn {
  /** f(t) as written in the integrand. */
  ft: string;
  /** f evaluated at an expression u (u is LaTeX such as x^{2}). */
  at: (u: string) => string;
  /** A typical wrong answer (f differentiated too, or F itself returned). */
  wrongDeriv: (coef: string, u: string, lower: number) => string;
  /** coef times f(u), when plain juxtaposition would look clumsy. */
  times?: (coef: string, u: string) => string;
  /** f(t) is undefined for t <= -1, so an odd power x^3 needs x > 0 stated. */
  needsPositive?: boolean;
}

const FTC_FNS: readonly FtcFn[] = [
  { ft: tex`\cos t`, at: (u) => `\\cos(${u})`, wrongDeriv: (c, u) => `-${c}\\sin(${u})` },
  { ft: tex`\sin t`, at: (u) => `\\sin(${u})`, wrongDeriv: (c, u) => `${c}\\cos(${u})` },
  { ft: tex`e^{t}`, at: (u) => `e^{${u}}`, wrongDeriv: (_c, u, lo) => `e^{${u}} - ${lo === 0 ? '1' : lo === 1 ? 'e' : `e^{${lo}}`}` },
  { ft: tex`\sqrt{1 + t}`, at: (u) => `\\sqrt{1 + ${u}}`, wrongDeriv: (_c, u) => `\\frac{1}{2\\sqrt{1 + ${u}}}`, needsPositive: true },
  { ft: tex`\frac{1}{1 + t}`, at: (u) => `\\frac{1}{1 + ${u}}`, wrongDeriv: (c, u) => `-\\frac{${c}}{(1 + ${u})^{2}}`, times: (c, u) => `\\frac{${c}}{1 + ${u}}`, needsPositive: true },
];

export default defineBank('mathematics', 'integration', (b) => [
  // ---------------------------------------------------------------- dynamic (parametric)

  b.dynamic('c-odd-part-vanishes', { difficulty: 2, origin: 'past-paper', tags: ['definite integrals'] }, (r) => {
    const a = r.int(1, 4);
    const top = r.pick([3, 5]);
    const p = r.nonZero(-4, 4);
    const q = r.nonZero(-6, 6);
    const c = r.nonZero(-6, 6);
    const coeffs = Array<number>(top + 1).fill(0);
    coeffs[0] = p;
    coeffs[top - 1] = q;
    coeffs[top] = c;
    const integrand = polyTex(coeffs);
    const correct = 2 * a * c;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [0, a * c, -correct, 4 * a * c],
      format: (v) => `$${v}$`,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`$\displaystyle\int_{-${a}}^{${a}}\left(${integrand}\right)dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`$${polyTex([...coeffs.slice(0, top), 0])}$ is an odd function, so its integral over $[-${a}, ${a}]$ is $0$. Only the constant contributes: $\int_{-${a}}^{${a}} (${c})\,dx = (${c})(2 \times ${a}) = ${correct}$.`,
    };
  }),

  b.dynamic('c-limit-properties', { difficulty: 1, tags: ['definite integrals'] }, (r) => {
    if (r.chance(0.5)) {
      const lo = r.int(-2, 3);
      const hi = lo + r.int(1, 5);
      const m = r.nonZero(-9, 9);
      const k = r.int(2, 5);
      const correct = -k * m;
      const { answer, distractors } = numericOptions(r, {
        correct,
        wrong: [k * m, -m, m],
        format: (v) => `$${v}$`,
        allowNegative: true,
      });
      return {
        stem: tex`If $\int_{${lo}}^{${hi}} f(x)\,dx = ${m}$, then $\int_{${hi}}^{${lo}} ${k}f(x)\,dx$ equals:`,
        answer,
        distractors,
        explanation: tex`Interchanging the limits changes the sign and a constant factor comes out: $\int_{${hi}}^{${lo}} ${k}f(x)\,dx = -${k}\int_{${lo}}^{${hi}} f(x)\,dx = -${k}(${m}) = ${correct}$.`,
      };
    }
    const a = r.int(-2, 2);
    const mid = a + r.int(1, 4);
    const end = mid + r.int(1, 4);
    const s = r.nonZero(-12, 12);
    const p = r.intExcept(-9, 9, [0, s]);
    const correct = s - p;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [s + p, p - s, s],
      format: (v) => `$${v}$`,
      allowNegative: true,
      allowZero: true,
    });
    return {
      stem: tex`If $\int_{${a}}^{${end}} f(x)\,dx = ${s}$ and $\int_{${a}}^{${mid}} f(x)\,dx = ${p}$, then $\int_{${mid}}^{${end}} f(x)\,dx$ is:`,
      answer,
      distractors,
      explanation: tex`By additivity, $\int_{${a}}^{${end}} f\,dx = \int_{${a}}^{${mid}} f\,dx + \int_{${mid}}^{${end}} f\,dx$, so $\int_{${mid}}^{${end}} f\,dx = ${s} - (${p}) = ${correct}$.`,
    };
  }),

  b.dynamic('c-ftc-variable-limit', { difficulty: 2, tags: ['definite integrals', 'antiderivatives'] }, (r) => {
    const fn = r.pick(FTC_FNS);
    const k = r.pick([2, 3]);
    const lower = r.int(0, 3);
    const u = `x^{${k}}`;
    const coef = k === 2 ? '2x' : '3x^{2}';
    const times = (v: string): string => (fn.times ? fn.times(coef, v) : `${coef}${fn.at(v)}`);
    const answer = `$${times(u)}$`;
    const distractors = pickDistractors(answer, [
      `$${fn.at(u)}$`, // lost the chain-rule factor
      `$${times('x')}$`, // substituted x instead of x^k
      `$${fn.wrongDeriv(coef, u, lower)}$`, // differentiated f too, or wrote F(x) itself
    ]);
    const domain = fn.needsPositive && k === 3 ? tex` for $x > 0$` : '';
    return {
      stem: tex`If $F(x) = \int_{${lower}}^{${u}} ${fn.ft}\,dt$${domain}, then $F'(x)$ is:`,
      answer,
      distractors,
      explanation: tex`By the fundamental theorem with the chain rule, $\frac{d}{dx}\int_{a}^{g(x)} f(t)\,dt = f(g(x))\,g'(x)$. Here $g(x) = ${u}$, $g'(x) = ${coef}$, so $F'(x) = ${times(u)}$ (the constant lower limit contributes nothing).`,
    };
  }),

  b.dynamic('c-area-vs-signed-integral', { difficulty: 2, origin: 'past-paper', tags: ['area under curves', 'definite integrals'] }, (r) => {
    const fn = r.pick(['sin', 'cos'] as const);
    // For sin x on [0, pi] the curve never dips below the axis, so the signed-integral trap
    // only exists from n = 2; cos x already changes sign on [0, pi].
    const n = fn === 'sin' ? r.int(2, 4) : r.int(1, 4);
    const fTex = fn === 'sin' ? '\\sin' : '\\cos';
    const upper = n === 1 ? '\\pi' : `${n}\\pi`;
    const piece =
      fn === 'sin'
        ? tex`$\int_{0}^{\pi} \sin x\,dx = 2$`
        : tex`$\int_{0}^{\pi/2} \cos x\,dx + \left|\int_{\pi/2}^{\pi} \cos x\,dx\right| = 1 + 1 = 2$`;
    const signedValue = fn === 'sin' ? (n % 2 === 1 ? 2 : 0) : 0;
    const correct = 2 * n;
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [signedValue, n, 4 * n, n + 1],
      format: (v) => `$${v}$ square units`,
      allowZero: true,
    });
    return {
      stem: tex`The area of the region bounded by $y = ${fTex} x$, the $x$-axis and the lines $x = 0$ and $x = ${upper}$ is:`,
      answer,
      distractors,
      explanation: tex`Area uses $|${fTex} x|$: every interval of length $\pi$ contributes area $2$ (on $[0, \pi]$: ${piece}). Over $[0, ${upper}]$ the area is $${n} \times 2 = ${correct}$. The plain integral $\int_{0}^{${upper}} ${fTex} x\,dx = ${signedValue}$ is not the area, because parts below the axis count as negative.`,
    };
  }),

  b.dynamic('c-ex-f-plus-fprime', { difficulty: 2, origin: 'past-paper', tags: ['antiderivatives', 'integration by parts'] }, (r) => {
    const e = r.pick(EXP_PAIRS);
    const answer = `$${e.ans} + c$`;
    const distractors = pickDistractors(
      answer,
      [`$${e.fpTerm} + c$`, `$${e.diff} + c$`, `$-${e.ans} + c$`, `$${e.integrand} + c$`],
      r,
    );
    return {
      stem: tex`$\int ${e.integrand}\,dx$ is equal to:`,
      answer,
      distractors,
      explanation: tex`Use the standard result $\int e^{x}\left[f(x) + f'(x)\right]dx = e^{x}f(x) + c$, since $\frac{d}{dx}\left[e^{x}f(x)\right] = e^{x}f(x) + e^{x}f'(x)$. Here the integral is $${e.ans} + c$.`,
    };
  }),

  b.dynamic('c-de-order-degree', { difficulty: 1, tags: ['differential equations'] }, (r) => {
    const n = r.pick([2, 3]);
    const p = r.int(1, 4);
    const q = r.intExcept(1, 5, [p]);
    const d = (order: number): string => (order === 1 ? '\\frac{dy}{dx}' : `\\frac{d^{${order}}y}{dx^{${order}}}`);
    const pow = (body: string, e: number): string => (e === 1 ? body : `\\left(${body}\\right)^{${e}}`);
    const high = pow(d(n), p);
    const low = pow(d(n - 1), q);
    const tail = r.pick(['xy', 'y', '\\sin x', 'x^{2}']);
    const lhs = r.chance(0.5) ? `${low} + ${high} + ${tail}` : `${high} + ${low} - ${tail}`;
    const opt = (o: number, g: number): string => `order $${o}$, degree $${g}$`;
    const answer = opt(n, p);
    const distractors = pickDistractors(
      answer,
      [opt(p, n), opt(n - 1, q), opt(n, q), opt(n, Math.max(p, q) + 1), opt(n + 1, p)],
      r,
    );
    return {
      stem: tex`The order and degree of the differential equation $${lhs} = 0$ are respectively:`,
      answer,
      distractors,
      explanation: tex`The order is that of the highest derivative present, $${d(n)}$, so the order is $${n}$. The degree is the power of that highest-order derivative (the equation is polynomial in the derivatives), namely $${p}$. The power $${q}$ belongs to a lower-order derivative and does not decide the degree.`,
    };
  }),

  b.dynamic('c-reflection-property', { difficulty: 3, origin: 'past-paper', tags: ['definite integrals'] }, (r) => {
    if (r.chance(0.5)) {
      const n = r.int(1, 9);
      const e = n === 1 ? '' : `^{${n}}`;
      const form = r.int(0, 2);
      const integrand =
        form === 0
          ? `\\frac{\\sin${e} x}{\\sin${e} x + \\cos${e} x}`
          : form === 1
            ? `\\frac{\\cos${e} x}{\\sin${e} x + \\cos${e} x}`
            : `\\frac{1}{1 + \\tan${e} x}`;
      const answer = tex`$\frac{\pi}{4}$`;
      const distractors = r.sample([tex`$\frac{\pi}{2}$`, '$0$', '$1$', tex`$\pi$`], 3);
      return {
        stem: tex`$\displaystyle\int_{0}^{\pi/2} ${integrand}\,dx$ equals:`,
        answer,
        distractors,
        explanation: tex`Call the integral $I$. Using $\int_{0}^{a} f(x)\,dx = \int_{0}^{a} f(a - x)\,dx$ with $a = \frac{\pi}{2}$ swaps $\sin x$ and $\cos x$, giving the complementary integral $J$. Adding, $I + J = \int_{0}^{\pi/2} 1\,dx = \frac{\pi}{2}$ and $I = J$, so $I = \frac{\pi}{4}$.`,
      };
    }
    const a = r.int(1, 6);
    const len = r.int(2, 9);
    const bb = a + len;
    const s = a + bb;
    const answer = `$${texOf(frac(len, 2))}$`;
    const distractors = pickDistractors(answer, [
      `$${len}$`,
      `$${texOf(frac(s, 2))}$`,
      `$${texOf(frac(len, 4))}$`,
      '$0$',
    ]);
    return {
      stem: tex`$\displaystyle\int_{${a}}^{${bb}} \frac{\sqrt{x}}{\sqrt{x} + \sqrt{${s} - x}}\,dx$ equals:`,
      answer,
      distractors,
      explanation: tex`Let $I$ be the integral. Using $\int_{a}^{b} f(x)\,dx = \int_{a}^{b} f(a + b - x)\,dx$ with $a + b = ${s}$ gives $I = \int_{${a}}^{${bb}} \frac{\sqrt{${s} - x}}{\sqrt{${s} - x} + \sqrt{x}}\,dx$. Adding the two forms, $2I = \int_{${a}}^{${bb}} 1\,dx = ${len}$, so $I = ${texOf(frac(len, 2))}$.`,
    };
  }),

  b.dynamic('c-definite-integral-properties', { difficulty: 2, tags: ['definite integrals'] }, (r) =>
    statementQuestion(r, {
      stem: tex`For continuous functions $f$ and $g$, which of the following is correct?`,
      negativeStem: tex`For continuous functions $f$ and $g$, which of the following is NOT correct in general?`,
      truths: [
        tex`$\int_{a}^{b} f(x)\,dx = -\int_{b}^{a} f(x)\,dx$`,
        tex`$\int_{a}^{b} f(x)\,dx = \int_{a}^{b} f(t)\,dt$`,
        tex`$\int_{0}^{a} f(x)\,dx = \int_{0}^{a} f(a - x)\,dx$`,
        tex`$\int_{a}^{b} f(x)\,dx = \int_{a}^{b} f(a + b - x)\,dx$`,
        tex`$\int_{-a}^{a} f(x)\,dx = 0$ when $f$ is odd`,
        tex`$\int_{-a}^{a} f(x)\,dx = 2\int_{0}^{a} f(x)\,dx$ when $f$ is even`,
        tex`$\int_{a}^{b} \left[f(x) + g(x)\right]dx = \int_{a}^{b} f(x)\,dx + \int_{a}^{b} g(x)\,dx$`,
      ],
      falsehoods: [
        tex`$\int_{a}^{b} f(x)g(x)\,dx = \int_{a}^{b} f(x)\,dx \cdot \int_{a}^{b} g(x)\,dx$`,
        tex`$\int_{-a}^{a} f(x)\,dx = 2\int_{0}^{a} f(x)\,dx$ for every $f$`,
        tex`$\int_{a}^{b} f(x)\,dx = \int_{a}^{b} f(a - x)\,dx$`,
        tex`$\int_{-a}^{a} f(x)\,dx = 0$ when $f$ is even`,
        tex`$\int_{a}^{b} \frac{f(x)}{g(x)}\,dx = \frac{\int_{a}^{b} f(x)\,dx}{\int_{a}^{b} g(x)\,dx}$`,
      ],
      explain: (ans, inverted) =>
        inverted
          ? tex`${ans} fails in general. The valid rules are: reversing limits changes the sign, the variable is a dummy, $\int_{a}^{b} f(x)\,dx = \int_{a}^{b} f(a + b - x)\,dx$, odd functions give $0$ and even functions give twice the half-range integral on $[-a, a]$, and the integral is linear (but not multiplicative).`
          : tex`${ans} is a standard property. The others fail: the integral is not multiplicative or divisive, on $[a, b]$ the reflection uses $a + b - x$ (not $a - x$), and the doubling rule holds only for even functions while the zero rule holds only for odd ones.`,
    }),
  ),

  b.dynamic('c-standard-antiderivatives', { difficulty: 1, tags: ['antiderivatives'] }, (r) =>
    statementQuestion(r, {
      stem: tex`Which of the following is correct? ($c$ is an arbitrary constant)`,
      negativeStem: tex`Which of the following is NOT correct? ($c$ is an arbitrary constant)`,
      truths: [
        tex`$\int \sec x\tan x\,dx = \sec x + c$`,
        tex`$\int \csc^{2}x\,dx = -\cot x + c$`,
        tex`$\int \frac{dx}{\sqrt{1 - x^{2}}} = \sin^{-1}x + c$`,
        tex`$\int \frac{dx}{1 + x^{2}} = \tan^{-1}x + c$`,
        tex`$\int 2^{x}\,dx = \frac{2^{x}}{\ln 2} + c$`,
        tex`$\int \tan x\,dx = \ln|\sec x| + c$`,
        tex`$\int \cot x\,dx = \ln|\sin x| + c$`,
        tex`$\int \sec x\,dx = \ln|\sec x + \tan x| + c$`,
      ],
      falsehoods: [
        tex`$\int \tan x\,dx = \sec^{2}x + c$`,
        tex`$\int \ln x\,dx = \frac{1}{x} + c$`,
        tex`$\int 2^{x}\,dx = 2^{x}\ln 2 + c$`,
        tex`$\int \csc x\cot x\,dx = \csc x + c$`,
        tex`$\int \sin x\,dx = \cos x + c$`,
        tex`$\int e^{2x}\,dx = 2e^{2x} + c$`,
        tex`$\int \frac{dx}{1 + x^{2}} = \ln(1 + x^{2}) + c$`,
      ],
      explain: (ans, inverted) =>
        inverted
          ? tex`${ans} is wrong: differentiate the right-hand side and it does not give the integrand. (Correct forms: $\int \tan x\,dx = \ln|\sec x| + c$, $\int 2^{x}dx = \frac{2^{x}}{\ln 2} + c$, $\int \csc x\cot x\,dx = -\csc x + c$, $\int \sin x\,dx = -\cos x + c$, $\int e^{2x}dx = \frac{1}{2}e^{2x} + c$, $\int \ln x\,dx = x\ln x - x + c$, $\int \frac{dx}{1 + x^{2}} = \tan^{-1}x + c$.)`
          : tex`${ans} is correct: differentiating the right-hand side returns the integrand. Each of the other options fails this check (for example $\frac{d}{dx}\cos x = -\sin x$ and $\frac{d}{dx}\left(2^{x}\ln 2\right) = 2^{x}(\ln 2)^{2}$).`,
    }),
  ),

  // ---------------------------------------------------------------- fixed

  ...b.mcqs([
    {
      id: 'c-by-parts-choice-of-u',
      d: 1,
      t: ['integration by parts'],
      q: tex`To evaluate $\int x^{2}e^{x}\,dx$ by parts, the function that should be differentiated (taken as $u$) is:`,
      a: tex`$x^{2}$`,
      x: [tex`$e^{x}$`, tex`$x^{2}e^{x}$`, tex`$x$`],
      e: tex`Take $u = x^{2}$: differentiating lowers its power (to $2x$, then $2$), while $e^{x}$ integrates to itself. Choosing $u = e^{x}$ would raise the power of $x$ at every step.`,
    },
    {
      id: 'c-integral-of-ln-x',
      d: 1,
      o: 'past-paper',
      t: ['integration by parts'],
      q: tex`$\int \ln x\,dx$ is equal to:`,
      a: tex`$x\ln x - x + c$`,
      x: [tex`$\frac{1}{x} + c$`, tex`$x\ln x + x + c$`, tex`$\frac{(\ln x)^{2}}{2} + c$`],
      e: tex`By parts with $u = \ln x$, $dv = dx$: $\int \ln x\,dx = x\ln x - \int x \cdot \frac{1}{x}\,dx = x\ln x - x + c$.`,
    },
    {
      id: 'c-arbitrary-constants',
      d: 1,
      t: ['differential equations'],
      q: 'The general solution of a differential equation of order three contains:',
      a: 'exactly three arbitrary constants',
      x: ['exactly one arbitrary constant', 'exactly two arbitrary constants', 'no arbitrary constant'],
      e: 'The number of independent arbitrary constants in the general solution equals the order of the differential equation, so an equation of order three needs three.',
    },
    {
      id: 'c-de-family-circles',
      d: 2,
      o: 'past-paper',
      t: ['differential equations'],
      q: tex`The general solution of $\frac{dy}{dx} = -\frac{x}{y}$ represents a family of:`,
      a: 'circles centred at the origin',
      x: ['straight lines through the origin', 'parabolas with vertex at the origin', 'rectangular hyperbolas'],
      e: tex`Separate the variables: $y\,dy = -x\,dx \Rightarrow \frac{y^{2}}{2} = -\frac{x^{2}}{2} + c \Rightarrow x^{2} + y^{2} = 2c$, a family of circles centred at $(0, 0)$. (Rectangular hyperbolas $y^{2} - x^{2} = C$ come from $\frac{dy}{dx} = \frac{x}{y}$.)`,
    },
    {
      id: 'c-reciprocal-negative-limits',
      d: 3,
      t: ['definite integrals', 'antiderivatives'],
      q: tex`The value of $\int_{-e}^{-1} \frac{dx}{x}$ is:`,
      a: tex`$-1$`,
      x: [tex`$1$`, tex`$0$`, 'not defined'],
      e: tex`$\frac{1}{x}$ is continuous on $[-e, -1]$ and $\int \frac{dx}{x} = \ln|x| + c$. So the value is $\ln|-1| - \ln|-e| = 0 - 1 = -1$. It is negative because the integrand is negative on the whole interval.`,
    },
    {
      id: 'c-ln-tan-zero',
      d: 3,
      t: ['definite integrals'],
      q: tex`$\int_{0}^{\pi/2} \ln(\tan x)\,dx$ equals:`,
      a: tex`$0$`,
      x: [tex`$\frac{\pi}{4}$`, tex`$\frac{\pi}{2}\ln 2$`, tex`$1$`],
      e: tex`Let $I$ be the integral. Replacing $x$ by $\frac{\pi}{2} - x$ gives $I = \int_{0}^{\pi/2} \ln(\cot x)\,dx = -\int_{0}^{\pi/2} \ln(\tan x)\,dx = -I$, so $2I = 0$ and $I = 0$.`,
    },
    {
      id: 'c-integral-of-abs-x',
      d: 1,
      t: ['definite integrals', 'area under curves'],
      q: tex`$\int_{-2}^{2} |x|\,dx$ is equal to:`,
      a: tex`$4$`,
      x: [tex`$0$`, tex`$2$`, tex`$8$`],
      e: tex`$|x|$ is even, so $\int_{-2}^{2} |x|\,dx = 2\int_{0}^{2} x\,dx = 2 \cdot \frac{2^{2}}{2} = 4$. Treating $|x|$ as $x$ wrongly gives $0$.`,
    },
    {
      id: 'c-semicircle-area',
      d: 2,
      o: 'past-paper',
      t: ['area under curves', 'definite integrals'],
      q: tex`$\int_{-2}^{2} \sqrt{4 - x^{2}}\,dx$ is equal to:`,
      a: tex`$2\pi$`,
      x: [tex`$4\pi$`, tex`$\pi$`, tex`$0$`],
      e: tex`$y = \sqrt{4 - x^{2}}$ is the upper half of the circle $x^{2} + y^{2} = 4$ of radius $2$, so the integral is the area of a semicircle: $\frac{1}{2}\pi(2)^{2} = 2\pi$.`,
    },
    {
      id: 'c-standard-x2-minus-a2',
      d: 1,
      t: ['partial fractions in integration', 'antiderivatives'],
      q: tex`$\int \frac{dx}{x^{2} - a^{2}}$ ($a > 0$) is equal to:`,
      a: tex`$\frac{1}{2a}\ln\left|\frac{x - a}{x + a}\right| + c$`,
      x: [
        tex`$\frac{1}{2a}\ln\left|\frac{x + a}{x - a}\right| + c$`,
        tex`$\frac{1}{a}\ln\left|\frac{x - a}{x + a}\right| + c$`,
        tex`$\frac{1}{a}\tan^{-1}\frac{x}{a} + c$`,
      ],
      e: tex`Partial fractions: $\frac{1}{x^{2} - a^{2}} = \frac{1}{2a}\left(\frac{1}{x - a} - \frac{1}{x + a}\right)$. Integrating, $\frac{1}{2a}\left(\ln|x - a| - \ln|x + a|\right) + c = \frac{1}{2a}\ln\left|\frac{x - a}{x + a}\right| + c$.`,
    },
    {
      id: 'c-substitution-new-limits',
      d: 2,
      t: ['substitution', 'definite integrals'],
      q: tex`With the substitution $u = x^{2}$, the integral $\int_{0}^{2} x\,f(x^{2})\,dx$ becomes:`,
      a: tex`$\frac{1}{2}\int_{0}^{4} f(u)\,du$`,
      x: [tex`$\frac{1}{2}\int_{0}^{2} f(u)\,du$`, tex`$2\int_{0}^{4} f(u)\,du$`, tex`$\int_{0}^{4} f(u)\,du$`],
      e: tex`$du = 2x\,dx \Rightarrow x\,dx = \frac{1}{2}du$. The limits change too: $x = 0 \Rightarrow u = 0$ and $x = 2 \Rightarrow u = 4$. So the integral is $\frac{1}{2}\int_{0}^{4} f(u)\,du$.`,
    },
    {
      id: 'c-negative-integrand-meaning',
      d: 1,
      t: ['area under curves', 'definite integrals'],
      q: tex`If $f(x) < 0$ for every $x$ in $[a, b]$, where $a < b$, then $\int_{a}^{b} f(x)\,dx$ equals:`,
      a: tex`minus the area between $y = f(x)$ and the $x$-axis`,
      x: [
        tex`the area between $y = f(x)$ and the $x$-axis`,
        tex`zero, since the curve lies below the $x$-axis`,
        tex`twice the area between $y = f(x)$ and the $x$-axis`,
      ],
      e: tex`For $f < 0$ every product $f(x)\,\Delta x$ in the sum is negative, so the integral is negative; its absolute value is the area. Hence area $= \left|\int_{a}^{b} f(x)\,dx\right| = -\int_{a}^{b} f(x)\,dx$.`,
    },
  ]),
]);
