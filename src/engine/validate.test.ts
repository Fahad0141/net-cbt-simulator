import { defineBank } from './authoring';
import { num, tex } from './helpers';
import type { AuthoredQuestion } from './types';
import { roundedValuesShown, validateQuestion, validateTemplate } from './validate';
import { texIssues } from './validate-tex';

const good: AuthoredQuestion = {
  stem: tex`If $y = x^3$, then $\frac{dy}{dx}$ at $x = 2$ is:`,
  answer: '$12$',
  distractors: ['$8$', '$6$', '$4$'],
  explanation: tex`$\frac{dy}{dx} = 3x^2 = 12$ at $x = 2$.`,
};

const errors = (q: AuthoredQuestion) =>
  validateQuestion(q)
    .filter((i) => i.severity === 'error')
    .map((i) => `${i.field}: ${i.message}`);

describe('validateQuestion', () => {
  it('accepts a well-formed question', () => {
    expect(errors(good)).toEqual([]);
    expect(texIssues(good)).toEqual([]);
  });

  it('flags lost LaTeX backslashes (control characters)', () => {
    // A plain string literal turns "\frac" into a form feed + "rac".
    const broken = { ...good, stem: 'Find $\frac{1}{2}$' };
    expect(errors(broken).join()).toMatch(/control character/);
  });

  it('flags duplicate options, including formatting-only differences', () => {
    expect(errors({ ...good, distractors: ['12', '$6$', '$4$'] }).join()).toMatch(/not distinct/);
  });

  it('flags wrong number of distractors', () => {
    expect(errors({ ...good, distractors: ['$8$', '$6$'] }).join()).toMatch(/exactly 3/);
  });

  it('flags JS leaks', () => {
    expect(errors({ ...good, answer: '$NaN$' }).join()).toMatch(/NaN/);
    expect(errors({ ...good, stem: 'Find $x = undefined$' }).join()).toMatch(/undefined/);
    expect(errors({ ...good, explanation: 'tan 90° is undefined.' })).toEqual([]);
  });

  it('requires fixedOrder for options that refer to other options', () => {
    const q = { ...good, distractors: ['$8$', '$6$', 'None of these'] };
    expect(errors(q).join()).toMatch(/fixedOrder/);
    expect(errors({ ...q, fixedOrder: ['$8$', '$12$', '$6$', 'None of these'] })).toEqual([]);
    expect(errors({ ...q, fixedOrder: ['$8$', '$12$', '$6$', 'x'] }).join()).toMatch(/permutation/);
  });

  it('flags unbalanced markup', () => {
    expect(errors({ ...good, stem: 'Find $x' }).join()).toMatch(/Unclosed/);
  });

  it('rejects scripted figures', () => {
    expect(errors({ ...good, figure: '<svg onload="x()"></svg>' }).join()).toMatch(/scripting/);
    expect(errors({ ...good, figure: '<div></div>' }).join()).toMatch(/svg/);
  });

  it('reports KaTeX failures', () => {
    expect(texIssues({ ...good, answer: tex`$\fracc{1}{2}$` })).toHaveLength(1);
    expect(texIssues({ ...good, answer: tex`$\ce{H2SO4}$` })).toEqual([]);
  });
});

describe('validateTemplate', () => {
  const bank = defineBank('mathematics', 'test-chapter', (b) => [
    b.dynamic('ok', 1, (r) => {
      const a = r.int(2, 9);
      return {
        stem: `Compute $${a} + 1$.`,
        answer: `$${a + 1}$`,
        distractors: [`$${a}$`, `$${a + 2}$`, `$${a - 1}$`],
        explanation: `$${a} + 1 = ${a + 1}$`,
      };
    }),
    b.dynamic('constant', 1, () => good),
    b.dynamic('nondeterministic', 1, () => {
      const a = Math.floor(Math.random() * 1000) + 10;
      return { ...good, stem: `Value ${a}?` };
    }),
  ]);
  const [ok, constant, nondeterministic] = bank.templates;

  it('passes a good dynamic template', () => {
    const report = validateTemplate(ok!);
    expect(report.issues).toEqual([]);
    expect(report.distinctInstances).toBeGreaterThan(5);
  });

  it('rejects a dynamic template with no variety', () => {
    expect(
      validateTemplate(constant!)
        .issues.map((i) => i.message)
        .join(),
    ).toMatch(/make it static/);
  });

  it('detects non-determinism', () => {
    expect(
      validateTemplate(nondeterministic!)
        .issues.map((i) => i.message)
        .join(),
    ).toMatch(/not deterministic/);
  });

  it('rejects a stem that shows a value rounded for display', () => {
    const mass = defineBank('chemistry', 'test-chapter', (b) => [
      b.dynamic('rounded-stem', 1, (r) => {
        const m = r.pick([12.75, 13.25, 14.75, 16.25, 17.75]);
        return {
          stem: `How many moles are in $${num(m)}$ g of a gas with $M = 17$ g/mol?`,
          answer: `$${num(m / 17)}$`,
          distractors: [`$${num(m / 34)}$`, `$${num(m / 8.5)}$`, `$${num(m * 17)}$`],
          explanation: `$n = ${num(m)} / 17$`,
        };
      }),
      b.dynamic('approximate-stem', 1, (r) => {
        const k = r.int(2, 9);
        return {
          stem: `Taking $\\sqrt{2} \\approx ${num(Math.SQRT2)}$, find $${k}\\sqrt{2}$.`,
          answer: `$${num(k * 1.41)}$`,
          distractors: [`$${num(k * 1.73)}$`, `$${num(k * 2)}$`, `$${num(k * 1.5)}$`],
          explanation: `$${k} \\times 1.41$`,
        };
      }),
    ]).templates;
    const messages = (t: (typeof mass)[number]) => validateTemplate(t).issues.map((i) => i.message);
    expect(messages(mass[0]!).join()).toMatch(/shows the rounded value \d+\.\d \(exact \d+\.\d5\)/);
    expect(messages(mass[1]!)).toEqual([]);
  });
});

describe('roundedValuesShown', () => {
  const value = { shown: '12.8', exact: 12.75 };
  it('matches whole numbers only', () => {
    expect(roundedValuesShown('A mass of $12.8$ g', [value])).toEqual([value]);
    expect(roundedValuesShown('A mass of $112.8$ g or $12.85$ g', [value])).toEqual([]);
  });
  it('ignores values marked as approximate', () => {
    expect(roundedValuesShown('$m \\approx 12.8$ g', [value])).toEqual([]);
    expect(roundedValuesShown('m ≈ 12.8 g', [value])).toEqual([]);
  });
});
