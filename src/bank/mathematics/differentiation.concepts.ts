import { defineBank } from '@/engine/authoring';
import type { Fraction } from '@/engine/helpers';
import { coefTex, factorial, frac, gcd, m$, ordinal, pickDistractors, polyTex, statementQuestion, tex } from '@/engine/helpers';

/**
 * Differentiation, part B: conceptual understanding, definitions, properties and classic
 * NET-style results. Every local id starts with `c-` so it never collides with part A
 * (`differentiation.ts`, computational items).
 */

type Row = { f: string; d: string; wrong: string[]; note: string };

const fx = (v: Fraction): string => m$(v.toTex());
const xPow = (k: number): string => (k === 1 ? 'x' : `x^{${k}}`);

const STATEMENT_REASONS = new Map<string, string>([
  [
    tex`If $f'(x) > 0$ for every $x$ in $(a, b)$, then $f$ is increasing on $(a, b)$.`,
    'A positive derivative means the function rises as $x$ increases (a standard test for increasing functions).',
  ],
  ['Every differentiable function is continuous.', 'Differentiability at a point implies continuity there (the converse is false).'],
  [
    'The derivative of an even differentiable function is an odd function.',
    tex`If $f(-x) = f(x)$, differentiating gives $-f'(-x) = f'(x)$, so $f'$ is odd.`,
  ],
  ['The derivative of a constant function is zero.', 'A constant does not change, so its rate of change is $0$.'],
  [
    tex`If $f'(c) = 0$ and $f''(c) < 0$, then $f$ has a local maximum at $x = c$.`,
    'This is the second derivative test: a negative second derivative at a stationary point gives a maximum.',
  ],
  [
    tex`$\frac{dx}{dy} = \dfrac{1}{dy/dx}$ wherever $\frac{dy}{dx} \neq 0$.`,
    'This is the derivative of an inverse function.',
  ],
  ['Every continuous function is differentiable.', tex`False: $f(x) = |x|$ is continuous at $0$ but has no derivative there.`],
  [
    tex`If $f'(c) = 0$, then $f$ must have a maximum or a minimum at $x = c$.`,
    tex`False: $f(x) = x^{3}$ has $f'(0) = 0$ but $x = 0$ is a point of inflexion, not an extremum.`,
  ],
  [
    'The derivative of an odd differentiable function is an odd function.',
    tex`False: if $f(-x) = -f(x)$ then $-f'(-x) = -f'(x)$, so $f'$ is even (e.g. $(\sin x)' = \cos x$).`,
  ],
  [
    tex`$\frac{d}{dx}(uv) = \frac{du}{dx} \cdot \frac{dv}{dx}$.`,
    tex`False: the product rule is $\frac{d}{dx}(uv) = u\frac{dv}{dx} + v\frac{du}{dx}$.`,
  ],
  [
    'The slope of the normal is the reciprocal of the slope of the tangent.',
    tex`False: the normal is perpendicular to the tangent, so its slope is $-\frac{1}{m}$ (the negative reciprocal).`,
  ],
  [
    tex`$\frac{d}{dx}\left(\frac{u}{v}\right) = \dfrac{u\,\frac{dv}{dx} - v\,\frac{du}{dx}}{v^{2}}$.`,
    tex`False: the numerator is reversed; the quotient rule is $\dfrac{v\,u' - u\,v'}{v^{2}}$.`,
  ],
]);

const STATEMENT_TRUTHS = [...STATEMENT_REASONS.keys()].slice(0, 6);
const STATEMENT_FALSEHOODS = [...STATEMENT_REASONS.keys()].slice(6);

const MACLAURIN_SERIES: ReadonlyArray<readonly [string, string]> = [
  [tex`1 + x + \frac{x^{2}}{2!} + \frac{x^{3}}{3!} + \cdots`, 'e^{x}'],
  [tex`1 - x + \frac{x^{2}}{2!} - \frac{x^{3}}{3!} + \cdots`, 'e^{-x}'],
  [tex`x - \frac{x^{3}}{3!} + \frac{x^{5}}{5!} - \cdots`, tex`\sin x`],
  [tex`1 - \frac{x^{2}}{2!} + \frac{x^{4}}{4!} - \cdots`, tex`\cos x`],
  [tex`x - \frac{x^{2}}{2} + \frac{x^{3}}{3} - \cdots`, tex`\ln(1 + x)`],
  [tex`-x - \frac{x^{2}}{2} - \frac{x^{3}}{3} - \cdots`, tex`\ln(1 - x)`],
  [tex`1 + x + x^{2} + x^{3} + \cdots`, tex`\frac{1}{1 - x}`],
  [tex`1 - x + x^{2} - x^{3} + \cdots`, tex`\frac{1}{1 + x}`],
];

const INVERSE_TRIG: ReadonlyArray<readonly [string, string]> = [
  [tex`\sin^{-1}x`, tex`\frac{1}{\sqrt{1 - x^{2}}}`],
  [tex`\cos^{-1}x`, tex`-\frac{1}{\sqrt{1 - x^{2}}}`],
  [tex`\tan^{-1}x`, tex`\frac{1}{1 + x^{2}}`],
  [tex`\cot^{-1}x`, tex`-\frac{1}{1 + x^{2}}`],
  [tex`\sec^{-1}x`, tex`\frac{1}{x\sqrt{x^{2} - 1}}`],
  [tex`\csc^{-1}x`, tex`-\frac{1}{x\sqrt{x^{2} - 1}}`],
];

const RECIPROCAL_TRIG: ReadonlyArray<readonly [string, string, string]> = [
  // function, derivative, derivative with the sign slipped
  [tex`\tan x`, tex`\sec^{2}x`, tex`-\sec^{2}x`],
  [tex`\cot x`, tex`-\csc^{2}x`, tex`\csc^{2}x`],
  [tex`\sec x`, tex`\sec x\tan x`, tex`-\sec x\tan x`],
  [tex`\csc x`, tex`-\csc x\cot x`, tex`\csc x\cot x`],
];

export default defineBank('mathematics', 'differentiation', (b) => [
  b.dynamic('c-first-principles-limit', { difficulty: 1, origin: 'past-paper', tags: ['derivative rules'] }, (r) => {
    const kind = r.pick(['power', 'power', 'sin', 'cos', 'exp', 'ln', 'sqrt', 'recip'] as const);
    const a = r.int(2, 9);
    const rows: Record<typeof kind, Row> = {
      power: {
        f: tex`\frac{(x + h)^{${a}} - x^{${a}}}{h}`,
        d: coefTex(a, xPow(a - 1)),
        wrong: [coefTex(a, xPow(a)), xPow(a - 1), '0', coefTex(a - 1, xPow(a))],
        note: `x^{${a}}`,
      },
      sin: {
        f: tex`\frac{\sin(${a}x + ${a}h) - \sin ${a}x}{h}`,
        d: tex`${a}\cos ${a}x`,
        wrong: [tex`\cos ${a}x`, tex`-${a}\cos ${a}x`, tex`${a}\sin ${a}x`],
        note: tex`\sin ${a}x`,
      },
      cos: {
        f: tex`\frac{\cos(${a}x + ${a}h) - \cos ${a}x}{h}`,
        d: tex`-${a}\sin ${a}x`,
        wrong: [tex`${a}\sin ${a}x`, tex`-\sin ${a}x`, tex`-${a}\cos ${a}x`],
        note: tex`\cos ${a}x`,
      },
      exp: {
        f: tex`\frac{e^{${a}x + ${a}h} - e^{${a}x}}{h}`,
        d: `${a}e^{${a}x}`,
        wrong: [`e^{${a}x}`, tex`\frac{1}{${a}}e^{${a}x}`, '0'],
        note: `e^{${a}x}`,
      },
      ln: {
        f: tex`\frac{\ln(x + h) - \ln x}{h}`,
        d: tex`\frac{1}{x}`,
        wrong: [tex`\ln x`, tex`-\frac{1}{x^{2}}`, '0'],
        note: tex`\ln x`,
      },
      sqrt: {
        f: tex`\frac{\sqrt{x + h} - \sqrt{x}}{h}`,
        d: tex`\frac{1}{2\sqrt{x}}`,
        wrong: [tex`\frac{1}{\sqrt{x}}`, tex`2\sqrt{x}`, tex`\frac{\sqrt{x}}{2}`],
        note: tex`\sqrt{x}`,
      },
      recip: {
        f: tex`\frac{1}{h}\left(\frac{1}{x + h} - \frac{1}{x}\right)`,
        d: tex`-\frac{1}{x^{2}}`,
        wrong: [tex`\frac{1}{x^{2}}`, tex`-\frac{1}{x}`, tex`\ln x`],
        note: tex`\frac{1}{x}`,
      },
    };
    const row = rows[kind];
    const answer = m$(row.d);
    return {
      stem: tex`The value of $\lim_{h \to 0} ${row.f}$ is:`,
      answer,
      distractors: pickDistractors(answer, row.wrong.map(m$)),
      explanation: tex`This limit is the first-principles definition $\lim_{h \to 0}\frac{f(x + h) - f(x)}{h} = f'(x)$ with $f(x) = ${row.note}$. Hence it equals $f'(x) = ${row.d}$ (substituting $h = 0$ directly only gives the indeterminate form $\frac{0}{0}$).`,
    };
  }),

  b.dynamic('c-nth-derivative-pattern', { difficulty: 2, tags: ['higher derivatives'] }, (r) => {
    const kind = r.pick(['sin', 'cos', 'sin', 'cos', 'exp', 'power', 'poly'] as const);
    if (kind === 'sin' || kind === 'cos') {
      const n = r.int(13, 60);
      const cycle =
        kind === 'sin'
          ? [tex`\sin x`, tex`\cos x`, tex`-\sin x`, tex`-\cos x`]
          : [tex`\cos x`, tex`-\sin x`, tex`-\cos x`, tex`\sin x`];
      const rem = n % 4;
      const answer = m$(cycle[rem] as string);
      return {
        stem: tex`If $y = ${cycle[0]}$, then $\frac{d^{${n}}y}{dx^{${n}}}$ is equal to:`,
        answer,
        distractors: cycle.filter((_, i) => i !== rem).map(m$),
        explanation: tex`The derivatives of $y = ${cycle[0]}$ repeat every four steps: $${cycle.join(',\\ ')}$, then back to $${cycle[0]}$. Since $${n} = 4(${(n - rem) / 4}) + ${rem}$, the ${ordinal(n)} derivative ${rem === 0 ? 'brings $y$ back to itself' : `equals the derivative of order ${rem}`}, i.e. $${cycle[rem]}$.`,
      };
    }
    if (kind === 'exp') {
      const a = r.int(2, 5);
      const n = r.int(3, 6);
      const answer = m$(`${a}^{${n}}e^{${a}x}`);
      return {
        stem: tex`If $y = e^{${a}x}$, then $\frac{d^{${n}}y}{dx^{${n}}}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(`${a}^{${n - 1}}e^{${a}x}`),
          // 2^3 = 2 x 4: skip the "multiplied by n" slip when it equals the previous distractor in value
          ...(a * n === a ** (n - 1) ? [] : [m$(`${a * n}e^{${a}x}`)]),
          m$(`${a}^{${n + 1}}e^{${a}x}`),
          m$(`e^{${a}x}`),
        ]),
        explanation: tex`Each differentiation of $e^{${a}x}$ brings down a factor $${a}$ (chain rule): $y' = ${a}e^{${a}x}$, $y'' = ${a}^{2}e^{${a}x}$, and so on. After ${n} differentiations, $\frac{d^{${n}}y}{dx^{${n}}} = ${a}^{${n}}e^{${a}x}$.`,
      };
    }
    if (kind === 'power') {
      const n = r.int(4, 7);
      const nf = factorial(n);
      const answer = m$(String(nf));
      return {
        stem: tex`If $y = x^{${n}}$, then $\frac{d^{${n}}y}{dx^{${n}}}$ equals:`,
        answer,
        distractors: [m$(`${nf}x`), m$(String(factorial(n - 1))), '$0$'],
        explanation: tex`Each differentiation lowers the power by one: $\frac{d^{${n}}}{dx^{${n}}}x^{${n}} = ${n} \times ${n - 1} \times \cdots \times 1 = ${n}! = ${nf}$, a constant. (Only the next derivative would be $0$.)`,
      };
    }
    const m = r.int(3, 5);
    const lead = r.int(2, 6);
    const coeffs = [lead, ...Array.from({ length: m }, () => r.int(-9, 9))];
    const mf = factorial(m);
    return {
      stem: tex`If $p(x) = ${polyTex(coeffs)}$, then $\frac{d^{${m + 1}}p}{dx^{${m + 1}}}$ equals:`,
      answer: '$0$',
      distractors: pickDistractors('$0$', [
        m$(String(lead * mf)),
        m$(String(lead * factorial(m + 1))),
        m$(String(mf)),
        m$(`${lead * mf}x`),
      ]),
      explanation: tex`$p$ has degree ${m}, so its ${ordinal(m)} derivative is the constant $${lead} \times ${m}! = ${lead * mf}$. One more differentiation gives $0$.`,
    };
  }),

  b.dynamic('c-maclaurin-coefficient', { difficulty: 2, origin: 'past-paper', tags: ['Maclaurin series'] }, (r) => {
    const kind = r.pick(['exp', 'exp', 'ln', 'sin', 'cos', 'zero'] as const);
    const sgn = (k: number): number => (k % 2 === 0 ? 1 : -1);
    let fTex: string;
    let k: number;
    let correct: Fraction;
    let wrong: Fraction[];
    let series: string;
    let work = '';
    if (kind === 'exp') {
      const a = r.pick([2, 3, -1, -2]);
      k = a === 3 ? r.int(2, 3) : r.int(2, 4);
      fTex = a === -1 ? 'e^{-x}' : `e^{${a}x}`;
      correct = frac(a ** k, factorial(k));
      wrong = [
        frac(a ** k, 1),
        frac(a, factorial(k)),
        frac(1, factorial(k)),
        correct.neg(),
        frac(a ** k, factorial(k - 1)),
        frac(a ** k, k),
        // extra slips so e^{-x}, k = 2 still has three distinct distractors
        frac(a ** k, factorial(k + 1)),
        frac(-(a ** k), 1),
      ];
      series = tex`e^{t} = 1 + t + \frac{t^{2}}{2!} + \frac{t^{3}}{3!} + \cdots` + tex` \text{ with } t = ${coefTex(a, 'x')}`;
      work = tex`\frac{${a < 0 ? `(${a})` : String(a)}^{${k}}}{${k}!} = `;
    } else if (kind === 'ln') {
      k = r.int(2, 6);
      fTex = tex`\ln(1 + x)`;
      correct = frac(-sgn(k), k);
      wrong = [
        correct.neg(),
        frac(-sgn(k), factorial(k)),
        frac(1, factorial(k)),
        frac(-sgn(k), k - 1),
        frac(sgn(k), k + 1), // read off the next term (needed when k = 2)
      ];
      series = tex`\ln(1 + x) = x - \frac{x^{2}}{2} + \frac{x^{3}}{3} - \frac{x^{4}}{4} + \cdots + (-1)^{n+1}\frac{x^{n}}{n} + \cdots`;
      work = tex`\frac{(-1)^{${k + 1}}}{${k}} = `;
    } else if (kind === 'sin' || kind === 'cos') {
      const j = r.int(1, 3);
      k = kind === 'sin' ? 2 * j + 1 : 2 * j;
      fTex = kind === 'sin' ? tex`\sin x` : tex`\cos x`;
      correct = frac(sgn(j), factorial(k));
      wrong = [correct.neg(), frac(sgn(j), k), frac(sgn(j), factorial(k - 1)), frac(0)];
      series =
        kind === 'sin'
          ? tex`\sin x = x - \frac{x^{3}}{3!} + \frac{x^{5}}{5!} - \frac{x^{7}}{7!} + \cdots`
          : tex`\cos x = 1 - \frac{x^{2}}{2!} + \frac{x^{4}}{4!} - \frac{x^{6}}{6!} + \cdots`;
    } else {
      const useSin = r.chance(0.5);
      k = useSin ? r.pick([2, 4, 6]) : r.pick([3, 5]);
      fTex = useSin ? tex`\sin x` : tex`\cos x`;
      correct = frac(0);
      wrong = [frac(1, factorial(k)), frac(-1, factorial(k)), frac(1, k), frac(-1, k), frac(1, factorial(k - 1))];
      series = useSin
        ? tex`\sin x = x - \frac{x^{3}}{3!} + \frac{x^{5}}{5!} - \cdots \text{ (odd powers only)}`
        : tex`\cos x = 1 - \frac{x^{2}}{2!} + \frac{x^{4}}{4!} - \cdots \text{ (even powers only)}`;
    }
    const answer = fx(correct);
    return {
      stem: tex`In the Maclaurin series of $${fTex}$, the coefficient of $x^{${k}}$ is:`,
      answer,
      distractors: pickDistractors(answer, wrong.map(fx)),
      explanation: tex`The coefficient of $x^{n}$ is $\frac{f^{(n)}(0)}{n!}$. Here $${series}$, so the coefficient of $x^{${k}}$ is $${work}${correct.toTex()}$.`,
    };
  }),

  b.dynamic('c-maclaurin-series-identify', { difficulty: 1, tags: ['Maclaurin series'] }, (r) => {
    const idx = r.int(0, MACLAURIN_SERIES.length - 1);
    const [series, fn] = MACLAURIN_SERIES[idx] as readonly [string, string];
    const answer = m$(fn);
    // the partner (same family, sign pattern changed) is the most tempting slip
    const partner = MACLAURIN_SERIES[idx ^ 1] as readonly [string, string];
    const others = MACLAURIN_SERIES.filter((_, i) => i !== idx && i !== (idx ^ 1)).map((s) => m$(s[1]));
    return {
      stem: tex`The Maclaurin series $${series}$ is the expansion of:`,
      answer,
      distractors: pickDistractors(answer, [m$(partner[1]), ...r.shuffle(others)]),
      explanation: tex`The standard Maclaurin expansion is $${fn} = ${series}$. (Its partner $${partner[1]} = ${partner[0]}$ differs in its signs or terms.)`,
    };
  }),

  b.dynamic('c-derivative-statements', { difficulty: 2, tags: ['derivative rules', 'maxima and minima'] }, (r) =>
    statementQuestion(r, {
      stem: 'Which of the following statements is correct?',
      negativeStem: 'Which of the following statements is NOT correct?',
      truths: STATEMENT_TRUTHS,
      falsehoods: STATEMENT_FALSEHOODS,
      explain: (answer) => STATEMENT_REASONS.get(answer) ?? '',
    }),
  ),

  b.dynamic('c-second-derivative-test', { difficulty: 1, tags: ['maxima and minima'] }, (r) => {
    const c = r.int(-6, 6);
    const k = r.nonZero(-12, 12);
    const isMin = k > 0;
    const answer = isMin ? 'a local minimum' : 'a local maximum';
    return {
      stem: tex`For a function $f$, $f'(${c}) = 0$ and $f''(${c}) = ${k}$. At $x = ${c}$, $f$ has:`,
      answer,
      distractors: [isMin ? 'a local maximum' : 'a local minimum', 'a point of inflexion', 'neither a maximum nor a minimum'],
      explanation: tex`$x = ${c}$ is a stationary point since $f'(${c}) = 0$. By the second derivative test, $f''(${c}) = ${k} ${isMin ? '> 0' : '< 0'}$, so the curve is concave ${isMin ? 'up' : 'down'} there and $f$ has ${answer}.`,
    };
  }),

  b.dynamic('c-derivative-wrt-function', { difficulty: 2, origin: 'past-paper', tags: ['chain rule', 'trigonometric and inverse derivatives'] }, (r) => {
    if (r.chance(0.5)) {
      const [n, m] = r.sample([2, 3, 4, 5, 6, 7], 2) as [number, number];
      const k = n - m;
      const powTex = (p: number): string => (p === 1 ? 'x' : `x^{${p}}`);
      const answer = m$(coefTex(frac(n, m), powTex(k)));
      return {
        stem: tex`The derivative of $x^{${n}}$ with respect to $x^{${m}}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(coefTex(frac(m, n), powTex(k))),
          m$(coefTex(n, powTex(n - 1))),
          m$(coefTex(frac(n, m), powTex(-k))),
          m$(coefTex(n * m, powTex(n + m - 2))),
        ]),
        explanation: tex`Let $u = x^{${m}}$. Then $\frac{d(x^{${n}})}{du} = \dfrac{d(x^{${n}})/dx}{du/dx} = \dfrac{${n}${xPow(n - 1)}}{${m}${xPow(m - 1)}} = ${answer.slice(1, -1)}$.`,
      };
    }
    const cases: ReadonlyArray<{ f: string; g: string; d: string; wrong: string[]; work: string }> = [
      {
        f: tex`\sin x`,
        g: tex`\cos x`,
        d: tex`-\cot x`,
        wrong: [tex`\cot x`, tex`-\tan x`, tex`\tan x`],
        work: tex`\dfrac{\cos x}{-\sin x} = -\cot x`,
      },
      {
        f: tex`\tan x`,
        g: tex`\sec x`,
        d: tex`\csc x`,
        wrong: [tex`\sin x`, tex`\sec x`, tex`\sec x\tan x`],
        work: tex`\dfrac{\sec^{2}x}{\sec x\tan x} = \dfrac{\sec x}{\tan x} = \dfrac{1}{\sin x} = \csc x`,
      },
      {
        f: 'e^{x}',
        g: tex`\ln x`,
        d: 'xe^{x}',
        wrong: [tex`\frac{e^{x}}{x}`, 'e^{x}', tex`e^{x}\ln x`],
        work: tex`\dfrac{e^{x}}{1/x} = xe^{x}`,
      },
      {
        f: tex`\ln x`,
        g: tex`\frac{1}{x}`,
        d: '-x',
        wrong: ['x', tex`-\frac{1}{x}`, tex`\frac{1}{x}`],
        work: tex`\dfrac{1/x}{-1/x^{2}} = -x`,
      },
      {
        f: tex`\sin x`,
        g: 'x^{2}',
        d: tex`\frac{\cos x}{2x}`,
        wrong: [tex`2x\cos x`, tex`\frac{\cos x}{x}`, tex`\frac{\sin x}{2x}`],
        work: tex`\dfrac{\cos x}{2x}`,
      },
    ];
    const c = r.pick(cases);
    const answer = m$(c.d);
    return {
      stem: tex`The derivative of $${c.f}$ with respect to $${c.g}$ is:`,
      answer,
      distractors: c.wrong.map(m$),
      explanation: tex`Divide the two derivatives with respect to $x$: $\dfrac{d(${c.f})}{d(${c.g})} = \dfrac{d(${c.f})/dx}{d(${c.g})/dx} = ${c.work}$.`,
    };
  }),

  b.dynamic('c-standard-trig-derivative', { difficulty: 1, tags: ['trigonometric and inverse derivatives'] }, (r) => {
    if (r.chance(0.6)) {
      const idx = r.int(0, INVERSE_TRIG.length - 1);
      const [f, d] = INVERSE_TRIG[idx] as readonly [string, string];
      const partner = (INVERSE_TRIG[idx ^ 1] as readonly [string, string])[1];
      const others = INVERSE_TRIG.filter((_, i) => i !== idx && i !== (idx ^ 1)).map((row) => m$(row[1]));
      const answer = m$(d);
      return {
        stem: tex`$\frac{d}{dx}\left(${f}\right)$ is equal to:`,
        answer,
        distractors: pickDistractors(answer, [m$(partner), ...r.shuffle(others)]),
        explanation: tex`Standard result: $\frac{d}{dx}\left(${f}\right) = ${d}$. The co-function $${(INVERSE_TRIG[idx ^ 1] as readonly [string, string])[0]}$ has the same derivative with the opposite sign.`,
      };
    }
    const idx = r.int(0, RECIPROCAL_TRIG.length - 1);
    const [f, d, slip] = RECIPROCAL_TRIG[idx] as readonly [string, string, string];
    const others = RECIPROCAL_TRIG.filter((_, i) => i !== idx).map((row) => m$(row[1]));
    const answer = m$(d);
    return {
      stem: tex`$\frac{d}{dx}\left(${f}\right)$ is equal to:`,
      answer,
      distractors: pickDistractors(answer, [m$(slip), ...r.shuffle(others)]),
      explanation: tex`Standard result: $\frac{d}{dx}\left(${f}\right) = ${d}$. (Derivatives of the co-functions $\cot x$, $\csc x$ carry a minus sign; those of $\tan x$, $\sec x$ do not.)`,
    };
  }),

  b.dynamic('c-implicit-curve-slope', { difficulty: 2, tags: ['implicit differentiation'] }, (r) => {
    const kind = r.pick(['conic', 'conic', 'parabola', 'rect'] as const);
    if (kind === 'conic') {
      const a = r.int(1, 6);
      const bb = r.int(1, 6);
      const s = r.sign();
      const c = r.int(5, 60);
      const g = gcd(a, bb);
      const p = a / g;
      const q = bb / g;
      const term = (k: number, v: string): string => (k === 1 ? v : `${k}${v}`);
      const fr = (top: string, bottom: string): string => (bottom === '1' ? top : tex`\frac{${top}}{${bottom}}`);
      const neg = s > 0 ? '-' : '';
      const pos = s > 0 ? '' : '-';
      const answer = m$(`${neg}${fr(term(p, 'x'), term(q, 'y'))}`);
      return {
        stem: tex`If $${coefTex(a, 'x^{2}')} ${s > 0 ? '+' : '-'} ${coefTex(bb, 'y^{2}')} = ${c}$, then $\frac{dy}{dx}$ is:`,
        answer,
        distractors: pickDistractors(answer, [
          m$(`${pos}${fr(term(p, 'x'), term(q, 'y'))}`),
          m$(`${neg}${fr(term(q, 'y'), term(p, 'x'))}`),
          m$(`${neg}${fr(term(q, 'x'), term(p, 'y'))}`),
          // used when a = b (the coefficient swap above then equals the answer)
          m$(`${pos}${fr(term(q, 'y'), term(p, 'x'))}`),
        ]),
        explanation: tex`Differentiate implicitly: $${2 * a}x ${s > 0 ? '+' : '-'} ${2 * bb}y\frac{dy}{dx} = 0$, so $\frac{dy}{dx} = ${neg}\dfrac{${2 * a}x}{${2 * bb}y} = ${answer.slice(1, -1)}$.`,
      };
    }
    if (kind === 'parabola') {
      const a = r.nonZero(-5, 5);
      const overY = (n: number): string => (n < 0 ? tex`-\frac{${-n}}{y}` : tex`\frac{${n}}{y}`);
      const yOver = (n: number): string => (n < 0 ? tex`-\frac{y}{${-n}}` : tex`\frac{y}{${n}}`);
      const answer = m$(overY(2 * a));
      return {
        stem: tex`If $y^{2} = ${coefTex(4 * a, 'x')}$, then $\frac{dy}{dx}$ is:`,
        answer,
        distractors: pickDistractors(answer, [m$(overY(4 * a)), m$(yOver(2 * a)), m$(overY(-2 * a)), m$(overY(a))]),
        explanation: tex`Differentiate implicitly: $2y\frac{dy}{dx} = ${4 * a}$, so $\frac{dy}{dx} = \dfrac{${4 * a}}{2y} = ${answer.slice(1, -1)}$.`,
      };
    }
    const k = r.int(2, 30);
    return {
      stem: tex`If $xy = ${k}$, then $\frac{dy}{dx}$ is:`,
      answer: tex`$-\frac{y}{x}$`,
      distractors: [tex`$\frac{y}{x}$`, tex`$-\frac{x}{y}$`, tex`$\frac{x}{y}$`],
      explanation: tex`By the product rule, $x\frac{dy}{dx} + y = 0$, so $\frac{dy}{dx} = -\frac{y}{x}$.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'c-own-derivative-exponential',
      d: 1,
      t: ['exponential and logarithmic derivatives'],
      q: tex`Which of the following functions satisfies $f'(x) = f(x)$ for all $x$?`,
      a: '$e^{x}$',
      x: [tex`$\ln x$`, '$e^{-x}$', '$x^{e}$'],
      e: tex`$\frac{d}{dx}e^{x} = e^{x}$. By contrast $(\ln x)' = \frac{1}{x}$, $(e^{-x})' = -e^{-x}$ and $(x^{e})' = ex^{e-1}$.`,
    },
    {
      id: 'c-horizontal-tangent',
      d: 1,
      t: ['tangents and normals'],
      q: tex`The tangent to the curve $y = f(x)$ at $x = a$ is parallel to the $x$-axis. Then:`,
      a: tex`$f'(a) = 0$`,
      x: [tex`$f(a) = 0$`, tex`$f'(a) = 1$`, tex`$f'(a)$ does not exist`],
      e: tex`$f'(a)$ is the slope of the tangent at $x = a$. A line parallel to the $x$-axis has slope $0$, so $f'(a) = 0$. (A vertical tangent would correspond to $f'(a)$ not existing.)`,
    },
    {
      id: 'c-circle-area-rate',
      d: 1,
      t: ['derivative rules'],
      q: 'The rate of change of the area of a circle with respect to its radius is equal to its:',
      a: 'circumference',
      x: ['diameter', 'radius', 'area'],
      e: tex`$A = \pi r^{2} \Rightarrow \frac{dA}{dr} = 2\pi r$, which is the circumference of the circle.`,
    },
    {
      id: 'c-sine-of-degrees',
      d: 3,
      o: 'past-paper',
      t: ['trigonometric and inverse derivatives', 'chain rule'],
      q: tex`$\frac{d}{dx}\left(\sin x^{\circ}\right)$ is equal to:`,
      a: tex`$\frac{\pi}{180}\cos x^{\circ}$`,
      x: [tex`$\cos x^{\circ}$`, tex`$\frac{180}{\pi}\cos x^{\circ}$`, tex`$-\frac{\pi}{180}\cos x^{\circ}$`],
      e: tex`In radians, $x^{\circ} = \frac{\pi x}{180}$, so $\frac{d}{dx}\sin\frac{\pi x}{180} = \frac{\pi}{180}\cos\frac{\pi x}{180} = \frac{\pi}{180}\cos x^{\circ}$ by the chain rule.`,
    },
    {
      id: 'c-y-double-prime-plus-y',
      d: 2,
      o: 'past-paper',
      t: ['higher derivatives'],
      q: tex`If $y = a\cos x + b\sin x$, where $a$ and $b$ are constants, then $\frac{d^{2}y}{dx^{2}} + y$ equals:`,
      a: '$0$',
      x: ['$2y$', '$-2y$', '$a + b$'],
      e: tex`$y' = -a\sin x + b\cos x$ and $y'' = -a\cos x - b\sin x = -y$. Hence $y'' + y = 0$.`,
    },
    {
      id: 'c-x-cubed-at-origin',
      d: 2,
      t: ['maxima and minima'],
      q: tex`For $f(x) = x^{3}$, the point $x = 0$ is:`,
      a: 'a point of inflexion',
      x: ['a local minimum', 'a local maximum', tex`a point where $f$ is not differentiable`],
      e: tex`$f'(x) = 3x^{2} = 0$ at $x = 0$, but $f'$ does not change sign there (it is positive on both sides), so there is no extremum. $f''(x) = 6x$ changes sign at $0$, so $x = 0$ is a point of inflexion.`,
    },
    {
      id: 'c-astroid-parametric',
      d: 2,
      o: 'past-paper',
      t: ['trigonometric and inverse derivatives', 'chain rule'],
      q: tex`If $x = a\cos^{3}\theta$ and $y = a\sin^{3}\theta$, then $\frac{dy}{dx}$ equals:`,
      a: tex`$-\tan\theta$`,
      x: [tex`$\tan\theta$`, tex`$-\cot\theta$`, tex`$-\tan^{2}\theta$`],
      e: tex`$\frac{dx}{d\theta} = -3a\cos^{2}\theta\sin\theta$ and $\frac{dy}{d\theta} = 3a\sin^{2}\theta\cos\theta$. So $\frac{dy}{dx} = \dfrac{3a\sin^{2}\theta\cos\theta}{-3a\cos^{2}\theta\sin\theta} = -\tan\theta$.`,
    },
    {
      id: 'c-x-fourth-test-fails',
      d: 3,
      t: ['maxima and minima'],
      q: tex`For $f(x) = x^{4}$, $f'(0) = 0$ and $f''(0) = 0$. At $x = 0$, $f$ has:`,
      a: 'a local minimum',
      x: ['a local maximum', 'a point of inflexion', 'neither a maximum nor a minimum'],
      e: tex`The second derivative test is inconclusive here. Check the sign of $f'(x) = 4x^{3}$: negative for $x < 0$ and positive for $x > 0$, so $f$ decreases then increases and $x = 0$ is a local minimum (indeed $x^{4} \geq 0$).`,
    },
    {
      id: 'c-max-area-fixed-perimeter',
      d: 1,
      o: 'past-paper',
      t: ['maxima and minima'],
      q: 'Among all rectangles with a given perimeter, the one with the greatest area is:',
      a: 'a square',
      x: ['a rectangle whose length is twice its breadth', 'a rectangle whose length is three times its breadth', 'a rectangle whose length is four times its breadth'],
      e: tex`With perimeter $2p$, sides $x$ and $p - x$ give $A = x(p - x)$. Then $A' = p - 2x = 0 \Rightarrow x = \frac{p}{2}$ and $A'' = -2 < 0$, a maximum. Both sides equal $\frac{p}{2}$, so the rectangle is a square.`,
    },
    {
      id: 'c-x-power-sin-x',
      d: 3,
      t: ['exponential and logarithmic derivatives'],
      q: tex`If $y = x^{\sin x}$ $(x > 0)$, then $\frac{dy}{dx}$ is:`,
      a: tex`$x^{\sin x}\left(\cos x\ln x + \frac{\sin x}{x}\right)$`,
      x: [
        tex`$\sin x \cdot x^{\sin x - 1}$`,
        tex`$x^{\sin x}\cos x\ln x$`,
        tex`$x^{\sin x}\left(\cos x\ln x - \frac{\sin x}{x}\right)$`,
      ],
      e: tex`Take logs: $\ln y = \sin x\ln x$. Differentiating, $\frac{1}{y}\frac{dy}{dx} = \cos x\ln x + \frac{\sin x}{x}$, so $\frac{dy}{dx} = x^{\sin x}\left(\cos x\ln x + \frac{\sin x}{x}\right)$. The power rule alone does not apply because the exponent varies.`,
    },
  ]),
]);
