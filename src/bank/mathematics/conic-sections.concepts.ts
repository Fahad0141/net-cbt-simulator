import { defineBank } from '@/engine/authoring';
import { frac, linearFactor, m$, numericOptions, n$, pickDistractors, signed, signedSum, statementQuestion, surdTex, tex } from '@/engine/helpers';

/**
 * Conic sections, part B: definitions, classification, standard properties and classic
 * NET-style results. Every local id starts with `c-` so it never collides with part A
 * (`conic-sections.ts`, computational items).
 */

const CONIC_NAMES = ['a circle', 'a parabola', 'an ellipse', 'a hyperbola'] as const;

/** `(x - 3)^{2}` or `x^{2}`. */
const sq = (root: number, v: string): string => `${linearFactor(root, v)}^{2}`;

const STATEMENT_REASONS = new Map<string, string>([
  [
    'For any point on an ellipse, the sum of its distances from the two foci equals the length of the major axis.',
    tex`This is the focal-distance property of an ellipse: $SP + S'P = 2a$.`,
  ],
  ['The eccentricity of every parabola is $1$.', tex`A parabola is the conic with $e = 1$ (distance from focus = distance from directrix).`],
  [
    'The asymptotes of a rectangular hyperbola are perpendicular to each other.',
    tex`For $x^{2} - y^{2} = a^{2}$ the asymptotes are $y = \pm x$, whose slopes multiply to $-1$.`,
  ],
  [
    tex`For the ellipse $\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1$ $(a > b)$, $b^{2} = a^{2}(1 - e^{2})$.`,
    tex`Since $c = ae$ and $c^{2} = a^{2} - b^{2}$, we get $b^{2} = a^{2} - a^{2}e^{2} = a^{2}(1 - e^{2})$.`,
  ],
  ['The foci of an ellipse lie on its major axis.', tex`The foci are $(\pm ae, 0)$ for $a > b$, i.e. on the major axis, inside the ellipse.`],
  [
    'The tangent to a circle at any point is perpendicular to the radius through that point.',
    'The radius to the point of contact is the normal, so the tangent is perpendicular to it.',
  ],
  [
    tex`For the hyperbola $\frac{x^{2}}{a^{2}} - \frac{y^{2}}{b^{2}} = 1$, $b^{2} = a^{2}(1 - e^{2})$.`,
    tex`False: for a hyperbola $c^{2} = a^{2} + b^{2}$, so $b^{2} = a^{2}(e^{2} - 1)$.`,
  ],
  ['The eccentricity of a hyperbola is less than $1$.', tex`False: a hyperbola has $e > 1$; $0 < e < 1$ describes an ellipse.`],
  [
    tex`The directrix of the parabola $y^{2} = 4ax$ is $x = a$.`,
    tex`False: the focus is $(a, 0)$ and the directrix is on the other side of the vertex, $x = -a$.`,
  ],
  [
    tex`The foci of the ellipse $\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1$ $(a > b)$ are $(0, \pm ae)$.`,
    tex`False: with $a > b$ the major axis is the $x$-axis, so the foci are $(\pm ae, 0)$.`,
  ],
  [
    tex`The length of the latus rectum of the ellipse $\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1$ $(a > b)$ is $\frac{2a^{2}}{b}$.`,
    tex`False: the latus rectum is $\frac{2b^{2}}{a}$.`,
  ],
  ['A circle is a special case of a parabola.', tex`False: a circle is the limiting case of an ellipse with $e = 0$; a parabola has $e = 1$.`],
]);

const STATEMENT_KEYS = [...STATEMENT_REASONS.keys()];
const STATEMENT_TRUTHS = STATEMENT_KEYS.slice(0, 6);
const STATEMENT_FALSEHOODS = STATEMENT_KEYS.slice(6);

export default defineBank('mathematics', 'conic-sections', (b) => [
  b.dynamic('c-classify-general-equation', { difficulty: 2, origin: 'past-paper', tags: ['circle', 'parabola', 'ellipse', 'hyperbola'] }, (r) => {
    const kind = r.pick(['circle', 'parabola', 'ellipse', 'hyperbola'] as const);
    let h = r.int(-4, 4);
    const k = r.int(-4, 4);
    if (h === 0 && k === 0) h = r.sign() * r.int(1, 4);
    let terms: Array<readonly [number, string]>;
    let answer: string;
    let why: string;
    if (kind === 'circle') {
      const m = r.pick([1, 1, 2, 3]);
      const rad = r.int(1, 5);
      terms = [
        [m, 'x^{2}'],
        [m, 'y^{2}'],
        [-2 * m * h, 'x'],
        [-2 * m * k, 'y'],
        [m * (h * h + k * k - rad * rad), ''],
      ];
      answer = CONIC_NAMES[0];
      why = tex`The coefficients of $x^{2}$ and $y^{2}$ are equal (and there is no $xy$ term), so it is a circle. Completing squares gives $${sq(h, 'x')} + ${sq(k, 'y')} = ${rad * rad}$.`;
    } else if (kind === 'parabola') {
      const p = r.nonZero(-3, 3);
      if (r.chance(0.5)) {
        // (y - k)^2 = 4p(x - h)
        terms = [
          [1, 'y^{2}'],
          [-4 * p, 'x'],
          [-2 * k, 'y'],
          [k * k + 4 * p * h, ''],
        ];
        why = tex`Only $y^{2}$ appears ($x^{2}$ is missing), so it is a parabola. Completing the square gives $${sq(k, 'y')} = ${4 * p}${linearFactor(h, 'x')}$.`;
      } else {
        // (x - h)^2 = 4p(y - k)
        terms = [
          [1, 'x^{2}'],
          [-2 * h, 'x'],
          [-4 * p, 'y'],
          [h * h + 4 * p * k, ''],
        ];
        why = tex`Only $x^{2}$ appears ($y^{2}$ is missing), so it is a parabola. Completing the square gives $${sq(h, 'x')} = ${4 * p}${linearFactor(k, 'y')}$.`;
      }
      answer = CONIC_NAMES[1];
    } else {
      const [A, C] = r.sample([1, 2, 3, 4, 5, 9], 2) as [number, number];
      if (kind === 'ellipse') {
        // A(x - h)^2 + C(y - k)^2 = AC
        terms = [
          [A, 'x^{2}'],
          [C, 'y^{2}'],
          [-2 * A * h, 'x'],
          [-2 * C * k, 'y'],
          [A * h * h + C * k * k - A * C, ''],
        ];
        answer = CONIC_NAMES[2];
        why = tex`The coefficients of $x^{2}$ and $y^{2}$ are unequal but have the same sign, so it is an ellipse: $\frac{${sq(h, 'x')}}{${C}} + \frac{${sq(k, 'y')}}{${A}} = 1$.`;
      } else {
        const s = r.sign();
        // s[A(x - h)^2 - C(y - k)^2] = AC
        terms = [
          [s * A, 'x^{2}'],
          [-s * C, 'y^{2}'],
          [-2 * s * A * h, 'x'],
          [2 * s * C * k, 'y'],
          [s * (A * h * h - C * k * k) - A * C, ''],
        ];
        answer = CONIC_NAMES[3];
        const std =
          s > 0
            ? tex`\frac{${sq(h, 'x')}}{${C}} - \frac{${sq(k, 'y')}}{${A}} = 1`
            : tex`\frac{${sq(k, 'y')}}{${A}} - \frac{${sq(h, 'x')}}{${C}} = 1`;
        why = tex`The coefficients of $x^{2}$ and $y^{2}$ have opposite signs, so it is a hyperbola: $${std}$.`;
      }
    }
    return {
      stem: tex`The equation $${signedSum(terms)} = 0$ represents:`,
      answer,
      distractors: CONIC_NAMES.filter((c) => c !== answer),
      explanation: tex`For $Ax^{2} + By^{2} + Dx + Ey + F = 0$ (no $xy$ term): $A = B$ gives a circle, $AB > 0$ with $A \neq B$ an ellipse, $AB < 0$ a hyperbola and $AB = 0$ a parabola. ${why}`,
    };
  }),

  b.dynamic('c-eccentricity-range', { difficulty: 1, origin: 'past-paper', tags: ['eccentricity'] }, (r) => {
    const kind = r.pick(['circle', 'ellipse', 'parabola', 'hyperbola'] as const);
    const p = r.int(2, 7);
    const q = r.intExcept(2, 7, [p]);
    const options = { circle: '$e = 0$', ellipse: '$0 < e < 1$', parabola: '$e = 1$', hyperbola: '$e > 1$' };
    const eq = {
      circle: tex`x^{2} + y^{2} = ${p * p}`,
      ellipse: tex`\frac{x^{2}}{${p * p}} + \frac{y^{2}}{${q * q}} = 1`,
      parabola: r.chance(0.5) ? tex`y^{2} = ${4 * p}x` : tex`x^{2} = -${4 * p}y`,
      hyperbola: tex`\frac{x^{2}}{${p * p}} - \frac{y^{2}}{${q * q}} = 1`,
    }[kind];
    const name = { circle: 'a circle', ellipse: 'an ellipse', parabola: 'a parabola', hyperbola: 'a hyperbola' }[kind];
    const stem = r.chance(0.4)
      ? tex`The eccentricity $e$ of ${name} always satisfies:`
      : tex`The eccentricity $e$ of the conic $${eq}$ satisfies:`;
    const answer = options[kind];
    return {
      stem,
      answer,
      distractors: Object.values(options).filter((o) => o !== answer),
      explanation: tex`The curve is ${name}. Eccentricity classifies conics: circle $e = 0$, ellipse $0 < e < 1$, parabola $e = 1$, hyperbola $e > 1$. Hence ${answer}.`,
    };
  }),

  b.dynamic('c-tangency-condition', { difficulty: 2, origin: 'past-paper', tags: ['tangents to circles', 'parabola', 'ellipse', 'hyperbola'] }, (r) => {
    const rows = [
      {
        curve: tex`x^{2} + y^{2} = a^{2}`,
        cond: tex`c^{2} = a^{2}(1 + m^{2})`,
        wrong: [tex`c^{2} = a^{2}(1 - m^{2})`, tex`c^{2} = a^{2}m^{2} - a^{2}`, tex`c = am`, tex`c^{2} = a^{2} + m^{2}`],
        work: tex`perpendicular distance from the centre $= $ radius: $\frac{|c|}{\sqrt{1 + m^{2}}} = a$, so $c^{2} = a^{2}(1 + m^{2})$`,
      },
      {
        curve: tex`y^{2} = 4ax`,
        cond: tex`c = \frac{a}{m}`,
        wrong: [tex`c = am`, tex`c = -am^{2}`, tex`c = \frac{m}{a}`, tex`c = -\frac{a}{m}`],
        work: tex`substituting $y = mx + c$ gives $m^{2}x^{2} + (2mc - 4a)x + c^{2} = 0$; equal roots need $(2mc - 4a)^{2} = 4m^{2}c^{2}$, i.e. $c = \frac{a}{m}$`,
      },
      {
        curve: tex`x^{2} = 4ay`,
        cond: tex`c = -am^{2}`,
        wrong: [tex`c = am^{2}`, tex`c = \frac{a}{m}`, tex`c = -\frac{a}{m}`, tex`c = am`],
        work: tex`substituting gives $x^{2} - 4amx - 4ac = 0$; equal roots need $16a^{2}m^{2} + 16ac = 0$, i.e. $c = -am^{2}$`,
      },
      {
        curve: tex`\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1`,
        cond: tex`c^{2} = a^{2}m^{2} + b^{2}`,
        wrong: [tex`c^{2} = a^{2}m^{2} - b^{2}`, tex`c^{2} = b^{2}m^{2} + a^{2}`, tex`c^{2} = a^{2}(1 + m^{2})`, tex`c = \frac{a}{m}`],
        work: tex`substituting and setting the discriminant of the quadratic in $x$ to zero gives $c^{2} = a^{2}m^{2} + b^{2}$`,
      },
      {
        curve: tex`\frac{x^{2}}{a^{2}} - \frac{y^{2}}{b^{2}} = 1`,
        cond: tex`c^{2} = a^{2}m^{2} - b^{2}`,
        wrong: [tex`c^{2} = a^{2}m^{2} + b^{2}`, tex`c^{2} = b^{2} - a^{2}m^{2}`, tex`c^{2} = b^{2}m^{2} - a^{2}`, tex`c = \frac{a}{m}`],
        work: tex`substituting and setting the discriminant of the quadratic in $x$ to zero gives $c^{2} = a^{2}m^{2} - b^{2}$`,
      },
    ];
    const row = r.pick(rows);
    const answer = m$(row.cond);
    return {
      stem: tex`The line $y = mx + c$ touches the curve $${row.curve}$ if:`,
      answer,
      distractors: pickDistractors(answer, row.wrong.map(m$), r),
      explanation: tex`The line is a tangent when it meets the curve in exactly one point: ${row.work}.`,
    };
  }),

  b.dynamic('c-focal-distance-property', { difficulty: 2, tags: ['ellipse', 'hyperbola', 'focus and directrix'] }, (r) => {
    const p = r.int(2, 9);
    const q = r.intExcept(2, 9, [p]);
    const ellipse = r.chance(0.5);
    let stem: string;
    let correct: number;
    let other: number;
    let explanation: string;
    if (ellipse) {
      correct = 2 * Math.max(p, q);
      other = 2 * Math.min(p, q);
      const axis = p > q ? 'x' : 'y';
      stem = tex`If $P$ is any point on the ellipse $\frac{x^{2}}{${p * p}} + \frac{y^{2}}{${q * q}} = 1$ and $S$, $S'$ are its foci, then $SP + S'P$ equals:`;
      explanation = tex`For an ellipse, $SP + S'P$ equals the length of the major axis. Here the larger denominator is $${Math.max(p, q) ** 2}$ (under $${axis}^{2}$), so the semi-major axis is $${Math.max(p, q)}$ and $SP + S'P = 2(${Math.max(p, q)}) = ${correct}$.`;
    } else {
      const xFirst = r.chance(0.5);
      const t = xFirst ? p : q; // semi-transverse axis
      correct = 2 * t;
      other = 2 * (xFirst ? q : p);
      const eq = xFirst
        ? tex`\frac{x^{2}}{${p * p}} - \frac{y^{2}}{${q * q}} = 1`
        : tex`\frac{y^{2}}{${q * q}} - \frac{x^{2}}{${p * p}} = 1`;
      stem = tex`If $P$ is any point on the hyperbola $${eq}$ and $S$, $S'$ are its foci, then $|SP - S'P|$ equals:`;
      explanation = tex`For a hyperbola, $|SP - S'P|$ equals the length of the transverse axis. The positive term is the one in $${xFirst ? 'x' : 'y'}^{2}$ with denominator $${t * t}$, so the semi-transverse axis is $${t}$ and $|SP - S'P| = 2(${t}) = ${correct}$.`;
    }
    const focal = Math.sqrt(ellipse ? Math.abs(p * p - q * q) : p * p + q * q);
    const { answer, distractors } = numericOptions(r, {
      correct,
      wrong: [other, correct / 2, p + q, Number.isInteger(focal) ? 2 * focal : 2 * (p + q)],
      format: n$,
    });
    return { stem, answer, distractors, explanation };
  }),

  b.dynamic('c-conjugate-hyperbola-eccentricity', { difficulty: 3, tags: ['hyperbola', 'eccentricity'] }, (r) => {
    if (r.chance(0.2)) {
      // e1 = 2: a = 1, b = sqrt 3, c = 2
      const answer = m$(tex`\frac{2}{\sqrt{3}}`);
      return {
        stem: tex`The eccentricity of a hyperbola is $2$. The eccentricity of its conjugate hyperbola is:`,
        answer,
        // b/c (forgot the reciprocal), b/a (used e2^2 = e1^2 - 1), e2 = e1
        distractors: [m$(tex`\frac{\sqrt{3}}{2}`), m$(tex`\sqrt{3}`), '$2$'],
        explanation: tex`If $e_1, e_2$ are the eccentricities of a hyperbola and its conjugate, $\frac{1}{e_1^{2}} + \frac{1}{e_2^{2}} = 1$. So $\frac{1}{e_2^{2}} = 1 - \frac{1}{4} = \frac{3}{4}$, giving $e_2 = \frac{2}{\sqrt{3}}$.`,
      };
    }
    const triple = r.pick([
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25],
    ] as const);
    const [a, bb] = r.chance(0.5) ? [triple[0], triple[1]] : [triple[1], triple[0]];
    const c = triple[2];
    const answer = m$(frac(c, bb).toTex());
    return {
      stem: tex`The eccentricity of a hyperbola is $${frac(c, a).toTex()}$. The eccentricity of its conjugate hyperbola is:`,
      answer,
      // e2 = e1 (c/a), e2^2 = e1^2 - 1 (b/a), e2^2 = 1/(e1^2 - 1) (a/b); one of the last two always exceeds 1
      distractors: pickDistractors(answer, [frac(c, a), frac(bb, a), frac(a, bb), frac(bb, c)].map((f) => m$(f.toTex()))),
      explanation: tex`For a hyperbola and its conjugate, $\frac{1}{e_1^{2}} + \frac{1}{e_2^{2}} = 1$. So $\frac{1}{e_2^{2}} = 1 - \frac{${a * a}}{${c * c}} = \frac{${bb * bb}}{${c * c}}$, giving $e_2 = ${frac(c, bb).toTex()}$ (an eccentricity of a hyperbola must exceed $1$).`,
    };
  }),

  b.dynamic('c-conic-statements', { difficulty: 2, tags: ['circle', 'parabola', 'ellipse', 'hyperbola', 'eccentricity'] }, (r) => {
    const reason = (s: string): string => STATEMENT_REASONS.get(s) ?? '';
    const q = statementQuestion(r, {
      stem: 'Which of the following statements about conics is correct?',
      negativeStem: 'Which of the following statements about conics is incorrect?',
      truths: STATEMENT_TRUTHS,
      falsehoods: STATEMENT_FALSEHOODS,
      explain: (answer, inverted) =>
        inverted ? `${reason(answer)} The other three statements are standard true results.` : reason(answer),
    });
    if (STATEMENT_FALSEHOODS.includes(q.answer)) return q;
    // "Correct statement" variant: also say why each of the three false options fails.
    const whyFalse = q.distractors.map((d) => {
      const text = reason(d).replace(/^False: /, '');
      return text.charAt(0).toUpperCase() + text.slice(1);
    });
    return { ...q, explanation: `${q.explanation} The other three statements are false. ${whyFalse.join(' ')}` };
  }),

  b.dynamic('c-parametric-to-cartesian', { difficulty: 1, tags: ['circle', 'parabola', 'ellipse', 'hyperbola'] }, (r) => {
    const kind = r.pick(['circle', 'shifted', 'ellipse', 'hyperbola', 'parabola', 'parabola-up'] as const);
    const a = r.int(2, 7);
    const bb = r.intExcept(2, 7, [a]);
    let param: string;
    let correct: string;
    let wrong: string[];
    let name: string;
    let how: string;
    if (kind === 'circle') {
      param = tex`x = ${a}\cos\theta,\; y = ${a}\sin\theta`;
      correct = tex`x^{2} + y^{2} = ${a * a}`;
      wrong = [tex`x^{2} + y^{2} = ${a}`, tex`x^{2} - y^{2} = ${a * a}`, tex`x^{2} + y^{2} = ${2 * a * a}`];
      name = 'a circle';
      how = tex`$x^{2} + y^{2} = ${a * a}(\cos^{2}\theta + \sin^{2}\theta) = ${a * a}$`;
    } else if (kind === 'shifted') {
      const h = r.nonZero(-4, 4);
      const k = r.nonZero(-4, 4);
      param = tex`x = ${h} + ${a}\cos\theta,\; y = ${k} + ${a}\sin\theta`;
      correct = tex`${sq(h, 'x')} + ${sq(k, 'y')} = ${a * a}`;
      wrong = [
        tex`${sq(-h, 'x')} + ${sq(-k, 'y')} = ${a * a}`,
        tex`${sq(h, 'x')} + ${sq(k, 'y')} = ${a}`,
        tex`${sq(h, 'x')} - ${sq(k, 'y')} = ${a * a}`,
      ];
      name = 'a circle';
      how = tex`$\cos\theta = \frac{x${signed(-h)}}{${a}}$ and $\sin\theta = \frac{y${signed(-k)}}{${a}}$; squaring and adding gives $${correct}$`;
    } else if (kind === 'ellipse') {
      param = tex`x = ${a}\cos\theta,\; y = ${bb}\sin\theta`;
      correct = tex`\frac{x^{2}}{${a * a}} + \frac{y^{2}}{${bb * bb}} = 1`;
      wrong = [
        tex`\frac{x^{2}}{${a}} + \frac{y^{2}}{${bb}} = 1`,
        tex`\frac{x^{2}}{${bb * bb}} + \frac{y^{2}}{${a * a}} = 1`,
        tex`\frac{x^{2}}{${a * a}} - \frac{y^{2}}{${bb * bb}} = 1`,
      ];
      name = 'an ellipse';
      how = tex`$\cos\theta = \frac{x}{${a}}$, $\sin\theta = \frac{y}{${bb}}$ and $\cos^{2}\theta + \sin^{2}\theta = 1$`;
    } else if (kind === 'hyperbola') {
      param = tex`x = ${a}\sec\theta,\; y = ${bb}\tan\theta`;
      correct = tex`\frac{x^{2}}{${a * a}} - \frac{y^{2}}{${bb * bb}} = 1`;
      wrong = [
        tex`\frac{x^{2}}{${a * a}} + \frac{y^{2}}{${bb * bb}} = 1`,
        tex`\frac{y^{2}}{${bb * bb}} - \frac{x^{2}}{${a * a}} = 1`,
        tex`\frac{x^{2}}{${a}} - \frac{y^{2}}{${bb}} = 1`,
      ];
      name = 'a hyperbola';
      how = tex`$\sec\theta = \frac{x}{${a}}$, $\tan\theta = \frac{y}{${bb}}$ and $\sec^{2}\theta - \tan^{2}\theta = 1$`;
    } else if (kind === 'parabola') {
      param = tex`x = ${a}t^{2},\; y = ${2 * a}t`;
      correct = tex`y^{2} = ${4 * a}x`;
      wrong = [tex`x^{2} = ${4 * a}y`, tex`y^{2} = ${2 * a}x`, tex`y^{2} = ${a}x`];
      name = 'a parabola';
      how = tex`$t = \frac{y}{${2 * a}}$, so $x = ${a}\cdot\frac{y^{2}}{${4 * a * a}}$, i.e. $y^{2} = ${4 * a}x$`;
    } else {
      param = tex`x = ${2 * a}t,\; y = ${a}t^{2}`;
      correct = tex`x^{2} = ${4 * a}y`;
      wrong = [tex`y^{2} = ${4 * a}x`, tex`x^{2} = ${2 * a}y`, tex`x^{2} = ${a}y`];
      name = 'a parabola';
      how = tex`$t = \frac{x}{${2 * a}}$, so $y = ${a}\cdot\frac{x^{2}}{${4 * a * a}}$, i.e. $x^{2} = ${4 * a}y$`;
    }
    const answer = m$(correct);
    return {
      stem: tex`The curve given parametrically by $${param}$ has Cartesian equation:`,
      answer,
      distractors: pickDistractors(answer, wrong.map(m$)),
      explanation: tex`Eliminate the parameter: ${how}. The curve is ${name}.`,
    };
  }),

  b.dynamic('c-eccentricity-from-axes-relation', { difficulty: 2, origin: 'past-paper', tags: ['eccentricity', 'ellipse', 'hyperbola'] }, (r) => {
    const kind = r.pick(['major-k-minor', 'foci-minor', 'latus-half-minor', 'latus-half-major', 'conj-k-trans', 'foci-k-trans'] as const);
    const root2inv = tex`\frac{1}{\sqrt{2}}`;
    const r3by2 = tex`\frac{\sqrt{3}}{2}`;
    let stem: string;
    let correct: string;
    let wrong: string[];
    let work: string;
    if (kind === 'major-k-minor') {
      const k = r.int(2, 5);
      stem = tex`The major axis of an ellipse is $${k}$ times its minor axis. Its eccentricity is:`;
      correct = tex`\frac{${surdTex(1, k * k - 1)}}{${k}}`;
      wrong = [tex`\frac{1}{${k}}`, tex`\frac{\sqrt{${k * k + 1}}}{${k}}`, surdTex(1, k * k - 1), tex`\frac{${k - 1}}{${k}}`];
      work = tex`$a = ${k}b$, so $e^{2} = 1 - \frac{b^{2}}{a^{2}} = 1 - \frac{1}{${k * k}} = \frac{${k * k - 1}}{${k * k}}$ and $e = ${correct}$`;
    } else if (kind === 'foci-minor') {
      stem = 'The distance between the foci of an ellipse equals the length of its minor axis. Its eccentricity is:';
      correct = root2inv;
      wrong = [r3by2, tex`\frac{1}{2}`, tex`\sqrt{2}`];
      work = tex`$2ae = 2b$ gives $a^{2}e^{2} = b^{2} = a^{2}(1 - e^{2})$, so $2e^{2} = 1$ and $e = ${root2inv}$`;
    } else if (kind === 'latus-half-minor') {
      stem = 'The latus rectum of an ellipse is half of its minor axis. Its eccentricity is:';
      correct = r3by2;
      wrong = [tex`\frac{1}{2}`, root2inv, tex`\frac{\sqrt{5}}{2}`];
      work = tex`$\frac{2b^{2}}{a} = b$ gives $b = \frac{a}{2}$, so $e^{2} = 1 - \frac{1}{4} = \frac{3}{4}$ and $e = ${r3by2}$`;
    } else if (kind === 'latus-half-major') {
      stem = 'The latus rectum of an ellipse is half of its major axis. Its eccentricity is:';
      correct = root2inv;
      wrong = [r3by2, tex`\frac{1}{2}`, tex`\frac{1}{4}`];
      work = tex`$\frac{2b^{2}}{a} = a$ gives $b^{2} = \frac{a^{2}}{2}$, so $e^{2} = 1 - \frac{1}{2}$ and $e = ${root2inv}$`;
    } else if (kind === 'conj-k-trans') {
      const k = r.int(2, 4);
      stem = tex`The conjugate axis of a hyperbola is $${k}$ times its transverse axis. Its eccentricity is:`;
      correct = surdTex(1, k * k + 1);
      wrong = [surdTex(1, k * k - 1), tex`\frac{\sqrt{${k * k + 1}}}{${k}}`, String(k), surdTex(1, k + 1)];
      work = tex`$b = ${k}a$, so $e^{2} = 1 + \frac{b^{2}}{a^{2}} = 1 + ${k * k} = ${k * k + 1}$ and $e = ${correct}$`;
    } else {
      const k = r.int(2, 4);
      stem = tex`The distance between the foci of a hyperbola is $${k}$ times the length of its transverse axis. Its eccentricity is:`;
      correct = String(k);
      wrong = [tex`\frac{1}{${k}}`, String(2 * k), surdTex(1, k), surdTex(1, k * k + 1)];
      work = tex`$2ae = ${k}(2a)$, so $e = ${k}$`;
    }
    const answer = m$(correct);
    return {
      stem,
      answer,
      distractors: pickDistractors(answer, wrong.map(m$)),
      explanation: tex`Use $c = ae$ with $b^{2} = a^{2}(1 - e^{2})$ (ellipse) or $b^{2} = a^{2}(e^{2} - 1)$ (hyperbola), latus rectum $\frac{2b^{2}}{a}$: ${work}.`,
    };
  }),

  b.dynamic('c-general-circle-conditions', { difficulty: 1, origin: 'past-paper', tags: ['circle'] }, (r) => {
    const gen = tex`x^{2} + y^{2} + 2gx + 2fy + c = 0`;
    const kind = r.pick(['real', 'point', 'radius', 'centre', 'second-degree'] as const);
    const rows = {
      real: {
        stem: tex`The equation $${gen}$ represents a real circle (positive radius) if:`,
        a: tex`g^{2} + f^{2} - c > 0`,
        x: [tex`g^{2} + f^{2} - c < 0`, tex`g^{2} + f^{2} - c = 0`, tex`g^{2} + f^{2} + c > 0`],
        e: tex`The radius is $\sqrt{g^{2} + f^{2} - c}$, which is real and positive only when $g^{2} + f^{2} - c > 0$ (zero gives a point circle, negative an imaginary circle).`,
      },
      point: {
        stem: tex`The equation $${gen}$ represents a point circle if:`,
        a: tex`g^{2} + f^{2} = c`,
        x: [tex`g^{2} + f^{2} > c`, tex`g^{2} + f^{2} < c`, tex`g^{2} + f^{2} + c = 0`],
        e: tex`A point circle has radius $0$: $\sqrt{g^{2} + f^{2} - c} = 0$, i.e. $g^{2} + f^{2} = c$.`,
      },
      radius: {
        stem: tex`The radius of the circle $${gen}$ is:`,
        a: tex`\sqrt{g^{2} + f^{2} - c}`,
        x: [tex`\sqrt{g^{2} + f^{2} + c}`, tex`g^{2} + f^{2} - c`, tex`\sqrt{4g^{2} + 4f^{2} - c}`],
        e: tex`Completing squares: $(x + g)^{2} + (y + f)^{2} = g^{2} + f^{2} - c$, so $r = \sqrt{g^{2} + f^{2} - c}$.`,
      },
      centre: {
        stem: tex`The centre of the circle $${gen}$ is:`,
        a: tex`(-g, -f)`,
        x: [tex`(g, f)`, tex`(-2g, -2f)`, tex`(-f, -g)`],
        e: tex`Completing squares: $(x + g)^{2} + (y + f)^{2} = g^{2} + f^{2} - c$, so the centre is $(-g, -f)$.`,
      },
      'second-degree': {
        stem: tex`The equation $ax^{2} + 2hxy + by^{2} + 2gx + 2fy + c = 0$ represents a circle only if:`,
        a: tex`a = b \neq 0 \text{ and } h = 0`,
        x: [tex`a = b \text{ and } h \neq 0`, tex`a = -b \text{ and } h = 0`, tex`a \neq b \text{ and } h = 0`],
        e: tex`Dividing by $a$ must give the form $x^{2} + y^{2} + 2Gx + 2Fy + C = 0$: the coefficients of $x^{2}$ and $y^{2}$ must be equal (and non-zero) and the $xy$ term must vanish.`,
      },
    };
    const row = rows[kind];
    return { stem: row.stem, answer: m$(row.a), distractors: row.x.map(m$), explanation: row.e };
  }),

  b.dynamic('c-plane-sections-of-cone', { difficulty: 1, tags: ['circle', 'parabola', 'ellipse', 'hyperbola'] }, (r) => {
    const kind = r.pick(['circle', 'parabola', 'ellipse', 'hyperbola'] as const);
    const cut = {
      circle: 'perpendicular to its axis and not passing through the vertex',
      parabola: 'parallel to one of its generators and not passing through the vertex',
      ellipse: 'inclined to its axis (but not perpendicular to it), meeting every generator of one nappe and not passing through the vertex',
      hyperbola: 'parallel to its axis and not passing through the vertex, so that it meets both nappes',
    }[kind];
    const answer = { circle: 'a circle', parabola: 'a parabola', ellipse: 'an ellipse', hyperbola: 'a hyperbola' }[kind];
    return {
      stem: `A double right circular cone is cut by a plane ${cut}. The section obtained is:`,
      answer,
      distractors: CONIC_NAMES.filter((c) => c !== answer),
      explanation:
        'Plane perpendicular to the axis: circle; tilted but cutting all generators of one nappe: ellipse; parallel to a generator: parabola; cutting both nappes (e.g. parallel to the axis): hyperbola. ' +
        `Hence the section is ${answer}.`,
    };
  }),

  ...b.mcqs([
    {
      id: 'c-rectangular-hyperbola-eccentricity',
      d: 1,
      o: 'past-paper',
      t: ['hyperbola', 'eccentricity'],
      q: tex`The eccentricity of the rectangular hyperbola $x^{2} - y^{2} = a^{2}$ is:`,
      a: tex`$\sqrt{2}$`,
      x: ['$1$', '$2$', tex`$\frac{1}{\sqrt{2}}$`],
      e: tex`Here $b = a$, so $e^{2} = 1 + \frac{b^{2}}{a^{2}} = 2$ and $e = \sqrt{2}$.`,
    },
    {
      id: 'c-tangent-perpendicular-radius',
      d: 1,
      t: ['tangents to circles'],
      q: 'The tangent to a circle at a point $P$ on it is:',
      a: 'perpendicular to the radius through $P$',
      x: ['parallel to the radius through $P$', tex`inclined at $45^\circ$ to the radius through $P$`, 'a line through the centre of the circle'],
      e: 'The radius drawn to the point of contact is the normal there, so the tangent at $P$ is perpendicular to it.',
    },
    {
      id: 'c-focus-directrix-definition',
      d: 1,
      o: 'past-paper',
      t: ['focus and directrix', 'parabola'],
      q: 'The locus of a point which moves so that its distance from a fixed point is always equal to its distance from a fixed line (not through that point) is:',
      a: 'a parabola',
      x: ['a circle', 'an ellipse', 'a hyperbola'],
      e: tex`A conic is the locus with $\frac{\text{distance from focus}}{\text{distance from directrix}} = e$. Equal distances mean $e = 1$, which is a parabola.`,
    },
    {
      id: 'c-director-circle-ellipse',
      d: 3,
      t: ['ellipse', 'tangents to circles'],
      q: tex`The locus of the point of intersection of two perpendicular tangents to the ellipse $\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1$ is:`,
      a: tex`$x^{2} + y^{2} = a^{2} + b^{2}$`,
      x: [tex`$x^{2} + y^{2} = a^{2}$`, tex`$x^{2} + y^{2} = a^{2} - b^{2}$`, tex`$x^{2} + y^{2} = (a + b)^{2}$`],
      e: tex`A tangent of slope $m$ is $y = mx \pm \sqrt{a^{2}m^{2} + b^{2}}$, so $(y - mx)^{2} = a^{2}m^{2} + b^{2}$, a quadratic in $m$. For perpendicular tangents the product of the slopes is $-1$: $\frac{y^{2} - b^{2}}{x^{2} - a^{2}} = -1$, i.e. $x^{2} + y^{2} = a^{2} + b^{2}$ (the director circle).`,
    },
    {
      id: 'c-auxiliary-circle',
      d: 2,
      t: ['ellipse', 'circle'],
      q: tex`The circle described on the major axis of the ellipse $\frac{x^{2}}{a^{2}} + \frac{y^{2}}{b^{2}} = 1$ $(a > b)$ as diameter has equation:`,
      a: tex`$x^{2} + y^{2} = a^{2}$`,
      x: [tex`$x^{2} + y^{2} = b^{2}$`, tex`$x^{2} + y^{2} = a^{2} + b^{2}$`, tex`$x^{2} + y^{2} = 4a^{2}$`],
      e: tex`The major axis runs from $(-a, 0)$ to $(a, 0)$, so the circle has centre $(0, 0)$ and radius $a$: $x^{2} + y^{2} = a^{2}$ (the auxiliary circle). $4a^{2}$ wrongly uses the diameter $2a$ as the radius.`,
    },
    {
      id: 'c-xy-hyperbola-asymptotes',
      d: 2,
      t: ['hyperbola'],
      q: tex`The asymptotes of the hyperbola $xy = 9$ are:`,
      a: 'the coordinate axes',
      x: ['the lines $y = x$ and $y = -x$', tex`the lines $x = \pm 3$ and $y = \pm 3$`, 'the line $y = x$ only'],
      e: tex`From $y = \frac{9}{x}$: $y \to 0$ as $x \to \pm\infty$ and $y \to \pm\infty$ as $x \to 0$, so the asymptotes are $y = 0$ and $x = 0$. The lines $y = \pm x$ are its axes of symmetry (they are the asymptotes of $x^{2} - y^{2} = a^{2}$).`,
    },
    {
      id: 'c-parabolic-reflector',
      d: 1,
      t: ['parabola', 'focus and directrix'],
      q: 'A ray of light travelling parallel to the axis of a parabolic mirror, after reflection, always passes through the:',
      a: 'focus',
      x: ['vertex', 'point where the axis meets the directrix', 'end of the latus rectum'],
      e: 'Reflective property of the parabola: every ray parallel to the axis is reflected through the focus (the principle of dish antennas and torch reflectors).',
    },
    {
      id: 'c-focal-chord-tangents',
      d: 3,
      t: ['parabola', 'focus and directrix'],
      q: tex`The tangents drawn at the two ends of any focal chord of the parabola $y^{2} = 4ax$ intersect:`,
      a: 'at right angles, on the directrix',
      x: ['at right angles, at the focus', 'at right angles, on the tangent at the vertex', tex`at an angle of $45^\circ$, on the directrix`],
      e: tex`For ends $(at_1^{2}, 2at_1)$ and $(at_2^{2}, 2at_2)$ of a focal chord, $t_1t_2 = -1$. The tangents have slopes $\frac{1}{t_1}, \frac{1}{t_2}$ (product $-1$, so perpendicular) and meet at $(at_1t_2,\, a(t_1 + t_2)) = (-a,\, a(t_1 + t_2))$, which lies on the directrix $x = -a$.`,
    },
    {
      id: 'c-length-of-tangent-formula',
      d: 2,
      t: ['tangents to circles'],
      q: tex`The length of the tangent drawn from the point $P(x_1, y_1)$ to the circle $x^{2} + y^{2} + 2gx + 2fy + c = 0$ is:`,
      a: tex`$\sqrt{x_1^{2} + y_1^{2} + 2gx_1 + 2fy_1 + c}$`,
      x: [
        tex`$x_1^{2} + y_1^{2} + 2gx_1 + 2fy_1 + c$`,
        tex`$\sqrt{x_1^{2} + y_1^{2} - 2gx_1 - 2fy_1 + c}$`,
        tex`$\sqrt{x_1^{2} + y_1^{2} + 2gx_1 + 2fy_1 - c}$`,
      ],
      e: tex`With centre $C(-g, -f)$ and radius $r$, the tangent is perpendicular to the radius, so $PT^{2} = PC^{2} - r^{2} = (x_1 + g)^{2} + (y_1 + f)^{2} - (g^{2} + f^{2} - c) = x_1^{2} + y_1^{2} + 2gx_1 + 2fy_1 + c$. Take the square root.`,
    },
    {
      id: 'c-ellipse-limit-zero-eccentricity',
      d: 1,
      t: ['ellipse', 'eccentricity', 'circle'],
      q: 'As the eccentricity of an ellipse approaches zero, the ellipse approaches:',
      a: 'a circle',
      x: ['a parabola', 'a straight line segment', 'a hyperbola'],
      e: tex`From $b^{2} = a^{2}(1 - e^{2})$, $e \to 0$ gives $b \to a$ and the foci merge at the centre, so the ellipse becomes a circle. (As $e \to 1$ it flattens towards a line segment.)`,
    },
  ]),
]);
